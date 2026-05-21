import React from 'react';

const DifficultySelector = ({ onSelectDifficulty, onBack, activeCategory = 'caesar', completedLevels = {} }) => {
  const catProgress = completedLevels[activeCategory] || { easy: [], medium: [], hard: [] };
  const isEasyCompleted = catProgress.easy?.length >= 5;
  const isMediumCompleted = catProgress.medium?.length >= 5;

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
        <h2 className="lobby-title" style={{ textTransform: 'capitalize' }}>Select {activeCategory} Difficulty</h2>
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
        <div 
          className={`difficulty-card medium ${isEasyCompleted ? 'playable' : 'locked'}`} 
          onClick={() => { if (isEasyCompleted) onSelectDifficulty('medium'); }}
        >
          <div className="difficulty-card-header">
            <span className="diff-label">MEDIUM TIER</span>
            {isEasyCompleted ? (
              <span className="diff-status active">PLAYABLE</span>
            ) : (
              <span className="diff-status locked">LOCKED</span>
            )}
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
        <div 
          className={`difficulty-card hard ${isMediumCompleted ? 'playable' : 'locked'}`} 
          onClick={() => { if (isMediumCompleted) onSelectDifficulty('hard'); }}
        >
          <div className="difficulty-card-header">
            <span className="diff-label">HARD TIER</span>
            {isMediumCompleted ? (
              <span className="diff-status active">PLAYABLE</span>
            ) : (
              <span className="diff-status locked">LOCKED</span>
            )}
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

