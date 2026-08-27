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
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(0, 229, 255, 0.4)" strokeWidth="2" strokeDasharray="3 3" />
          <circle cx="50" cy="50" r="28" fill="none" stroke="rgba(0, 229, 255, 0.8)" strokeWidth="2" />
          <circle cx="50" cy="50" r="14" fill="rgba(0, 229, 255, 0.15)" stroke="#00e5ff" strokeWidth="1.5" />
          <text x="50" y="16" textAnchor="middle" fill="#00e5ff" fontSize="8" fontWeight="bold">A B C D E</text>
          <text x="50" y="30" textAnchor="middle" fill="#39ff14" fontSize="7" fontWeight="bold">D E F G H</text>
          <path d="M50 20 L50 24 M50 76 L50 80 M20 50 L24 50 M76 50 L80 50" stroke="#00e5ff" strokeWidth="2" />
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
          <rect x="10" y="22" width="80" height="22" rx="4" fill="rgba(0, 229, 255, 0.15)" stroke="rgba(0, 229, 255, 0.6)" strokeWidth="1.5" />
          <text x="50" y="36" textAnchor="middle" fill="#e8f4f8" fontSize="9" fontFamily="monospace" fontWeight="bold">P L A I N T E X T</text>
          
          <rect x="10" y="56" width="80" height="22" rx="4" fill="rgba(255, 0, 127, 0.15)" stroke="rgba(255, 0, 127, 0.6)" strokeWidth="1.5" />
          <text x="50" y="70" textAnchor="middle" fill="#ff007f" fontSize="9" fontFamily="monospace" fontWeight="bold">K E Y K E Y K E Y</text>
          
          <path d="M30 44 L30 56 M50 44 L50 56 M70 44 L70 56" stroke="#ffd700" strokeWidth="1.5" strokeDasharray="2 2" />
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
          <rect x="10" y="10" width="80" height="80" rx="6" fill="rgba(6, 19, 36, 0.6)" stroke="rgba(57, 255, 20, 0.4)" strokeWidth="1.5" />
          <line x1="26" y1="10" x2="26" y2="90" stroke="rgba(255,255,255,0.12)" />
          <line x1="42" y1="10" x2="42" y2="90" stroke="rgba(255,255,255,0.12)" />
          <line x1="58" y1="10" x2="58" y2="90" stroke="rgba(255,255,255,0.12)" />
          <line x1="74" y1="10" x2="74" y2="90" stroke="rgba(255,255,255,0.12)" />
          <line x1="10" y1="26" x2="90" y2="26" stroke="rgba(255,255,255,0.12)" />
          <line x1="10" y1="42" x2="90" y2="42" stroke="rgba(255,255,255,0.12)" />
          <line x1="10" y1="58" x2="90" y2="58" stroke="rgba(255,255,255,0.12)" />
          <line x1="10" y1="74" x2="90" y2="74" stroke="rgba(255,255,255,0.12)" />
          <rect x="26" y="26" width="32" height="32" fill="rgba(57, 255, 20, 0.2)" stroke="#39ff14" strokeWidth="2" rx="2" />
          <circle cx="34" cy="34" r="3.5" fill="#39ff14" />
          <circle cx="50" cy="50" r="3.5" fill="#39ff14" />
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
            CipherQuest <span className="dh-lock-icon">🔒</span>
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
          <button className="dh-menu-item" onClick={() => setShowTutorial(true)}>
            Tutorial
          </button>
          <button className="dh-menu-item" onClick={() => navigate('/dashboard/badges')}>
            Badges
          </button>
          <button className="dh-menu-item" onClick={openSettings}>
            Settings
          </button>
          <button className="dh-menu-item danger" onClick={handleQuit}>
            Quit
          </button>
        </nav>

        {/* Cards Row */}
        <div className="dh-cards-row">
          {cardsData.map((card) => (
            <div
              key={card.id}
              role="button"
              tabIndex={0}
              className="dh-quest-card"
              onClick={() => navigate('/dashboard/ciphergame')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate('/dashboard/ciphergame');
                }
              }}
            >
              <div className="dh-card-art-panel">
                {card.svg}
              </div>
              <div className="dh-card-body">
                <h3 className="dh-card-title">{card.title}</h3>
                <p className="dh-card-desc">{card.desc}</p>
              </div>
              <div className="dh-card-footer">
                <span className="dh-card-xp">{card.xp}</span>
                <button className="dh-card-play-btn" tabIndex={-1} aria-label="Play">
                  <span className="material-symbols-outlined fill-1">play_arrow</span>
                </button>
              </div>
            </div>
          ))}
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