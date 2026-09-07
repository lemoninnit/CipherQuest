import React, { useState } from 'react';

const tierArtworks = {
  easy: (
    <svg viewBox="0 0 100 100" className="cq-card-svg" aria-hidden="true">
      <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(0, 229, 255, 0.2)" strokeWidth="1.5" strokeDasharray="3 3" />
      <circle cx="50" cy="50" r="27" fill="rgba(0, 229, 255, 0.06)" stroke="#00e5ff" strokeWidth="2" />
      <circle cx="50" cy="50" r="13" fill="rgba(0, 229, 255, 0.25)" stroke="#00e5ff" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="4" fill="#ffffff" />
      <line x1="50" y1="6" x2="50" y2="18" stroke="#00e5ff" strokeWidth="2" strokeLinecap="round" />
      <line x1="50" y1="82" x2="50" y2="94" stroke="#00e5ff" strokeWidth="2" strokeLinecap="round" />
      <line x1="6" y1="50" x2="18" y2="50" stroke="#00e5ff" strokeWidth="2" strokeLinecap="round" />
      <line x1="82" y1="50" x2="94" y2="50" stroke="#00e5ff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  medium: (
    <svg viewBox="0 0 100 100" className="cq-card-svg" aria-hidden="true">
      <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(251, 191, 36, 0.2)" strokeWidth="1.5" strokeDasharray="4 3" />
      <ellipse cx="50" cy="50" rx="36" ry="16" transform="rotate(-30 50 50)" fill="none" stroke="#fbbf24" strokeWidth="2" />
      <ellipse cx="50" cy="50" rx="36" ry="16" transform="rotate(30 50 50)" fill="none" stroke="#fbbf24" strokeWidth="2" />
      <polygon points="50,38 62,50 50,62 38,50" fill="rgba(251, 191, 36, 0.25)" stroke="#fbbf24" strokeWidth="2" />
      <circle cx="50" cy="50" r="3.5" fill="#ffffff" />
      <circle cx="76" cy="35" r="3.5" fill="#fbbf24" />
      <circle cx="24" cy="65" r="3.5" fill="#fbbf24" />
    </svg>
  ),
  hard: (
    <svg viewBox="0 0 100 100" className="cq-card-svg" aria-hidden="true">
      <polygon points="50,8 86,28 86,72 50,92 14,72 14,28" fill="rgba(255, 77, 109, 0.05)" stroke="rgba(255, 77, 109, 0.25)" strokeWidth="1.5" strokeDasharray="4 3" />
      <polygon points="50,18 78,34 78,66 50,82 22,66 22,34" fill="rgba(255, 77, 109, 0.12)" stroke="#ff4d6d" strokeWidth="2" />
      <polygon points="50,30 66,40 66,60 50,70 34,60 34,40" fill="rgba(255, 77, 109, 0.3)" stroke="#ff4d6d" strokeWidth="2" />
      <circle cx="50" cy="50" r="5" fill="#ffffff" />
      <line x1="50" y1="22" x2="50" y2="30" stroke="#ffffff" strokeWidth="2" />
      <line x1="50" y1="70" x2="50" y2="78" stroke="#ffffff" strokeWidth="2" />
      <line x1="26" y1="50" x2="34" y2="50" stroke="#ffffff" strokeWidth="2" />
      <line x1="66" y1="50" x2="74" y2="50" stroke="#ffffff" strokeWidth="2" />
    </svg>
  ),
};

const categoryMetadata = {
  caesar: {
    title: 'Caesar Shift',
    desc: 'Decrypt alphabet letters using mathematical modular arithmetic key offsets.',
    icon: 'sync'
  },
  vigenere: {
    title: 'Vigenère Matrix',
    desc: 'Polyalphabetic substitution using a repeating keyword cycle matrix.',
    icon: 'vpn_key'
  },
  playfair: {
    title: 'Playfair Matrix',
    desc: 'Digraph substitution technique using a coordinate 5×5 grid.',
    icon: 'grid_view'
  }
};

const DifficultySelector = ({ onSelectDifficulty, onBack, activeCategory = 'caesar', completedLevels = {} }) => {
  const [hoveredTier, setHoveredTier] = useState('easy');

  const catProgress = completedLevels[activeCategory] || { easy: [], medium: [], hard: [] };
  const isEasyCompleted   = true;
  const isMediumCompleted = true;

  const categoryLabels = {
    caesar:   { easy: 'Simple Shifts',     medium: 'Compound Shifts',  hard: 'Full Key-Space' },
    vigenere: { easy: 'Short Keywords',    medium: 'Medium Keywords',   hard: 'Long Keywords' },
    playfair: { easy: 'Basic Digraphs',    medium: 'Compound Digraphs', hard: 'Full Matrix' },
  };
  const labels = categoryLabels[activeCategory] || categoryLabels.caesar;
  const meta = categoryMetadata[activeCategory] || categoryMetadata.caesar;

  const easyCount   = (catProgress.easy   || []).length;
  const mediumCount = (catProgress.medium || []).length;
  const hardCount   = (catProgress.hard   || []).length;

  const getButtonLabel = (tier, count, isPlayable) => {
    if (!isPlayable) return 'Locked';
    if (count === 0) return 'Start Stage 1';
    if (count >= 5) return 'Replay Tier (5/5)';
    return `Continue stage ${count + 1}`;
  };

  return (
    <div className="game-lobby cq-lobby-screen">
      {/* ── Legibility Scrim Overlay ── */}
      <div className="cq-lobby-scrim" />

      {/* ── Standardized Left-Aligned Screen Header Block ── */}
      <div className="cq-screen-header-block">
        <div className="cq-top-nav-bar">
          <button className="cq-back-btn" onClick={onBack}>
            <span className="cq-back-icon-circle">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
            </span>
            <span>Back to Quest Categories</span>
          </button>
        </div>

        <div className="cq-screen-header">
          <div className="cq-screen-title-row">
            <h1 className="cq-screen-title">{meta.title}</h1>
            <span className="material-symbols-outlined cq-screen-header-icon">{meta.icon}</span>
          </div>
          <p className="cq-screen-subtitle">
            {meta.desc}
          </p>
        </div>
      </div>

      {/* ── Centered Tier Selection Cards Row ── */}
      <div className="cq-lobby-center-content">
        <div className="cq-cards-row">
          {/* Easy Tier */}
          <div
            role="button"
            tabIndex={0}
            className={`cq-portrait-card playable ${hoveredTier === 'easy' ? 'active' : ''}`}
            onMouseEnter={() => setHoveredTier('easy')}
            onFocus={() => setHoveredTier('easy')}
            onClick={() => onSelectDifficulty('easy')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectDifficulty('easy');
              }
            }}
          >
            {/* Inset Artwork Emblem Panel (Unique Easy Emblem) */}
            <div className="cq-card-art-panel">
              {tierArtworks.easy}
            </div>

            <div className="cq-card-body">
              <div>
                {/* Meta Strip: Tier tag on left (tier color in ONE place), XP on right */}
                <div className="cq-card-meta-row">
                  <span className="cq-badge-tag cyan">Easy</span>
                  <span className="cq-card-xp-tag">+100 XP / Level</span>
                </div>

                <h3 className="cq-card-title">{labels.easy}</h3>
                <p className="cq-card-desc">Beginner-friendly challenges to master the cipher basics.</p>
              </div>

              <div>
                <button className="cq-card-action-btn" tabIndex={-1}>
                  {getButtonLabel('easy', easyCount, true)}
                </button>
                <div className="cq-card-footer">
                  <span>5 stages ({easyCount}/5 done)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Medium Tier */}
          <div
            role="button"
            tabIndex={0}
            className={`cq-portrait-card ${isEasyCompleted ? 'playable' : 'locked'} ${hoveredTier === 'medium' ? 'active' : ''}`}
            onMouseEnter={() => setHoveredTier('medium')}
            onFocus={() => setHoveredTier('medium')}
            onClick={() => { if (isEasyCompleted) onSelectDifficulty('medium'); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (isEasyCompleted) onSelectDifficulty('medium');
              }
            }}
          >
            {/* Inset Artwork Emblem Panel (Unique Medium Emblem) */}
            <div className="cq-card-art-panel">
              {!isEasyCompleted && (
                <span className="cq-tier-lock-icon">
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>lock</span>
                </span>
              )}
              {tierArtworks.medium}
            </div>

            <div className="cq-card-body">
              <div>
                {/* Meta Strip: Amber Tier tag on left (tier color in ONE place), XP on right */}
                <div className="cq-card-meta-row">
                  <span className="cq-badge-tag amber">Medium</span>
                  <span className="cq-card-xp-tag">+250 XP / Level</span>
                </div>

                <h3 className="cq-card-title">{labels.medium}</h3>
                <p className="cq-card-desc">
                  {isEasyCompleted
                    ? 'Intermediate challenges with more complex keys.'
                    : 'Complete all 5 Easy stages to unlock.'}
                </p>
              </div>

              <div>
                <button className="cq-card-action-btn" tabIndex={-1}>
                  {getButtonLabel('medium', mediumCount, isEasyCompleted)}
                </button>
                <div className="cq-card-footer">
                  <span>5 stages ({mediumCount}/5 done)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Hard Tier */}
          <div
            role="button"
            tabIndex={0}
            className={`cq-portrait-card ${isMediumCompleted ? 'playable' : 'locked'} ${hoveredTier === 'hard' ? 'active' : ''}`}
            onMouseEnter={() => setHoveredTier('hard')}
            onFocus={() => setHoveredTier('hard')}
            onClick={() => { if (isMediumCompleted) onSelectDifficulty('hard'); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (isMediumCompleted) onSelectDifficulty('hard');
              }
            }}
          >
            {/* Inset Artwork Emblem Panel (Unique Hard Emblem) */}
            <div className="cq-card-art-panel">
              {!isMediumCompleted && (
                <span className="cq-tier-lock-icon">
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>lock</span>
                </span>
              )}
              {tierArtworks.hard}
            </div>

            <div className="cq-card-body">
              <div>
                {/* Meta Strip: Coral/Red Tier tag on left (tier color in ONE place), XP on right */}
                <div className="cq-card-meta-row">
                  <span className="cq-badge-tag coral">Hard</span>
                  <span className="cq-card-xp-tag">+500 XP / Level</span>
                </div>

                <h3 className="cq-card-title">{labels.hard}</h3>
                <p className="cq-card-desc">
                  {isMediumCompleted
                    ? 'Advanced challenges using full key-space encryption.'
                    : 'Complete all 5 Medium stages to unlock.'}
                </p>
              </div>

              <div>
                <button className="cq-card-action-btn" tabIndex={-1}>
                  {getButtonLabel('hard', hardCount, isMediumCompleted)}
                </button>
                <div className="cq-card-footer">
                  <span>5 stages ({hardCount}/5 done)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Centered Bottom Caption Line ── */}
      <div className="cq-lobby-bottom-caption">
        <p>Unlock advanced cryptographic operations by mastering current difficulty tiers</p>
      </div>
    </div>
  );
};

export default DifficultySelector;