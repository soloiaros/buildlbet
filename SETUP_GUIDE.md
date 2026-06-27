# Prediction Market — Setup Guide

> **Time estimate:** 30–45 minutes to go from zero to a working demo, assuming all tools are installed and the faucet cooperates.

> ⚠️ **This is a hackathon demo.** It uses play-money tokens with no real value. The signing backend holds demo wallet private keys server-side — this is a deliberate simplification for the demo, not production-grade security.

---

## 1. Install Prerequisites

You need **Node.js** (v18 or newer) and **npm** (comes with Node.js).

```bash
# Check Node.js version (need v18+)
node --version

# Check npm version
npm --version
```

If Node.js isn't installed, download it from [nodejs.org](https://nodejs.org/) — use the LTS (Long Term Support) version.

---

## 2. Get Monad Testnet RPC Details

An **RPC endpoint** is a URL your code uses to talk to the blockchain — think of it as an API URL for the Monad network.

| Field | Value |
|---|---|
| Network Name | Monad Testnet |
| Chain ID | `10143` |
| RPC URL | `https://testnet-rpc.monad.xyz` |
| Currency | MON |
| Block Explorer | `https://testnet.monadvision.com` |

> [!NOTE]
> [CONFIRM] These details were sourced from Monad's official docs at build time. If they've changed, check [docs.monad.xyz](https://docs.monad.xyz) for current values.

The RPC URL is already configured in the code. You shouldn't need to change it unless you're using a custom RPC provider.

---

## 3. Generate Demo Wallets

A **wallet** is a pair of cryptographic keys — a public **address** (like a username, safe to share) and a **private key** (like a password, must be kept secret). Anyone with a private key can control that wallet's funds.

```bash
cd contracts
npm install          # Install dependencies (first time only)
node scripts/generate-wallets.js 30
```

This creates `contracts/demo-wallets.json` with 30 wallets. The output will confirm:

```
✅ Generated 30 demo wallets → /path/to/demo-wallets.json

⚠️  WARNING: demo-wallets.json contains private keys!
   Do NOT commit this file to version control.
   Do NOT share it publicly.
```

> ⚠️ **Never commit `demo-wallets.json` to Git.** It's already in `.gitignore`, but double-check. Anyone with these private keys could use the wallets.

---

## 4. Get a Deployer Wallet & Fund It

You need one wallet to deploy the contract and run admin operations. You can use one of the generated demo wallets or create a separate one.

**Option A: Use a generated wallet as deployer (simplest)**

Open `contracts/demo-wallets.json` and copy the `privateKey` of wallet #0.

**Option B: Use MetaMask**

If you already have MetaMask, export a private key from it.

### Create the `.env` file

```bash
cd contracts
cp .env.example .env
```

Edit `contracts/.env` and paste the private key:

```
DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
```

### Fund the deployer with testnet MON

**Testnet MON** is free, play-money gas tokens used to pay for transactions on the test network. You get them from a **faucet** — a website that gives out free testnet tokens.

1. Go to [https://testnet.monad.xyz](https://testnet.monad.xyz)
2. Connect or paste your deployer wallet address
3. Request testnet MON

> [!NOTE]
> [CONFIRM] The faucet URL may have changed. Check Monad's official docs or Discord if the above URL doesn't work.

> **How much do you need?** About 5 MON should be more than enough — deploying the contract costs ~0.01 MON, and you'll send ~0.1 MON to each of the 30 demo wallets (3 MON total).

The faucet may have a claim limit (e.g., once per 12–24 hours). If you need more, ask in Monad's Discord.

---

## 5. Configure Environment Variables

### contracts/.env
```
DEPLOYER_PRIVATE_KEY=0x...your_deployer_private_key...
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
```

### server/.env (create this file)
```bash
cd server
cp -n /dev/null .env   # Create empty file if it doesn't exist
```

Add:
```
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
PORT=3001
```

### frontend/.env (optional)
Only needed if your server isn't running on the default port 3001:
```
VITE_API_URL=http://localhost:3001
```

---

## 6. Deploy the Contract

**Deploying** means uploading the compiled smart contract code to the Monad testnet so it becomes a live program on the blockchain.

```bash
cd contracts
npx hardhat compile           # Compile the Solidity code
npx hardhat run scripts/deploy.js --network monadTestnet
```

**What success looks like:**
```
Deploying PredictionMarket with teams: [ 'Team Alpha', 'Team Beta', 'Team Gamma', 'Team Delta', 'Team Epsilon' ]
Network: monadTestnet

✅ PredictionMarket deployed to: 0x1234...abcd
📄 Deployment info saved to: /path/to/contracts/deployment.json
```

The deployed contract address and ABI are saved to `contracts/deployment.json`. The server reads this file automatically.

### Want different team names?

Edit `contracts/scripts/deploy.js` — change the `teamNames` array — then redeploy.

---

## 7. Fund Demo Wallets with Gas

Each demo wallet needs a tiny amount of MON to pay **gas fees** (the cost of sending transactions to the blockchain). The signing server pays gas from each wallet when it signs transactions on that wallet's behalf.

```bash
cd contracts
npx hardhat run scripts/fund-wallets.js --network monadTestnet
```

This sends 0.1 MON from the deployer to each of the 30 wallets. The output shows each transfer:

```
Deployer: 0x...
Deployer balance: 4.9 MON
Funding 30 wallets with 0.1 MON each
Total needed: 3.0 MON

Sending...
  ✅ #0 0x... — tx: 0x...
  ✅ #1 0x... — tx: 0x...
  ...
```

---

## 8. Credit Play-Money Balances

Now give each demo wallet 1000 play-money tokens to bet with:

```bash
cd contracts
npx hardhat run scripts/credit-balances.js --network monadTestnet
```

```
Contract: 0x...
Crediting 1000 tokens to 30 wallets...
  ✅ #0 0x... — credited 1000 tokens
  ...
```

---

## 9. Start the Server

```bash
cd server
npm install          # First time only
npm start
```

**What success looks like:**
```
🎲 Prediction Market Server running on http://localhost:3001
   Contract: 0x1234...abcd
   RPC:      https://testnet-rpc.monad.xyz
   Wallets:  30 loaded, 0 claimed
```

If you see an error about missing `deployment.json` or `demo-wallets.json`, make sure you completed steps 3, 6 above.

Leave this terminal running.

---

## 10. Start the Frontend

Open a **new terminal** tab/window:

```bash
cd frontend
npm install          # First time only
npm run dev
```

**What success looks like:**
```
  VITE v6.x.x  ready in X ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
```

Open `http://localhost:5173/` in your browser. You should see the "Get My Wallet" screen.

### Verify it's working:
1. Click "Get My Wallet" — you should be assigned a wallet and see your 1000 token balance.
2. Tap a team → enter an amount → confirm → the bet should go through (you'll see a green success toast).
3. The team pools should update within a few seconds.

---

## 11. Make It Reachable on Attendees' Phones

`localhost` only works on your own computer. For other people's phones to access it, you need to expose it over the network.

### Option A: ngrok (recommended — works on any network)

[ngrok](https://ngrok.com/) creates a public URL that tunnels to your local server.

```bash
# Install ngrok (one-time)
brew install ngrok    # or download from ngrok.com

# You need to tunnel BOTH the server and the frontend.
# Terminal 1: Tunnel the API server
ngrok http 3001

# Note the HTTPS URL it gives you, e.g. https://abc123.ngrok.io
```

Then update the frontend to point to the ngrok URL:

```bash
# In frontend/.env, set:
VITE_API_URL=https://abc123.ngrok.io
```

Restart the frontend dev server. Then tunnel the frontend too:

```bash
# Terminal 2: Tunnel the frontend
ngrok http 5173
```

Share the frontend's ngrok URL with attendees (e.g., show a QR code on the projection screen).

### Option B: Same Wi-Fi network (simpler, less reliable)

If everyone is on the same Wi-Fi network, you can use your local IP:

1. Find your local IP: `ipconfig getifaddr en0` (Mac)
2. Update `frontend/.env`: `VITE_API_URL=http://YOUR_IP:3001`
3. Start the frontend with `--host`: `npx vite --host`
4. Share `http://YOUR_IP:5173` with attendees

> ⚠️ This only works if the venue Wi-Fi allows device-to-device connections. Many event/corporate networks block this.

---

## 12. Open the Live Dashboard

The dashboard is the big-screen view, designed to be projected:

```
http://localhost:5173/#/dashboard
```

(Or the ngrok URL with `#/dashboard` appended.)

- Open this URL in a browser on the projector computer
- Make it full-screen (F11 or Cmd+Ctrl+F on Mac)
- It auto-refreshes every 3 seconds — no manual interaction needed

---

## 13. Resolve the Market (After the Audience Vote)

Once the audience vote is done and you know which team won:

1. Find the winning team's **ID** (0-based index):
   - Team Alpha = 0, Team Beta = 1, Team Gamma = 2, Team Delta = 3, Team Epsilon = 4

2. Run the resolve command:

```bash
cd contracts
npx hardhat console --network monadTestnet
```

Then in the console:
```javascript
const deployment = require("./deployment.json");
const market = await ethers.getContractAt("PredictionMarket", deployment.address);
await market.resolve(WINNING_TEAM_ID);  // Replace with 0, 1, 2, 3, or 4
```

**Verify:** The dashboard should immediately show the winner. Attendees' phones should show their win/loss status and a "Claim Payout" button for winners.

### Alternative (faster):

Create a one-line script:
```bash
cd contracts
WINNING_TEAM=2 npx hardhat run --network monadTestnet -e "
  const d = require('./deployment.json');
  const m = await ethers.getContractAt('PredictionMarket', d.address);
  await m.resolve(process.env.WINNING_TEAM);
  console.log('✅ Resolved!');
"
```

---

## 14. Verify Payouts

Before the live demo, verify that claiming payouts works:

1. After resolving (step 13), go to the bettor view on a phone/browser that bet on the winning team.
2. You should see a "You won!" banner with the expected payout amount.
3. Tap "Claim Payout" — it should succeed and your balance should increase.

You can also verify via the API:
```bash
# Check a wallet's balance (replace 0 with the wallet ID)
curl http://localhost:3001/api/balance/0
```

---

## Pre-Demo Dry-Run Checklist

Run through this **once** before the live event to catch bugs:

- [ ] Deploy contract (step 6)
- [ ] Fund wallets (step 7)
- [ ] Credit balances (step 8)
- [ ] Start server (step 9) — verify it shows "30 loaded"
- [ ] Start frontend (step 10)
- [ ] Open bettor view, claim a wallet, verify 1000 balance
- [ ] Place a bet on Team Alpha from wallet #1
- [ ] Place a bet on Team Beta from wallet #2 (open in incognito for a second wallet)
- [ ] Open dashboard (`#/dashboard`), verify bars update
- [ ] Resolve the market with Team Alpha as winner (step 13)
- [ ] Verify wallet #1 sees "You won!" and can claim payout
- [ ] Verify wallet #2 sees "Better luck next time!"
- [ ] Verify wallet #1's balance increased after claiming
- [ ] **If anything fails:** check the Troubleshooting section below

---

## Troubleshooting

### "Transaction reverts with no clear reason"
- **Check the wallet has gas:** `curl http://localhost:3001/api/balance/WALLET_ID` — if the wallet can't pay gas fees, the transaction fails silently. Re-run `fund-wallets.js`.
- **Check the wallet has play-money balance:** The balance shown in the API response. If 0, re-run `credit-balances.js`.
- **Market already resolved:** Bets can't be placed after resolution.

### "Frontend can't connect to server"
- Is the server running? Check the terminal where you ran `npm start`.
- Is it on the right port? Default is 3001. Check `VITE_API_URL` in `frontend/.env`.
- CORS issues? The server uses the `cors` middleware which allows all origins by default.

### "Server can't find deployment.json or demo-wallets.json"
- Run steps 3 and 6 first — the server needs both files to exist in the `contracts/` directory.

### "Wallet has no gas to pay for a transaction"
- Re-run `npx hardhat run scripts/fund-wallets.js --network monadTestnet` from the `contracts/` directory.
- Make sure the deployer wallet has enough MON (check on the block explorer).

### "Frontend shows 'Connecting to prediction market...' forever"
- Is the server running and reachable? Try `curl http://localhost:3001/api/market` — you should get JSON back.
- If using ngrok, make sure `VITE_API_URL` in `frontend/.env` points to the ngrok HTTPS URL, and restart the frontend.

### "claimPayout reverts"
- Did you bet on the winning team? Only wallets that bet on the winning team can claim.
- Already claimed? Each wallet can only claim once.
- Is the market resolved? `claimPayout` only works after `resolve` is called.

### "RPC connection errors"
- The public Monad RPC (`https://testnet-rpc.monad.xyz`) may have rate limits. If you hit them, consider using a dedicated RPC provider like QuickNode or Ankr.
- Check your internet connection.
