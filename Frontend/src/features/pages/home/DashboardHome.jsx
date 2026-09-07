import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { DashboardChromeContext } from '../../layout/DashboardLayout';
import './DashboardHome.css';

const DashboardHome = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { openSettings } = useContext(DashboardChromeContext);
  const [showTutorial, setShowTutorial] = useState(false);
  const [activeCardId, setActiveCardId] = useState('caesar');

  const xpToNextLevel = 1000;
  const xpProgress = user ? ((user.xp % xpToNextLevel) / xpToNextLevel) * 100 : 0;

  const handleQuit = () => {
    if (window.confirm("Are you sure you want to quit and sign out?")) {
      logout();
      navigate('/');
    }
  };

  const cardsData = [
    {
      id: 'caesar',
      title: 'Caesar Shift',
      desc: 'Decrypt alphabet letters using mathematical modular arithmetic key offsets.',
      xp: '+100 XP / Level',
      art: 'caesar',
      svg: (
        <svg viewBox="0 0 100 100" className="dh-card-svg">
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(0, 229, 255, 0.25)" strokeWidth="1.5" strokeDasharray="3 3" />
          <path d="M 32,38 A 22,22 0 1,1 68,38" fill="none" stroke="#00e5ff" strokeWidth="4" strokeLinecap="round" />
          <polyline points="62,30 68,38 76,34" fill="none" stroke="#00e5ff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 68,62 A 22,22 0 1,1 32,62" fill="none" stroke="#00e5ff" strokeWidth="4" strokeLinecap="round" />
          <polyline points="38,70 32,62 24,66" fill="none" stroke="#00e5ff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <text x="26" y="44" fill="#00e5ff" fontSize="11" fontWeight="bold" fontFamily="sans-serif">A</text>
          <text x="70" y="44" fill="#39ff14" fontSize="11" fontWeight="bold" fontFamily="sans-serif">X</text>
        </svg>
      )
    },
    {
      id: 'vigenere',
      title: 'Vigenère Matrix',
      desc: 'Polyalphabetic substitution using a keyword cycle matrix.',
      xp: '+1,200 XP',
      art: 'vigenere',
      svg: (
        <svg viewBox="0 0 100 100" className="dh-card-svg">
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
      )
    },
    {
      id: 'playfair',
      title: 'Playfair Matrix',
      desc: 'Digraph substitution technique using a coordinate 5×5 grid.',
      xp: '+2,500 XP',
      art: 'playfair',
      svg: (
        <svg viewBox="0 0 100 100" className="dh-card-svg">
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
      )
    }
  ];

  return (
    <div className="dh-lobby">
      {/* Legibility Scrim Overlay */}
      <div className="dh-lobby-scrim" />

      {/* Top Header Bar */}
      <header className="dh-header-bar">
        <div className="dh-wordmark-container">
          <div className="dh-wordmark-title">
            CipherQuest{' '}
            <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="#00e5ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="dh-lock-svg">
              <rect x="5" y="11" width="14" height="10" rx="3" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
          </div>
          <div className="dh-wordmark-subtitle">
            OPERATIVE: {user?.username ?? 'OPERATIVE'} &nbsp;•&nbsp; LEVEL {user?.level ?? 1} OPERATIVE
          </div>
        </div>

        {/* Top-Right HUD Badge */}
        <div className="dh-hud-badge">
          <div className="dh-hud-item">
            <span className="dh-hud-icon">🔥</span>
            <span>{user?.streak ?? 0}</span>
          </div>
          <div className="dh-hud-divider" />
          <div className="dh-hud-item">
            <span className="dh-hud-icon">🏅</span>
            <span>Lv.{user?.level ?? 1}</span>
          </div>
          <div className="dh-hud-divider" />
          <div className="dh-hud-item">
            <span className="dh-hud-icon">⭐</span>
            <span>{user?.xp ?? 0} XP</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="dh-lobby-content">
        {/* Vertical Left Menu */}
        <nav className="dh-side-menu">
          <button className="dh-menu-item primary" onClick={() => navigate('/dashboard/ciphergame')}>
            Start Quest
          </button>
          <button className="dh-menu-item" onClick={() => navigate('/dashboard/badges')}>
            Badges
          </button>
          <button className="dh-menu-item" onClick={() => setShowTutorial(true)}>
            Tutorial
          </button>
          <button className="dh-menu-item" onClick={openSettings}>
            Settings
          </button>
          <button className="dh-menu-item danger" onClick={handleQuit}>
            Quit
          </button>
        </nav>

        {/* Center Section: Cards & Bottom Action Controls */}
        <div className="dh-center-section">
          {/* Cards Row */}
          <div className="dh-cards-row">
            {cardsData.map((card) => {
              const isExpanded = card.id === activeCardId;
              return (
                <div
                  key={card.id}
                  role="button"
                  tabIndex={0}
                  className={`dh-quest-card ${isExpanded ? 'active' : ''}`}
                  onMouseEnter={() => setActiveCardId(card.id)}
                  onFocus={() => setActiveCardId(card.id)}
                  onClick={() => setActiveCardId(card.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActiveCardId(card.id);
                    }
                  }}
                >
                  <div className="dh-card-art-panel">
                    {card.svg}
                  </div>
                  <div className="dh-card-body">
                    <h3 className="dh-card-title">{card.title}</h3>
                    <div className="dh-card-expanded-wrapper">
                      <p className="dh-card-desc">{card.desc}</p>
                      <button
                        className="dh-card-show-tutorial-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowTutorial(true);
                        }}
                      >
                        Show Tutorial
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Action Section: Select Button & Mini Description */}
          <div className="dh-bottom-action-container">
            <button
              className="dh-select-btn"
              onClick={() => navigate('/dashboard/ciphergame')}
            >
              Select
            </button>
            <div className="dh-mini-desc">
              <p>This game contains randomize game mode</p>
              <p>Game mode: Sprint, Pacman, Fishing</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Stats & XP Strip */}
      <footer className="dh-bottom-strip">
        <div className="dh-stats-row">
          <span>▸ {user?.fishingGamesPlayed ?? 0} Games</span>
          <span className="dh-stat-sep">•</span>
          <span>{user?.fishingBestScore ?? 0} Best Score</span>
          <span className="dh-stat-sep">•</span>
          <span>{user?.totalCiphersSolved ?? 0} Solved</span>
        </div>
        <div className="dh-xp-bar-container">
          <span className="dh-xp-label">XP {Math.round(xpProgress)}% ({user?.xp ?? 0}/{xpToNextLevel})</span>
          <div className="dh-xp-track">
            <div className="dh-xp-fill" style={{ width: `${xpProgress}%` }} />
          </div>
        </div>
      </footer>

      {/* Tutorial Modal */}
      {showTutorial && (
        <div className="settings-modal-overlay" onClick={() => setShowTutorial(false)}>
          <div className="settings-modal-content cq-tutorial-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="material-symbols-outlined text-primary" style={{ color: 'var(--neon-cyan, #00e5ff)' }}>menu_book</span>
                <h2>CipherQuest Field Manual</h2>
              </div>
              <button className="settings-close-btn" onClick={() => setShowTutorial(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="settings-modal-body cq-tutorial-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              <div className="cq-tutorial-section">
                <h3>🔤 1. Caesar Shift</h3>
                <p>
                  Shift letters of the alphabet by a fixed numeric key. Learn monoalphabetic substitution through modular math.
                </p>
              </div>

              <div className="cq-tutorial-section">
                <h3>🔑 2. Vigenère Matrix</h3>
                <p>
                  Polyalphabetic substitution using a repeating keyword. Decrypt repeating keyword shifts dynamically.
                </p>
              </div>

              <div className="cq-tutorial-section">
                <h3>🗂️ 3. Playfair Matrix</h3>
                <p>
                  Encrypt pairs of letters (digraphs) inside a 5×5 key matrix using row, column, and rectangular swaps.
                </p>
              </div>

              <div className="cq-tutorial-section">
                <h3>🎮 4. Arcade Operations</h3>
                <p>
                  • 🎣 <strong>Fishing:</strong> Reel in letters or keyword slots.<br />
                  • 🟡 <strong>Pacman:</strong> Navigate maze and eat correct ghosts.<br />
                  • 🏃 <strong>Sprint:</strong> Relay run through ciphertext lanes.
                </p>
              </div>
            </div>

            <div style={{ padding: '16px 28px', borderTop: '1px solid rgba(0, 229, 255, 0.1)', textAlign: 'right' }}>
              <button
                className="fg-btn fg-btn-primary"
                onClick={() => setShowTutorial(false)}
                style={{ background: 'var(--neon-cyan, #00e5ff)', color: '#030914', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Got It, Operative!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardHome;