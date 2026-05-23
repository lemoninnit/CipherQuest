import React from 'react';

const DifficultySelector = ({ onSelectDifficulty, onBack, activeCategory = 'caesar', completedLevels = {} }) => {
  const catProgress = completedLevels[activeCategory] || { easy: [], medium: [], hard: [] };
  const isEasyCompleted   = true;
  const isMediumCompleted = true;

  const categoryLabels = {
    caesar:   { easy: 'Simple Shifts',     medium: 'Compound Shifts',  hard: 'Full Key-Space' },
    vigenere: { easy: 'Short Keywords',    medium: 'Medium Keywords',   hard: 'Long Keywords' },
    playfair: { easy: 'Basic Digraphs',    medium: 'Compound Digraphs', hard: 'Full Matrix' },
  };
  const labels = categoryLabels[activeCategory] || categoryLabels.caesar;

  const easyCount   = (catProgress.easy   || []).length;
  const mediumCount = (catProgress.medium || []).length;
  const hardCount   = (catProgress.hard   || []).length;

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
        {/* Easy */}
        <div className="difficulty-card easy playable" onClick={() => onSelectDifficulty('easy')}>
          <div className="difficulty-card-header">
            <span className="diff-label">EASY TIER</span>
            <span className="diff-status active">PLAYABLE</span>
          </div>
          <h3 className="diff-title">{labels.easy}</h3>
          <p className="diff-desc">Beginner-friendly challenges to master the cipher basics.</p>
          <div className="diff-meta">
            <span>5 Levels ({easyCount}/5 done)</span>
            <span>+100 XP per level</span>
          </div>
        </div>

        {/* Medium */}
        <div
          className={`difficulty-card medium ${isEasyCompleted ? 'playable' : 'locked'}`}
          onClick={() => { if (isEasyCompleted) onSelectDifficulty('medium'); }}
        >
          <div className="difficulty-card-header">
            <span className="diff-label">MEDIUM TIER</span>
            {isEasyCompleted
              ? <span className="diff-status active">PLAYABLE</span>
              : <span className="diff-status locked">🔒 LOCKED</span>
            }
          </div>
          <h3 className="diff-title">{labels.medium}</h3>
          <p className="diff-desc">
            {isEasyCompleted
              ? 'Intermediate challenges with more complex keys.'
              : 'Complete all 5 Easy stages to unlock.'}
          </p>
          <div className="diff-meta">
            <span>5 Levels ({mediumCount}/5 done)</span>
            <span>+250 XP per level</span>
          </div>
        </div>

        {/* Hard */}
        <div
          className={`difficulty-card hard ${isMediumCompleted ? 'playable' : 'locked'}`}
          onClick={() => { if (isMediumCompleted) onSelectDifficulty('hard'); }}
        >
          <div className="difficulty-card-header">
            <span className="diff-label">HARD TIER</span>
            {isMediumCompleted
              ? <span className="diff-status active">PLAYABLE</span>
              : <span className="diff-status locked">🔒 LOCKED</span>
            }
          </div>
          <h3 className="diff-title">{labels.hard}</h3>
          <p className="diff-desc">
            {isMediumCompleted
              ? 'Advanced challenges using full key-space encryption.'
              : 'Complete all 5 Medium stages to unlock.'}
          </p>
          <div className="diff-meta">
            <span>5 Levels ({hardCount}/5 done)</span>
            <span>+500 XP per level</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DifficultySelector;