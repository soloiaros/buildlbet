import { useState } from "react";
import { createTeam, joinTeam } from "../api";
import { Users, PlusCircle, ArrowLeft, Gamepad2 } from "lucide-react";
import "./TeamSetup.css";

export default function TeamSetup({ wallet, market, onRefresh }) {
  const [mode, setMode] = useState(null); // 'create' | 'join' | null
  const [teamName, setTeamName] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  const hasTeams = market?.teams && market.teams.length > 0;

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    setPending(true);
    setError(null);
    try {
      await createTeam(wallet.walletId, teamName);
      await onRefresh();
    } catch (err) {
      setError(err.message);
      setPending(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (selectedTeamId === "") return;
    setPending(true);
    setError(null);
    try {
      await joinTeam(wallet.walletId, selectedTeamId);
      await onRefresh();
    } catch (err) {
      setError(err.message);
      setPending(false);
    }
  };

  if (mode === "create") {
    return (
      <div className="bettor-container setup-layout">
        <div className="brutal-card setup-screen animate-fade-in">
          <button className="btn-back" onClick={() => { setMode(null); setError(null); }} disabled={pending}>
            <ArrowLeft size={18} /> BACK
          </button>
          
          <div className="setup-icon animate-float" style={{ background: "var(--accent-pink)" }}>
            <PlusCircle size={48} />
          </div>
          
          <h2 className="setup-title">CREATE A TEAM</h2>
          <p className="setup-subtitle">You'll be the first member of this team.</p>
          
          <form className="setup-form" onSubmit={handleCreate}>
            <input
              type="text"
              className="brutal-input"
              placeholder="ENTER TEAM NAME"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              disabled={pending}
              autoFocus
              maxLength={30}
            />
            {error && <div className="setup-error">{error}</div>}
            <button
              type="submit"
              className="btn btn-primary setup-submit"
              disabled={pending || !teamName.trim()}
            >
              {pending ? <><span className="spinner"/> CREATING...</> : "CREATE TEAM"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (mode === "join") {
    return (
      <div className="bettor-container setup-layout">
        <div className="brutal-card setup-screen animate-fade-in">
          <button className="btn-back" onClick={() => { setMode(null); setError(null); }} disabled={pending}>
            <ArrowLeft size={18} /> BACK
          </button>
          
          <div className="setup-icon animate-float" style={{ background: "var(--accent-cyan)" }}>
            <Users size={48} />
          </div>
          
          <h2 className="setup-title">JOIN A TEAM</h2>
          <p className="setup-subtitle">Select an existing team to join.</p>
          
          <form className="setup-form" onSubmit={handleJoin}>
            <div className="setup-team-list">
              {market.teams.map((t) => (
                <label key={t.id} className={`setup-team-option ${selectedTeamId === t.id ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="team"
                    value={t.id}
                    checked={selectedTeamId === t.id}
                    onChange={() => setSelectedTeamId(t.id)}
                    disabled={pending}
                  />
                  <span className="setup-team-name">{t.name}</span>
                </label>
              ))}
            </div>
            {error && <div className="setup-error">{error}</div>}
            <button
              type="submit"
              className="btn btn-primary setup-submit"
              disabled={pending || selectedTeamId === ""}
            >
              {pending ? <><span className="spinner"/> JOINING...</> : "JOIN TEAM"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="bettor-container setup-layout">
      <div className="brutal-card setup-screen animate-fade-in">
        <div className="setup-icon animate-float" style={{ background: "var(--accent-amber)" }}>
          <Gamepad2 size={48} />
        </div>
        
        <h1 className="setup-title">JOIN THE GAME</h1>
        <p className="setup-subtitle">
          To start betting, you must belong to a team. You cannot bet on your own team.
        </p>

        <div className="setup-actions">
          <button className="btn btn-primary setup-action-btn" onClick={() => setMode("create")}>
            <PlusCircle size={20} /> CREATE A NEW TEAM
          </button>
          {hasTeams ? (
            <button className="btn btn-secondary setup-action-btn" onClick={() => setMode("join")}>
              <Users size={20} /> JOIN EXISTING TEAM
            </button>
          ) : (
            <div className="setup-note">
              No teams exist yet. Create one!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
