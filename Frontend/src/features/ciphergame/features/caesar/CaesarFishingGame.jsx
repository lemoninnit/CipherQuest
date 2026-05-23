import React, { useState, useEffect, useRef } from 'react';
import '../../CipherGame.css';

/* ─── Caesar math ─── */
const caesarDecryptChar = (char, shift) => {
  const code = char.charCodeAt(0);
  if (code >= 65 && code <= 90) {
    return String.fromCharCode(((code - 65 - shift + 26) % 26 + 26) % 26 + 65);
  }
  return char;
};
const caesarDecryptWord = (word, shift) =>
  word.split('').map(ch => caesarDecryptChar(ch, shift)).join('');

const applyShiftDelta = (curr, delta) => {
  let val = curr + delta;
  if (val < -25) {
    val = val + 26;
  } else if (val > 25) {
    val = val - 26;
  }
  return val;
};

const FISH_EMOJIS = ['🐟', '🐠', '🐡', '🦈', '🦐'];
const FISH_VALUES = [+1, -1, +2, -2, +3, -3, +5, -5];

export default function CaesarFishingGame({ levelData, tier, onVerifySubmit, onBackToStages, onReplayNewQuestion }) {
  const words         = levelData.plaintext.split(' ');
  const cipherSegs    = levelData.ciphertext.split(' ');

  /* ── state ── */
  const [phase, setPhase]                     = useState('ready');
  const [activeShifts, setActiveShifts]       = useState(cipherSegs.map(() => 0));
  const [targetSegIdx, setTargetSegIdx]       = useState(0);
  const [attemptsLeft, setAttemptsLeft]       = useState(15);
  const [levelSolved, setLevelSolved]         = useState(false);
  const [basketShake, setBasketShake]         = useState(false);
  const [floatingXp, setFloatingXp]           = useState(null);
  const [fishList, setFishList]               = useState([]);
  const [bubbles, setBubbles]                 = useState([]);
  const [isCasting, setIsCasting]             = useState(false);
  const [castProgress, setCastProgress]       = useState(0);
  const [castTarget, setCastTarget]           = useState({ x: 0, y: 0 });
  const [caughtFish, setCaughtFish]           = useState(null);
  const [splash, setSplash]                   = useState({ show: false, x: 0, y: 0 });
  const [showExplanation, setShowExplanation] = useState(false);
  const [explanationStep, setExplanationStep] = useState(-1);
  const [chumCount, setChumCount]             = useState(3);
  const [hoveredFish, setHoveredFish]         = useState(null);
  const animationRef = useRef(null);

  /* ── derived ── */
  const decryptedSegs = cipherSegs.map((seg, i) =>
    caesarDecryptWord(seg, activeShifts[i] ?? 0)
  );

  // Live hovered preview of decrypted segments (Only in Easy mode!)
  const previewSegs = cipherSegs.map((seg, i) => {
    if (i !== targetSegIdx || !hoveredFish) return decryptedSegs[i];
    if (tier !== 'easy') return decryptedSegs[i];

    const previewShift = applyShiftDelta(activeShifts[i] ?? 0, hoveredFish.value);
    return caesarDecryptWord(seg, previewShift);
  });

  const allCorrect = decryptedSegs.every((dec, i) => dec === words[i]);

  /* ── start game ── */
  const startGame = () => {
    setActiveShifts(cipherSegs.map(() => 0));
    setTargetSegIdx(0);
    setAttemptsLeft(15);
    setChumCount(3);
    setLevelSolved(false);
    setPhase('playing');
    spawnFish();
    spawnBubbles();
  };

  /* ── reset on levelData change ── */
  useEffect(() => {
    setPhase('ready');
  }, [levelData]);

  /* ── detect solve ── */
  useEffect(() => {
    if (phase !== 'playing') return;
    if (allCorrect && !levelSolved) setLevelSolved(true);
    if (!allCorrect && levelSolved) setLevelSolved(false);
  }, [activeShifts, allCorrect]);

  /* ── fish physics ── */
  const spawnFish = () => {
    const list = [];
    for (let i = 0; i < 6; i++) {
      const value = FISH_VALUES[Math.floor(Math.random() * FISH_VALUES.length)];
      const emoji = FISH_EMOJIS[Math.floor(Math.random() * FISH_EMOJIS.length)];
      const color = i % 2 === 0 ? 'var(--neon-cyan)' : 'var(--neon-green)';
      list.push({
        id: i,
        value,
        x: 10 + Math.random() * 80,
        y: 60 + Math.random() * 140,
        speed: 0.3 + Math.random() * 0.4,
        direction: Math.random() > 0.5 ? 1 : -1,
        emoji,
        color,
      });
    }
    setFishList(list);
  };

  const spawnBubbles = () => {
    const list = [];
    for (let i = 0; i < 15; i++) {
      list.push({
        id: i, x: Math.random() * 100,
        size: 3 + Math.random() * 8,
        delay: Math.random() * 6,
        duration: 5 + Math.random() * 5,
      });
    }
    setBubbles(list);
  };

  useEffect(() => {
    if (phase !== 'playing') return;
    const tick = () => {
      setFishList(prev => prev.map(f => {
        let nx = f.x + f.speed * f.direction * 0.08;
        let nd = f.direction;
        let nv = f.value;
        
        // Spawn fresh modifiers on screen bounce for variety
        if (nx > 92) {
          nx = 92;
          nd = -1;
          if (typeof nv === 'number') nv = FISH_VALUES[Math.floor(Math.random() * FISH_VALUES.length)];
        }
        if (nx < 8)  {
          nx = 8;
          nd = 1;
          if (typeof nv === 'number') nv = FISH_VALUES[Math.floor(Math.random() * FISH_VALUES.length)];
        }
        return { ...f, x: nx, direction: nd, value: nv };
      }));
      animationRef.current = requestAnimationFrame(tick);
    };
    animationRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationRef.current);
  }, [phase]);

  /* ── casting ── */

  const handleChumWaters = () => {
    if (chumCount <= 0 || isCasting) return;
    setChumCount(prev => prev - 1);
    spawnFish();
    setSplash({ show: true, x: 50, y: 120 });
    setTimeout(() => setSplash({ show: false, x: 0, y: 0 }), 600);
  };

  const castLineToFish = (fish) => {
    if (isCasting || levelSolved) return;
    setIsCasting(true);
    setCaughtFish(fish);
    setHoveredFish(null);
    const tx = (fish.x / 100) * 500;
    const ty = fish.y;
    setCastTarget({ x: tx, y: ty });

    let startTime = null;
    const castOut = (ts) => {
      if (!startTime) startTime = ts;
      const p = Math.min((ts - startTime) / 350, 1);
      setCastProgress(p);
      if (p < 1) { requestAnimationFrame(castOut); return; }

      setSplash({ show: true, x: fish.x, y: fish.y });
      setTimeout(() => setSplash({ show: false, x: 0, y: 0 }), 500);
      setFishList(prev => prev.filter(f => f.id !== fish.id));

      setTimeout(() => {
        let rs = null;
        const reelIn = (ts2) => {
          if (!rs) rs = ts2;
          const rp = Math.min((ts2 - rs) / 450, 1);
          setCastProgress(1 - rp);
          if (rp < 1) { requestAnimationFrame(reelIn); return; }

          setIsCasting(false);
          setCaughtFish(null);
          setActiveShifts(prev => {
            const next = [...prev];
            next[targetSegIdx] = applyShiftDelta(next[targetSegIdx], fish.value);
            return next;
          });
          setBasketShake(true);
          setTimeout(() => setBasketShake(false), 400);
          setAttemptsLeft(prev => Math.max(0, prev - 1));
          
          setTimeout(() => {
            setFishList(prev => {
              const value = FISH_VALUES[Math.floor(Math.random() * FISH_VALUES.length)];
              const emoji = FISH_EMOJIS[Math.floor(Math.random() * FISH_EMOJIS.length)];
              const color = Math.random() > 0.5 ? 'var(--neon-cyan)' : 'var(--neon-green)';
              return [...prev, {
                id: Date.now(),
                value,
                x: Math.random() > 0.5 ? 90 : 10,
                y: 60 + Math.random() * 140,
                speed: 0.3 + Math.random() * 0.4,
                direction: Math.random() > 0.5 ? 1 : -1,
                emoji,
                color,
              }];
            });
          }, 600);
        };
        requestAnimationFrame(reelIn);
      }, 50);
    };
    requestAnimationFrame(castOut);
  };

  /* ── verify ── */
  const handleVerifySubmit = () => {
    if (!levelSolved) return;
    setShowExplanation(true);
    setExplanationStep(-1);
    const total = levelData.plaintext.replace(/\s+/g, '').length;
    let step = -1;
    const iv = setInterval(() => {
      step++;
      setExplanationStep(step);
      if (step >= total - 1) clearInterval(iv);
    }, 600);

    const xpReward = 100;
    setFloatingXp({ amount: xpReward, x: 80, y: 80 });
    setTimeout(() => setFloatingXp(null), 1200);
  };

  const handleCloseExplanation = () => {
    setShowExplanation(false);
    onVerifySubmit();
  };

  /* ── rod SVG coords ── */
  const rodBaseX = 250, rodBaseY = 260;
  let rodTipX = 220, rodTipY = 190;
  let hookX = rodTipX, hookY = rodTipY;
  if (isCasting && castTarget) {
    const dx = castTarget.x - rodBaseX, dy = castTarget.y - rodBaseY;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) { rodTipX = rodBaseX + (dx / len) * 50; rodTipY = rodBaseY + (dy / len) * 50; }
    if (castProgress <= 1 && caughtFish) {
      hookX = rodTipX + (castTarget.x - rodTipX) * castProgress;
      hookY = rodTipY + (castTarget.y - rodTipY) * castProgress;
    }
  }

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  /* ── rule violation feedback ── */
  const getRuleViolation = () => {
    const tWord = words[targetSegIdx];
    const tCiph = cipherSegs[targetSegIdx];
    const dec   = decryptedSegs[targetSegIdx];
    const pShift = activeShifts[targetSegIdx] ?? 0;
    const tShift = levelData.targetShifts[targetSegIdx];
    if (dec === tWord) return null;
    for (let i = 0; i < tWord.length; i++) {
      if (dec[i] !== tWord[i]) {
        return {
          rule: `Shift +${pShift} turns '${tCiph[i]}' → '${dec[i]}', but the correct shift +${tShift} gives '${tWord[i]}'. (Letter #${tCiph[i].charCodeAt(0) - 64} minus ${tShift} = #${tWord[i].charCodeAt(0) - 64})`
        };
      }
    }
    return null;
  };
  const ruleViolation = phase === 'playing' ? getRuleViolation() : null;

  /* ════ READY ════ */
  if (phase === 'ready') return (
    <div className="fg-root">
      <header className="fg-header">
        <button className="fg-btn-back-nav" onClick={onBackToStages}>
          <span className="material-symbols-outlined">arrow_back</span> Exit to Stages
        </button>
        <div className="fg-header-category">Caesar Cipher</div>
        <div className="fg-header-stage" style={{ flex: 1, textAlign: 'center' }}>
          {tier.toUpperCase()} Mode — Stage {levelData.level}
        </div>
      </header>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div className="vg-ready-card" style={{ maxWidth: 540 }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🎣</div>
          <h2 style={{ color: 'var(--neon-cyan)', margin: '0 0 8px', fontSize: '1.5rem', fontWeight: 800 }}>Caesar Fishing</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.6 }}>
            Catch fish carrying shift modifiers (<strong>+1, -1, +2, -2, +3, -3, +5, -5</strong>) to dial in the correct Caesar shift and decrypt the ciphertext.
          </p>
          <div style={{ background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 12, padding: '16px 20px', marginBottom: '20px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Ciphertext</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--neon-cyan)' }}>{levelData.ciphertext}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Hint</span>
              <span style={{ color: '#a0c4d8', fontStyle: 'italic' }}>{levelData.hint}</span>
            </div>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', marginBottom: '20px', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--neon-green)' }}>How it works:</strong>{' '}
            Each cipher segment has a basket shift. Click a fish to reel it in — its value adjusts the current segment's shift.
            When the decrypted text matches the plaintext, submit! Formula:{' '}
            <code style={{ color: 'var(--neon-cyan)' }}>Plain = (Cipher − Shift) mod 26</code>
          </p>
          <button className="vg-start-btn" onClick={startGame}>🎣 Start Fishing</button>
        </div>
      </div>
    </div>
  );

  /* ════ PLAYING ════ */
  const currentShift = activeShifts[targetSegIdx] ?? 0;

  return (
    <div className="fg-root">
      <style>{`
        @keyframes pulse {
          0% { opacity: 0.6; box-shadow: 0 0 4px rgba(0, 229, 255, 0.4); }
          100% { opacity: 1; box-shadow: 0 0 12px rgba(0, 229, 255, 0.8); }
        }
        .golden-badge {
          background: #ffd700 !important;
          color: #000 !important;
          font-weight: 800 !important;
          box-shadow: 0 0 8px gold !important;
        }
        .scramble-badge {
          background: #ff007f !important;
          color: #fff !important;
          font-weight: 800 !important;
        }
      `}</style>

      {showExplanation && (
        <div className="fg-recap-overlay" style={{ overflowY: 'auto', padding: '30px 10px' }}>
          <div className="fg-recap-card" style={{ maxWidth: '1100px', width: '95%', padding: '24px 32px' }}>
            <h2 className="fg-recap-title">🔬 Cryptographic Recap</h2>
            <p className="fg-recap-subtitle">Why Did This Work?</p>
            <div className="fg-recap-animation-box" style={{ minHeight: 'auto', padding: '16px', marginBottom: '16px' }}>
              <div className="fg-recap-letter-row">
                {levelData.plaintext.replace(/\s+/g, '').split('').map((plainCh, idx) => {
                  const cipherCh = levelData.ciphertext.replace(/\s+/g, '')[idx];
                  let wi = 0, acc = 0;
                  for (let i = 0; i < words.length; i++) {
                    if (idx < acc + words[i].length) { wi = i; break; }
                    acc += words[i].length;
                  }
                  const seg = levelData.targetShifts[wi];
                  return (
                    <div key={idx} className={`fg-recap-node ${explanationStep >= idx ? 'active' : 'waiting'}`}>
                      <span className="fg-recap-char-cipher">{cipherCh}</span>
                      <span className="fg-recap-math">-{seg}</span>
                      <span className="fg-recap-arrow">↓</span>
                      <span className="fg-recap-char-plain">{plainCh}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="fg-recap-explanation" style={{ background: 'rgba(255,255,255,0.015)' }}>
              💡 <strong>Caesar Cipher Decryption:</strong> Each ciphertext letter is shifted backward by the key value.
              By catching fish with numeric modifiers, you tuned the basket shift to match the secret key.{' '}
              <code>Plain = (Cipher − Key) mod 26</code> maps every letter back uniformly.
              {levelData.targetShifts && levelData.targetShifts.map((shiftVal, sIdx) => {
                const sAlph = alphabet.map((_, i) => alphabet[(i + shiftVal) % 26]);
                return (
                  <div key={sIdx} style={{ marginTop: 16, background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 12, padding: 12 }}>
                    <div style={{ fontWeight: 700, color: 'var(--neon-cyan)', marginBottom: 8, fontSize: '0.82rem' }}>
                      🔑 Caesar Alphabet Shift Table {levelData.targetShifts.length > 1 ? `— Segment #${sIdx + 1}` : ''} (Key: +{shiftVal})
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ borderCollapse: 'collapse', textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', minWidth: 850 }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <th style={{ padding: '4px 2px', textAlign: 'left', color: 'var(--text-muted)' }}>Plain:</th>
                            {alphabet.map((ch, i) => (
                              <td key={i} style={{ padding: '4px 2px', color: '#fff', background: 'rgba(255,255,255,0.02)' }}>
                                <div style={{ fontWeight: 'bold' }}>{ch}</div>
                                <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>{i + 1}</div>
                              </td>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <th style={{ padding: '4px 2px', textAlign: 'left', color: 'var(--text-muted)' }}>Cipher:</th>
                            {sAlph.map((ch, i) => (
                              <td key={i} style={{ padding: '4px 2px', color: 'var(--neon-cyan)', background: 'rgba(0,229,255,0.02)' }}>
                                <div style={{ fontWeight: 'bold' }}>{ch}</div>
                                <div style={{ fontSize: '0.55rem', color: 'rgba(0,229,255,0.6)' }}>{ch.charCodeAt(0) - 64}</div>
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="fg-recap-actions" style={{ marginTop: 16 }}>
              <button
                className="fg-btn fg-btn-primary"
                onClick={handleCloseExplanation}
                disabled={explanationStep < levelData.plaintext.replace(/\s+/g, '').length - 1}
                style={{ background: 'var(--neon-green)', color: '#030914' }}
              >
                Unlock Next Objective ➔
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="fg-header">
        <button className="fg-btn-back-nav" onClick={onBackToStages}>
          <span className="material-symbols-outlined">arrow_back</span> Exit to Stages
        </button>
        <div className="fg-header-category">Caesar Cipher</div>
        <div className="fg-header-stage" style={{ flex: 1, textAlign: 'center' }}>
          {tier.toUpperCase()} Mode — Stage {levelData.level}
        </div>
        <div className={`fg-header-attempts ${attemptsLeft <= 3 ? 'low-attempts' : ''}`}>
          Casts Left: {attemptsLeft}
        </div>
      </header>

      <div className="fg-game-layout">
        {/* Sidebar */}
        <aside className="fg-sidebar">
          <div className={`fg-basket-card ${levelSolved ? 'active-target' : ''} ${basketShake ? 'shake' : ''}`}>
            <div className="fg-basket-container">🧺</div>
            <div className="fg-basket-shift-value">{currentShift >= 0 ? `+${currentShift}` : currentShift}</div>
            <span className="fg-basket-label">Basket Shift (Seg #{targetSegIdx + 1})</span>
            {floatingXp && (
              <div className="fg-xp-pop-indicator" style={{ left: `${floatingXp.x}%`, top: `${floatingXp.y}%` }}>
                +{floatingXp.amount} XP
              </div>
            )}
          </div>

          <button
            className="fg-btn"
            onClick={handleChumWaters}
            disabled={chumCount <= 0 || isCasting}
            style={{
              width: '100%',
              marginBottom: '16px',
              padding: '12px',
              fontWeight: 'bold',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s',
              background: chumCount > 0 ? 'rgba(0, 229, 255, 0.12)' : 'rgba(255, 255, 255, 0.03)',
              border: chumCount > 0 ? '1px solid var(--neon-cyan)' : '1px solid rgba(255, 255, 255, 0.08)',
              color: chumCount > 0 ? 'var(--neon-cyan)' : 'var(--text-muted)',
              cursor: chumCount > 0 ? 'pointer' : 'not-allowed',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>waves</span>
            Chum the Waters ({chumCount} left)
          </button>

          <div className="fg-cipher-ref">
            <p className="fg-ref-title">Target: Segment #{targetSegIdx + 1}</p>
            <p className="fg-ref-hint"><span>Active Shift:</span><span className="fg-key">{currentShift >= 0 ? `+${currentShift}` : currentShift}</span></p>
            <p className="fg-ref-hint"><span>A →</span><span>{caesarDecryptChar('A', -currentShift)}</span></p>
            <p className="fg-ref-hint"><span>B →</span><span>{caesarDecryptChar('B', -currentShift)}</span></p>
            <p className="fg-ref-hint"><span>Z →</span><span>{caesarDecryptChar('Z', -currentShift)}</span></p>
            <p className="fg-ref-formula">Formula:<br />Plain[i] = (Cipher[i] − Shift) mod 26</p>
          </div>

          <div className="fg-sidebar-alerts">
            {levelSolved ? (
              <div className="fg-success-panel">
                <h3>✅ SECURED!</h3>
                <p>All segments decrypted successfully.</p>
                <button className="fg-btn fg-btn-primary" onClick={handleVerifySubmit} style={{ width: '100%', background: 'var(--neon-green)', color: '#030914', marginTop: 10 }}>
                  🚀 Verify & Submit
                </button>
                {onReplayNewQuestion && (
                  <button className="fg-btn fg-btn-secondary" onClick={onReplayNewQuestion} style={{ width: '100%', marginTop: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
                    🔄 Play Again
                  </button>
                )}
              </div>
            ) : ruleViolation ? (
              <div className="fg-alert-panel">
                <strong>⚠️ Rule Violation:</strong>
                <p style={{ marginTop: 6, fontSize: '0.82rem', lineHeight: 1.4 }}>{ruleViolation.rule}</p>
              </div>
            ) : (
              <div className="fg-alert-panel default-alert">
                <strong>🎣 Status:</strong>
                <p style={{ marginTop: 6, fontSize: '0.82rem', lineHeight: 1.4 }}>Select a cipher word segment, then catch fish to adjust the basket shift!</p>
              </div>
            )}
          </div>
        </aside>

        {/* Main */}
        <main className="fg-main">
          <section className="fg-word-panel">
            <div className="fg-word-segments-row">
              {words.map((word, wIdx) => {
                const isTargeted = targetSegIdx === wIdx;
                const segShift = activeShifts[wIdx] ?? 0;
                const cipherWord = cipherSegs[wIdx];
                const decWord = decryptedSegs[wIdx];
                const prevWord = previewSegs[wIdx];

                return (
                  <div key={wIdx} className={`fg-word-segment-card ${isTargeted ? 'targeted' : ''}`}
                    onClick={() => { if (!isCasting) setTargetSegIdx(wIdx); }}>
                    <div className="fg-letter-cells">
                      {cipherWord.split('').map((cipherCh, chIdx) => {
                        const maskList = levelData.masks[wIdx];
                        const isPrefilled = tier === 'easy' && maskList?.[chIdx];
                        
                        const isCorrect = decWord[chIdx] === word[chIdx];
                        const isHovered = tier === 'easy' && hoveredFish && isTargeted;
                        const letterToShow = (isPrefilled || isCorrect) ? word[chIdx] : (isHovered ? prevWord[chIdx] : '_');
                        
                        let cellClass = 'fg-letter-cell';
                        if (isPrefilled || isCorrect) cellClass = 'fg-letter-cell correct-plain';
                        
                        const cellStyle = isHovered && !isPrefilled ? {
                          borderColor: 'var(--neon-cyan)',
                          animation: 'pulse 1s infinite alternate',
                          color: 'var(--neon-cyan)'
                        } : {};

                        return (
                          <div key={chIdx} className={cellClass} style={cellStyle}>
                            <span className="fg-cell-ciphertext">{cipherCh}</span>
                            <span className="fg-cell-plaintext">{letterToShow}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="fg-segment-basket-badge">Basket Shift: {segShift >= 0 ? `+${segShift}` : segShift}</div>
                  </div>
                );
              })}
            </div>
            <div className="fg-clue-banner">💡 Hint: <strong>"{levelData.hint}"</strong></div>
          </section>

          {/* Pond */}
          <section className="fg-pond-wrapper">
            <div className="fg-pond-container">
              <div className="fg-wave" />
              {bubbles.map(b => (
                <div key={b.id} className="fg-bubble" style={{ left: `${b.x}%`, width: `${b.size}px`, height: `${b.size}px`, animationDelay: `${b.delay}s`, animationDuration: `${b.duration}s` }} />
              ))}
              {fishList.map(f => {
                const badgeText = f.value > 0 ? `+${f.value}` : `${f.value}`;
                const badgeClass = `fg-fish-badge ${f.value > 0 ? 'positive' : 'negative'}`;

                return (
                  <div key={f.id} className="fg-fish-entity"
                    style={{ left: `${f.x}%`, top: `${f.y}px`, transform: `scaleX(${f.direction})` }}
                    onMouseEnter={() => { if (!isCasting) setHoveredFish(f); }}
                    onMouseLeave={() => setHoveredFish(null)}
                    onClick={() => castLineToFish(f)}>
                    <span className="fg-fish-sprite" style={{ color: f.color }}>{f.emoji}</span>
                    <div className={badgeClass} style={{ transform: `scaleX(${f.direction})` }}>
                      {badgeText}
                    </div>
                  </div>
                );
              })}
              {isCasting && caughtFish && castProgress < 1 && (
                <div className="fg-fish-entity" style={{ left: `${(hookX / 500) * 100}%`, top: `${hookY - 20}px`, transform: 'scale(1.2)' }}>
                  <span className="fg-fish-sprite" style={{ color: caughtFish.color }}>{caughtFish.emoji}</span>
                </div>
              )}
              <svg className="fg-pond-svg" viewBox="0 0 500 260">
                <line x1={rodBaseX} y1={rodBaseY} x2={rodTipX} y2={rodTipY} className="fg-fishing-rod-line" />
                {isCasting && <line x1={rodTipX} y1={rodTipY} x2={hookX} y2={hookY} className="fg-fishing-line" />}
              </svg>
              {splash.show && (
                <div className="fg-splash-effect" style={{ left: `${splash.x}%`, top: `${splash.y}px` }}>💦</div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}