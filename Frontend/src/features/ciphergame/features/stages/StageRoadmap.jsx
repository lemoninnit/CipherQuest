import React from "react";

export default function StageRoadmap({ game }) {
  const { category, difficulty, progress, startStage, backToDifficulty } = game;
  const catProg = progress[category] || { easy: [], medium: [], hard: [] };
  const completed = catProg[difficulty] || [];

  return (
    <div className="game-lobby cq-lobby-screen">
      {/* ── Navigation Row ── */}
      <div className="lobby-header-row" style={{ width: '100%', marginBottom: '16px' }}>
        <button className="fg-btn-back-nav" onClick={backToDifficulty}>
          <span className="material-symbols-outlined">arrow_back</span>
          <span>Back to Difficulty</span>
        </button>
      </div>

      {/* ── Stage Header ── */}
      <div className="lobby-header cq-lobby-header">
        <div className="cq-lobby-badge-wrapper">
          <span className="material-symbols-outlined fill-1 lobby-badge-icon stages">map</span>
        </div>
        <h2 className="lobby-title cq-lobby-main-title" style={{ textTransform: 'capitalize' }}>
          {category} — {difficulty} Stages
        </h2>
        <p className="lobby-subtitle cq-lobby-main-subtitle">
          Complete all 5 operations to master this difficulty tier
        </p>
      </div>

      {/* ── Stages Grid ── */}
      <div className="stages-grid cq-lobby-grid">
        {Array.from({ length: 5 }).map((_, i) => {
          const stageId = `${category}-${difficulty}-${i}`;
          const done = completed.includes(stageId);
          return (
            <button
              key={stageId}
              className={`stage-card cq-lobby-card ${done ? "completed" : "available"}`}
              onClick={() => startStage(category, difficulty, i)}
            >
              <div className="stage-card-number">Stage {i + 1}</div>
              <div className="stage-card-icon">
                {done
                  ? <span className="material-symbols-outlined">check_circle</span>
                  : <span className="material-symbols-outlined">play_circle</span>
                }
              </div>
              <div className="stage-card-status">{done ? "COMPLETED" : "PLAY"}</div>
            </button>
          );
        })}
      </div>

      {/* ── Tier Progress Bar ── */}
      <div className="stages-progress-section" style={{ width: '100%', maxWidth: '600px', marginTop: '32px' }}>
        <div className="stages-progress-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
          <span className="stages-progress-label" style={{ color: 'var(--text-muted)' }}>Tier Operational Progress</span>
          <span className="stages-progress-count" style={{ color: 'var(--neon-green)', fontWeight: 'bold' }}>{completed.length} / 5 Operations Cleared</span>
        </div>
        <div className="stages-progress-bar" style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '10px', height: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div
            className="stages-progress-fill"
            style={{
              width: `${(completed.length / 5) * 100}%`,
              height: '100%',
              background: 'linear-gradient(90deg, var(--neon-cyan), var(--neon-green))',
              transition: 'width 0.4s ease'
            }}
          />
        </div>
      </div>
    </div>
  );
}