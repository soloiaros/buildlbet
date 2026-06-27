import { useRef, useEffect } from "react";
import "./DashboardView.css";

const BAR_COLORS = [
  { gradient: "linear-gradient(180deg, #a855f7, #7c3aed)", glow: "rgba(168, 85, 247, 0.3)" },
  { gradient: "linear-gradient(180deg, #22d3ee, #0891b2)", glow: "rgba(34, 211, 238, 0.3)" },
  { gradient: "linear-gradient(180deg, #fbbf24, #d97706)", glow: "rgba(251, 191, 36, 0.3)" },
  { gradient: "linear-gradient(180deg, #34d399, #059669)", glow: "rgba(52, 211, 153, 0.3)" },
  { gradient: "linear-gradient(180deg, #f87171, #dc2626)", glow: "rgba(248, 113, 113, 0.3)" },
  { gradient: "linear-gradient(180deg, #818cf8, #6366f1)", glow: "rgba(129, 140, 248, 0.3)" },
];

export default function DashboardView({ market }) {
  const maxPool = market?.teams
    ? Math.max(...market.teams.map((t) => t.pool), 1)
    : 1;

  if (!market) {
    return (
      <div className="dashboard">
        <div className="dashboard-loading animate-pulse">
          Connecting to prediction market...
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <h1 className="dashboard-title">
          <span className="gradient-text">Prediction Market</span>
        </h1>
        <div className="dashboard-total">
          <span className="dashboard-total-label">Total Pool</span>
          <span className="dashboard-total-value">{market.totalPool.toLocaleString()}</span>
        </div>
      </header>

      {/* Resolution Banner */}
      {market.resolved && (
        <div className="dashboard-resolved animate-fade-in">
          <span className="dashboard-resolved-icon">🏆</span>
          <span className="dashboard-resolved-text">
            Winner: <strong>{market.teams[market.winningTeamId]?.name}</strong>
          </span>
        </div>
      )}

      {/* Bars */}
      <div className="dashboard-bars">
        {market.teams.map((team, i) => {
          const color = BAR_COLORS[i % BAR_COLORS.length];
          const heightPercent = maxPool > 0 ? (team.pool / maxPool) * 100 : 0;
          const isWinner = market.resolved && team.id === market.winningTeamId;

          return (
            <div
              key={team.id}
              className={`dashboard-bar-col ${isWinner ? "dashboard-bar-winner" : ""} ${market.resolved && !isWinner ? "dashboard-bar-dimmed" : ""}`}
            >
              {/* Odds */}
              <div className="dashboard-bar-odds">
                {team.odds > 0 ? `${team.odds}x` : "—"}
              </div>

              {/* Pool Amount */}
              <div className="dashboard-bar-amount">
                {team.pool.toLocaleString()}
              </div>

              {/* Bar */}
              <div className="dashboard-bar-track">
                <div
                  className="dashboard-bar-fill"
                  style={{
                    height: `${Math.max(heightPercent, 2)}%`,
                    background: color.gradient,
                    boxShadow: `0 0 20px ${color.glow}`,
                  }}
                />
              </div>

              {/* Team Name */}
              <div className="dashboard-bar-name">
                {isWinner && <span className="dashboard-bar-trophy">🏆</span>}
                {team.name}
              </div>
            </div>
          );
        })}
      </div>

      {/* Live indicator */}
      {!market.resolved && (
        <div className="dashboard-live">
          <span className="dashboard-live-dot" />
          LIVE
        </div>
      )}
    </div>
  );
}
