import React from "react";

export default function StageRoadmap({ game }) {
  const { category, difficulty, progress, startStage, backToDifficulty } = game;
  const catProg = progress[category] || { easy: [], medium: [], hard: [] };
  const completed = catProg[difficulty] || [];

  const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

  return (
    <div className="game-lobby cq-lobby-screen">
      {/* ── Legibility Scrim Overlay ── */}
      <div className="cq-lobby-scrim" />

      {/* ── Standardized Left-Aligned Screen Header Block ── */}
      <div className="cq-screen-header-block">
        <div className="cq-top-nav-bar">
          <button className="cq-back-btn" onClick={backToDifficulty}>
            <span className="cq-back-icon-circle">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
            </span>
            <span>Back to Difficulty</span>
          </button>
        </div>

        <div className="cq-screen-header">
          <div className="cq-screen-title-row">
            <h1 className="cq-screen-title">
              {capitalize(category)} — {capitalize(difficulty)} Stages
            </h1>
            <span className="material-symbols-outlined cq-screen-header-icon">map</span>
          </div>
          <p className="cq-screen-subtitle">
            Complete all 5 operations to master this difficulty tier
          </p>
        </div>
      </div>

      {/* ── Centered Stages Roadmap & Progress Section ── */}
      <div className="cq-lobby-center-content">
        <div className="cq-stages-container">
          {/* 5 Stage Cards in a Centered Row */}
          <div className="cq-stages-row">
            {Array.from({ length: 5 }).map((_, i) => {
              const stageId = `${category}-${difficulty}-${i}`;
              const done = completed.includes(stageId);
              return (
                <div
                  key={stageId}
                  role="button"
                  tabIndex={0}
                  className={`cq-stage-card ${done ? "completed" : "available"}`}
                  onClick={() => startStage(category, difficulty, i)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      startStage(category, difficulty, i);
                    }
                  }}
                >
                  <div className="cq-stage-card-number">Stage {i + 1}</div>
                  <div className="cq-stage-card-icon-box">
                    <span className="material-symbols-outlined">
                      {done ? "check_circle" : "play_circle"}
                    </span>
                  </div>
                  <div className="cq-stage-card-status">
                    {done ? "COMPLETED" : "PLAY"}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Tier Progress Bar ── */}
          <div className="cq-stages-progress-wrap">
            <div className="cq-stages-progress-header">
              <span className="cq-stages-progress-label">Tier Operational Progress</span>
              <span className="cq-stages-progress-count">
                {completed.length} / 5 Operations Cleared
              </span>
            </div>
            <div className="cq-stages-progress-track">
              <div
                className="cq-stages-progress-fill"
                style={{
                  width: `${(completed.length / 5) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Centered Bottom Caption Line ── */}
      <div className="cq-lobby-bottom-caption">
        <p>Master each stage operation to advance operative clearance and earn level XP</p>
      </div>
    </div>
  );
}