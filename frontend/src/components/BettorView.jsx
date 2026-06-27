import { useState } from "react";
import TeamCard from "./TeamCard";
import BetModal from "./BetModal";
import { placeBet, claimPayout } from "../api";
import { Sparkles, Dice5, Wallet, Coins, ArrowRight, CheckCircle2, Frown, Trophy } from "lucide-react";
import "./BettorView.css";

export default function BettorView({
  wallet,
  market,
  userBalance,
  onClaimWallet,
  claimingWallet,
  claimError,
  onRefresh,
}) {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [betPending, setBetPending] = useState(false);
  const [betResult, setBetResult] = useState(null);
  const [claimPending, setClaimPending] = useState(false);
  const [claimResult, setClaimResult] = useState(null);

  // ── Wallet Claim Screen ────────────────────────────────────────
  if (!wallet) {
    return (
      <div className="bettor-container claim-layout">
        <div className="brutal-card claim-screen animate-fade-in">
          <div className="claim-icon animate-float">
            <Dice5 size={64} strokeWidth={1.5} color="var(--accent-purple)" />
          </div>
          <h1 className="claim-title">
            HACKATHON<br/>
            <span style={{ color: "var(--accent-red)" }}>PREDICTION</span>
          </h1>
          <p className="claim-subtitle">
            Bet on which team will win the audience vote!
          </p>
          <button
            className="btn btn-primary claim-btn"
            onClick={onClaimWallet}
            disabled={claimingWallet}
          >
            {claimingWallet ? (
              <>
                <span className="spinner" />
                GETTING WALLET...
              </>
            ) : (
              <>
                <Wallet size={20} /> GET MY WALLET <ArrowRight size={20} />
              </>
            )}
          </button>
          {claimError && <div className="bet-error">{claimError}</div>}
          <div className="claim-note">
            <Sparkles size={16} /> 
            You'll receive a demo wallet with play-money tokens. No real money involved!
          </div>
        </div>
      </div>
    );
  }

  // ── Bet handlers ───────────────────────────────────────────────
  const handlePlaceBet = async (teamId, amount) => {
    setBetPending(true);
    setBetResult(null);
    try {
      await placeBet(wallet.walletId, teamId, amount);
      setBetResult({ success: true });
      setSelectedTeam(null);
      onRefresh();
    } catch (err) {
      setBetResult({ success: false, error: err.message });
    } finally {
      setBetPending(false);
    }
  };

  const handleClaimPayout = async () => {
    setClaimPending(true);
    setClaimResult(null);
    try {
      await claimPayout(wallet.walletId);
      setClaimResult({ success: true });
      onRefresh();
    } catch (err) {
      setClaimResult({ success: false, error: err.message });
    } finally {
      setClaimPending(false);
    }
  };

  // ── Compute user's payout eligibility ─────────────────────────
  const isResolved = market?.resolved;
  const winningTeamId = market?.winningTeamId;
  const userWinningBet = userBalance?.bets?.find(
    (b) => b.teamId === winningTeamId && b.amount > 0
  );
  const hasClaimed = userBalance?.hasClaimed;

  // Compute expected payout
  let expectedPayout = 0;
  if (isResolved && userWinningBet && market) {
    const winningTeam = market.teams.find((t) => t.id === winningTeamId);
    if (winningTeam && winningTeam.pool > 0) {
      expectedPayout = Math.floor(
        (userWinningBet.amount * market.totalPool) / winningTeam.pool
      );
    }
  }

  const totalBet = userBalance?.bets?.reduce((sum, b) => sum + b.amount, 0) || 0;

  return (
    <div className="bettor-container">
      {/* Header */}
      <header className="bettor-header animate-fade-in">
        <h1 className="bettor-title">PREDICTION MARKET</h1>
        <div className="wallet-info brutal-card">
          <Wallet size={16} />
          <div className="wallet-address" title={wallet.address}>
            {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
          </div>
        </div>
      </header>

      {/* Balance Card */}
      <div className="brutal-card balance-card">
        <div className="balance-row">
          <div className="balance-item">
            <span className="balance-label">AVAILABLE</span>
            <span className="balance-value">
              <Coins size={24} color="var(--accent-amber)" />
              {userBalance?.balance ?? "..."}
            </span>
          </div>
          <div className="balance-divider" />
          <div className="balance-item">
            <span className="balance-label">TOTAL STAKED</span>
            <span className="balance-value balance-staked">{totalBet}</span>
          </div>
        </div>
      </div>

      {/* Resolution Banner */}
      {isResolved && (
        <div className={`brutal-card resolution-banner ${userWinningBet ? "resolution-win" : "resolution-lose"}`}>
          {userWinningBet && !hasClaimed ? (
            <>
              <div className="resolution-emoji"><Trophy size={48} /></div>
              <h2 className="resolution-title">YOU WON!</h2>
              <p className="resolution-detail">
                Your payout: <strong>{expectedPayout}</strong> tokens
              </p>
              <button
                className="btn btn-success claim-payout-btn"
                onClick={handleClaimPayout}
                disabled={claimPending}
              >
                {claimPending ? (
                  <><span className="spinner" /> CLAIMING...</>
                ) : (
                  "CLAIM PAYOUT"
                )}
              </button>
              {claimResult?.success === false && (
                <p className="bet-error">{claimResult.error}</p>
              )}
            </>
          ) : hasClaimed ? (
            <>
              <div className="resolution-emoji"><CheckCircle2 size={48} /></div>
              <h2 className="resolution-title">PAYOUT CLAIMED</h2>
              <p className="resolution-detail">
                {expectedPayout} tokens added to your balance.
              </p>
            </>
          ) : (
            <>
              <div className="resolution-emoji"><Frown size={48} /></div>
              <h2 className="resolution-title">BETTER LUCK NEXT TIME!</h2>
              <p className="resolution-detail">
                {market.teams[winningTeamId]?.name} won the vote.
              </p>
            </>
          )}
        </div>
      )}

      {/* Success Toast */}
      {betResult?.success && (
        <div className="brutal-card bet-toast">
          <CheckCircle2 size={20} /> BET PLACED SUCCESSFULLY!
        </div>
      )}

      {/* Teams List */}
      <div className="teams-section">
        <div className="section-header">
          <Sparkles size={24} color="var(--accent-pink)" className="animate-float" />
          <h2 className="section-title">
            {isResolved ? "FINAL RESULTS" : "PLACE YOUR BETS"}
          </h2>
          <Sparkles size={24} color="var(--accent-cyan)" className="animate-float" style={{ animationDelay: "1s" }} />
        </div>
        
        <div className="teams-list">
          {market?.teams?.map((team, i) => (
            <TeamCard
              key={team.id}
              team={team}
              totalPool={market.totalPool}
              userBet={userBalance?.bets?.find((b) => b.teamId === team.id)?.amount || 0}
              isWinner={isResolved && team.id === winningTeamId}
              isResolved={isResolved}
              isOwnTeam={userBalance?.hasTeam && userBalance?.teamId === team.id}
              onClick={() => !isResolved && setSelectedTeam(team)}
              animDelay={i * 0.08}
            />
          ))}
        </div>
        {!market && (
          <div className="loading-state">
            <span className="spinner" /> LOADING MARKET...
          </div>
        )}
      </div>

      {/* Bet Modal */}
      {selectedTeam && (
        <BetModal
          team={selectedTeam}
          maxAmount={userBalance?.balance || 0}
          hasTeam={userBalance?.hasTeam}
          pending={betPending}
          error={betResult?.success === false ? betResult.error : null}
          onConfirm={(amount) => handlePlaceBet(selectedTeam.id, amount)}
          onClose={() => {
            setSelectedTeam(null);
            setBetResult(null);
          }}
        />
      )}
    </div>
  );
}
