import React, { useState, useEffect } from "react";
import "./StageLoadingScreen.css";

export default function StageLoadingScreen({ category, difficulty, stageIndex, onLoadingComplete, durationMs = 2500 }) {
  const [progressPercent, setProgressPercent] = useState(0);
  const [statusMessage, setStatusMessage] = useState("INITIALIZING CRYPTOGRAPHIC ENGINE...");
  const [isExiting, setIsExiting] = useState(false);

  const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

  useEffect(() => {
    const duration = durationMs; // 2.5 seconds default loading screen duration
    const intervalTime = 30;
    const increment = 100 / (duration / intervalTime);

    const timer = setInterval(() => {
      setProgressPercent((prev) => {
        const next = Math.min(prev + increment, 100);

        if (next < 25) {
          setStatusMessage("INITIALIZING CRYPTOGRAPHIC ENGINE & PARSING PROTOCOLS...");
        } else if (next < 50) {
          setStatusMessage("DECRYPTING MATRIX ALGORITHMS & LOADING STAGE DATA...");
        } else if (next < 75) {
          setStatusMessage("ESTABLISHING REAL-TIME HIGH-SPEED DECRYPTION LINK...");
        } else if (next < 99) {
          setStatusMessage("VERIFYING CIPHER KEYS & FINALIZING STAGE DEPLOYMENT...");
        } else {
          setStatusMessage("OPERATIVE DEPLOYMENT READY. DEPLOYING TO MISSION...");
        }

        if (next >= 100) {
          clearInterval(timer);
          setIsExiting(true);
          setTimeout(() => {
            if (onLoadingComplete) onLoadingComplete();
          }, 550); // Matches smooth exit fade animation duration
        }
        return next;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [onLoadingComplete, durationMs]);

  const formattedStage = typeof stageIndex === "number" ? String(stageIndex + 1).padStart(2, "0") : "01";

  return (
    <div className={`cq-loading-screen ${isExiting ? "cq-loading-exit" : ""}`}>
      {/* 21:9 Full-bleed Loading Screen Background */}
      <img
        className="cq-loading-bg-img"
        src="/assets/ui/loading_screen_bg.png"
        alt="Loading Background"
        aria-hidden="true"
      />

      {/* Legibility Scrim Overlay */}
      <div className="cq-loading-scrim" />

      {/* Main HUD Loading Container */}
      <div className="cq-loading-content">
        {/* Top Operative HUD Header */}
        <div className="cq-loading-header">
          <div className="cq-loading-sub-badge">
            <span className="material-symbols-outlined cq-pulse-icon">shield</span>
            <span>CIPHER OPERATION DEPLOYMENT &bull; SECURE LINK</span>
          </div>
          <h1 className="cq-loading-title">
            {capitalize(category)} &mdash; {capitalize(difficulty)} Stage {formattedStage}
          </h1>
        </div>

        {/* Center Cybernetic Radar Spinner */}
        <div className="cq-loading-spinner-wrapper">
          <div className="cq-loading-ring cq-ring-outer" />
          <div className="cq-loading-ring cq-ring-inner" />
          <span className="material-symbols-outlined cq-loading-center-icon">lock</span>
        </div>

        {/* Bottom Progress Bar & Operative Status */}
        <div className="cq-loading-bar-section">
          <div className="cq-loading-status-row">
            <span className="cq-loading-status-text">{statusMessage}</span>
            <span className="cq-loading-percent">{Math.round(progressPercent)}%</span>
          </div>
          <div className="cq-loading-track">
            <div
              className="cq-loading-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
