import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Coins } from "lucide-react";
import { fetchTeamPost } from "../api";
import "./BetModal.css";

export default function BetModal({ team, maxAmount, hasTeam, pending, error, onConfirm, onClose }) {
  const [amount, setAmount] = useState("");
  const [post, setPost] = useState(null);
  const [loadingPost, setLoadingPost] = useState(true);

  const numAmount = parseInt(amount) || 0;
  const isValid = numAmount > 0 && numAmount <= maxAmount;

  const presets = [
    Math.floor(maxAmount * 0.1),
    Math.floor(maxAmount * 0.25),
    Math.floor(maxAmount * 0.5),
    maxAmount,
  ].filter((v) => v > 0);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // Fetch team post on open
  useEffect(() => {
    setLoadingPost(true);
    fetchTeamPost(team.id)
      .then((res) => {
        if (res.hasPost) setPost(res.post);
      })
      .catch(console.error)
      .finally(() => setLoadingPost(false));
  }, [team.id]);

  return (
    <AnimatePresence>
      <div className="modal-overlay" onClick={onClose}>
        <motion.div
          className="brutal-card modal-sheet"
          onClick={(e) => e.stopPropagation()}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
        >
          <button className="modal-close-btn" onClick={onClose} disabled={pending}>
            <X size={24} strokeWidth={3} />
          </button>

          <h2 className="modal-title">
            BET ON <br />
            <span style={{ color: "var(--accent-purple)", fontSize: "1.2em" }}>{team.name}</span>
          </h2>

          <div className="modal-stats">
            <div className="modal-stat-box">
              <span className="modal-stat-label">ODDS</span>
              <span className="modal-stat-value">{team.odds > 0 ? `${team.odds}x` : "—"}</span>
            </div>
            <div className="modal-stat-box">
              <span className="modal-stat-label">AVAILABLE</span>
              <span className="modal-stat-value">{maxAmount}</span>
            </div>
          </div>

          {!loadingPost && post && (
            <div className="modal-post-preview brutal-card">
              {post.imageBase64 && <img src={post.imageBase64} alt="Project" />}
              {post.text && <p>{post.text}</p>}
            </div>
          )}
          {loadingPost && (
            <div className="modal-post-loading">
              <span className="spinner" style={{width: 16, height: 16, borderWidth: 2}} /> Loading project info...
            </div>
          )}

          <div className="modal-input-group">
            <Coins size={24} className="modal-input-icon" />
            <input
              type="number"
              className="brutal-input modal-input"
              placeholder="ENTER AMOUNT..."
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={1}
              max={maxAmount}
              autoFocus
              inputMode="numeric"
              disabled={!hasTeam}
            />
          </div>

          <div className="modal-presets">
            {presets.map((val) => (
              <button
                key={val}
                className="btn btn-secondary modal-preset-btn"
                onClick={() => setAmount(String(val))}
                type="button"
                disabled={!hasTeam}
              >
                {val === maxAmount ? "MAX" : val}
              </button>
            ))}
          </div>

          {error && <div className="modal-error">{error}</div>}

          <div className="modal-actions">
            {!hasTeam ? (
              <button className="btn btn-primary modal-confirm" disabled>
                JOIN A TEAM TO BET
              </button>
            ) : (
              <button
                className="btn btn-primary modal-confirm"
                disabled={!isValid || pending}
                onClick={() => onConfirm(numAmount)}
              >
                {pending ? (
                  <><span className="spinner" /> CONFIRMING...</>
                ) : (
                  `BET ${numAmount || 0} TOKENS`
                )}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
