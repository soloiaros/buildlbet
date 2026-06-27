import { useState, useEffect } from "react";
import { Zap, TrendingUp, X } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";
import { fetchRecentPosts, fetchCards, claimCollectible } from "../api";
import { motion, AnimatePresence } from "framer-motion";
import CardsCarousel from "./CardsCarousel";
import QRScanner from "./QRScanner";
import CollectibleCard from "./CollectibleCard";
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
        <div className="brutal-tooltip-stat">Bettors: <span>{data.bettorCount || 0}</span></div>
      </div>
    );
  }
  return null;
};

export default function DashboardView({ market, wallet }) {
  const [recentPosts, setRecentPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);

  // Cards state
  const [ownedCards, setOwnedCards] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [claimingCard, setClaimingCard] = useState(false);
  const [cardToReveal, setCardToReveal] = useState(null);

  useEffect(() => {
    if (wallet?.walletId !== undefined) {
      fetchCards(wallet.walletId).then(setOwnedCards).catch(console.error);
    }
  }, [wallet?.walletId]);

  const handleScan = async (text) => {
    setShowScanner(false);
    if (ownedCards?.joinCard) return; // already have it
    setClaimingCard(true);
    try {
      const res = await claimCollectible(wallet.walletId);
      if (!res.alreadyOwned) {
        setCardToReveal(0); // JOIN_CARD
        setOwnedCards(prev => ({ ...prev, joinCard: true }));
      } else {
        alert("Already claimed this collectible!");
      }
    } catch (e) {
      alert("Failed to claim: " + e.message);
    } finally {
      setClaimingCard(false);
    }
  };

  useEffect(() => {
    let active = true;
    const pollPosts = async () => {
      try {
        const posts = await fetchRecentPosts();
        if (active) setRecentPosts(posts);
      } catch (err) {
        console.error("Failed to fetch recent posts:", err);
      }
    };
    pollPosts();
    const interval = setInterval(pollPosts, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Close post modal on escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") setSelectedPost(null);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

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
        <h1 className="dashboard-title" style={{ flexWrap: 'wrap' }}>
          <Zap size={40} className="animate-pulse" /> 
          Event: <span style={{ color: 'var(--accent-pink)', fontFamily: 'var(--font-family)', border: '4px dashed var(--accent-pink)', padding: '4px 12px', borderRadius: '8px', background: '#fff', transform: 'rotate(-2deg)', display: 'inline-block', marginLeft: '8px' }}>BuilderMare</span>
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
        {(!market.teams || market.teams.length === 0 || market.totalPool === 0) ? (
          <div className="dashboard-empty-state" style={{ 
            height: '100%', 
            minHeight: '400px', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            textAlign: 'center',
            gap: '16px'
          }}>
            <div style={{ fontSize: '4rem' }}>🤔</div>
            <h2 style={{ fontFamily: 'var(--font-family)', fontWeight: 900, margin: 0 }}>NO BETS YET</h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: '300px', margin: 0 }}>
              {market.teams && market.teams.length > 0 
                ? "Teams are registered but nobody has placed a bet yet. Be the first!"
                : "Waiting for teams to join the hackathon and create their profiles!"}
            </p>
          </div>
        ) : (
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
        )}
      </div>

      {/* Collectibles Carousel */}
      {wallet && (
        <CardsCarousel 
          ownedCards={ownedCards} 
          claimingCard={claimingCard} 
          onClaimClick={() => setShowScanner(true)} 
        />
      )}

      {/* Recent Posts */}
      {recentPosts.length > 0 && (
        <div className="brutal-card dashboard-recent-posts" style={{ padding: 0, overflow: 'hidden' }}>
          <h2 className="recent-posts-title" style={{ padding: "24px", margin: 0, borderBottom: "4px solid black", background: "var(--accent-purple)", color: "white" }}>
            LATEST PROJECT POSTS
          </h2>
          <div className="recent-posts-list" style={{ display: "flex", flexDirection: "column" }}>
            {recentPosts.map((post, idx) => (
              <div 
                key={`${post.teamId}-${post.updatedAt}`} 
                className="recent-post-card"
                style={{ 
                  padding: "24px", 
                  borderBottom: idx === recentPosts.length - 1 ? "none" : "2px solid black",
                  display: "flex",
                  gap: "16px",
                  alignItems: "flex-start",
                  cursor: "pointer"
                }}
                onClick={() => setSelectedPost(post)}
              >
                {post.imageBase64 && (
                  <div 
                    className="recent-post-thumb" 
                    style={{ 
                      backgroundImage: `url(${post.imageBase64})`,
                      width: "120px",
                      height: "120px",
                      flexShrink: 0,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      border: "2px solid black",
                      borderRadius: "8px"
                    }} 
                  />
                )}
                <div style={{ flex: 1 }}>
                  <div className="recent-post-header" style={{ fontWeight: 900, marginBottom: "8px", textTransform: "uppercase", color: "var(--accent-purple)" }}>
                    {post.teamName}
                  </div>
                  {post.text && (
                    <p className="recent-post-snippet" style={{ margin: 0, fontWeight: 600, fontSize: "1rem" }}>
                      {post.text.length > 100 ? post.text.slice(0, 100) + '...' : post.text}
                    </p>
                  )}
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "12px", fontWeight: 700 }}>
                    {new Date(post.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live indicator */}
      {!market.resolved && (
        <div className="dashboard-live brutal-card">
          <span className="dashboard-live-dot animate-pulse" />
          LIVE EVENT
        </div>
      )}

      {/* Post Modal */}
      <AnimatePresence>
        {selectedPost && (
          <div className="post-modal-overlay" onClick={() => setSelectedPost(null)}>
            <motion.div 
              className="brutal-card post-modal-content"
              onClick={e => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <button className="post-modal-close" onClick={() => setSelectedPost(null)}>
                <X size={24} strokeWidth={3} />
              </button>
              <h2 className="post-modal-title">{selectedPost.teamName}</h2>
              {selectedPost.imageBase64 && (
                <img src={selectedPost.imageBase64} alt="Project" className="post-modal-image" />
              )}
              {selectedPost.text && (
                <p className="post-modal-text">{selectedPost.text}</p>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Collectible Scanner & Reveal */}
      {showScanner && (
        <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      )}
      
      {cardToReveal !== null && (
        <CollectibleCard cardId={cardToReveal} onClaim={() => setCardToReveal(null)} />
      )}

    </div>
  );
}
