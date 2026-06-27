import { LayoutList, Users } from "lucide-react";
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
        className={`nav-btn ${currentTab === "team" ? "active" : ""}`}
        onClick={() => onChange("team")}
      >
        <Users size={24} strokeWidth={currentTab === "team" ? 3 : 2} />
        <span>TEAM</span>
      </button>
    </div>
  );
}
