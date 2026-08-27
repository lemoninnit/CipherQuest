import React, { useState, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardChromeContext } from '../../layout/DashboardLayout';

const CategorySelector = ({ onSelectCategory, completedLevels = {} }) => {
  const navigate = useNavigate();
  const { openSettings } = useContext(DashboardChromeContext);
  const [showTutorial, setShowTutorial] = useState(false);

  const caesarRef = useRef(null);
  const vigenereRef = useRef(null);
  const playfairRef = useRef(null);

  const handleStartQuest = () => {
    if (caesarRef.current) {
      caesarRef.current.focus();
      caesarRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

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
      icon: 'sort_by_alpha',
      classKey: 'caesar',
      desc: 'Shift letters of the alphabet by a fixed numeric key. Learn the foundation of monoalphabetic substitution ciphers.',
      ref: caesarRef,
      stages: 15,
      completed: getCompletedCount('caesar'),
      reward: '+100 XP / Level',
    },
    {
      id: 'vigenere',
      title: 'Vigenère Cipher',
      icon: 'vpn_key',
      classKey: 'vigenere',
      desc: 'Polyalphabetic substitution using a repeating keyword. Decrypt repeating keyword shifts dynamically.',
      ref: vigenereRef,
      stages: 15,
      completed: getCompletedCount('vigenere'),
      reward: '+100 XP / Level',
    },
    {
      id: 'playfair',
      title: 'Playfair Cipher',
      icon: 'grid_view',
      classKey: 'playfair',
      desc: 'Encrypt pairs of letters (digraphs) inside a 5×5 key matrix. Learn row, column, and rectangular swaps.',
      ref: playfairRef,
      stages: 15,
      completed: getCompletedCount('playfair'),
      reward: '+100 XP / Level',
    },
  ];

  return (
    <div className="game-lobby cq-lobby-screen">
      {/* ── Main Lobby Hero Header ── */}
      <div className="lobby-header cq-lobby-header">
        <div className="cq-lobby-badge-wrapper">
          <span className="material-symbols-outlined fill-1 lobby-badge-icon">sports_esports</span>
        </div>
        <h1 className="lobby-title cq-lobby-main-title">CIPHERQUEST TERMINAL</h1>
        <p className="lobby-subtitle cq-lobby-main-subtitle">
          Select a cipher module to deploy into tactical arcade operations
        </p>
      </div>

      {/* ── Lobby Quick Action Bar ── */}
      <div className="cq-lobby-menu-bar">
        <button className="cq-lobby-menu-btn primary" onClick={handleStartQuest}>
          <span className="material-symbols-outlined">play_arrow</span>
          <span>Start Quest</span>
        </button>
        <button className="cq-lobby-menu-btn" onClick={() => setShowTutorial(true)}>
          <span className="material-symbols-outlined">menu_book</span>
          <span>Tutorial</span>
        </button>
        <button className="cq-lobby-menu-btn" onClick={openSettings}>
          <span className="material-symbols-outlined">settings</span>
          <span>Settings</span>
        </button>
        <button className="cq-lobby-menu-btn danger" onClick={() => navigate('/dashboard')}>
          <span className="material-symbols-outlined">logout</span>
          <span>Quit Game</span>
        </button>
      </div>

      {/* ── Category Modules Grid ── */}
      <div className="flow-grid cq-lobby-grid">
        {categories.map((cat) => (
          <div
            key={cat.id}
            ref={cat.ref}
            tabIndex={0}
            className={`flow-card active cq-lobby-card cq-card-${cat.classKey}`}
            onClick={() => onSelectCategory(cat.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectCategory(cat.id); }}
          >
            <div className="flow-card-header">
              <div className={`flow-icon-box ${cat.classKey}`}>
                <span className="material-symbols-outlined">{cat.icon}</span>
              </div>
              <span className="flow-status active">
                {cat.completed > 0 ? `${cat.completed} / ${cat.stages} DONE` : 'AVAILABLE'}
              </span>
            </div>

            <h3 className="flow-card-title">{cat.title}</h3>
            <p className="flow-card-desc">{cat.desc}</p>

            <div className="flow-card-footer">
              <span className="flow-stat">{cat.stages} STAGES</span>
              <span className="flow-reward">{cat.reward}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tutorial Modal ── */}
      {showTutorial && (
        <div className="settings-modal-overlay" onClick={() => setShowTutorial(false)}>
          <div className="settings-modal-content cq-tutorial-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="material-symbols-outlined text-primary" style={{ color: 'var(--neon-cyan)' }}>menu_book</span>
                <h2>CipherQuest Field Manual</h2>
              </div>
              <button className="settings-close-btn" onClick={() => setShowTutorial(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="settings-modal-body cq-tutorial-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="cq-tutorial-section">
                <h3>🔤 1. Caesar Cipher</h3>
                <p>
                  Every letter in the plaintext is shifted by a fixed key number (e.g. key +3 turns A into D). Simple monoalphabetic substitution.
                </p>
              </div>

              <div className="cq-tutorial-section">
                <h3>🔑 2. Vigenère Cipher</h3>
                <p>
                  Uses a repeating keyword. Each letter shift is determined by the corresponding key character in the repeating keyword string.
                </p>
              </div>

              <div className="cq-tutorial-section">
                <h3>🗂️ 3. Playfair Cipher</h3>
                <p>
                  Encrypts letter pairs (digraphs) using a 5×5 key matrix. Decrypt by reversing row shifts, column shifts, or rectangle corner swaps.
                </p>
              </div>

              <div className="cq-tutorial-section">
                <h3>🎮 4. Arcade Operations</h3>
                <p>
                  • 🎣 <strong>Fishing:</strong> Reel in letters or keyword slots using arrow/wasd keys or mouse clicks.<br />
                  • 🟡 <strong>Pacman:</strong> Navigate ghost-infested mazes to collect plaintext letters.<br />
                  • 🏃 <strong>Sprint:</strong> Relay run through hurdles by steering into matching ciphertext lanes.
                </p>
              </div>
            </div>

            <div style={{ padding: '16px 28px', borderTop: '1px solid rgba(0, 229, 255, 0.1)', textAlign: 'right' }}>
              <button className="fg-btn fg-btn-primary" onClick={() => setShowTutorial(false)} style={{ background: 'var(--neon-cyan)', color: '#030914' }}>
                Got It, Operative!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategorySelector;