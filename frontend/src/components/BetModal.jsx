import { useState } from "react";
import "./BetModal.css";

export default function BetModal({ team, maxAmount, pending, error, onConfirm, onClose }) {
  const [amount, setAmount] = useState("");

  const numAmount = parseInt(amount) || 0;
  const isValid = numAmount > 0 && numAmount <= maxAmount;

  const presets = [
    Math.floor(maxAmount * 0.1),
    Math.floor(maxAmount * 0.25),
    Math.floor(maxAmount * 0.5),
    maxAmount,
  ].filter((v) => v > 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />

        <h2 className="modal-title">
          Bet on <span className="gradient-text">{team.name}</span>
        </h2>

        <div className="modal-odds">
          Current odds: <strong>{team.odds > 0 ? `${team.odds}x` : "—"}</strong>
        </div>

        <div className="modal-balance">
          Available: <strong>{maxAmount}</strong> tokens
        </div>

        <div className="modal-input-group">
          <input
            type="number"
            className="modal-input"
            placeholder="Enter amount..."
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={1}
            max={maxAmount}
            autoFocus
            inputMode="numeric"
          />
        </div>

        <div className="modal-presets">
          {presets.map((val) => (
            <button
              key={val}
              className="btn btn-secondary modal-preset-btn"
              onClick={() => setAmount(String(val))}
            >
              {val === maxAmount ? "MAX" : val}
            </button>
          ))}
        </div>

        {error && <p className="modal-error">{error}</p>}

        <div className="modal-actions">
          <button className="btn btn-secondary modal-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary modal-confirm"
            disabled={!isValid || pending}
            onClick={() => onConfirm(numAmount)}
          >
            {pending ? (
              <>
                <span className="spinner" />
                Confirming...
              </>
            ) : (
              `Bet ${numAmount || 0} tokens`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
