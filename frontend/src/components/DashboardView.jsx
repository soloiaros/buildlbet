import { Zap, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";
import "./DashboardView.css";

const BAR_COLORS = [
  "var(--accent-pink)",
  "var(--accent-cyan)",
  "var(--accent-amber)",
  "var(--accent-green)",
  "var(--accent-red)",
  "var(--accent-purple)",
];

const BrutalTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="brutal-tooltip">
        <div className="brutal-tooltip-name">{data.name}</div>
        <div className="brutal-tooltip-stat">Pool: <span>{data.pool}</span></div>
        <div className="brutal-tooltip-stat">Odds: <span>{data.odds > 0 ? `${data.odds}x` : "—"}</span></div>
      </div>
    );
  }
  return null;
};

export default function DashboardView({ market }) {
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

      {/* Actual Graph */}
      <div className="brutal-card dashboard-content">
        <ResponsiveContainer width="100%" height="100%" minHeight={400}>
          <BarChart
            data={market.teams}
            margin={{ top: 40, right: 20, left: 20, bottom: 40 }}
          >
            <XAxis
              dataKey="name"
              axisLine={{ stroke: "black", strokeWidth: 4 }}
              tickLine={{ stroke: "black", strokeWidth: 4 }}
              tick={{ fill: "black", fontSize: 16, fontWeight: 900, fontFamily: "Space Grotesk" }}
              dy={16}
            />
            <YAxis
              hide
              domain={[0, 'dataMax']}
            />
            <Tooltip
              content={<BrutalTooltip />}
              cursor={{ fill: "rgba(0,0,0,0.05)" }}
            />
            <Bar
              dataKey="pool"
              isAnimationActive={true}
              animationDuration={1500}
              animationEasing="ease-out"
              stroke="black"
              strokeWidth={4}
            >
              {market.teams.map((entry, index) => {
                const isWinner = market.resolved && entry.id === market.winningTeamId;
                const isLoser = market.resolved && !isWinner;
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={BAR_COLORS[index % BAR_COLORS.length]}
                    opacity={isLoser ? 0.4 : 1}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
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
