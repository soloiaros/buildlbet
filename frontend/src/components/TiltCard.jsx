import React, { useState } from "react";
import { motion } from "framer-motion";
import "./CollectibleCard.css"; // Reuse holo-glare from here

export default function TiltCard({ imageSrc, isDummy }) {
  const [interactive, setInteractive] = useState(true);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

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
    <motion.div
      className="tilt-card-container"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      animate={{ rotateX, rotateY }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      style={{ 
        boxShadow: `${-rotateY}px ${rotateX}px 15px rgba(0,0,0,0.4)`,
        border: `3px solid black`,
        width: 180,
        height: 252,
        borderRadius: 12,
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
        background: isDummy ? '#ccc' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isDummy ? 'default' : 'pointer',
      }}
    >
      {!isDummy && imageSrc ? (
        <img src={imageSrc} alt="Collectible" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ fontSize: '4rem', color: '#999', fontFamily: 'var(--font-family)', fontWeight: 900 }}>?</span>
      )}
      
      {/* Holographic shifting layer */}
      {!isDummy && interactive && (
        <div 
          className="holo-glare"
          style={{
            backgroundPosition: `${50 + rotateY * 5}% ${50 + rotateX * 5}%`
          }}
        />
      )}
    </motion.div>
  );
}
