import React from "react";

export default function StageRoadmap({ game }) {
  const { category, difficulty, progress, isUnlocked, isStageCompleted, startStage, backToDifficulty } = game;
  const catProg = progress[category] || { easy: [], medium: [], hard: [] };
  const completed = catProg[difficulty] || [];

  return (
    <div className="game-lobby">
      <div className="lobby-header-row">
        <button className="lobby-back-btn" onClick={backToDifficulty}>
          <span className="material-symbols-outlined">arrow_back</span>
          <span>Back to Difficulty</span>
        </button>
      </div>

      <div className="lobby-header" style={{ marginTop: '16px' }}>
        <span className="material-symbols-outlined fill-1 lobby-badge-icon">map</span>
        <h2 className="lobby-title" style={{ textTransform: 'capitalize' }}>
          {category} — {difficulty} Stages
        </h2>
        <p className="lobby-subtitle">Complete all 5 stages to unlock the next tier</p>
      </div>

      <div className="stages-grid">
        {Array.from({ length: 5 }).map((_, i) => {
          const stageId = `${category}-${difficulty}-${i}`;
          const done = completed.includes(stageId);
          return (
            <button
              key={stageId}
              className={`stage-card ${done ? "completed" : "available"}`}
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

      <div className="stages-progress-bar">
        <div
          className="stages-progress-fill"
          style={{ width: `${(completed.length / 5) * 100}%` }}
        />
        <span className="stages-progress-text">{completed.length} / 5 completed</span>
      </div>
    </div>
  );
}