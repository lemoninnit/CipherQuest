import React, { useState } from 'react';
import './LobbyTutorialPanel.css';

const CIPHERS = {
  caesar: {
    id: 'caesar',
    name: 'Caesar',
    subtitle: 'FIXED-SHIFT SUBSTITUTION',
    formula: 'P = (C - K + 26) mod 26',
    legend: [
      { key: 'C', label: 'cipher letter', color: 'cyan' },
      { key: 'K', label: 'shift key', color: 'amber' },
      { key: 'P', label: 'plain letter', color: 'white' },
    ],
    stripLabel: 'Count back 3 from D to land on A',
    stripBadge: '-3',
    highlightIndices: {
      3: 'cyan',  // D
      0: 'amber', // A
    },
    steps: [
      { step: 'STEP 1', title: 'Find the key', desc: 'Read the shift K from the HUD or stage clue.' },
      { step: 'STEP 2', title: 'Get the index', desc: 'Turn the cipher letter into a number, A = 0.' },
      { step: 'STEP 3', title: 'Subtract & wrap', desc: 'C - K. Below 0? Add 26.' },
    ],
    examples: [
      { input: 'D - 3', calc: '3 - 3 = 0', output: 'A' },
      { input: 'B - 3', calc: '1 - 3 + 26 = 24', output: 'Y' },
    ],
  },
  vigenere: {
    id: 'vigenere',
    name: 'Vigenère',
    subtitle: 'POLYALPHABETIC KEYWORD CIPHER',
    formula: 'P = (C - Kval + 26) mod 26',
    legend: [
      { key: 'C', label: 'cipher letter', color: 'cyan' },
      { key: 'Kval', label: 'key letter value', color: 'amber' },
      { key: 'P', label: 'plain letter', color: 'white' },
    ],
    stripLabel: 'Align key letter index to decrypt (Key K = 10, Cipher R = 17)',
    stripBadge: '-10',
    highlightIndices: {
      17: 'cyan',   // R
      10: 'amber',  // K
      7: 'emerald', // H
    },
    steps: [
      { step: 'STEP 1', title: 'Align keyword', desc: 'Repeat the secret keyword under the ciphertext.' },
      { step: 'STEP 2', title: 'Get key value', desc: 'Look up the key letter index (A = 0, B = 1...).' },
      { step: 'STEP 3', title: 'Subtract shift', desc: 'C - Kval. Below 0? Add 26.' },
    ],
    examples: [
      { input: 'R (Key K)', calc: '17 - 10 = 7', output: 'H' },
      { input: 'C (Key E)', calc: '2 - 4 + 26 = 24', output: 'Y' },
    ],
  },
  playfair: {
    id: 'playfair',
    name: 'Playfair',
    subtitle: '5×5 MATRIX DIGRAPH SUBSTITUTION',
    formula: 'Inverse Geometric Matrix Rules',
    legend: [
      { key: 'Pairs', label: '2-letter digraphs', color: 'cyan' },
      { key: '5×5', label: 'keyword grid', color: 'amber' },
      { key: 'Rules', label: 'corner swap / shift left / shift up', color: 'white' },
    ],
    isPlayfair: true,
    rules: [
      { name: 'Rectangle', desc: 'Swap column coordinates across opposite corners.' },
      { name: 'Same Row', desc: 'Shift 1 step to the LEFT (wrap around).' },
      { name: 'Same Column', desc: 'Shift 1 step UP (wrap around).' },
    ],
    steps: [
      { step: 'STEP 1', title: 'Split into pairs', desc: 'Group ciphertext into 2-letter digraphs (BM, OD...).' },
      { step: 'STEP 2', title: 'Locate in 5×5', desc: 'Find row and column of both letters on grid.' },
      { step: 'STEP 3', title: 'Apply rule', desc: 'Swap columns, shift left, or shift up.' },
    ],
    examples: [
      { input: 'B M (Rectangle)', calc: 'Swap column corners', output: 'Plain Pair' },
      { input: 'K X (Same Row)', calc: 'Shift 1 tile Left (wrap)', output: 'Plain Pair' },
    ],
  },
};

const GAMES = {
  fishing: {
    id: 'fishing',
    name: 'Fishing',
    goal: 'catch every fish carrying the right decrypted letter to fill the word.',
    controls: [
      { key: 'HOLD SPACE', desc: 'Charge your cast' },
      { key: 'TAP SPACE', desc: 'Reel & hold tension' },
      { key: 'CHUM', desc: 'Pull fish closer' },
    ],
    walkthrough: [
      { step: 1, title: 'Read the active slot', desc: 'Check the HUD for the letter you need.' },
      { step: 2, title: 'Decode it', desc: 'Use the formula on the left to find the target.' },
      { step: 3, title: 'Cast', desc: "Release when the power bar reaches the fish's depth." },
      { step: 4, title: 'Reel in the green zone', desc: 'Keep tension out of red or the line snaps.' },
      { step: 5, title: 'Fill every slot', desc: 'Complete the word before attempts run out.' },
    ],
  },
  pacman: {
    id: 'pacman',
    name: 'Pacman',
    goal: 'navigate the maze, evade hazard ghosts, and capture correct target letter ghosts.',
    controls: [
      { key: 'WASD / ARROWS', desc: 'Steer agent in maze' },
      { key: 'PELLETS', desc: 'Speed & freeze ghosts' },
      { key: 'TABULA (T)', desc: 'Toggle matrix HUD' },
    ],
    walkthrough: [
      { step: 1, title: 'Inspect target slot', desc: 'Check active HUD slot to see which letter is missing.' },
      { step: 2, title: 'Decode target', desc: 'Use cipher decryption rules to identify target ghost.' },
      { step: 3, title: 'Navigate corridors', desc: 'Move through open lanes while dodging red hazard ghosts.' },
      { step: 4, title: 'Capture target ghost', desc: 'Touch the matching letter ghost to fill the word slot.' },
      { step: 5, title: 'Solve & extract', desc: 'Fill all slots to open the extraction portal.' },
    ],
  },
  sprint: {
    id: 'sprint',
    name: 'Sprint',
    goal: 'switch lanes at high speed, dodge monsters, and collect decrypted diamonds.',
    controls: [
      { key: 'W / S or UP / DOWN', desc: 'Switch 3 lanes' },
      { key: 'A / D or LEFT / RIGHT', desc: 'Fine-tune position' },
      { key: 'ESC / PAUSE', desc: 'Review key & strategy' },
    ],
    walkthrough: [
      { step: 1, title: 'Calculate target letter', desc: 'Check the active clue to know which diamond to grab.' },
      { step: 2, title: 'Scan upcoming lanes', desc: 'Look ahead for the lane with the target diamond.' },
      { step: 3, title: 'Switch lanes safely', desc: 'Steer into the clear lane and avoid obstacles.' },
      { step: 4, title: 'Collect target diamond', desc: 'Collect diamonds to decrypt stage word slots.' },
      { step: 5, title: 'Secure the stage', desc: 'Complete the phrase before running out of hearts.' },
    ],
  },
};

const ALPHABET_ROW_1 = [
  { char: 'A', idx: 0 }, { char: 'B', idx: 1 }, { char: 'C', idx: 2 }, { char: 'D', idx: 3 },
  { char: 'E', idx: 4 }, { char: 'F', idx: 5 }, { char: 'G', idx: 6 }, { char: 'H', idx: 7 },
  { char: 'I', idx: 8 }, { char: 'J', idx: 9 }, { char: 'K', idx: 10 }, { char: 'L', idx: 11 },
  { char: 'M', idx: 12 },
];

const ALPHABET_ROW_2 = [
  { char: 'N', idx: 13 }, { char: 'O', idx: 14 }, { char: 'P', idx: 15 }, { char: 'Q', idx: 16 },
  { char: 'R', idx: 17 }, { char: 'S', idx: 18 }, { char: 'T', idx: 19 }, { char: 'U', idx: 20 },
  { char: 'V', idx: 21 }, { char: 'W', idx: 22 }, { char: 'X', idx: 23 }, { char: 'Y', idx: 24 },
  { char: 'Z', idx: 25 },
];

export default function LobbyTutorialPanel({
  initialCipher = 'caesar',
  initialGame = 'fishing',
}) {
  const [selectedCipher, setSelectedCipher] = useState(initialCipher);
  const [selectedGame, setSelectedGame] = useState(initialGame);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const cipher = CIPHERS[selectedCipher] || CIPHERS.caesar;
  const game = GAMES[selectedGame] || GAMES.fishing;

  const handleCipherChange = (cipherId) => {
    if (cipherId === selectedCipher) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setSelectedCipher(cipherId);
      setIsTransitioning(false);
    }, 100);
  };

  const handleGameChange = (gameId) => {
    setSelectedGame(gameId);
  };

  return (
    <div className="cq-tut-container">
      {/* ── Top Header Row: Centered Cipher Switcher Capsule & Right Subtitle ── */}
      <div className="cq-tut-header-bar">
        <div className="cq-tut-cipher-capsule" role="tablist" aria-label="Cipher categories">
          {Object.keys(CIPHERS).map((key) => {
            const c = CIPHERS[key];
            const isActive = selectedCipher === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`cq-tut-cipher-btn ${isActive ? 'active' : ''}`}
                onClick={() => handleCipherChange(key)}
              >
                {c.name}
              </button>
            );
          })}
        </div>
        <div className="cq-tut-cipher-subline">{cipher.subtitle}</div>
      </div>

      {/* ── Main 2-Column Layout ── */}
      <div className={`cq-tut-columns ${isTransitioning ? 'transitioning' : ''}`}>
        {/* ════════ LEFT COLUMN: 01 HOW TO SOLVE ════════ */}
        <div className="cq-tut-col cq-tut-col-solve">
          <div className="cq-tut-col-header">
            <div className="cq-tut-title-wrap">
              <span className="cq-tut-num-tag">01</span>
              <h2 className="cq-tut-col-title">How to Solve</h2>
            </div>
          </div>

          {/* Formula Block */}
          <div className="cq-tut-formula-block">
            <div className="cq-tut-formula-math">{cipher.formula}</div>
            <div className="cq-tut-formula-legend">
              {cipher.legend.map((item, i) => (
                <span key={i} className={`cq-legend-item color-${item.color}`}>
                  <strong>{item.key}</strong> {item.label}
                </span>
              ))}
            </div>
          </div>

          {/* A–Z Strip or Playfair Matrix Rules */}
          {!cipher.isPlayfair ? (
            <div className="cq-tut-strip-block">
              <div className="cq-tut-strip-top">
                <span className="cq-tut-strip-label">{cipher.stripLabel}</span>
                {cipher.stripBadge && (
                  <span className="cq-tut-strip-badge">{cipher.stripBadge}</span>
                )}
              </div>

              <div className="cq-tut-az-grid">
                <div className="cq-tut-az-row">
                  {ALPHABET_ROW_1.map((tile) => {
                    const highlight = cipher.highlightIndices[tile.idx];
                    return (
                      <div
                        key={tile.idx}
                        className={`cq-az-tile ${highlight ? `highlight-${highlight}` : ''}`}
                      >
                        <span className="cq-az-char">{tile.char}</span>
                        <span className="cq-az-idx">{tile.idx}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="cq-tut-az-row">
                  {ALPHABET_ROW_2.map((tile) => {
                    const highlight = cipher.highlightIndices[tile.idx];
                    return (
                      <div
                        key={tile.idx}
                        className={`cq-az-tile ${highlight ? `highlight-${highlight}` : ''}`}
                      >
                        <span className="cq-az-char">{tile.char}</span>
                        <span className="cq-az-idx">{tile.idx}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="cq-tut-rules-block">
              <div className="cq-tut-strip-top">
                <span className="cq-tut-strip-label">3 Geometric Matrix Rules</span>
              </div>
              <div className="cq-tut-rules-grid">
                {cipher.rules.map((rule, i) => (
                  <div key={i} className="cq-rule-card">
                    <strong className="cq-rule-name">{rule.name}</strong>
                    <span className="cq-rule-desc">{rule.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3 Short Steps Side by Side */}
          <div className="cq-tut-steps-grid">
            {cipher.steps.map((st, i) => (
              <div key={i} className="cq-step-box">
                <span className="cq-step-tag">{st.step}</span>
                <strong className="cq-step-title">{st.title}</strong>
                <p className="cq-step-desc">{st.desc}</p>
              </div>
            ))}
          </div>

          {/* Calculation Examples Directly Under the 3 Steps */}
          <div className="cq-tut-examples-row">
            {cipher.examples.map((ex, i) => (
              <div key={i} className="cq-ex-pill">
                <span className="cq-ex-input">{ex.input}</span>
                <span className="cq-ex-calc">{ex.calc}</span>
                <span className="cq-ex-output">{ex.output}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ════════ RIGHT COLUMN: 02 HOW TO PLAY ════════ */}
        <div className="cq-tut-col cq-tut-col-play">
          <div className="cq-tut-col-header">
            <div className="cq-tut-title-wrap">
              <span className="cq-tut-num-tag">02</span>
              <h2 className="cq-tut-col-title">How to Play</h2>
            </div>

            {/* Game Text Tabs */}
            <div className="cq-tut-game-tabs" role="tablist" aria-label="Game mode tabs">
              {Object.keys(GAMES).map((key) => {
                const g = GAMES[key];
                const isActive = selectedGame === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`cq-game-tab-btn ${isActive ? 'active' : ''}`}
                    onClick={() => handleGameChange(key)}
                  >
                    {g.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Goal Banner */}
          <div className="cq-tut-goal-banner">
            <span className="material-symbols-outlined cq-goal-icon">flag</span>
            <div className="cq-goal-text">
              <strong>Goal</strong> — {game.goal}
            </div>
          </div>

          {/* Controls Section */}
          <div className="cq-tut-controls-section">
            <span className="cq-section-heading">CONTROLS</span>
            <div className="cq-controls-cards">
              {game.controls.map((ctrl, i) => (
                <div key={i} className="cq-ctrl-card">
                  <div className="cq-ctrl-key">{ctrl.key}</div>
                  <div className="cq-ctrl-desc">{ctrl.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Walkthrough Section */}
          <div className="cq-tut-walkthrough-section">
            <span className="cq-section-heading">WALKTHROUGH</span>
            <div className="cq-walkthrough-list">
              {game.walkthrough.map((item) => (
                <div key={item.step} className="cq-walkthrough-row">
                  <div className="cq-walk-badge">{item.step}</div>
                  <div className="cq-walk-content">
                    <strong className="cq-walk-title">{item.title}</strong>
                    <span className="cq-walk-desc">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
