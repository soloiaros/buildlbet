import { useState, useRef, useEffect } from "react";
import TeamSetup from "./TeamSetup";
import { fetchTeamPost, publishTeamPost } from "../api";
import { ImagePlus, Send, RefreshCcw } from "lucide-react";
import CollectibleCard from "./CollectibleCard";
import "./TeamTabView.css";

export default function TeamTabView({ wallet, market, userBalance, onRefresh }) {
  const [posts, setPosts] = useState([]);
  const [publishing, setPublishing] = useState(false);
  const [text, setText] = useState("");
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [cardToReveal, setCardToReveal] = useState(null);
  const fileInputRef = useRef(null);

  // Load the current post for this team
  useEffect(() => {
    if (userBalance?.hasTeam && userBalance.teamId != null) {
      fetchTeamPost(userBalance.teamId)
        .then((res) => {
          if (res.hasPost) setPosts(res.posts);
        })
        .catch((err) => console.error("Error fetching team post", err));
    }
  }, [userBalance?.hasTeam, userBalance?.teamId]);

  if (!userBalance?.hasTeam) {
    return <TeamSetup wallet={wallet} market={market} onRefresh={onRefresh} />;
  }

  const team = market?.teams?.find((t) => t.id === userBalance.teamId);

  // Compress image using Canvas
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 600;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        setPreview(dataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!text.trim() && !preview) return;
    setPublishing(true);
    setError(null);
    try {
      const res = await publishTeamPost(wallet.walletId, preview || "", text);
      if (res.success) {
        setPosts(prev => [...prev, res.post]);
        setPreview(null);
        setText("");
        if (fileInputRef.current) fileInputRef.current.value = "";
        
        if (res.awardedNewCard) {
          setCardToReveal(1); // THREE_POSTS_CARD
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="team-tab-container">
      <header className="brutal-card team-tab-header">
        <h1 className="team-tab-title">{team?.name || "YOUR TEAM"}</h1>
      </header>

      <div className="brutal-card team-stats-card">
        <div className="team-stat">
          <span className="stat-label">POOL SIZE</span>
          <span className="stat-value">{team?.pool || 0}</span>
        </div>
        <div className="stat-divider" />
        <div className="team-stat">
          <span className="stat-label">ODDS</span>
          <span className="stat-value">{team?.odds > 0 ? `${team?.odds}x` : "—"}</span>
        </div>
        <div className="stat-divider" />
        <div className="team-stat">
          <span className="stat-label">BETTORS</span>
          <span className="stat-value">{team?.bettorCount || 0}</span>
        </div>
      </div>

      <div className="brutal-card publish-card">
        <h2 className="publish-title">PROJECT POST</h2>
        <p className="publish-subtitle">Share what you're building! Bettors will see this.</p>

        <form onSubmit={handlePublish} className="publish-form">
          <textarea
            className="brutal-input publish-textarea"
            placeholder="Describe your project..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={publishing}
          />
          
          <div className="publish-image-row">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: "none" }}
              id="file-upload"
              disabled={publishing}
            />
            <label htmlFor="file-upload" className="btn btn-secondary upload-btn">
              <ImagePlus size={20} />
              {preview ? "REPLACE PHOTO" : "TAKE PHOTO"}
            </label>
            {preview && (
              <button 
                type="button" 
                className="btn btn-secondary clear-btn"
                onClick={() => { setPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
              >
                X
              </button>
            )}
          </div>

          {preview && (
            <div className="publish-preview">
              <img src={preview} alt="Preview" />
            </div>
          )}

          {error && <div className="publish-error">{error}</div>}

          <button
            type="submit"
            className="btn btn-primary publish-submit"
            disabled={publishing || (!text.trim() && !preview)}
          >
            {publishing ? <RefreshCcw className="animate-spin" /> : <Send />}
            PUBLISH POST
          </button>
        </form>
      </div>

      {posts.length > 0 && (
        <div className="brutal-card team-posts-feed" style={{ padding: 0, overflow: 'hidden' }}>
          <h3 className="feed-title" style={{ fontFamily: "var(--font-family)", fontWeight: 900, padding: "24px", margin: 0, borderBottom: "4px solid black", background: "var(--accent-purple)", color: "white" }}>
            PROJECT FEED
          </h3>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {[...posts].sort((a, b) => b.updatedAt - a.updatedAt).map((p, idx) => (
              <div key={idx} className="current-post-card" style={{ padding: "24px", borderBottom: idx === posts.length - 1 ? "none" : "2px solid black" }}>
                {p.imageBase64 && (
                  <img src={p.imageBase64} alt="Team project" className="current-post-image" style={{ width: '100%', border: '2px solid black', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }} />
                )}
                {p.text && <p className="current-post-text" style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{p.text}</p>}
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "12px", fontWeight: 700 }}>
                  {new Date(p.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {cardToReveal !== null && (
        <CollectibleCard 
          cardId={cardToReveal} 
          onClaim={() => setCardToReveal(null)} 
        />
      )}
    </div>
  );
}
