import { useState } from "react";
import TeamCard from "./TeamCard";
import BetModal from "./BetModal";
import { placeBet, claimPayout } from "../api";
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
      <div className="bettor-container">
        <div className="claim-screen animate-fade-in">
          <div className="claim-icon">🎲</div>
          <h1 className="claim-title">
            <span className="gradient-text">Prediction Market</span>
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
                Getting your wallet...
              </>
            ) : (
              "Get My Wallet"
            )}
          </button>
          {claimError && <p className="claim-error">{claimError}</p>}
          <p className="claim-note">
            You'll receive a demo wallet with play-money tokens to bet with.
            No real money involved!
          </p>
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
        <h1 className="bettor-title">
          <span className="gradient-text">Prediction Market</span>
        </h1>
        <div className="wallet-info glass">
          <div className="wallet-address" title={wallet.address}>
            {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
          </div>
        </div>
      </header>

      {/* Balance Card */}
      <div className="balance-card glass animate-slide-up">
        <div className="balance-row">
          <div className="balance-item">
            <span className="balance-label">Available</span>
            <span className="balance-value">{userBalance?.balance ?? "..."}</span>
          </div>
          <div className="balance-divider" />
          <div className="balance-item">
            <span className="balance-label">Total Staked</span>
            <span className="balance-value balance-staked">{totalBet}</span>
          </div>
        </div>
      </div>

      {/* Resolution Banner */}
      {isResolved && (
        <div className={`resolution-banner animate-slide-up ${userWinningBet ? "resolution-win" : "resolution-lose"}`}>
          {userWinningBet && !hasClaimed ? (
            <>
              <div className="resolution-emoji">🎉</div>
              <h2>You won!</h2>
              <p className="resolution-detail">
                Your payout: <strong>{expectedPayout}</strong> tokens
              </p>
              <button
                className="btn btn-success claim-payout-btn"
                onClick={handleClaimPayout}
                disabled={claimPending}
              >
                {claimPending ? (
                  <>
                    <span className="spinner" />
                    Claiming...
                  </>
                ) : (
                  "Claim Payout"
                )}
              </button>
              {claimResult?.success === false && (
                <p className="bet-error">{claimResult.error}</p>
              )}
            </>
          ) : hasClaimed ? (
            <>
              <div className="resolution-emoji">✅</div>
              <h2>Payout Claimed!</h2>
              <p className="resolution-detail">
                {expectedPayout} tokens added to your balance.
              </p>
            </>
          ) : (
            <>
              <div className="resolution-emoji">😔</div>
              <h2>Better luck next time!</h2>
              <p className="resolution-detail">
                {market.teams[winningTeamId]?.name} won the vote.
              </p>
            </>
          )}
        </div>
      )}

      {/* Success Toast */}
      {betResult?.success && (
        <div className="bet-toast animate-slide-up">
          ✅ Bet placed successfully!
        </div>
      )}

      {/* Teams List */}
      <div className="teams-section">
        <h2 className="section-title">
          {isResolved ? "Final Results" : "Place Your Bets"}
        </h2>
        <div className="teams-list">
          {market?.teams?.map((team, i) => (
            <TeamCard
              key={team.id}
              team={team}
              totalPool={market.totalPool}
              userBet={userBalance?.bets?.find((b) => b.teamId === team.id)?.amount || 0}
              isWinner={isResolved && team.id === winningTeamId}
              isResolved={isResolved}
              onClick={() => !isResolved && setSelectedTeam(team)}
              animDelay={i * 0.08}
            />
          ))}
        </div>
        {!market && (
          <div className="loading-state animate-pulse">
            Loading market data...
          </div>
        )}
      </div>

      {/* Bet Modal */}
      {selectedTeam && (
        <BetModal
          team={selectedTeam}
          maxAmount={userBalance?.balance || 0}
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
