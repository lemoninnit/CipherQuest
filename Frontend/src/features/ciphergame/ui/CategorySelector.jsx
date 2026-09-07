import React from 'react';
import { useNavigate } from 'react-router-dom';

const cipherArtworks = {
  caesar: (
    <svg viewBox="0 0 100 100" className="cq-card-svg" aria-hidden="true">
      <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(0, 229, 255, 0.25)" strokeWidth="1.5" strokeDasharray="3 3" />
      <path d="M 32,38 A 22,22 0 1,1 68,38" fill="none" stroke="#00e5ff" strokeWidth="3.5" strokeLinecap="round" />
      <polyline points="62,31 68,38 76,34" fill="none" stroke="#00e5ff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 68,62 A 22,22 0 1,1 32,62" fill="none" stroke="#00e5ff" strokeWidth="3.5" strokeLinecap="round" />
      <polyline points="38,69 32,62 24,66" fill="none" stroke="#00e5ff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <text x="26" y="44" fill="#00e5ff" fontSize="10" fontWeight="bold" fontFamily="sans-serif">A</text>
      <text x="69" y="44" fill="#10b981" fontSize="10" fontWeight="bold" fontFamily="sans-serif">X</text>
    </svg>
  ),
  vigenere: (
    <svg viewBox="0 0 100 100" className="cq-card-svg" aria-hidden="true">
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
      <text x="14" y="72" textAnchor="middle" fill="#10b981" fontSize="9" fontWeight="bold">C</text>
      <rect x="24" y="60" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
      <text x="32" y="72" textAnchor="middle" fill="#10b981" fontSize="9" fontWeight="bold">A</text>
      <rect x="42" y="60" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
      <text x="50" y="72" textAnchor="middle" fill="#10b981" fontSize="9" fontWeight="bold">T</text>
      <rect x="60" y="60" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
      <text x="68" y="72" textAnchor="middle" fill="#10b981" fontSize="9" fontWeight="bold">C</text>
      <rect x="78" y="60" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
      <text x="86" y="72" textAnchor="middle" fill="#10b981" fontSize="9" fontWeight="bold">A</text>

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
    <svg viewBox="0 0 100 100" className="cq-card-svg" aria-hidden="true">
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
      <text x="32" y="54" textAnchor="middle" fill="#10b981" fontSize="9" fontWeight="bold">X</text>
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

      <rect x="22" y="4" width="36" height="56" rx="4" fill="rgba(0, 229, 255, 0.08)" stroke="#00e5ff" strokeWidth="1.8" />
      <circle cx="22" cy="60" r="3" fill="#00e5ff" />
      <circle cx="58" cy="4" r="3" fill="#00e5ff" />
    </svg>
  ),
};

const CategorySelector = ({ onSelectCategory, completedLevels = {} }) => {
  const navigate = useNavigate();

  const getCompletedCount = (cat) => {
    const data = completedLevels[cat] || {};
    const easy = (data.easy || []).length;
    const medium = (data.medium || []).length;
    const hard = (data.hard || []).length;
    return easy + medium + hard;
  };

  const categories = [
    {
      id: 'caesar',
      title: 'Caesar Cipher',
      classKey: 'caesar',
      desc: 'Shift letters of the alphabet by a fixed numeric key. Learn the foundation of monoalphabetic substitution ciphers.',
      stages: 15,
      completed: getCompletedCount('caesar'),
      reward: '+100 XP / LEVEL',
    },
    {
      id: 'vigenere',
      title: 'Vigenère Cipher',
      classKey: 'vigenere',
      desc: 'Polyalphabetic substitution using a repeating keyword. Decrypt repeating keyword shifts dynamically.',
      stages: 15,
      completed: getCompletedCount('vigenere'),
      reward: '+100 XP / LEVEL',
    },
    {
      id: 'playfair',
      title: 'Playfair Cipher',
      classKey: 'playfair',
      desc: 'Encrypt pairs of letters (digraphs) inside a 5×5 key matrix. Learn row, column, and rectangular swaps.',
      stages: 15,
      completed: getCompletedCount('playfair'),
      reward: '+100 XP / LEVEL',
    },
  ];

  return (
    <div className="game-lobby cq-lobby-screen">
      {/* ── Legibility Scrim Overlay ── */}
      <div className="cq-lobby-scrim" />

      {/* ── Standardized Left-Aligned Screen Header ── */}
      <div className="cq-screen-header-block">
        <div className="cq-top-nav-bar">
          <button className="cq-back-btn" onClick={() => navigate('/dashboard')}>
            <span className="cq-back-icon-circle">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
            </span>
            <span>Back to Dashboard</span>
          </button>
        </div>

        <div className="cq-screen-header">
          <div className="cq-screen-title-row">
            <h1 className="cq-screen-title">CIPHERQUEST TERMINAL</h1>
            <span className="material-symbols-outlined cq-screen-header-icon">sports_esports</span>
          </div>
          <p className="cq-screen-subtitle">
            Select a cipher module to deploy into tactical arcade operations
          </p>
        </div>
      </div>

      {/* ── Centered Category Modules Row ── */}
      <div className="cq-lobby-center-content">
        <div className="cq-cards-row">
          {categories.map((cat) => {
            const hasCompleted = cat.completed > 0;
            return (
              <div
                key={cat.id}
                role="button"
                tabIndex={0}
                className={`cq-portrait-card cq-card-${cat.classKey}`}
                onClick={() => onSelectCategory(cat.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectCategory(cat.id);
                  }
                }}
              >
                {/* Inset Artwork Emblem Panel */}
                <div className="cq-card-art-panel">
                  {cipherArtworks[cat.id]}
                </div>

                {/* Card Body with Uncrowded Hierarchy */}
                <div className="cq-card-body">
                  <div>
                    {/* Meta Strip: Status tag on left, XP on right */}
                    <div className="cq-card-meta-row">
                      <span className={`cq-badge-tag ${hasCompleted ? 'green' : 'cyan'}`}>
                        {hasCompleted ? `${cat.completed} / ${cat.stages} DONE` : 'AVAILABLE'}
                      </span>
                      <span className="cq-card-xp-tag">{cat.reward}</span>
                    </div>

                    {/* Uncrowded Title */}
                    <h3 className="cq-card-title">{cat.title}</h3>

                    {/* Description */}
                    <p className="cq-card-desc">{cat.desc}</p>
                  </div>

                  <div>
                    <button className="cq-card-action-btn" tabIndex={-1}>
                      Deploy Module
                    </button>
                    <div className="cq-card-footer">
                      <span>{cat.stages} STAGES AVAILABLE</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Centered Bottom Caption Line ── */}
      <div className="cq-lobby-bottom-caption">
        <p>Deploy into tactical cryptographic operations to earn XP and unlock operative badges</p>
      </div>
    </div>
  );
};

export default CategorySelector;