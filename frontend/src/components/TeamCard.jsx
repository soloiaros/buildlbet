import "./TeamCard.css";

const TEAM_COLORS = [
  { bg: "rgba(168, 85, 247, 0.12)", border: "rgba(168, 85, 247, 0.25)", accent: "#a855f7" },
  { bg: "rgba(34, 211, 238, 0.12)", border: "rgba(34, 211, 238, 0.25)", accent: "#22d3ee" },
  { bg: "rgba(251, 191, 36, 0.12)", border: "rgba(251, 191, 36, 0.25)", accent: "#fbbf24" },
  { bg: "rgba(52, 211, 153, 0.12)", border: "rgba(52, 211, 153, 0.25)", accent: "#34d399" },
  { bg: "rgba(248, 113, 113, 0.12)", border: "rgba(248, 113, 113, 0.25)", accent: "#f87171" },
  { bg: "rgba(129, 140, 248, 0.12)", border: "rgba(129, 140, 248, 0.25)", accent: "#818cf8" },
];

export default function TeamCard({
  team,
  totalPool,
  userBet,
  isWinner,
  isResolved,
  onClick,
  animDelay,
}) {
  const color = TEAM_COLORS[team.id % TEAM_COLORS.length];
  const poolPercent = totalPool > 0 ? (team.pool / totalPool) * 100 : 0;
  const oddsDisplay = team.odds > 0 ? `${team.odds}x` : "—";

  return (
    <div
      className={`team-card ${isResolved ? "team-card-resolved" : ""} ${isWinner ? "team-card-winner" : ""}`}
      style={{
        "--team-bg": color.bg,
        "--team-border": color.border,
        "--team-accent": color.accent,
        animationDelay: `${animDelay}s`,
      }}
      onClick={!isResolved ? onClick : undefined}
      role={!isResolved ? "button" : undefined}
      tabIndex={!isResolved ? 0 : undefined}
    >
      <div className="team-card-left">
        <div className="team-name">{team.name}</div>
        <div className="team-pool">
          <span className="team-pool-value">{team.pool}</span>
          <span className="team-pool-label"> staked</span>
        </div>
        {userBet > 0 && (
          <div className="team-user-bet">
            Your bet: {userBet}
          </div>
        )}
      </div>

      <div className="team-card-right">
        <div className="team-odds" style={{ color: color.accent }}>
          {oddsDisplay}
        </div>
        <div className="team-bar-container">
          <div
            className="team-bar"
            style={{
              width: `${Math.max(poolPercent, 2)}%`,
              background: color.accent,
            }}
          />
        </div>
        {isWinner && <div className="team-winner-badge">🏆 Winner</div>}
      </div>
    </div>
  );
}
