import React from "react";
import "./CollectibleCard.css"; 

export default function TiltCard({ imageSrc, isDummy }) {
  return (
    <div
      className="tilt-card-container"
      style={{ 
        boxShadow: isDummy ? 'none' : `0px 20px 30px -10px rgba(0,0,0,0.6), 0px 8px 10px -5px rgba(0,0,0,0.4)`,
        border: isDummy ? `3px dashed rgba(0,0,0,0.15)` : `2px solid rgba(0,0,0,0.8)`,
        width: 180,
        height: 252,
        borderRadius: 12,
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
        background: isDummy ? 'rgba(0,0,0,0.02)' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isDummy ? 'default' : 'pointer',
        transform: 'translateY(-5px)', // gives it a default "floating" lift
      }}
    >
      {!isDummy && imageSrc ? (
        <img src={imageSrc} alt="Collectible" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ fontSize: '4rem', color: 'rgba(0,0,0,0.15)', fontFamily: 'var(--font-family)', fontWeight: 900 }}>?</span>
      )}
    </div>
  );
}
