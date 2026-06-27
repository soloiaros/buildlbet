import { LayoutList, Users, TrendingUp } from "lucide-react";
import "./BottomNav.css";

export default function BottomNav({ currentTab, onChange }) {
  return (
    <div className="bottom-nav">
      <button 
        className={`nav-btn ${currentTab === "bet" ? "active" : ""}`}
        onClick={() => onChange("bet")}
      >
        <LayoutList size={24} strokeWidth={currentTab === "bet" ? 3 : 2} />
        <span>BET</span>
      </button>
      <div className="nav-divider" />
      <button 
        className={`nav-btn ${currentTab === "dashboard" ? "active" : ""}`}
        onClick={() => onChange("dashboard")}
      >
        <TrendingUp size={24} strokeWidth={currentTab === "dashboard" ? 3 : 2} />
        <span>LIVE</span>
      </button>
      <div className="nav-divider" />
      <button 
        className={`nav-btn ${currentTab === "team" ? "active" : ""}`}
        onClick={() => onChange("team")}
      >
        <Users size={24} strokeWidth={currentTab === "team" ? 3 : 2} />
        <span>TEAM</span>
      </button>
    </div>
  );
}
