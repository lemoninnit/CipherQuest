import React from 'react';

const DifficultySelector = ({ onSelectDifficulty, onBack }) => {
  return (
    <div className="game-lobby">
      <div className="lobby-header-row">
        <button className="lobby-back-btn" onClick={onBack}>
          <span className="material-symbols-outlined">arrow_back</span>
          <span>Back to Categories</span>
        </button>
      </div>

      <div className="lobby-header" style={{ marginTop: '16px' }}>
        <span className="material-symbols-outlined fill-1 lobby-badge-icon difficulty">network_intelligence_history</span>
        <h2 className="lobby-title">Select Shift Difficulty</h2>
        <p className="lobby-subtitle">Unlock advanced cryptographic tiers by completing current levels</p>
      </div>

      <div className="difficulty-grid">
        {/* Easy Card */}
        <div className="difficulty-card easy playable" onClick={() => onSelectDifficulty('easy')}>
          <div className="difficulty-card-header">
            <span className="diff-label">EASY TIER</span>
            <span className="diff-status active">PLAYABLE</span>
          </div>
          <h3 className="diff-title">Easy Shift</h3>
          <p className="diff-desc">
            Simple numeric shifts between +1 and +9. Excellent for standard operative drills and mastering base substitution.
          </p>
          <div className="diff-meta">
            <span>5 Levels</span>
            <span>+100 XP per level</span>
          </div>
        </div>

        {/* Medium Card */}
        <div className="difficulty-card medium locked">
          <div className="difficulty-card-header">
            <span className="diff-label">MEDIUM TIER</span>
            <span className="diff-status locked">LOCKED</span>
          </div>
          <h3 className="diff-title">Compound Shift</h3>
          <p className="diff-desc">
            Moderate numeric shifts. Requires active subtraction and double-step fish decryption. Complete Easy tier to unlock.
          </p>
          <div className="diff-meta">
            <span>5 Levels</span>
            <span>+250 XP per level</span>
          </div>
        </div>

        {/* Hard Card */}
        <div className="difficulty-card hard locked">
          <div className="difficulty-card-header">
            <span className="diff-label">HARD TIER</span>
            <span className="diff-status locked">LOCKED</span>
          </div>
          <h3 className="diff-title">Dynamic Chaos Shift</h3>
          <p className="diff-desc">
            Full key-space shifts (1–25). Includes compound decrypt rules and rapidly moving obstacles. Complete Medium tier to unlock.
          </p>
          <div className="diff-meta">
            <span>5 Levels</span>
            <span>+500 XP per level</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DifficultySelector;
