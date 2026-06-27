/**
 * Wallet store — manages the current user's demo wallet assignment.
 * Stores walletId + address in localStorage. No private keys ever touch the browser.
 */

const STORAGE_KEY = "pm_wallet";

export function getSavedWallet() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // Corrupted data, ignore
  }
  return null;
}

export function saveWallet(walletId, address) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ walletId, address }));
}

export function clearWallet() {
  localStorage.removeItem(STORAGE_KEY);
}
