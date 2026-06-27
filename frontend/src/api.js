/**
 * API client — thin fetch wrappers for the signing backend.
 * No private keys or ethers.js in the browser.
 */
import { API_BASE_URL } from "./config";

async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data;
}

/** Claim the next available demo wallet */
export async function claimWallet() {
  return request("/api/claim-wallet", { method: "POST" });
}

/** Re-claim a specific wallet (after page refresh) */
export async function reclaimWallet(walletId) {
  return request("/api/reclaim-wallet", {
    method: "POST",
    body: JSON.stringify({ walletId }),
  });
}

/** Place a bet on a team */
export async function placeBet(walletId, teamId, amount) {
  return request("/api/bet", {
    method: "POST",
    body: JSON.stringify({ walletId, teamId, amount }),
  });
}

/** Claim payout after resolution */
export async function claimPayout(walletId) {
  return request("/api/claim-payout", {
    method: "POST",
    body: JSON.stringify({ walletId }),
  });
}

/** Get full market state (teams, pools, odds, resolution) */
export async function fetchMarket() {
  return request("/api/market");
}

/** Get balance and bets for a specific wallet */
export async function fetchBalance(walletId) {
  return request(`/api/balance/${walletId}`);
}
