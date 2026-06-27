const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PredictionMarket", function () {
  let market, organizer, alice, bob, charlie;
  const teamNames = ["Alpha", "Beta", "Gamma"];

  beforeEach(async function () {
    [organizer, alice, bob, charlie] = await ethers.getSigners();
    const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
    market = await PredictionMarket.deploy(teamNames);
    await market.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should set the organizer", async function () {
      expect(await market.organizer()).to.equal(organizer.address);
    });

    it("should have the correct number of teams", async function () {
      expect(await market.getTeamCount()).to.equal(3);
    });

    it("should have correct team names", async function () {
      expect(await market.getTeamName(0)).to.equal("Alpha");
      expect(await market.getTeamName(1)).to.equal("Beta");
      expect(await market.getTeamName(2)).to.equal("Gamma");
    });

    it("should start unresolved", async function () {
      const [resolved] = await market.getMarketState();
      expect(resolved).to.be.false;
    });
  });

  describe("creditBalance", function () {
    it("should credit balance as organizer", async function () {
      await market.creditBalance(alice.address, 1000);
      expect(await market.getBalance(alice.address)).to.equal(1000);
    });

    it("should revert if called by non-organizer", async function () {
      await expect(
        market.connect(alice).creditBalance(bob.address, 1000)
      ).to.be.revertedWith("not organizer");
    });

    it("should revert for zero amount", async function () {
      await expect(
        market.creditBalance(alice.address, 0)
      ).to.be.revertedWith("amount must be > 0");
    });

    it("should emit BalanceCredited event", async function () {
      await expect(market.creditBalance(alice.address, 500))
        .to.emit(market, "BalanceCredited")
        .withArgs(alice.address, 500);
    });
  });

  describe("placeBet", function () {
    beforeEach(async function () {
      await market.creditBalance(alice.address, 1000);
      await market.creditBalance(bob.address, 1000);
    });

    it("should place a bet and update state", async function () {
      await market.connect(alice).placeBet(0, 300);

      expect(await market.getBalance(alice.address)).to.equal(700);
      expect(await market.getTeamPool(0)).to.equal(300);
      expect(await market.getUserBet(alice.address, 0)).to.equal(300);
      expect(await market.getTotalPool()).to.equal(300);
    });

    it("should allow multiple bets from same user", async function () {
      await market.connect(alice).placeBet(0, 200);
      await market.connect(alice).placeBet(0, 100);

      expect(await market.getBalance(alice.address)).to.equal(700);
      expect(await market.getUserBet(alice.address, 0)).to.equal(300);
    });

    it("should allow bets on different teams", async function () {
      await market.connect(alice).placeBet(0, 200);
      await market.connect(alice).placeBet(1, 300);

      expect(await market.getBalance(alice.address)).to.equal(500);
      expect(await market.getUserBet(alice.address, 0)).to.equal(200);
      expect(await market.getUserBet(alice.address, 1)).to.equal(300);
    });

    it("should revert on insufficient balance", async function () {
      await expect(
        market.connect(alice).placeBet(0, 2000)
      ).to.be.revertedWith("insufficient balance");
    });

    it("should revert on invalid team id", async function () {
      await expect(
        market.connect(alice).placeBet(99, 100)
      ).to.be.revertedWith("invalid team id");
    });

    it("should revert for zero amount", async function () {
      await expect(
        market.connect(alice).placeBet(0, 0)
      ).to.be.revertedWith("amount must be > 0");
    });

    it("should emit BetPlaced event", async function () {
      await expect(market.connect(alice).placeBet(1, 250))
        .to.emit(market, "BetPlaced")
        .withArgs(alice.address, 1, 250);
    });
  });

  describe("resolve", function () {
    it("should resolve the market", async function () {
      await market.resolve(1);
      const [resolved, winningTeamId] = await market.getMarketState();
      expect(resolved).to.be.true;
      expect(winningTeamId).to.equal(1);
    });

    it("should revert if called by non-organizer", async function () {
      await expect(
        market.connect(alice).resolve(0)
      ).to.be.revertedWith("not organizer");
    });

    it("should revert on double resolve", async function () {
      await market.resolve(0);
      await expect(market.resolve(1)).to.be.revertedWith("market already resolved");
    });

    it("should revert on invalid team id", async function () {
      await expect(market.resolve(99)).to.be.revertedWith("invalid team id");
    });

    it("should block betting after resolution", async function () {
      await market.creditBalance(alice.address, 1000);
      await market.resolve(0);
      await expect(
        market.connect(alice).placeBet(0, 100)
      ).to.be.revertedWith("market already resolved");
    });

    it("should emit MarketResolved event", async function () {
      await expect(market.resolve(2))
        .to.emit(market, "MarketResolved")
        .withArgs(2);
    });
  });

  describe("claimPayout", function () {
    beforeEach(async function () {
      // Alice bets 400 on team 0, Bob bets 600 on team 0, Charlie bets 1000 on team 1
      await market.creditBalance(alice.address, 1000);
      await market.creditBalance(bob.address, 1000);
      await market.creditBalance(charlie.address, 1000);

      await market.connect(alice).placeBet(0, 400);
      await market.connect(bob).placeBet(0, 600);
      await market.connect(charlie).placeBet(1, 1000);

      // Total pool: 2000, Team 0 pool: 1000, Team 1 pool: 1000
      await market.resolve(0); // Team 0 wins
    });

    it("should compute correct proportional payout", async function () {
      // Alice: 400/1000 * 2000 = 800
      // Bob: 600/1000 * 2000 = 1200
      await market.connect(alice).claimPayout();
      expect(await market.getBalance(alice.address)).to.equal(600 + 800); // remaining 600 + 800 payout

      await market.connect(bob).claimPayout();
      expect(await market.getBalance(bob.address)).to.equal(400 + 1200); // remaining 400 + 1200 payout
    });

    it("should revert for non-winning bettor", async function () {
      await expect(
        market.connect(charlie).claimPayout()
      ).to.be.revertedWith("no winning bet");
    });

    it("should revert on double claim", async function () {
      await market.connect(alice).claimPayout();
      await expect(
        market.connect(alice).claimPayout()
      ).to.be.revertedWith("already claimed");
    });

    it("should revert before resolution", async function () {
      // Deploy a fresh market
      const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
      const fresh = await PredictionMarket.deploy(teamNames);
      await fresh.waitForDeployment();

      await expect(
        fresh.connect(alice).claimPayout()
      ).to.be.revertedWith("market not resolved yet");
    });

    it("should emit PayoutClaimed event", async function () {
      await expect(market.connect(alice).claimPayout())
        .to.emit(market, "PayoutClaimed")
        .withArgs(alice.address, 800);
    });
  });

  describe("getAllTeams", function () {
    it("should return all team names and pools", async function () {
      await market.creditBalance(alice.address, 1000);
      await market.connect(alice).placeBet(0, 100);
      await market.connect(alice).placeBet(2, 200);

      const [pools, names] = await market.getAllTeams();
      expect(names[0]).to.equal("Alpha");
      expect(names[1]).to.equal("Beta");
      expect(names[2]).to.equal("Gamma");
      expect(pools[0]).to.equal(100);
      expect(pools[1]).to.equal(0);
      expect(pools[2]).to.equal(200);
    });
  });
});
