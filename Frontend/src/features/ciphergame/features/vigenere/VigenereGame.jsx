import React, { useState, useEffect, useRef } from 'react';
import './VigenereGame.css';

/* ─────────────────────────────────────────────────────────────
   Vigenère Math
   Decrypt: P[i] = (C[i] - K[i mod keyLen] + 26) mod 26
   Encrypt: C[i] = (P[i] + K[i mod keyLen]) mod 26
───────────────────────────────────────────────────────────── */
const charToIdx = (ch) => ch.charCodeAt(0) - 65;
const idxToChar = (n) => String.fromCharCode((((n % 26) + 26) % 26) + 65);

const vigenereDecrypt = (ciphertext, key) => {
  if (!key || key.length === 0) return ciphertext;
  let out = '';
  let ki = 0;
  for (const ch of ciphertext) {
    if (ch === ' ') { out += ' '; continue; }
    if (ch >= 'A' && ch <= 'Z') {
      const shift = charToIdx(key[ki % key.length]);
      out += idxToChar(charToIdx(ch) - shift);
      ki++;
    } else {
      out += ch;
    }
  }
  return out;
};

const FISH_EMOJIS = ['🐟', '🐠', '🐡', '🦑', '🦐', '🐙', '🐬'];

/* ─────────────────────────────────────────────────────────────
   Tabula Recta helper — returns one row (the row for keyLetter)
   Cipher letter at column C under key letter K:
     cipher = (plain + K) mod 26
   Decrypt: given cipher column, plain = (cipher - K + 26) mod 26
───────────────────────────────────────────────────────────── */
const tabulaRow = (keyLetter) => {
  const k = charToIdx(keyLetter);
  return Array.from({ length: 26 }, (_, i) => idxToChar(i + k));
};

export default function VigenereGame({
  levelData,
  tier,
  onVerifySubmit,
  onBackToStages,
}) {
  const targetKey = levelData.targetKey;
  const keyLen    = targetKey.length;

  /* ── state machine ── */
  const [phase, setPhase]             = useState('ready');
  const [builtKey, setBuiltKey]       = useState(Array(keyLen).fill(''));
  const [activeSlot, setActiveSlot]   = useState(0);
  const [wrongCount, setWrongCount]   = useState(0); // wrong catches for current slot
  const [hintRevealed, setHintRevealed] = useState(false); // show key letter hint after 2 misses

  /* ── fish & physics ── */
  const [fishList, setFishList]       = useState([]);
  const [bubbles, setBubbles]         = useState([]);
  const [isCasting, setIsCasting]     = useState(false);
  const [caughtFish, setCaughtFish]   = useState(null);
  const [castTarget, setCastTarget]   = useState({ x: 0, y: 0 });
  const [castProg, setCastProg]       = useState(0);
  const [splash, setSplash]           = useState(null);
  const [hoveredFish, setHoveredFish] = useState(null);

  /* ── feedback ── */
  const [feedback, setFeedback]       = useState(null);
  const [recapStep, setRecapStep]     = useState(-1);
  const [showTabula, setShowTabula]   = useState(false);

  const animRef      = useRef(null);
  const feedbackTimer = useRef(null);

  /* ── derived ── */
  const partialKey    = builtKey.join('');
  const cipherChars   = levelData.ciphertext.replace(/ /g, '').split('');
  const plainChars    = levelData.plaintext.replace(/ /g, '').split('');

  const letterStatuses = cipherChars.map((_, i) => {
    const keyPos = i % keyLen;
    if (!builtKey[keyPos]) return 'pending';
    const shift = charToIdx(targetKey[keyPos]);
    const dec   = idxToChar(charToIdx(cipherChars[i]) - shift);
    return dec === plainChars[i] ? 'correct' : 'wrong';
  });

  const allCorrect = builtKey.join('') === targetKey;

  /* ── fish spawn — always 1 correct + decoys ── */
  const spawnFish = (slot) => {
    const correct = targetKey[slot];
    const pool = new Set([correct]);
    while (pool.size < 7) {
      pool.add(idxToChar(Math.floor(Math.random() * 26)));
    }
    return [...pool].sort(() => Math.random() - 0.5).map((letter, i) => ({
      id: Date.now() + i,
      letter,
      x: 8 + Math.random() * 80,
      y: 30 + Math.random() * 100, // kept within 180px pond height
      speed: 0.10 + Math.random() * 0.12,
      direction: Math.random() > 0.5 ? 1 : -1,
      emoji: FISH_EMOJIS[i % FISH_EMOJIS.length],
    }));
  };

  const spawnBubbles = () => {
    const list = [];
    for (let i = 0; i < 14; i++) {
      list.push({ id: i, x: Math.random() * 100, size: 3 + Math.random() * 7, delay: Math.random() * 6, duration: 5 + Math.random() * 5 });
    }
    setBubbles(list);
  };

  const startGame = () => {
    setBuiltKey(Array(keyLen).fill(''));
    setActiveSlot(0);
    setWrongCount(0);
    setHintRevealed(false);
    setHoveredFish(null);
    setPhase('playing');
    setFishList(spawnFish(0));
    spawnBubbles();
  };

  useEffect(() => {
    setPhase('ready');
    setBuiltKey(Array(keyLen).fill(''));
    setActiveSlot(0);
    setWrongCount(0);
    setHintRevealed(false);
    setHoveredFish(null);
  }, [levelData]);

  /* ── physics loop ── */
  useEffect(() => {
    if (phase !== 'playing') return;
    const tick = () => {
      setFishList(prev => prev.map(f => {
        let nx = f.x + f.speed * f.direction * 0.07;
        let nd = f.direction;
        if (nx > 92) { nx = 92; nd = -1; }
        if (nx < 8)  { nx = 8;  nd = 1;  }
        return { ...f, x: nx, direction: nd };
      }));
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [phase]);

  /* ── cast ── */
  const castAt = (fish) => {
    if (isCasting || phase !== 'playing') return;
    setIsCasting(true);
    setCaughtFish(fish);
    setHoveredFish(null);
    const pondEl = document.querySelector('.vg-pond-section');
    const pondW  = pondEl?.offsetWidth || 600;
    setCastTarget({ x: (fish.x / 100) * pondW, y: fish.y });

    let start = null;
    const castOut = (ts) => {
      if (!start) start = ts;
      const prog = Math.min((ts - start) / 320, 1);
      setCastProg(prog);
      if (prog < 1) { requestAnimationFrame(castOut); return; }
      setSplash({ x: fish.x, y: fish.y });
      setTimeout(() => setSplash(null), 500);
      setFishList(prev => prev.filter(f => f.id !== fish.id));
      setTimeout(() => {
        let rs = null;
        const reelIn = (ts2) => {
          if (!rs) rs = ts2;
          const rp = Math.min((ts2 - rs) / 380, 1);
          setCastProg(1 - rp);
          if (rp < 1) { requestAnimationFrame(reelIn); return; }
          setIsCasting(false);
          setCaughtFish(null);
          handleCatch(fish);
        };
        requestAnimationFrame(reelIn);
      }, 60);
    };
    requestAnimationFrame(castOut);
  };

  /* ── catch result ── */
  const handleCatch = (fish) => {
    setHoveredFish(null);
    const correct = fish.letter === targetKey[activeSlot];
    if (correct) {
      const nextKey = [...builtKey];
      nextKey[activeSlot] = fish.letter;
      setBuiltKey(nextKey);
      setWrongCount(0);
      setHintRevealed(false);
      showFeedback(`✅ Key letter ${fish.letter} confirmed! Shift = ${charToIdx(fish.letter)}`, '#39ff14');
      const nextSlot = activeSlot + 1;
      if (nextSlot >= keyLen) {
        setTimeout(() => {
          setPhase('recap');
          setRecapStep(-1);
          animateRecap(plainChars.length);
        }, 700);
      } else {
        setActiveSlot(nextSlot);
        setTimeout(() => setFishList(spawnFish(nextSlot)), 400);
      }
    } else {
      const newWrong = wrongCount + 1;
      setWrongCount(newWrong);
      // Reveal key letter hint after 2 wrong catches
      if (newWrong >= 2) setHintRevealed(true);
      const shift = charToIdx(fish.letter);
      // Show WHY it's wrong — what decryption it would produce
      const sampleCipher = levelData.ciphertext.replace(/ /g, '')[activeSlot % cipherChars.length];
      const wrongPlain   = idxToChar(charToIdx(sampleCipher) - shift);
      showFeedback(
        `✗ "${fish.letter}" (shift ${shift}) decrypts '${sampleCipher}' → '${wrongPlain}'. That's wrong — try again.`,
        '#ff2d55'
      );
      setTimeout(() => {
        setFishList(prev => [
          ...prev,
          { ...fish, id: Date.now(), x: Math.random() > 0.5 ? 88 : 12, y: 30 + Math.random() * 100 },
        ]);
      }, 500);
    }
  };

  const showFeedback = (text, color) => {
    clearTimeout(feedbackTimer.current);
    setFeedback({ text, color });
    feedbackTimer.current = setTimeout(() => setFeedback(null), 2200);
  };

  const animateRecap = (total) => {
    let step = -1;
    const iv = setInterval(() => {
      step++;
      setRecapStep(step);
      if (step >= total - 1) clearInterval(iv);
    }, 500);
  };

  const handleSubmit = () => onVerifySubmit();

  /* ── recap rows ── */
  const buildRecapRows = () => {
    const rows = [];
    let ki = 0;
    for (let i = 0; i < levelData.ciphertext.length; i++) {
      const ch = levelData.ciphertext[i];
      if (ch === ' ') continue;
      const keyLetter = targetKey[ki % keyLen];
      const keyShift  = charToIdx(keyLetter);
      const plain     = idxToChar(charToIdx(ch) - keyShift);
      rows.push({ cipher: ch, keyLetter, keyShift, plain, idx: ki });
      ki++;
    }
    return rows;
  };
  const recapRows = buildRecapRows();
  const isDone    = recapStep >= recapRows.length - 1;

  /* ── rod coords ── */
  const pondW    = 600;
  const rodBaseX = pondW * 0.42;
  const rodBaseY = 165; // shifted for 180px pond
  const rodTipX  = rodBaseX - 30;
  const rodTipY  = 115; // shifted for 180px pond
  let hookX = rodTipX, hookY = rodTipY;
  if (isCasting && caughtFish) {
    hookX = rodTipX + (castTarget.x - rodTipX) * castProg;
    hookY = rodTipY + (castTarget.y - rodTipY) * castProg;
  }

  /* ── word views ── */
  const wordSegments   = levelData.ciphertext.split(' ');
  const plainSegments  = levelData.plaintext.split(' ');
  let globalCharIdx = 0;
  const wordViews = wordSegments.map((cipherWord, wIdx) => {
    const cells = cipherWord.split('').map((cipherCh) => {
      const gi     = globalCharIdx;
      const keyPos = gi % keyLen;
      const kFilled = !!builtKey[keyPos];
      const isHovered = hoveredFish && keyPos === activeSlot && !kFilled;
      const activeKeyLetter = kFilled ? targetKey[keyPos] : (isHovered ? hoveredFish.letter : null);
      const shift = activeKeyLetter ? charToIdx(activeKeyLetter) : 0;
      const plainCh = (kFilled || isHovered) ? idxToChar(charToIdx(cipherCh) - shift) : '?';
      const correct = kFilled && plainCh === plainChars[gi];
      globalCharIdx++;
      return { 
        cipherCh, 
        keyPos, 
        kFilled, 
        plainCh, 
        correct, 
        kLetter: kFilled ? (builtKey[keyPos] || '?') : (isHovered ? hoveredFish.letter : '?'),
        isHovered 
      };
    });
    return { cipherWord, cells, plainWord: plainSegments[wIdx] };
  });
  const wordSolved = wordViews.map(w => w.cells.every(c => c.correct));

  /* ══ READY ══ */
  if (phase === 'ready') return (
    <div className="vg-root">
      <div className="vg-header">
        <button className="vg-btn-back" onClick={onBackToStages}>
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>arrow_back</span> Exit to Stages
        </button>
        <div className="vg-header-title">🔐 Vigenère Cipher — Fishing Game</div>
        <div className="vg-stage-badge">{tier.toUpperCase()} · Stage {levelData.level}</div>
      </div>
      <div className="vg-ready-screen">
        <div className="vg-ready-card">
          <div className="vg-ready-icon">🎣</div>
          <div className="vg-ready-title">Decode the Message</div>
          <div className="vg-ready-subtitle">
            A Vigenère cipher uses a <strong>repeating keyword</strong> — each letter of the key applies a different Caesar shift to successive plaintext letters.
            Catch fish carrying the correct key letters to reconstruct the key and decrypt the message.
          </div>

          <div className="vg-ready-preview">
            <div className="vg-preview-row">
              <span className="vg-preview-label">Ciphertext</span>
              <span className="vg-preview-value" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem' }}>{levelData.ciphertext}</span>
            </div>
            <div className="vg-preview-row">
              <span className="vg-preview-label">Key length</span>
              <span className="vg-preview-value">{keyLen} letter{keyLen > 1 ? 's' : ''}</span>
            </div>
            <div className="vg-preview-row">
              <span className="vg-preview-label">Message hint</span>
              <span className="vg-preview-value">{levelData.hint}</span>
            </div>
            {levelData.keyClue && (
              <div className="vg-preview-row" style={{ borderTop: '1px solid rgba(255,215,0,0.2)', paddingTop: 8, marginTop: 4 }}>
                <span className="vg-preview-label" style={{ color: '#ffd700' }}>Key clue 🔑</span>
                <span className="vg-preview-value" style={{ color: '#ffd700', fontStyle: 'italic', fontSize: '0.82rem' }}>{levelData.keyClue}</span>
              </div>
            )}
          </div>

          <div className="vg-how-it-works">
            <strong>Decryption mechanics:</strong><br />
            <code style={{ color: '#39ff14', fontFamily: 'JetBrains Mono, monospace' }}>
              Plain[i] = (Cipher[i] − Key[i mod |key|] + 26) mod 26
            </code>
            <br /><br />
            Each fish carries one letter A–Z. Hover over a swimming fish to see its live decryption output preview, then catch it to set the key letter.
          </div>

          <button className="vg-start-btn" onClick={startGame}>🎣 Start Fishing</button>
        </div>
      </div>
    </div>
  );

  /* ══ RECAP ══ */
  if (phase === 'recap') return (
    <div className="vg-root">
      <div className="vg-header">
        <div className="vg-header-title">🔬 Cryptographic Recap — Vigenère Decryption</div>
      </div>
      <div className="vg-recap-overlay" style={{ position: 'relative', flex: 1, background: 'transparent', backdropFilter: 'none', overflowY: 'auto' }}>
        <div className="vg-recap-card" style={{ maxWidth: 800 }}>
          <div className="vg-recap-title">✅ Key Recovered: <span style={{ color: '#ffd700', letterSpacing: '0.12em' }}>{targetKey}</span></div>
          <div className="vg-recap-subtitle">Watch how each cipher letter is shifted back by its key letter</div>

          {/* Key info panel */}
          {levelData.keyInfo && (
            <div style={{ background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: '0.83rem', color: '#ffd700', lineHeight: 1.6 }}>
              🔑 <strong>About this key:</strong> {levelData.keyInfo}
            </div>
          )}

          <div className="vg-recap-table-wrap">
            <table className="vg-recap-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Cipher</th>
                  <th>Key Letter</th>
                  <th>Shift</th>
                  <th>Formula</th>
                  <th>Plain</th>
                </tr>
              </thead>
              <tbody>
                {recapRows.map((row, idx) => {
                  const isLit = recapStep >= idx;
                  return (
                    <tr key={idx} style={{ opacity: isLit ? 1 : 0.2, transition: 'opacity 0.3s' }}>
                      <td style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem' }}>{idx + 1}</td>
                      <td className={isLit ? 'lit' : ''}>{row.cipher}</td>
                      <td style={{ color: '#ffd700', fontWeight: isLit ? 700 : 400 }}>{row.keyLetter}</td>
                      <td style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem' }}>-{row.keyShift}</td>
                      <td style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>
                        ({charToIdx(row.cipher)} − {row.keyShift} + 26) mod 26 = {charToIdx(row.plain)}
                      </td>
                      <td className={isLit ? 'result-cell' : ''}>{row.plain}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {isDone && (
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginBottom: 6 }}>Decrypted message</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.4rem', fontWeight: 800, color: 'var(--neon-green)', letterSpacing: '0.12em' }}>
                {levelData.plaintext}
              </div>
            </div>
          )}

          <div className="vg-recap-explanation">
            <strong>Why Vigenère is harder to break than Caesar:</strong><br />
            Caesar uses a <em>single</em> shift for all letters — so the most frequent ciphertext letter is almost certainly the encryption of 'E'.
            Vigenère uses a <em>repeating keyword</em> — the same plaintext letter maps to <strong>different</strong> cipher letters depending on its position.
            This breaks simple frequency analysis. You need at least {keyLen} letters before the pattern repeats.
            <br /><br />
            Formula: <code>Plain[i] = (Cipher[i] − Key[i mod |key|] + 26) mod 26</code>
            {levelData.keyClue && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(255,215,0,0.05)', borderRadius: 8, borderLeft: '3px solid #ffd700', fontSize: '0.82rem', color: '#ffd700' }}>
                🔑 Key clue for next time: <em>{levelData.keyClue}</em>
              </div>
            )}
          </div>

          <button className="vg-recap-proceed-btn" disabled={!isDone} onClick={handleSubmit}>
            {isDone ? 'Unlock Next Stage ➔' : 'Decrypting…'}
          </button>
        </div>
      </div>
    </div>
  );

  /* ══ PLAYING ══ */
  return (
    <div className="vg-root">
      <div className="vg-header">
        <button className="vg-btn-back" onClick={onBackToStages}>
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>arrow_back</span> Exit
        </button>
        <div className="vg-header-title">🔐 Vigenère Fishing</div>
        <div className="vg-stage-badge">{tier.toUpperCase()} · Stage {levelData.level}</div>
      </div>

      <div className="vg-game-body">
        <div className="vg-top-section">
          {/* Sidebar */}
          <aside className="vg-sidebar">
            {/* Key slots */}
            <div className="vg-sidebar-card">
              <div className="vg-sidebar-title">🔑 Building the Key</div>
              <div className="vg-key-slots">
                {builtKey.map((letter, i) => (
                  <div key={i} className={`vg-key-slot ${letter ? 'filled' : ''} ${i === activeSlot && !letter ? 'active-slot' : ''}`}>
                    {letter || (i === activeSlot ? '?' : '_')}
                  </div>
                ))}
              </div>
              <div className="vg-progress-bar" style={{ marginTop: 10 }}>
                <div className="vg-progress-fill" style={{ width: `${(builtKey.filter(Boolean).length / keyLen) * 100}%` }} />
              </div>
              <div style={{ marginTop: 6, fontSize: 0.72 + 'rem', color: 'var(--text-muted)' }}>
                Slot {activeSlot + 1} of {keyLen}
              </div>
            </div>

            {/* Key clue */}
            {levelData.keyClue && (
              <div className="vg-sidebar-card" style={{ borderColor: 'rgba(255,215,0,0.3)', background: 'rgba(255,215,0,0.04)' }}>
                <div className="vg-sidebar-title" style={{ color: '#ffd700' }}>🔑 Key Clue</div>
                <div style={{ fontSize: '0.8rem', color: '#ffd700', lineHeight: 1.5, fontStyle: 'italic' }}>
                  {levelData.keyClue}
                </div>
                {/* Hint letter revealed after 2 misses */}
                {hintRevealed && (
                  <div style={{ marginTop: 8, padding: '8px 10px', background: 'rgba(255,45,85,0.1)', border: '1px solid rgba(255,45,85,0.3)', borderRadius: 8, fontSize: '0.78rem', color: '#ff9eb5' }}>
                    💡 Slot {activeSlot + 1} hint: the letter is <strong style={{ fontSize: '1.1rem', color: '#ff2d55' }}>{targetKey[activeSlot]}</strong>
                  </div>
                )}
              </div>
            )}

            {/* Interactive Tools */}
            <div className="vg-sidebar-card compact-tool-card">
              <div className="vg-sidebar-title">🔧 Decoding Tools</div>
              <button
                className="vg-tabula-modal-btn"
                onClick={() => setShowTabula(true)}
              >
                <span className="material-symbols-outlined">grid_on</span>
                Interactive Tabula Recta
              </button>
            </div>

            {/* Formula */}
            <div className="vg-formula-box">
              <strong style={{ color: 'var(--neon-cyan)', fontSize: '0.78rem' }}>Vigenère Decrypt:</strong><br />
              <code>P[i] = (C[i] − K[i mod n] + 26) mod 26</code><br />
              <span style={{ fontSize: '0.72rem', marginTop: 4, display: 'block' }}>K = letter index (A=0…Z=25)</span>
            </div>

            {allCorrect && (
              <div className="vg-submit-panel">
                <div style={{ fontSize: '0.82rem', color: 'var(--neon-green)', fontWeight: 700 }}>🎉 Full key found!</div>
                <button className="vg-submit-btn" onClick={() => { setPhase('recap'); setRecapStep(-1); animateRecap(recapRows.length); }}>
                  🚀 See Recap & Submit
                </button>
              </div>
            )}
          </aside>

          {/* Word panel */}
          <div className="vg-word-area">
            <div className="vg-word-panel-title">Live Decryption Console</div>
            <div className="vg-segments-row">
              {wordViews.map((w, wIdx) => (
                <div key={wIdx} className={`vg-segment-card ${wordSolved[wIdx] ? 'is-solved' : ''}`}>
                  <div className="vg-letter-row">
                    {w.cells.map((cell, cIdx) => {
                      let plainClass = 'vg-cell-plain';
                      if (cell.kFilled) {
                        plainClass += cell.correct ? ' correct' : ' wrong';
                      } else if (cell.isHovered) {
                        plainClass += ' preview';
                      } else {
                        plainClass += ' pending';
                      }

                      let keyClass = 'vg-cell-key';
                      if (cell.kFilled) {
                        keyClass += ' filled';
                      } else if (cell.isHovered) {
                        keyClass += ' preview';
                      }

                      return (
                        <div key={cIdx} className="vg-letter-cell">
                          <span className="vg-cell-cipher">{cell.cipherCh}</span>
                          <span className={keyClass}>
                            {cell.kFilled ? cell.kLetter : (cell.isHovered ? cell.kLetter : (cell.keyPos === activeSlot ? '?' : '_'))}
                          </span>
                          <span className="vg-cell-arrow">↓</span>
                          <span className={plainClass}>
                            {cell.kFilled ? cell.plainCh : (cell.isHovered ? cell.plainCh : '?')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="vg-segment-label">{wordSolved[wIdx] ? '✅ ' : ''}{w.plainWord}</div>
                </div>
              ))}
            </div>

            <div className="vg-hint-banner">
              💡 <strong>Message hint:</strong> {levelData.hint}
            </div>

            {/* Wrong-catch educational feedback */}
            {wrongCount > 0 && !hintRevealed && (
              <div style={{ background: 'rgba(255,45,85,0.08)', border: '1px solid rgba(255,45,85,0.25)', borderRadius: 10, padding: '8px 14px', fontSize: '0.8rem', color: '#ff9eb5' }}>
                ⚠️ {wrongCount} wrong catch{wrongCount > 1 ? 'es' : ''} for slot {activeSlot + 1}.
                The wrong key letter produced incorrect decryptions. Check the Interactive Tabula Recta tool.
                {wrongCount === 1 && ' One more miss and you\'ll get a hint letter.'}
              </div>
            )}

            {/* Live Hover Scanner Console */}
            {hoveredFish ? (
              <div className="vg-scan-indicator scanning">
                <span className="material-symbols-outlined scanner-icon">radar</span>
                <span className="scanner-text">
                  Testing Key Letter: <strong style={{ color: 'var(--neon-cyan)' }}>{hoveredFish.letter}</strong> (Shift -{charToIdx(hoveredFish.letter)}) — Previewing decryptions...
                </span>
              </div>
            ) : (
              <div className="vg-scan-indicator idle">
                <span className="material-symbols-outlined scanner-icon">explore</span>
                <span className="scanner-text">
                  Hover over a swimming fish to scan its decryption output in real time! Click to catch it when you find a match.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Pond */}
        <section className="vg-pond-section">
          <div className="vg-pond-surface" />
          {bubbles.map(b => (
            <div key={b.id} className="vg-bubble" style={{ left: `${b.x}%`, width: b.size, height: b.size, animationDelay: `${b.delay}s`, animationDuration: `${b.duration}s` }} />
          ))}
          {fishList.map(f => {
            const isCorrect = f.letter === targetKey[activeSlot];
            return (
              <div key={f.id} className="vg-fish"
                style={{ left: `${f.x}%`, top: f.y, '--dir': f.direction }}
                onMouseEnter={() => { if (!isCasting) setHoveredFish(f); }}
                onMouseLeave={() => setHoveredFish(null)}
                onClick={() => castAt(f)}>
                <span className="vg-fish-sprite">{f.emoji}</span>
                <span className={`vg-fish-badge ${isCorrect && hintRevealed ? 'correct-letter' : 'other-letter'}`} style={{ transform: `scaleX(${f.direction})` }}>
                  {f.letter}
                </span>
              </div>
            );
          })}
          {isCasting && caughtFish && (
            <div className="vg-reel-fish" style={{ left: `${(hookX / pondW) * 100}%`, top: hookY - 10 }}>
              <span className="vg-fish-sprite">{caughtFish.emoji}</span>
            </div>
          )}
          {splash && (
            <div className="vg-splash" style={{ left: `${splash.x}%`, top: splash.y }}>💦</div>
          )}
          <svg className="vg-pond-svg" viewBox={`0 0 ${pondW} 180`} preserveAspectRatio="none">
            <line x1={rodBaseX} y1={rodBaseY} x2={rodTipX} y2={rodTipY} className="vg-rod-line" />
            {isCasting && <line x1={rodTipX} y1={rodTipY} x2={hookX} y2={hookY} className="vg-fish-line" />}
          </svg>
        </section>
      </div>

      {feedback && (
        <div className="vg-feedback" style={{ color: feedback.color, fontSize: '0.88rem', maxWidth: '70%', lineHeight: 1.4 }}>
          {feedback.text}
        </div>
      )}

      {/* Tabula Recta Modal */}
      {showTabula && (
        <div className="vg-modal-overlay" onClick={() => setShowTabula(false)}>
          <div className="vg-modal-card tabula-modal" onClick={e => e.stopPropagation()}>
            <div className="vg-modal-header">
              <h3>📊 Interactive Tabula Recta</h3>
              <button className="vg-modal-close" onClick={() => setShowTabula(false)}>×</button>
            </div>
            <div className="vg-modal-body">
              <p className="vg-modal-instructions">
                The Tabula Recta is a 26×26 grid of shifted alphabets. Find the column of your <strong>Cipher letter (C)</strong>,
                then look at the row of your <strong>Key letter (K)</strong> to find the intersection, which is the <strong>Plain letter (P)</strong>!
                <br />
                <span style={{ color: 'var(--neon-yellow)' }}>★ Gold Row: the correct key letter for the active slot is highlighted.</span>
              </p>
              <div className="vg-tabula-scroll-wrapper">
                <table className="vg-tabula-full-grid">
                  <thead>
                    <tr>
                      <th className="corner-cell">K \ P</th>
                      {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(ch => (
                        <th key={ch} className="col-header">{ch}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((kChar, rIdx) => {
                      const isCorrectKey = kChar === targetKey[activeSlot];
                      const rowLetters = tabulaRow(kChar);
                      return (
                        <tr key={kChar} className={isCorrectKey ? 'correct-key-row' : ''}>
                          <td className="row-header">{kChar}</td>
                          {rowLetters.map((cChar, cIdx) => {
                            const plainLetter = idxToChar(cIdx);
                            return (
                              <td 
                                key={cIdx} 
                                className="cell"
                                title={`Key: ${kChar}, Plain: ${plainLetter} → Cipher: ${cChar}`}
                              >
                                {cChar}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}