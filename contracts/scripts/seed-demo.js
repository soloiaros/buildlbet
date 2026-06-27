require('dotenv').config();
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3001/api';

// Helper to make API requests to the backend
async function req(method, endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    let txt = '';
    try {
      const j = await res.json();
      txt = j.error || JSON.stringify(j);
    } catch (e) {
      txt = await res.text();
    }
    throw new Error(`API Error ${res.status}: ${txt}`);
  }
  return res.json();
}

async function main() {
  console.log("🌱 Starting Demo Seed Script...");
  console.log("⚠️  This script interacts with the live backend to seed ON-CHAIN state.");
  
  // Load wallets
  let wallets = [];
  if (process.env.DEMO_WALLETS_JSON) {
    wallets = JSON.parse(process.env.DEMO_WALLETS_JSON);
  } else {
    const walletsPath = path.join(__dirname, "..", "demo-wallets.json");
    if (fs.existsSync(walletsPath)) {
      wallets = JSON.parse(fs.readFileSync(walletsPath, "utf8"));
    } else {
      console.error("❌ demo-wallets.json not found.");
      process.exit(1);
    }
  }

  const totalWallets = wallets.length;
  console.log(`Loaded ${totalWallets} demo wallets.`);

  // 1. Fetch current market state
  console.log("Fetching market state...");
  let market = await req('GET', '/market');
  let existingTeams = market.teams || [];

  const targetTeams = ['BuildlBet', 'CrowdCast', 'DraftMon', 'HyperLock'];
  const toCreate = targetTeams.filter(t => !existingTeams.some(e => e.name === t));

  // 2. Fetch wallet states to find available wallets
  console.log("Checking wallet availability...");
  const walletStates = [];
  let unassignedCount = 0;
  for (let i = 0; i < totalWallets; i++) {
    if (unassignedCount >= 20) break; // We only need ~20 wallets, stop hammering RPC
    try {
      const st = await req('GET', `/balance/${i}`);
      walletStates.push({ id: i, ...st });
      if (!st.hasTeam) unassignedCount++;
      await new Promise(r => setTimeout(r, 1000)); // 1 second delay to avoid strict RPC limits
    } catch (err) {
      console.warn(`Could not fetch balance for wallet ${i}, skipping.`);
    }
  }

  let unassignedWallets = walletStates.filter(w => !w.hasTeam);

  // 3. Create missing teams
  if (toCreate.length > 0) {
    console.log(`\nCreating ${toCreate.length} teams...`);
    for (const name of toCreate) {
      if (unassignedWallets.length === 0) {
        console.warn("⚠️  Ran out of unassigned wallets to create teams.");
        break;
      }
      const creator = unassignedWallets.shift();
      console.log(`  -> Wallet ${creator.id} creating team: ${name}`);
      try {
        await req('POST', '/create-team', { walletId: creator.id, name });
        await new Promise(r => setTimeout(r, 1500)); // wait for indexer/rpc sync
      } catch(e) {
        console.error(`  ❌ Failed to create ${name}: ${e.message}`);
      }
    }
  } else {
    console.log("\nAll target teams already exist. Skipping creation.");
  }

  // Refresh market state
  market = await req('GET', '/market');
  existingTeams = market.teams || [];
  const relevantTeams = existingTeams.filter(t => targetTeams.includes(t.name));

  // 4. Have some wallets join teams
  console.log("\nSimulating members joining teams...");
  const joiners = unassignedWallets.splice(0, 3);
  for (const joiner of joiners) {
    const randomTeam = relevantTeams[Math.floor(Math.random() * relevantTeams.length)];
    if (!randomTeam) continue;
    console.log(`  -> Wallet ${joiner.id} joining team: ${randomTeam.name}`);
    try {
      await req('POST', '/join-team', { walletId: joiner.id, teamId: randomTeam.id });
      await new Promise(r => setTimeout(r, 1500));
    } catch(e) {
      console.error(`  ❌ Failed to join: ${e.message}`);
    }
  }

  // 5. Place uneven organic bets
  console.log("\nPlacing organic, uneven bets...");
  const roles = ['favorite', 'middle1', 'middle2', 'underdog'];
  const shuffledTeams = [...relevantTeams].sort(() => 0.5 - Math.random());
  
  const betPlan = [];
  let bettorPool = unassignedWallets.splice(0, 15);

  function addBets(teamId, count, min, max) {
    for (let i = 0; i < count; i++) {
      if (bettorPool.length === 0) break;
      const w = bettorPool.shift();
      const amt = Math.floor(Math.random() * (max - min + 1)) + min;
      // Make sure wallet actually has enough balance
      if (w.balance >= amt) {
        betPlan.push({ walletId: w.id, teamId, amount: amt });
      }
    }
  }

  for (let i = 0; i < shuffledTeams.length; i++) {
    const role = roles[i];
    const t = shuffledTeams[i];
    if (role === 'favorite') addBets(t.id, 4, 80, 150);
    else if (role === 'middle1') addBets(t.id, 3, 50, 100);
    else if (role === 'middle2') addBets(t.id, 2, 40, 90);
    else if (role === 'underdog') addBets(t.id, 1, 60, 100);
  }

  for (const b of betPlan) {
    console.log(`  -> Wallet ${b.walletId} betting ${b.amount} on Team ${b.teamId}...`);
    try {
      await req('POST', '/bet', { walletId: b.walletId, teamId: b.teamId, amount: b.amount });
      await new Promise(r => setTimeout(r, 1000));
    } catch(e) {
      console.error(`  ❌ Bet failed: ${e.message}`);
    }
  }

  // 6. Publish team posts for a subset of teams
  console.log("\nPublishing team pitches...");
  const postTeams = shuffledTeams.slice(0, 2); // Pick 2 teams to post
  
  // Re-fetch wallet states to figure out who is on which team now
  const updatedWalletStates = [];
  for (let i = 0; i < totalWallets; i++) {
    try {
      const st = await req('GET', `/balance/${i}`);
      updatedWalletStates.push({ id: i, ...st });
    } catch(e) {}
  }

  for (const pt of postTeams) {
    if (pt.hasPost) {
      console.log(`  -> Team ${pt.name} already has a post, skipping.`);
      continue;
    }
    const member = updatedWalletStates.find(w => w.hasTeam && w.teamId === pt.id);
    if (member) {
      console.log(`  -> Wallet ${member.id} posting for ${pt.name}...`);
      try {
        await req('POST', '/team-post', {
          walletId: member.id,
          text: `We are ${pt.name}, and we are building the future on Monad! Our project brings incredible utility and smooth UX to the ecosystem. Let's go! 🚀`
        });
        await new Promise(r => setTimeout(r, 1000));
      } catch(e) {
        console.error(`  ❌ Post failed: ${e.message}`);
      }
    } else {
      console.warn(`  -> Could not find a member for ${pt.name} to post.`);
    }
  }

  // 7. Summary
  console.log("\n✅ Seeding complete! Final Market State:");
  market = await req('GET', '/market');
  
  const summary = (market.teams || []).map(t => ({
    "ID": t.id,
    "Name": t.name,
    "Pool Size": t.pool,
    "Bettors": t.bettorCount,
    "Has Post": t.hasPost ? "Yes" : "No",
    "Odds": t.odds
  }));
  
  console.table(summary);
}

main().catch(console.error);
