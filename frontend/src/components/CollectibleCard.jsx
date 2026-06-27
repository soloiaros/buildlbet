import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./CollectibleCard.css";

// 0 = JOIN_CARD, 1 = THREE_POSTS_CARD
const CARD_DATA = {
  0: {
    title: "EARLY ADOPTER",
    subtitle: "Venue Scan",
    color: "var(--accent-amber)",
    gradient: "linear-gradient(135deg, #ffd700 0%, #ff8c00 100%)",
    emoji: "🔥",
    stat: "1st",
    desc: "You proved you were here."
  },
  1: {
    title: "SERIAL SHIPPER",
    subtitle: "3 Posts Published",
    color: "var(--accent-cyan)",
    gradient: "linear-gradient(135deg, #00ffff 0%, #ff00ff 100%)",
    emoji: "🚀",
    stat: "3",
    desc: "Shipping at hackathon speeds."
  }
};

export default function CollectibleCard({ cardId, onClaim }) {
  const [interactive, setInteractive] = useState(false);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const data = CARD_DATA[cardId] || CARD_DATA[0];

  const handlePointerMove = (e) => {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left; // x position within the element.
    const y = e.clientY - rect.top;  // y position within the element.
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Calculate rotation (-20 to 20 degrees)
    const rotateXValue = ((y - centerY) / centerY) * -20;
    const rotateYValue = ((x - centerX) / centerX) * 20;

    setRotateX(rotateXValue);
    setRotateY(rotateYValue);
  };

  const handlePointerLeave = () => {
    if (!interactive) return;
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <AnimatePresence>
      <div className="collectible-overlay">
        <motion.div
          className="collectible-container"
          initial={{ scale: 0, rotateY: 1080 }} // 3 full spins
          animate={{ scale: 1, rotateY: 0 }}
          transition={{ duration: 1.5, type: "spring", bounce: 0.4 }}
          onAnimationComplete={() => setInteractive(true)}
          style={{ perspective: 1000 }}
        >
          <motion.div
            className="collectible-card"
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            animate={{ rotateX, rotateY }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            style={{ 
              background: data.gradient,
              boxShadow: `${-rotateY}px ${rotateX}px 20px rgba(0,0,0,0.5)`,
              border: `4px solid ${data.color}`
            }}
          >
            {/* Holographic shifting layer */}
            {interactive && (
              <div 
                className="holo-glare"
                style={{
                  backgroundPosition: `${50 + rotateY * 5}% ${50 + rotateX * 5}%`
                }}
              />
            )}
            
            <div className="card-inner">
              <div className="card-header">
                <h2>{data.title}</h2>
                <span>{data.subtitle}</span>
              </div>
              
              <div className="card-art" style={{ borderColor: data.color }}>
                <span className="card-emoji">{data.emoji}</span>
              </div>
              
              <div className="card-stats">
                <div className="stat-box">
                  <span className="stat-label">LEVEL</span>
                  <span className="stat-value">{data.stat}</span>
                </div>
              </div>
              
              <p className="card-desc">{data.desc}</p>
            </div>
          </motion.div>

          {interactive && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="btn btn-primary claim-btn"
              onClick={onClaim}
            >
              CLAIM REWARD
            </motion.button>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
