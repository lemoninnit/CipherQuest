import React from "react";

export default function StageRoadmap({ game }) {
  const { category, difficulty, progress, startStage, backToDifficulty } = game;
  const catProg = progress[category] || { easy: [], medium: [], hard: [] };
  const completed = catProg[difficulty] || [];

  const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

  // Find the first uncompleted stage index (0 to 4)
  const firstUncompletedIndex = Array.from({ length: 5 }).findIndex(
    (_, idx) => !completed.includes(`${category}-${difficulty}-${idx}`)
  );

  // Line fill progress percentage:
  // Runs from center of Node 0 (0%) to center of Node 4 (100%).
  // If all 5 completed, fill is 100%. Otherwise, it fills up to firstUncompletedIndex.
  const lineFillPercent = firstUncompletedIndex === -1
    ? 100
    : (firstUncompletedIndex / 4) * 100;

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
          <div className="cq-stages-cleared-badge">
            <span className="material-symbols-outlined cq-cleared-badge-icon">verified</span>
            <span className="cq-cleared-badge-text">
              {completed.length} / 5 Operations Cleared
            </span>
          </div>
        </div>
      </div>

      {/* ── Centered Stages Roadmap & Connected Path Section ── */}
      <div className="cq-lobby-center-content">
        <div className="cq-stages-container cq-roadmap-container">
          <div className="cq-roadmap-path-wrapper">
            {/* Horizontal Connecting Line Track behind nodes */}
            <div className="cq-roadmap-track-container">
              <div className="cq-roadmap-track-dim" />
              <div
                className="cq-roadmap-track-fill"
                style={{ width: `${lineFillPercent}%` }}
              />
            </div>

            {/* 5 Stage Circular Nodes in a Centered Row */}
            <div className="cq-stages-row cq-roadmap-row">
              {Array.from({ length: 5 }).map((_, i) => {
                const stageId = `${category}-${difficulty}-${i}`;
                const done = completed.includes(stageId);
                const isCurrent = !done && i === firstUncompletedIndex;
                const isLocked = Boolean(game.isStageLocked?.(category, difficulty, i));

                return (
                  <div
                    key={stageId}
                    role="button"
                    tabIndex={0}
                    aria-label={`Stage ${i + 1}${done ? ': Completed' : isCurrent ? ': Current Playable' : isLocked ? ': Locked' : ': Playable'}`}
                    className={`cq-stage-card cq-roadmap-node ${
                      done
                        ? "completed"
                        : isCurrent
                        ? "current"
                        : isLocked
                        ? "locked"
                        : "available"
                    }`}
                    onClick={() => startStage(category, difficulty, i)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        startStage(category, difficulty, i);
                      }
                    }}
                  >
                    <div className="cq-node-circle-wrap">
                      <div className="cq-node-circle">
                        <span className="material-symbols-outlined cq-node-icon">
                          {done ? "check" : isLocked ? "lock" : "play_arrow"}
                        </span>
                      </div>
                    </div>
                    <span className="cq-node-number">{String(i + 1).padStart(2, '0')}</span>
                  </div>
                );
              })}
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