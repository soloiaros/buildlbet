# Prediction Market — Agent Context

> This document describes the codebase for AI coding agents. It covers architecture, key files, and how to modify/extend the project.

## Project Overview

A hackathon prediction market on Monad testnet. Attendees bet play-money tokens on teams via phones; a live dashboard shows odds for projection; the organizer resolves the market after an audience vote.

**Stack:** Solidity + Hardhat (contract) → Express signing backend (keys server-side) → React/Vite frontend (no ethers in browser).

**Key constraint:** Built for a 7-hour hackathon by someone with zero web3 experience. Every decision optimizes for "actually finishes and works."

---

## Architecture

```
┌─────────────┐     HTTP/JSON      ┌─────────────────┐     JSON-RPC      ┌──────────────┐
│   Frontend   │ ◄──────────────► │  Signing Server   │ ◄──────────────► │ Monad Testnet│
│  (React/Vite)│                   │    (Express)      │                   │  (EVM Chain) │
│  Port 5173   │                   │    Port 3001      │                   │  Chain 10143 │
└─────────────┘                   └─────────────────┘                   └──────────────┘
                                         │
                                         │ reads
                                    ┌────┴──────────────────────┐
                                    │ contracts/deployment.json  │
                                    │ contracts/demo-wallets.json│
                                    └───────────────────────────┘
```

**Data flow:**
1. Frontend sends API requests to the signing server (e.g. "wallet 3 wants to bet 100 on team 2")
2. Server looks up wallet 3's private key, signs a `placeBet` transaction, submits it to Monad
3. Server returns the result (tx hash / error) to the frontend
4. Frontend polls `GET /api/market` every 3-5 seconds for updated state

**Why a signing server?** Private keys stay server-side. The frontend never holds or sees any private key — attendees can't snoop each other's keys via browser devtools.

---

## Directory Structure

```
├── contracts/              # Hardhat project (Solidity contract + scripts)
│   ├── contracts/
│   │   └── PredictionMarket.sol    # The smart contract
│   ├── scripts/
│   │   ├── deploy.js               # Deploy to Monad testnet
│   │   ├── generate-wallets.js     # Generate N demo wallets
│   │   ├── fund-wallets.js         # Send gas MON to all wallets
│   │   └── credit-balances.js      # Credit play-money to all wallets
│   ├── test/
│   │   └── PredictionMarket.test.js # 27 tests covering all flows
│   ├── hardhat.config.js
│   ├── deployment.json             # Created by deploy.js (gitignored)
│   └── demo-wallets.json           # Created by generate-wallets.js (gitignored)
│
├── server/                 # Express signing backend
│   └── index.js            # ~180 lines, 5 API endpoints
│
├── frontend/               # Vite + React app
│   ├── src/
│   │   ├── App.jsx         # Root: hash routing, polling, wallet claim
│   │   ├── api.js          # Fetch wrappers for server endpoints
│   │   ├── config.js       # API_BASE_URL
│   │   ├── walletStore.js  # localStorage for wallet ID (no keys)
│   │   ├── components/
│   │   │   ├── BettorView.jsx/css  # Attendee betting interface
│   │   │   ├── DashboardView.jsx/css # Projection dashboard
│   │   │   ├── TeamCard.jsx/css    # Reusable team display card
│   │   │   └── BetModal.jsx/css    # Bet amount input modal
│   │   └── index.css       # Global design system
│   └── index.html
│
├── SETUP_GUIDE.md          # 14-step manual setup for first-time users
└── AGENT_CONTEXT.md        # This file
```

---

## Smart Contract: PredictionMarket.sol

**Solidity ^0.8.24**, deployed on Monad testnet (chain ID 10143).

### Key State
- `organizer` — deployer's address, the only one who can `creditBalance` and `resolve`
- `teamCount` / `teamNames` — dynamic team list, grows as attendees create teams
- `memberOfTeam[address]` — which team a wallet belongs to
- `balances[address]` — play-money balance (not a real token)
- `teamPools[teamId]` — total staked on each team
- `userBets[address][teamId]` — how much each address bet on each team
- `resolved` / `winningTeamId` — set once by `resolve()`
- `hasClaimed[address]` — prevents double-claiming

### Functions
| Function | Access | Purpose |
|---|---|---|
| `createTeam(name)` | Anyone w/o team | Creates a team, makes caller first member |
| `joinTeam(teamId)` | Anyone w/o team | Joins an existing team |
| `creditBalance(address, amount)` | Organizer only | Add play-money to a wallet |
| `placeBet(teamId, amount)` | Anyone (before resolve) | Deduct balance, add to team pool (cannot bet on own team) |
| `resolve(winningTeamId)` | Organizer only, once | Lock betting, declare winner |
| `claimPayout()` | Anyone (after resolve) | Credit proportional winnings |
| `getMarketState()` | View | Returns (resolved, winningTeamId, teamCount, totalPool) |
| `getAllTeams()` | View | Returns all pool sizes and names in one call |
| `getBalance(address)` | View | Free balance |
| `getUserBet(address, teamId)` | View | Amount bet on a team |

### Payout formula
```
payout = (userContribution to winning team) * totalPool / winningTeamPool
```

---

## Server API Endpoints

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/claim-wallet` | — | `{ walletId, address }` |
| POST | `/api/reclaim-wallet` | `{ walletId }` | `{ walletId, address }` |
| POST | `/api/create-team` | `{ walletId, name }` | `{ success, txHash }` |
| POST | `/api/join-team` | `{ walletId, teamId }` | `{ success, txHash }` |
| POST | `/api/bet` | `{ walletId, teamId, amount }` | `{ success, txHash }` |
| POST | `/api/claim-payout` | `{ walletId }` | `{ success, txHash }` |
| GET | `/api/market` | — | `{ resolved, winningTeamId, totalPool, teams[] }` |
| GET | `/api/balance/:walletId` | — | `{ address, balance, bets[], hasClaimed, hasTeam, teamId }` |

---

## Frontend Routing

Hash-based routing (no react-router dependency):
- `#/` or `/` → BettorView (default, for phones)
- `#/dashboard` → DashboardView (for projection)

---

## How to Modify

### Change team names/count
Edit `contracts/scripts/deploy.js` → `teamNames` array → redeploy.

### Change starting balance
Edit `contracts/scripts/credit-balances.js` → `balancePerWallet` → re-run.

### Change number of demo wallets
Run `node scripts/generate-wallets.js 50` (or any number) → re-run fund + credit scripts.

### Change polling interval
- BettorView: `App.jsx` → `setInterval(poll, 5000)`
- DashboardView: `App.jsx` → `setInterval(poll, 3000)`

### Add a new team color
Edit `TeamCard.jsx` → `TEAM_COLORS` array and `DashboardView.jsx` → `BAR_COLORS` array.

---

## Testing

```bash
cd contracts && npx hardhat test    # 27 tests, all passing
```

---

## Dependencies

| Package | Where | Why |
|---|---|---|
| hardhat + toolbox | contracts | Compile + deploy Solidity |
| ethers.js v6 | contracts, server | Wallet/contract interaction |
| express | server | HTTP API |
| cors | server | Allow cross-origin requests from frontend |
| react | frontend | UI |
| vite | frontend | Dev server + build |
