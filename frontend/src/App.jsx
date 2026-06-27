import { useState, useEffect, useCallback } from "react";
import BettorView from "./components/BettorView";
import DashboardView from "./components/DashboardView";
import TeamTabView from "./components/TeamTabView";
import BottomNav from "./components/BottomNav";
import { getSavedWallet, saveWallet } from "./walletStore";
import { claimWallet, reclaimWallet, fetchMarket, fetchBalance } from "./api";
import "./App.css";

function getRoute() {
  const hash = window.location.hash.replace("#", "") || "/";
  return hash;
}

export default function App() {
  const [route, setRoute] = useState(getRoute);
  const [currentTab, setCurrentTab] = useState("bet");
  const [wallet, setWallet] = useState(null);
  const [market, setMarket] = useState(null);
  const [userBalance, setUserBalance] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState(null);

  // Listen to hash changes
  useEffect(() => {
    const onHashChange = () => setRoute(getRoute());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

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
    const interval = setInterval(poll, route === "/dashboard" ? 3000 : 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [route]);

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
    const interval = setInterval(poll, 5000);
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

  // Dashboard route — no wallet needed
  if (route === "/dashboard") {
    return <DashboardView market={market} />;
  }

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
      {currentTab === "bet" ? (
        <BettorView
          wallet={wallet}
          market={market}
          userBalance={userBalance}
          onClaimWallet={handleClaimWallet}
          claimingWallet={claiming}
          claimError={error}
          onRefresh={refreshData}
        />
      ) : (
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
