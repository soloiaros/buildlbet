import "./TeamCard.css";
import { Star, AlertOctagon } from "lucide-react";

const TEAM_COLORS = [
  { bg: "var(--accent-pink)" },
  { bg: "var(--accent-cyan)" },
  { bg: "var(--accent-amber)" },
  { bg: "var(--accent-green)" },
  { bg: "var(--accent-red)" },
  { bg: "var(--accent-purple)" },
];

export default function TeamCard({
  team,
  totalPool,
  userBet,
  isWinner,
  isResolved,
  isOwnTeam,
  onClick,
  animDelay,
}) {
  const color = TEAM_COLORS[team.id % TEAM_COLORS.length];
  const poolPercent = totalPool > 0 ? (team.pool / totalPool) * 100 : 0;
  const oddsDisplay = team.odds > 0 ? `${team.odds}x` : "—";

  return (
    <div
      className={`brutal-team-card ${isResolved || isOwnTeam ? "resolved" : ""} ${isWinner ? "winner" : ""} ${isOwnTeam ? "own-team" : ""}`}
      style={{
        "--team-bg": color.bg,
        animationDelay: `${animDelay}s`,
      }}
      onClick={!isResolved && !isOwnTeam ? onClick : undefined}
      role={!isResolved && !isOwnTeam ? "button" : undefined}
      tabIndex={!isResolved && !isOwnTeam ? 0 : undefined}
    >
      <div className="team-card-left">
        <div className="team-name">{team.name}</div>
        <div className="team-pool-box">
          <span className="team-pool-value">{team.pool}</span>
          <span className="team-pool-label">STAKED</span>
        </div>
        {userBet > 0 && (
          <div className="team-user-bet">
            BET: <span>{userBet}</span>
          </div>
        )}
        {isOwnTeam && (
          <div className="team-own-label">
            <AlertOctagon size={14} /> YOUR TEAM (NO BETS)
          </div>
        )}
      </div>

      <div className="team-card-right">
        <div className="team-odds-box">
          {oddsDisplay}
        </div>
        <div className="team-bar-container">
          <div
            className="team-bar"
            style={{ width: `${Math.max(poolPercent, 2)}%` }}
          />
        </div>
        {isWinner && (
          <div className="team-winner-badge">
            <Star size={16} fill="black" /> WINNER
          </div>
        )}
      </div>
    </div>
  );
}
