import { useState, useEffect, useCallback } from "react";
import BettorView from "./components/BettorView";
import DashboardView from "./components/DashboardView";
import TeamTabView from "./components/TeamTabView";
import BottomNav from "./components/BottomNav";
import { getSavedWallet, saveWallet } from "./walletStore";
import { claimWallet, reclaimWallet, fetchMarket, fetchBalance } from "./api";
import "./App.css";

export default function App() {
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [wallet, setWallet] = useState(null);
  const [market, setMarket] = useState(null);
  const [userBalance, setUserBalance] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState(null);

  // On mount, restore wallet from localStorage
  useEffect(() => {
    const saved = getSavedWallet();
    if (saved) {
      reclaimWallet(saved.walletId)
        .then((w) => {
          setWallet(w);
          saveWallet(w.walletId, w.address);
        })
        .catch(() => {
          // Server might have restarted, wallet ID is still valid
          setWallet(saved);
        });
    }
  }, []);

  // Poll market data
  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const data = await fetchMarket();
        if (active) setMarket(data);
      } catch (err) {
        console.error("Market poll error:", err);
      }
    };
    poll();
    const interval = setInterval(poll, currentTab === "dashboard" ? 5000 : 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [currentTab]);

  // Poll user balance when wallet is set
  useEffect(() => {
    if (!wallet) return;
    let active = true;
    const poll = async () => {
      try {
        const data = await fetchBalance(wallet.walletId);
        if (active) setUserBalance(data);
      } catch (err) {
        console.error("Balance poll error:", err);
      }
    };
    poll();
    const interval = setInterval(poll, 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [wallet]);

  const handleClaimWallet = useCallback(async () => {
    setClaiming(true);
    setError(null);
    try {
      const w = await claimWallet();
      setWallet(w);
      saveWallet(w.walletId, w.address);
    } catch (err) {
      setError(err.message);
    } finally {
      setClaiming(false);
    }
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const [mkt, bal] = await Promise.all([
        fetchMarket(),
        wallet ? fetchBalance(wallet.walletId) : null,
      ]);
      setMarket(mkt);
      if (bal) setUserBalance(bal);
    } catch (err) {
      console.error("Refresh error:", err);
    }
  }, [wallet]);

  // If wallet is claimed but balance hasn't loaded yet
  if (wallet && !userBalance) {
    return (
      <div className="bettor-container">
        <div className="loading-state animate-pulse" style={{ marginTop: "20vh", textAlign: "center" }}>
          Loading your data...
        </div>
      </div>
    );
  }

  // If wallet is claimed but user hasn't joined/created a team, we don't hard-gate them anymore.
  // We let them browse the Bet tab or use the Team tab to join/create.

  return (
    <>
      {currentTab === "dashboard" && (
        <DashboardView market={market} wallet={wallet} />
      )}
      {currentTab === "bet" && (
        <BettorView
          wallet={wallet}
          market={market}
          userBalance={userBalance}
          onClaimWallet={handleClaimWallet}
          claimingWallet={claiming}
          claimError={error}
          onRefresh={refreshData}
        />
      )}
      {currentTab === "team" && (
        <TeamTabView
          wallet={wallet}
          market={market}
          userBalance={userBalance}
          onRefresh={refreshData}
        />
      )}
      <BottomNav currentTab={currentTab} onChange={setCurrentTab} />
    </>
  );
}
