import { motion } from "framer-motion";
import { Zap, Trophy, TrendingUp } from "lucide-react";
import "./DashboardView.css";

const BAR_COLORS = [
  { bg: "var(--accent-pink)" },
  { bg: "var(--accent-cyan)" },
  { bg: "var(--accent-amber)" },
  { bg: "var(--accent-green)" },
  { bg: "var(--accent-red)" },
  { bg: "var(--accent-purple)" },
];

export default function DashboardView({ market }) {
  const maxPool = market?.teams
    ? Math.max(...market.teams.map((t) => t.pool), 1)
    : 1;

  if (!market) {
    return (
      <div className="dashboard-container">
        <div className="brutal-card dashboard-loading">
          <span className="spinner" /> CONNECTING TO MARKET...
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="brutal-card dashboard-header">
        <h1 className="dashboard-title">
          <Zap size={40} className="animate-pulse" /> LIVE PREDICTION MARKET
        </h1>
        <div className="dashboard-total">
          <span className="dashboard-total-label">TOTAL POOL</span>
          <span className="dashboard-total-value">
            <TrendingUp size={24} /> {market.totalPool.toLocaleString()}
          </span>
        </div>
      </header>

      {/* Resolution Banner */}
      {market.resolved && (
        <div className="brutal-card dashboard-resolved">
          <span className="dashboard-resolved-icon">🏆</span>
          <span className="dashboard-resolved-text">
            WINNER: <strong>{market.teams[market.winningTeamId]?.name}</strong>
          </span>
        </div>
      )}

      {/* Bars */}
      <div className="brutal-card dashboard-content">
        <div className="dashboard-bars">
          {market.teams.map((team, i) => {
            const color = BAR_COLORS[i % BAR_COLORS.length];
            const heightPercent = maxPool > 0 ? (team.pool / maxPool) * 100 : 0;
            const isWinner = market.resolved && team.id === market.winningTeamId;

            return (
              <div
                key={team.id}
                className={`dashboard-bar-col ${isWinner ? "winner" : ""} ${market.resolved && !isWinner ? "dimmed" : ""}`}
              >
                {/* Odds */}
                <div className="dashboard-bar-odds brutal-card">
                  {team.odds > 0 ? `${team.odds}x` : "—"}
                </div>

                {/* Pool Amount */}
                <div className="dashboard-bar-amount">
                  {team.pool.toLocaleString()}
                </div>

                {/* Bar */}
                <div className="dashboard-bar-track brutal-card">
                  <motion.div
                    className="dashboard-bar-fill"
                    initial={{ height: "0%" }}
                    animate={{ height: `${Math.max(heightPercent, 2)}%` }}
                    transition={{ type: "spring", damping: 15, stiffness: 100 }}
                    style={{ background: color.bg }}
                  />
                </div>

                {/* Team Name */}
                <div className="dashboard-bar-name">
                  {isWinner && <Trophy size={16} fill="black" />}
                  {team.name}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live indicator */}
      {!market.resolved && (
        <div className="dashboard-live brutal-card">
          <span className="dashboard-live-dot animate-pulse" />
          LIVE EVENT
        </div>
      )}
    </div>
  );
}
