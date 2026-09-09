import { useNavigate } from 'react-router-dom';

const cipherArtworks = {
  caesar: (
    <svg viewBox="0 0 100 100" className="cq-tier-card-svg" aria-hidden="true">
      <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(0, 229, 255, 0.25)" strokeWidth="1.5" strokeDasharray="3 3" />
      <path d="M 32,38 A 22,22 0 1,1 68,38" fill="none" stroke="#00e5ff" strokeWidth="4" strokeLinecap="round" />
      <polyline points="62,30 68,38 76,34" fill="none" stroke="#00e5ff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 68,62 A 22,22 0 1,1 32,62" fill="none" stroke="#00e5ff" strokeWidth="4" strokeLinecap="round" />
      <polyline points="38,70 32,62 24,66" fill="none" stroke="#00e5ff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <text x="26" y="44" fill="#00e5ff" fontSize="11" fontWeight="bold" fontFamily="sans-serif">A</text>
      <text x="70" y="44" fill="#39ff14" fontSize="11" fontWeight="bold" fontFamily="sans-serif">X</text>
    </svg>
  ),
  vigenere: (
    <svg viewBox="0 0 100 100" className="cq-tier-card-svg" aria-hidden="true">
      <rect x="2" y="2" width="96" height="96" rx="6" fill="rgba(3, 12, 26, 0.8)" stroke="rgba(0, 229, 255, 0.3)" strokeWidth="1" />
      
      <rect x="6" y="6" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
      <text x="14" y="18" textAnchor="middle" fill="#7a9bb8" fontSize="9" fontWeight="bold">A</text>
      <rect x="24" y="6" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
      <text x="32" y="18" textAnchor="middle" fill="#7a9bb8" fontSize="9" fontWeight="bold">B</text>
      <rect x="42" y="6" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
      <text x="50" y="18" textAnchor="middle" fill="#7a9bb8" fontSize="9" fontWeight="bold">C</text>
      <rect x="60" y="6" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
      <text x="68" y="18" textAnchor="middle" fill="#7a9bb8" fontSize="9" fontWeight="bold">D</text>
      <rect x="78" y="6" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
      <text x="86" y="18" textAnchor="middle" fill="#7a9bb8" fontSize="9" fontWeight="bold">E</text>

      <rect x="6" y="24" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
      <text x="14" y="36" textAnchor="middle" fill="#00e5ff" fontSize="9" fontWeight="bold">A</text>
      <rect x="24" y="24" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
      <text x="32" y="36" textAnchor="middle" fill="#00e5ff" fontSize="9" fontWeight="bold">P</text>
      <rect x="42" y="24" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
      <text x="50" y="36" textAnchor="middle" fill="#00e5ff" fontSize="9" fontWeight="bold">P</text>
      <rect x="60" y="24" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
      <text x="68" y="36" textAnchor="middle" fill="#00e5ff" fontSize="9" fontWeight="bold">L</text>
      <rect x="78" y="24" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
      <text x="86" y="36" textAnchor="middle" fill="#00e5ff" fontSize="9" fontWeight="bold">E</text>

      <rect x="6" y="42" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
      <text x="14" y="54" textAnchor="middle" fill="#7a9bb8" fontSize="9" fontWeight="bold">C</text>
      <rect x="24" y="42" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
      <text x="32" y="54" textAnchor="middle" fill="#7a9bb8" fontSize="9" fontWeight="bold">D</text>
      <rect x="42" y="42" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
      <text x="50" y="54" textAnchor="middle" fill="#7a9bb8" fontSize="9" fontWeight="bold">E</text>
      <rect x="60" y="42" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
      <text x="68" y="54" textAnchor="middle" fill="#7a9bb8" fontSize="9" fontWeight="bold">F</text>
      <rect x="78" y="42" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
      <text x="86" y="54" textAnchor="middle" fill="#7a9bb8" fontSize="9" fontWeight="bold">G</text>

      <rect x="6" y="60" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
      <text x="14" y="72" textAnchor="middle" fill="#39ff14" fontSize="9" fontWeight="bold">C</text>
      <rect x="24" y="60" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
      <text x="32" y="72" textAnchor="middle" fill="#39ff14" fontSize="9" fontWeight="bold">A</text>
      <rect x="42" y="60" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
      <text x="50" y="72" textAnchor="middle" fill="#39ff14" fontSize="9" fontWeight="bold">T</text>
      <rect x="60" y="60" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
      <text x="68" y="72" textAnchor="middle" fill="#39ff14" fontSize="9" fontWeight="bold">C</text>
      <rect x="78" y="60" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
      <text x="86" y="72" textAnchor="middle" fill="#39ff14" fontSize="9" fontWeight="bold">A</text>

      <rect x="6" y="78" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
      <text x="14" y="90" textAnchor="middle" fill="#7a9bb8" fontSize="9" fontWeight="bold">E</text>
      <rect x="24" y="78" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
      <text x="32" y="90" textAnchor="middle" fill="#7a9bb8" fontSize="9" fontWeight="bold">F</text>
      <rect x="42" y="78" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
      <text x="50" y="90" textAnchor="middle" fill="#7a9bb8" fontSize="9" fontWeight="bold">G</text>
      <rect x="60" y="78" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
      <text x="68" y="90" textAnchor="middle" fill="#7a9bb8" fontSize="9" fontWeight="bold">H</text>
      <rect x="78" y="78" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
      <text x="86" y="90" textAnchor="middle" fill="#7a9bb8" fontSize="9" fontWeight="bold">I</text>
    </svg>
  ),
  playfair: (
    <svg viewBox="0 0 100 100" className="cq-tier-card-svg" aria-hidden="true">
      <rect x="2" y="2" width="96" height="96" rx="6" fill="rgba(3, 12, 26, 0.8)" stroke="rgba(0, 229, 255, 0.3)" strokeWidth="1" />
      
      <rect x="6" y="6" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
      <text x="14" y="18" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">T</text>
      <rect x="24" y="6" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
      <text x="32" y="18" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">Y</text>
      <rect x="42" y="6" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
      <text x="50" y="18" textAnchor="middle" fill="#00e5ff" fontSize="9" fontWeight="bold">P</text>
      <rect x="60" y="6" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
      <text x="68" y="18" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">J</text>
      <rect x="78" y="6" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
      <text x="86" y="18" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">K</text>

      <rect x="6" y="24" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
      <text x="14" y="36" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">C</text>
      <rect x="24" y="24" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
      <text x="32" y="36" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">D</text>
      <rect x="42" y="24" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
      <text x="50" y="36" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">E</text>
      <rect x="60" y="24" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
      <text x="68" y="36" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">F</text>
      <rect x="78" y="24" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
      <text x="86" y="36" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">G</text>

      <rect x="6" y="42" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
      <text x="14" y="54" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">Z</text>
      <rect x="24" y="42" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
      <text x="32" y="54" textAnchor="middle" fill="#39ff14" fontSize="9" fontWeight="bold">X</text>
      <rect x="42" y="42" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
      <text x="50" y="54" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">C</text>
      <rect x="60" y="42" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
      <text x="68" y="54" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">V</text>
      <rect x="78" y="42" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
      <text x="86" y="54" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">B</text>

      <rect x="6" y="60" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
      <text x="14" y="72" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">E</text>
      <rect x="24" y="60" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
      <text x="32" y="72" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">F</text>
      <rect x="42" y="60" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
      <text x="50" y="72" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">G</text>
      <rect x="60" y="60" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
      <text x="68" y="72" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">H</text>
      <rect x="78" y="60" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
      <text x="86" y="72" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">I</text>

      <rect x="6" y="78" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
      <text x="14" y="90" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">O</text>
      <rect x="24" y="78" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
      <text x="32" y="90" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">P</text>
      <rect x="42" y="78" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
      <text x="50" y="90" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">Q</text>
      <rect x="60" y="78" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
      <text x="68" y="90" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">R</text>
      <rect x="78" y="78" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
      <text x="86" y="90" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">S</text>

      <rect x="22" y="4" width="36" height="56" rx="4" fill="rgba(255, 230, 0, 0.08)" stroke="#d4ff00" strokeWidth="2" />
      <circle cx="22" cy="60" r="3" fill="#d4ff00" />
      <circle cx="58" cy="4" r="3" fill="#d4ff00" />
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
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) onBack();
    navigate('/dashboard');
  };

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

  const getTierDesc = (tierId, isPlayable) => {
    if (!isPlayable) {
      if (tierId === 'medium') return 'Complete all 5 Easy stages to unlock.';
      if (tierId === 'hard') return 'Complete all 5 Medium stages to unlock.';
    }
    if (activeCategory === 'caesar') {
      if (tierId === 'easy') return 'Beginner-friendly challenges to master the cipher basics.';
      if (tierId === 'medium') return 'Intermediate challenges with more complex keys.';
      if (tierId === 'hard') return 'Decrypt alphabet letters using mathematical modular arithmetic key offsets.';
    } else if (activeCategory === 'vigenere') {
      if (tierId === 'easy') return 'Polyalphabetic substitution with short keyword repetitions.';
      if (tierId === 'medium') return 'Intermediate challenges with dynamic keyword shifts.';
      if (tierId === 'hard') return 'Full tableau cipher challenges with extended keyword cycles.';
    } else if (activeCategory === 'playfair') {
      if (tierId === 'easy') return 'Basic digraph substitutions using standard coordinate rules.';
      if (tierId === 'medium') return 'Intermediate challenges with row, column, and rectangle swaps.';
      if (tierId === 'hard') return 'Master 5×5 key matrix operations across full-text digraphs.';
    }
    return 'Challenge stages to master this cipher.';
  };

  const tiers = [
    {
      id: 'easy',
      name: 'Easy',
      colorClass: 'easy',
      title: labels.easy,
      desc: getTierDesc('easy', true),
      xp: '+100 XP / Level',
      count: easyCount,
      isPlayable: true,
    },
    {
      id: 'medium',
      name: 'Medium',
      colorClass: 'medium',
      title: labels.medium,
      desc: getTierDesc('medium', isEasyCompleted),
      xp: '+250 XP / Level',
      count: mediumCount,
      isPlayable: isEasyCompleted,
    },
    {
      id: 'hard',
      name: 'Hard',
      colorClass: 'hard',
      title: labels.hard,
      desc: getTierDesc('hard', isMediumCompleted),
      xp: '+500 XP / Level',
      count: hardCount,
      isPlayable: isMediumCompleted,
    },
  ];

  return (
    <div className="game-lobby cq-lobby-screen">
      {/* ── Legibility Scrim Overlay ── */}
      <div className="cq-lobby-scrim" />

      {/* ── Standardized Left-Aligned Screen Header Block ── */}
      <div className="cq-screen-header-block">
        <div className="cq-top-nav-bar">
          <button className="cq-back-btn" onClick={handleBack}>
            <span className="cq-back-icon-circle">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
            </span>
            <span>Back to Dashboard</span>
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
        <div className="cq-tier-cards-row">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              role="button"
              tabIndex={0}
              className={`cq-tier-card ${tier.isPlayable ? 'playable' : 'locked'}`}
              onClick={() => {
                if (tier.isPlayable) onSelectDifficulty(tier.id);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (tier.isPlayable) onSelectDifficulty(tier.id);
                }
              }}
            >
              {/* Inset Artwork Emblem Panel */}
              <div className="cq-tier-art-panel">
                {/* Plain colored tier label overlaid inside the artwork's top-left corner */}
                <span className={`cq-tier-art-label ${tier.colorClass}`}>
                  {tier.name}
                </span>

                {/* Padlock icon in bottom-right of artwork for locked tiers */}
                {!tier.isPlayable && (
                  <div className="cq-tier-corner-lock">
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>lock</span>
                  </div>
                )}

                {/* Cipher Artwork Vector */}
                {cipherArtworks[activeCategory] || cipherArtworks.caesar}
              </div>

              {/* Card Body */}
              <div className="cq-tier-card-body">
                <div>
                  {/* Title Row with XP tag */}
                  <div className="cq-tier-title-row">
                    <h3 className="cq-tier-card-title">{tier.title}</h3>
                    <span className="cq-tier-xp-tag">{tier.xp}</span>
                  </div>

                  <p className="cq-tier-card-desc">{tier.desc}</p>
                </div>

                {/* Stages Footer */}
                <div className="cq-tier-card-footer">
                  <span>
                    {tier.count > 0 ? `5 stages (${tier.count}/5 done)` : '5 stages'}
                  </span>
                </div>
              </div>
            </div>
          ))}
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