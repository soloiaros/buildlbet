/**
 * Prediction Market — Signing Backend
 *
 * A tiny Express server that holds demo wallet private keys server-side.
 * The frontend never sees any private key — it sends signing requests here.
 *
 * ⚠️  DEMO ONLY — not for production use. No auth, in-memory state, single process.
 */
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ── Config ──────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
const RPC_URL = process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";

// Load deployment info (contract address + ABI)
const deploymentPath = path.join(__dirname, "..", "contracts", "deployment.json");
if (!fs.existsSync(deploymentPath)) {
  console.error("❌ contracts/deployment.json not found. Deploy the contract first.");
  process.exit(1);
}
const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

// Load demo wallets
const walletsPath = path.join(__dirname, "..", "contracts", "demo-wallets.json");
if (!fs.existsSync(walletsPath)) {
  console.error("❌ contracts/demo-wallets.json not found. Run: cd contracts && npm run generate-wallets");
  process.exit(1);
}
const demoWallets = JSON.parse(fs.readFileSync(walletsPath, "utf8"));

// ── Setup ethers ────────────────────────────────────────────────────────

const provider = new ethers.JsonRpcProvider(RPC_URL);
const readContract = new ethers.Contract(deployment.address, deployment.abi, provider);

// Pre-build wallet signers for each demo wallet
const walletSigners = demoWallets.map((w) => {
  const wallet = new ethers.Wallet(w.privateKey, provider);
  return { ...w, wallet, contract: new ethers.Contract(deployment.address, deployment.abi, wallet) };
});

// Track which wallets have been claimed (in-memory, resets on restart)
const claimedWallets = new Set();

// Track team posts (in-memory)
// { teamId: { imageBase64, text, updatedAt } }
const teamPosts = {};

// Track distinct bettors per team
const teamBettors = new Map(); // teamId -> Set<address>

// Initialize past events and listen for new ones
(async () => {
  let lastCheckedBlock = await provider.getBlockNumber().catch(() => 0);

  // Listen for live events using polling (since eth_newFilter is unsupported on this RPC)
  setInterval(async () => {
    try {
      const latestBlock = await provider.getBlockNumber();
      if (latestBlock <= lastCheckedBlock) return;
      
      const filter = readContract.filters.BetPlaced();
      const newEvents = await readContract.queryFilter(filter, lastCheckedBlock + 1, latestBlock);
      
      newEvents.forEach((event) => {
        const { bettor, teamId } = event.args;
        const tId = Number(teamId);
        if (!teamBettors.has(tId)) teamBettors.set(tId, new Set());
        teamBettors.get(tId).add(bettor);
      });
      
      lastCheckedBlock = latestBlock;
    } catch (err) {
      // Ignore transient RPC errors during polling
    }
  }, 4000);
})();

// ── Helper ──────────────────────────────────────────────────────────────

function getWalletById(walletId) {
  const id = parseInt(walletId);
  if (isNaN(id) || id < 0 || id >= walletSigners.length) {
    return null;
  }
  return walletSigners[id];
}

// ── Endpoints ───────────────────────────────────────────────────────────

/**
 * POST /api/claim-wallet
 * Assigns the next unclaimed demo wallet to the caller.
 * Returns { walletId, address }
 */
app.post("/api/claim-wallet", (req, res) => {
  for (let i = 0; i < demoWallets.length; i++) {
    if (!claimedWallets.has(i)) {
      claimedWallets.add(i);
      return res.json({
        walletId: i,
        address: demoWallets[i].address,
      });
    }
  }
  return res.status(503).json({ error: "No more wallets available" });
});

/**
 * POST /api/reclaim-wallet
 * Re-claim a specific wallet (e.g. after page refresh when walletId is in localStorage).
 * Body: { walletId }
 */
app.post("/api/reclaim-wallet", (req, res) => {
  const { walletId } = req.body;
  const w = getWalletById(walletId);
  if (!w) {
    return res.status(400).json({ error: "Invalid wallet ID" });
  }
  claimedWallets.add(parseInt(walletId));
  return res.json({
    walletId: parseInt(walletId),
    address: w.address,
  });
});

/**
 * POST /api/create-team
 * Body: { walletId, name }
 * Signs and submits a createTeam transaction.
 */
app.post("/api/create-team", async (req, res) => {
  try {
    const { walletId, name } = req.body;
    const w = getWalletById(walletId);
    if (!w) {
      return res.status(400).json({ error: "Invalid wallet ID" });
    }
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: "Team name cannot be empty" });
    }

    const tx = await w.contract.createTeam(name.trim());
    const receipt = await tx.wait();

    // To get the teamId, we can parse the TeamCreated event, but it's simpler
    // to just let the frontend refresh the market state to see the new team.
    return res.json({
      success: true,
      txHash: receipt.hash,
    });
  } catch (err) {
    console.error("Create team error:", err.message);
    const reason = err.reason || err.shortMessage || err.message;
    return res.status(400).json({ error: reason });
  }
});

/**
 * POST /api/join-team
 * Body: { walletId, teamId }
 * Signs and submits a joinTeam transaction.
 */
app.post("/api/join-team", async (req, res) => {
  try {
    const { walletId, teamId } = req.body;
    const w = getWalletById(walletId);
    if (!w) {
      return res.status(400).json({ error: "Invalid wallet ID" });
    }
    if (teamId === undefined) {
      return res.status(400).json({ error: "Missing teamId" });
    }

    const tx = await w.contract.joinTeam(teamId);
    const receipt = await tx.wait();

    return res.json({
      success: true,
      txHash: receipt.hash,
    });
  } catch (err) {
    console.error("Join team error:", err.message);
    const reason = err.reason || err.shortMessage || err.message;
    return res.status(400).json({ error: reason });
  }
});

/**
 * POST /api/bet
 * Body: { walletId, teamId, amount }
 * Signs and submits a placeBet transaction on behalf of the wallet.
 */
app.post("/api/bet", async (req, res) => {
  try {
    const { walletId, teamId, amount } = req.body;
    const w = getWalletById(walletId);
    if (!w) {
      return res.status(400).json({ error: "Invalid wallet ID" });
    }
    if (teamId === undefined || amount === undefined) {
      return res.status(400).json({ error: "Missing teamId or amount" });
    }

    const tx = await w.contract.placeBet(teamId, amount);
    const receipt = await tx.wait();

    return res.json({
      success: true,
      txHash: receipt.hash,
    });
  } catch (err) {
    console.error("Bet error:", err.message);
    // Extract revert reason if available
    const reason = err.reason || err.shortMessage || err.message;
    return res.status(400).json({ error: reason });
  }
});

/**
 * POST /api/claim-payout
 * Body: { walletId }
 * Signs and submits a claimPayout transaction on behalf of the wallet.
 */
app.post("/api/claim-payout", async (req, res) => {
  try {
    const { walletId } = req.body;
    const w = getWalletById(walletId);
    if (!w) {
      return res.status(400).json({ error: "Invalid wallet ID" });
    }

    const tx = await w.contract.claimPayout();
    const receipt = await tx.wait();

    return res.json({
      success: true,
      txHash: receipt.hash,
    });
  } catch (err) {
    console.error("Claim error:", err.message);
    const reason = err.reason || err.shortMessage || err.message;
    return res.status(400).json({ error: reason });
  }
});

const rpcCache = {
  market: { data: null, expires: 0 },
  balance: {}
};

/**
 * GET /api/market
 * Returns full market state: teams, pools, odds, resolution status.
 */
app.get("/api/market", async (req, res) => {
  if (Date.now() < rpcCache.market.expires && rpcCache.market.data) {
    return res.json(rpcCache.market.data);
  }
  
  try {
    const [resolved, winningTeamId, teamCount, totalPool] = await readContract.getMarketState();
    const [pools, names] = await readContract.getAllTeams();

    const teams = [];
    for (let i = 0; i < Number(teamCount); i++) {
      const pool = Number(pools[i]);
      const odds = pool > 0 ? Number(totalPool) / pool : 0;
      teams.push({
        id: i,
        name: names[i],
        pool: pool,
        odds: Math.round(odds * 10) / 10,
        bettorCount: teamBettors[i] ? teamBettors[i].size : 0,
        hasPost: !!teamPosts[i]
      });
    }

    const responseData = {
      resolved: resolved,
      winningTeamId: Number(winningTeamId),
      totalPool: Number(totalPool),
      teams: teams,
    };
    
    rpcCache.market.data = responseData;
    rpcCache.market.expires = Date.now() + 3000; // cache for 3s
    
    return res.json(responseData);
  } catch (err) {
    console.error("Market read error:", err.message);
    // Fallback to cache if available
    if (rpcCache.market.data) return res.json(rpcCache.market.data);
    return res.status(500).json({ error: "Failed to read market state" });
  }
});

/**
 * GET /api/balance/:walletId
 * Returns the free balance and per-team bets for the given wallet.
 */
app.get("/api/balance/:walletId", async (req, res) => {
  const walletId = req.params.walletId;
  
  if (rpcCache.balance[walletId] && Date.now() < rpcCache.balance[walletId].expires) {
    return res.json(rpcCache.balance[walletId].data);
  }

  try {
    const w = getWalletById(walletId);
    if (!w) {
      return res.status(400).json({ error: "Invalid wallet ID" });
    }

    const balance = await readContract.getBalance(w.address);
    const [, , teamCount] = await readContract.getMarketState();

    const bets = [];
    for (let i = 0; i < Number(teamCount); i++) {
      const betAmount = await readContract.getUserBet(w.address, i);
      bets.push({ teamId: i, amount: Number(betAmount) });
    }

    // Check if payout has been claimed (only relevant after resolution)
    const hasClaimed = await readContract.hasClaimed(w.address);
    const [hasTeam, teamId] = await readContract.getTeamMembership(w.address);

    const responseData = {
      address: w.address,
      balance: Number(balance),
      bets: bets,
      hasClaimed: hasClaimed,
      hasTeam: hasTeam,
      teamId: hasTeam ? Number(teamId) : null,
    };

    rpcCache.balance[walletId] = {
      data: responseData,
      expires: Date.now() + 3000
    };

    return res.json(responseData);
  } catch (err) {
    console.error("Balance read error:", err.message);
    if (rpcCache.balance[walletId]?.data) return res.json(rpcCache.balance[walletId].data);
    return res.status(500).json({ error: "Failed to read balance" });
  }
});

/**
 * POST /api/team-post
 * Body: { walletId, imageBase64, text }
 */
app.post("/api/team-post", async (req, res) => {
  try {
    const { walletId, imageBase64, text } = req.body;
    const w = getWalletById(walletId);
    if (!w) return res.status(400).json({ error: "Invalid wallet ID" });

    const [hasTeam, teamId] = await readContract.getTeamMembership(w.address);
    if (!hasTeam) return res.status(403).json({ error: "Must belong to a team to post" });

    const tId = Number(teamId);
    teamPosts[tId] = {
      teamId: tId,
      imageBase64: imageBase64 || null,
      text: text || "",
      updatedAt: Date.now()
    };

    return res.json({ success: true, post: teamPosts[tId] });
  } catch (err) {
    console.error("Post error:", err);
    return res.status(500).json({ error: "Failed to save post" });
  }
});

/**
 * GET /api/team-post/:teamId
 */
app.get("/api/team-post/:teamId", (req, res) => {
  const tId = Number(req.params.teamId);
  if (teamPosts[tId]) {
    return res.json({ hasPost: true, post: teamPosts[tId] });
  }
  return res.json({ hasPost: false });
});

/**
 * GET /api/recent-posts
 */
app.get("/api/recent-posts", async (req, res) => {
  // Returns posts sorted by updatedAt, plus the team name
  try {
    const posts = Object.values(teamPosts).sort((a, b) => b.updatedAt - a.updatedAt);
    
    // Attach team names
    const [, names] = await readContract.getAllTeams();
    const enriched = posts.map(p => ({
      ...p,
      teamName: names[p.teamId]
    }));

    return res.json(enriched);
  } catch (err) {
    console.error("Fetch recent posts error:", err);
    return res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// ── Start ───────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🎲 Prediction Market Server running on http://localhost:${PORT}`);
  console.log(`   Contract: ${deployment.address}`);
  console.log(`   RPC:      ${RPC_URL}`);
  console.log(`   Wallets:  ${demoWallets.length} loaded, ${claimedWallets.size} claimed\n`);
});
