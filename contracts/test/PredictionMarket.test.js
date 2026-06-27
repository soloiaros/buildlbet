const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PredictionMarket", function () {
  let market, organizer, alice, bob, charlie;

  beforeEach(async function () {
    [organizer, alice, bob, charlie] = await ethers.getSigners();
    const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
    market = await PredictionMarket.deploy();
    await market.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should set the organizer", async function () {
      expect(await market.organizer()).to.equal(organizer.address);
    });

    it("should start with zero teams", async function () {
      expect(await market.getTeamCount()).to.equal(0);
    });

    it("should start unresolved", async function () {
      const [resolved] = await market.getMarketState();
      expect(resolved).to.be.false;
    });
  });

  describe("createTeam", function () {
    it("should create a team and assign membership", async function () {
      const tx = await market.connect(alice).createTeam("Alpha");
      await expect(tx).to.emit(market, "TeamCreated").withArgs(0, "Alpha", alice.address);
      await expect(tx).to.emit(market, "TeamJoined").withArgs(0, alice.address);

      expect(await market.getTeamCount()).to.equal(1);
      expect(await market.getTeamName(0)).to.equal("Alpha");

      const [hasTeam, teamId] = await market.getTeamMembership(alice.address);
      expect(hasTeam).to.be.true;
      expect(teamId).to.equal(0);
    });

    it("should create multiple teams", async function () {
      await market.connect(alice).createTeam("Alpha");
      await market.connect(bob).createTeam("Beta");

      expect(await market.getTeamCount()).to.equal(2);
      expect(await market.getTeamName(0)).to.equal("Alpha");
      expect(await market.getTeamName(1)).to.equal("Beta");
    });

    it("should revert if already in a team (via create)", async function () {
      await market.connect(alice).createTeam("Alpha");
      await expect(
        market.connect(alice).createTeam("Beta")
      ).to.be.revertedWith("already in a team");
    });

    it("should revert if already in a team (via join then create)", async function () {
      await market.connect(alice).createTeam("Alpha");
      await market.connect(bob).joinTeam(0);
      await expect(
        market.connect(bob).createTeam("Beta")
      ).to.be.revertedWith("already in a team");
    });

    it("should revert on empty team name", async function () {
      await expect(
        market.connect(alice).createTeam("")
      ).to.be.revertedWith("team name cannot be empty");
    });

    it("should revert after market is resolved", async function () {
      await market.connect(alice).createTeam("Alpha");
      await market.connect(bob).createTeam("Beta");
      await market.resolve(0);
      await expect(
        market.connect(charlie).createTeam("Gamma")
      ).to.be.revertedWith("market already resolved");
    });
  });

  describe("joinTeam", function () {
    beforeEach(async function () {
      await market.connect(alice).createTeam("Alpha");
    });

    it("should join an existing team", async function () {
      const tx = await market.connect(bob).joinTeam(0);
      await expect(tx).to.emit(market, "TeamJoined").withArgs(0, bob.address);

      const [hasTeam, teamId] = await market.getTeamMembership(bob.address);
      expect(hasTeam).to.be.true;
      expect(teamId).to.equal(0);
    });

    it("should revert if already in a team", async function () {
      await expect(
        market.connect(alice).joinTeam(0)
      ).to.be.revertedWith("already in a team");
    });

    it("should revert on invalid team id", async function () {
      await expect(
        market.connect(bob).joinTeam(99)
      ).to.be.revertedWith("invalid team id");
    });

    it("should revert after market is resolved", async function () {
      await market.connect(bob).createTeam("Beta");
      await market.resolve(0);
      await expect(
        market.connect(charlie).joinTeam(0)
      ).to.be.revertedWith("market already resolved");
    });
  });

  describe("getTeamMembership", function () {
    it("should return false for a wallet with no team", async function () {
      const [hasTeam, teamId] = await market.getTeamMembership(alice.address);
      expect(hasTeam).to.be.false;
      expect(teamId).to.equal(0); // default, meaningless when hasTeam is false
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
      // Alice creates Team Alpha (id=0), Bob creates Team Beta (id=1)
      await market.connect(alice).createTeam("Alpha");
      await market.connect(bob).createTeam("Beta");
      await market.creditBalance(alice.address, 1000);
      await market.creditBalance(bob.address, 1000);
    });

    it("should place a bet on another team and update state", async function () {
      // Alice (team 0) bets on team 1
      await market.connect(alice).placeBet(1, 300);

      expect(await market.getBalance(alice.address)).to.equal(700);
      expect(await market.getTeamPool(1)).to.equal(300);
      expect(await market.getUserBet(alice.address, 1)).to.equal(300);
      expect(await market.getTotalPool()).to.equal(300);
    });

    it("should allow multiple bets from same user on another team", async function () {
      await market.connect(alice).placeBet(1, 200);
      await market.connect(alice).placeBet(1, 100);

      expect(await market.getBalance(alice.address)).to.equal(700);
      expect(await market.getUserBet(alice.address, 1)).to.equal(300);
    });

    it("should revert when betting on your own team", async function () {
      // Alice is on team 0, tries to bet on team 0
      await expect(
        market.connect(alice).placeBet(0, 100)
      ).to.be.revertedWith("cannot bet on your own team");
    });

    it("should revert when betting on your own team (joined, not created)", async function () {
      // Charlie joins team 0, then tries to bet on team 0
      await market.connect(charlie).joinTeam(0);
      await market.creditBalance(charlie.address, 1000);
      await expect(
        market.connect(charlie).placeBet(0, 100)
      ).to.be.revertedWith("cannot bet on your own team");
    });

    it("should revert when wallet has no team", async function () {
      await market.creditBalance(charlie.address, 1000);
      await expect(
        market.connect(charlie).placeBet(1, 100)
      ).to.be.revertedWith("must join or create a team before betting");
    });

    it("should revert on insufficient balance", async function () {
      await expect(
        market.connect(alice).placeBet(1, 2000)
      ).to.be.revertedWith("insufficient balance");
    });

    it("should revert on invalid team id", async function () {
      await expect(
        market.connect(alice).placeBet(99, 100)
      ).to.be.revertedWith("invalid team id");
    });

    it("should revert for zero amount", async function () {
      await expect(
        market.connect(alice).placeBet(1, 0)
      ).to.be.revertedWith("amount must be > 0");
    });

    it("should emit BetPlaced event", async function () {
      await expect(market.connect(alice).placeBet(1, 250))
        .to.emit(market, "BetPlaced")
        .withArgs(alice.address, 1, 250);
    });
  });

  describe("resolve", function () {
    beforeEach(async function () {
      await market.connect(alice).createTeam("Alpha");
      await market.connect(bob).createTeam("Beta");
    });

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
        market.connect(alice).placeBet(1, 100)
      ).to.be.revertedWith("market already resolved");
    });

    it("should emit MarketResolved event", async function () {
      await expect(market.resolve(1))
        .to.emit(market, "MarketResolved")
        .withArgs(1);
    });
  });

  describe("claimPayout", function () {
    beforeEach(async function () {
      // Alice creates team 0, Bob creates team 1, Charlie joins team 1
      await market.connect(alice).createTeam("Alpha");
      await market.connect(bob).createTeam("Beta");
      await market.connect(charlie).joinTeam(1);

      await market.creditBalance(alice.address, 1000);
      await market.creditBalance(bob.address, 1000);
      await market.creditBalance(charlie.address, 1000);

      // Alice (team 0) bets 400 on team 1, Bob (team 1) bets 600 on team 0
      // Charlie (team 1) bets 1000 on team 0
      await market.connect(alice).placeBet(1, 400);
      await market.connect(bob).placeBet(0, 600);
      await market.connect(charlie).placeBet(0, 1000);

      // Total pool: 2000, Team 0 pool: 1600, Team 1 pool: 400
      await market.resolve(0); // Team 0 wins
    });

    it("should compute correct proportional payout", async function () {
      // Bob: 600/1600 * 2000 = 750
      // Charlie: 1000/1600 * 2000 = 1250
      await market.connect(bob).claimPayout();
      expect(await market.getBalance(bob.address)).to.equal(400 + 750); // remaining 400 + 750 payout

      await market.connect(charlie).claimPayout();
      expect(await market.getBalance(charlie.address)).to.equal(0 + 1250); // 0 remaining + 1250 payout
    });

    it("should revert for non-winning bettor", async function () {
      // Alice bet on team 1, but team 0 won
      await expect(
        market.connect(alice).claimPayout()
      ).to.be.revertedWith("no winning bet");
    });

    it("should revert on double claim", async function () {
      await market.connect(bob).claimPayout();
      await expect(
        market.connect(bob).claimPayout()
      ).to.be.revertedWith("already claimed");
    });

    it("should revert before resolution", async function () {
      // Deploy a fresh market
      const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
      const fresh = await PredictionMarket.deploy();
      await fresh.waitForDeployment();

      await expect(
        fresh.connect(alice).claimPayout()
      ).to.be.revertedWith("market not resolved yet");
    });

    it("should emit PayoutClaimed event", async function () {
      await expect(market.connect(bob).claimPayout())
        .to.emit(market, "PayoutClaimed")
        .withArgs(bob.address, 750);
    });
  });

  describe("getAllTeams", function () {
    it("should return empty arrays when no teams exist", async function () {
      const [pools, names] = await market.getAllTeams();
      expect(pools.length).to.equal(0);
      expect(names.length).to.equal(0);
    });

    it("should return all team names and pools", async function () {
      await market.connect(alice).createTeam("Alpha");
      await market.connect(bob).createTeam("Beta");
      await market.creditBalance(alice.address, 1000);
      await market.connect(alice).placeBet(1, 100);

      const [pools, names] = await market.getAllTeams();
      expect(names[0]).to.equal("Alpha");
      expect(names[1]).to.equal("Beta");
      expect(pools[0]).to.equal(0);
      expect(pools[1]).to.equal(100);
    });
  });
});
