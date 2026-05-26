import React, { useState, useEffect, useRef } from 'react';
import '../../CipherGame.css';

const FISH_EMOJIS = ['🐟', '🐠', '🐡', '🦈', '🦐'];
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const normalizeShift = (shift = 0) => ((shift % 26) + 26) % 26;
const charToIdx = (char) => char.charCodeAt(0) - 65;
const idxToChar = (idx) => String.fromCharCode(normalizeShift(idx) + 65);
const formatShift = (shift) => `+${normalizeShift(shift)}`;

const caesarDecryptChar = (char, shift) => {
  const code = char.charCodeAt(0);
  if (code >= 65 && code <= 90) {
    return idxToChar(code - 65 - shift);
  }
  return char;
};

const buildSlotMap = (segments, keyLen) => {
  let alphaIndex = 0;
  return segments.map((segment) =>
    segment.split('').map((char) => {
      if (char < 'A' || char > 'Z') return -1;
      const slot = alphaIndex % keyLen;
      alphaIndex++;
      return slot;
    })
  );
};

const buildActiveSlotSamples = (ciphertext, plaintext, slotMap, activeSlot, activeShifts) => {
  const cipherSegs = ciphertext.split(' ');
  const words = plaintext.split(' ');
  const rows = [];

  cipherSegs.forEach((segment, wordIdx) => {
    segment.split('').forEach((cipherChar, charIdx) => {
      const slot = slotMap[wordIdx]?.[charIdx];
      if (slot !== activeSlot) return;
      rows.push({
        cipherChar,
        plainChar: caesarDecryptChar(cipherChar, activeShifts[slot] ?? 0),
        targetPlain: words[wordIdx]?.[charIdx] ?? '',
        wordIdx,
        charIdx
      });
    });
  });

  return rows;
};

export default function VigenereFishingGame({
  levelData,
  tier,
  onVerifySubmit,
  onBackToStages,
  onReplayNewQuestion
}) {
  const words = levelData.plaintext.split(' ');
  const cipherSegs = levelData.ciphertext.split(' ');
  const targetKey = levelData.targetKey || '';
  const keyLen = Math.max(1, targetKey.length);
  const targetShifts = targetKey.split('').map(charToIdx);
  const slotMap = buildSlotMap(cipherSegs, keyLen);

  const getInitialShifts = () =>
    Array.from({ length: keyLen }, (_, idx) =>
      normalizeShift(levelData.startShifts?.[idx] ?? 0)
    );

  const [phase, setPhase] = useState('ready');
  const [activeShifts, setActiveShifts] = useState(getInitialShifts);
  const [activeSlot, setActiveSlot] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(Math.max(20, keyLen * 10));
  const [levelSolved, setLevelSolved] = useState(false);
  const [basketShake, setBasketShake] = useState(false);
  const [floatingXp, setFloatingXp] = useState(null);
  const [fishList, setFishList] = useState([]);
  const [bubbles, setBubbles] = useState([]);
  const [isCasting, setIsCasting] = useState(false);
  const [castProgress, setCastProgress] = useState(0);
  const [castTarget, setCastTarget] = useState({ x: 0, y: 0 });
  const [caughtFish, setCaughtFish] = useState(null);
  const [splash, setSplash] = useState({ show: false, x: 0, y: 0 });
  const [showExplanation, setShowExplanation] = useState(false);
  const [explanationStep, setExplanationStep] = useState(-1);
  const [chumCount, setChumCount] = useState(3);
  const [hoveredFish, setHoveredFish] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const animationRef = useRef(null);

  const activePreviewShifts = hoveredFish
    ? activeShifts.map((shift, idx) =>
        idx === activeSlot ? hoveredFish.value : shift
      )
    : activeShifts;

  const buildDecryptedSegments = (shifts) =>
    cipherSegs.map((segment, wordIdx) =>
      segment
        .split('')
        .map((cipherChar, charIdx) => {
          const slot = slotMap[wordIdx]?.[charIdx] ?? 0;
          return caesarDecryptChar(cipherChar, shifts[slot] ?? 0);
        })
        .join('')
    );

  const decryptedSegs = buildDecryptedSegments(activeShifts);
  const previewSegs = buildDecryptedSegments(activePreviewShifts);
  const activeSlotSamples = buildActiveSlotSamples(
    levelData.ciphertext,
    levelData.plaintext,
    slotMap,
    activeSlot,
    activeShifts
  );
  const allCorrect = decryptedSegs.every((segment, idx) => segment === words[idx]);
  const solvedSlots = activeShifts.filter((shift, idx) => shift === targetShifts[idx]).length;
  const currentShift = activeShifts[activeSlot] ?? 0;
  const currentKeyGuess = idxToChar(currentShift);
  const currentTargetShift = targetShifts[activeSlot] ?? 0;
  const currentTargetKey = targetKey[activeSlot] || '';

  const spawnFish = () => {
    const correctLetter = targetKey[activeSlot] || ALPHABET[0];
    const letters = new Set([correctLetter]);
    while (letters.size < 6) {
      letters.add(ALPHABET[Math.floor(Math.random() * ALPHABET.length)]);
    }

    const list = [...letters].sort(() => Math.random() - 0.5).map((letter, i) => {
      const emoji = FISH_EMOJIS[Math.floor(Math.random() * FISH_EMOJIS.length)];
      const color = i % 2 === 0 ? 'var(--neon-cyan)' : 'var(--neon-green)';
      return {
        id: i,
        letter,
        value: charToIdx(letter),
        x: 10 + Math.random() * 80,
        y: 60 + Math.random() * 140,
        speed: 0.3 + Math.random() * 0.4,
        direction: Math.random() > 0.5 ? 1 : -1,
        emoji,
        color
      };
    });
    setFishList(list);
  };

  const spawnBubbles = () => {
    const list = [];
    for (let i = 0; i < 15; i++) {
      list.push({
        id: i,
        x: Math.random() * 100,
        size: 3 + Math.random() * 8,
        delay: Math.random() * 6,
        duration: 5 + Math.random() * 5
      });
    }
    setBubbles(list);
  };

  const resetRound = () => {
    setActiveShifts(getInitialShifts());
    setActiveSlot(0);
    setAttemptsLeft(Math.max(20, keyLen * 10));
    setChumCount(3);
    setLevelSolved(false);
    setShowExplanation(false);
    setExplanationStep(-1);
    setHoveredFish(null);
    setIsCasting(false);
    setCaughtFish(null);
    setFloatingXp(null);
  };

  const startGame = () => {
    resetRound();
    setPhase('playing');
    spawnFish();
    spawnBubbles();
  };

  useEffect(() => {
    setPhase('ready');
    setIsMenuOpen(false);
    resetRound();
  }, [levelData]);

  useEffect(() => {
    if (phase !== 'playing') return;
    if (allCorrect && !levelSolved) setLevelSolved(true);
    if (!allCorrect && levelSolved) setLevelSolved(false);
  }, [phase, allCorrect, levelSolved]);

  useEffect(() => {
    if (phase !== 'playing' || isMenuOpen) return;
    const tick = () => {
      setFishList(prev => prev.map(fish => {
        let nextX = fish.x + fish.speed * fish.direction * 0.08;
        let nextDirection = fish.direction;
        let nextValue = fish.value;

        if (nextX > 92) {
          nextX = 92;
          nextDirection = -1;
        }
        if (nextX < 8) {
          nextX = 8;
          nextDirection = 1;
        }

        return { ...fish, x: nextX, direction: nextDirection, value: nextValue };
      }));
      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationRef.current);
  }, [phase, isMenuOpen]);

  useEffect(() => {
    if (phase !== 'playing' || isCasting) return;
    spawnFish();
  }, [activeSlot]);

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
    setCastTarget({ x: (fish.x / 100) * 500, y: fish.y });

    let startTime = null;
    const castOut = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / 350, 1);
      setCastProgress(progress);
      if (progress < 1) {
        requestAnimationFrame(castOut);
        return;
      }

      setSplash({ show: true, x: fish.x, y: fish.y });
      setTimeout(() => setSplash({ show: false, x: 0, y: 0 }), 500);
      setFishList(prev => prev.filter(item => item.id !== fish.id));

      setTimeout(() => {
        let reelStart = null;
        const reelIn = (reelTimestamp) => {
          if (!reelStart) reelStart = reelTimestamp;
          const reelProgress = Math.min((reelTimestamp - reelStart) / 450, 1);
          setCastProgress(1 - reelProgress);
          if (reelProgress < 1) {
            requestAnimationFrame(reelIn);
            return;
          }

          setIsCasting(false);
          setCaughtFish(null);
          setActiveShifts(prev => {
            const next = [...prev];
            next[activeSlot] = fish.value;
            return next;
          });
          setBasketShake(true);
          setTimeout(() => setBasketShake(false), 400);
          setAttemptsLeft(prev => Math.max(0, prev - 1));

          setTimeout(() => {
            setFishList(prev => {
              const usedLetters = new Set(prev.map(item => item.letter));
              const targetLetter = targetKey[activeSlot] || ALPHABET[0];
              let letter = targetLetter;
              if (usedLetters.has(targetLetter) || Math.random() > 0.45) {
                do {
                  letter = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
                } while (usedLetters.has(letter));
              }
              const emoji = FISH_EMOJIS[Math.floor(Math.random() * FISH_EMOJIS.length)];
              const color = Math.random() > 0.5 ? 'var(--neon-cyan)' : 'var(--neon-green)';
              return [...prev, {
                id: Date.now(),
                letter,
                value: charToIdx(letter),
                x: Math.random() > 0.5 ? 90 : 10,
                y: 60 + Math.random() * 140,
                speed: 0.3 + Math.random() * 0.4,
                direction: Math.random() > 0.5 ? 1 : -1,
                emoji,
                color
              }];
            });
          }, 600);
        };
        requestAnimationFrame(reelIn);
      }, 50);
    };
    requestAnimationFrame(castOut);
  };

  const handleVerifySubmit = () => {
    if (!levelSolved) return;
    setShowExplanation(true);
    setExplanationStep(-1);
    const total = levelData.plaintext.replace(/\s+/g, '').length;
    let step = -1;
    const interval = setInterval(() => {
      step++;
      setExplanationStep(step);
      if (step >= total - 1) clearInterval(interval);
    }, 600);

    setFloatingXp({ amount: 100, x: 80, y: 80 });
    setTimeout(() => setFloatingXp(null), 1200);
  };

  const handleCloseExplanation = () => {
    setShowExplanation(false);
    onVerifySubmit();
  };

  const getRuleViolation = () => {
    if (activeShifts[activeSlot] === targetShifts[activeSlot]) return null;
    return {
      rule: `Slot #${activeSlot + 1} is set to ${currentKeyGuess}. The keyword clue points to ${currentTargetKey}. Catch the matching key-letter fish to fix every ${keyLen}th letter.`
    };
  };

  const ruleViolation = phase === 'playing' ? getRuleViolation() : null;

  const rodBaseX = 250;
  const rodBaseY = 260;
  let rodTipX = 220;
  let rodTipY = 190;
  let hookX = rodTipX;
  let hookY = rodTipY;

  if (isCasting && castTarget) {
    const dx = castTarget.x - rodBaseX;
    const dy = castTarget.y - rodBaseY;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      rodTipX = rodBaseX + (dx / len) * 50;
      rodTipY = rodBaseY + (dy / len) * 50;
    }
    if (castProgress <= 1 && caughtFish) {
      hookX = rodTipX + (castTarget.x - rodTipX) * castProgress;
      hookY = rodTipY + (castTarget.y - rodTipY) * castProgress;
    }
  }

  if (phase === 'ready') return (
    <div className="fg-root">
      <header className="fg-header">
        <button className="fg-btn-back-nav" onClick={onBackToStages}>
          <span className="material-symbols-outlined">arrow_back</span> Exit to Stages
        </button>
        <div className="fg-header-category">Vigenere Cipher</div>
        <div className="fg-header-stage" style={{ flex: 1, textAlign: 'center' }}>
          {tier.toUpperCase()} Mode - Stage {levelData.level}
        </div>
      </header>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div className="vg-ready-card" style={{ maxWidth: 620 }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🎣</div>
          <h2 style={{ color: 'var(--neon-cyan)', margin: '0 0 8px', fontSize: '1.5rem', fontWeight: 800 }}>Vigenere Fishing</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.6 }}>
            Recover the repeating keyword one letter at a time. Slot #1 affects letters 1, {keyLen + 1}, {keyLen * 2 + 1}; slot #2 affects letters 2, {keyLen + 2}, and so on.
          </p>
          <div style={{ background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 12, padding: '16px 20px', marginBottom: '20px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 8, fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Ciphertext</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--neon-cyan)' }}>{levelData.ciphertext}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 8, fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Keyword Clue</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--neon-yellow)' }}>{levelData.keyClue}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Hint</span>
              <span style={{ color: '#a0c4d8', fontStyle: 'italic' }}>{levelData.hint}</span>
            </div>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', marginBottom: '20px', lineHeight: 1.5 }}>
            Catch letter fish to fill the active keyword slot. When every slot matches the keyword, the full Vigenere plaintext resolves.
          </p>
          <button className="vg-start-btn" onClick={startGame}>🎣 Start Fishing</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fg-root">
      <style>{`
        @keyframes pulse {
          0% { opacity: 0.6; box-shadow: 0 0 4px rgba(0, 229, 255, 0.4); }
          100% { opacity: 1; box-shadow: 0 0 12px rgba(0, 229, 255, 0.8); }
        }
        .vg-key-slot-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(72px, 1fr));
          gap: 8px;
          width: 100%;
        }
        .vg-key-slot-btn {
          border: 1px solid rgba(0, 229, 255, 0.18);
          background: rgba(255,255,255,0.04);
          color: var(--text-primary);
          border-radius: 8px;
          padding: 8px 6px;
          cursor: pointer;
          font-family: JetBrains Mono, monospace;
          font-size: 0.75rem;
        }
        .vg-key-slot-btn.active {
          border-color: var(--neon-cyan);
          box-shadow: 0 0 14px rgba(0,229,255,0.22);
          background: rgba(0,229,255,0.1);
        }
        .vg-key-slot-btn.solved {
          border-color: var(--neon-green);
          color: var(--neon-green);
        }
      `}</style>

      {showExplanation && (
        <div className="fg-recap-overlay" style={{ overflowY: 'auto', padding: '30px 10px' }}>
          <div className="fg-recap-card" style={{ maxWidth: '1100px', width: '95%', padding: '24px 32px' }}>
            <h2 className="fg-recap-title">🔬 Vigenere Cipher Recap</h2>
            <p className="fg-recap-subtitle">Why Did This Work?</p>
            <div className="fg-recap-animation-box" style={{ minHeight: 'auto', padding: '16px', marginBottom: '16px' }}>
              <div className="fg-recap-letter-row">
                {levelData.ciphertext.replace(/\s+/g, '').split('').map((cipherCh, idx) => {
                  const plainCh = levelData.plaintext.replace(/\s+/g, '')[idx];
                  const slot = idx % keyLen;
                  const keyLetter = targetKey[slot];
                  const shift = targetShifts[slot];
                  return (
                    <div key={idx} className={`fg-recap-node ${explanationStep >= idx ? 'active' : 'waiting'}`}>
                      <span className="fg-recap-char-cipher">{cipherCh}</span>
                      <span className="fg-recap-math">-{keyLetter} ({shift})</span>
                      <span className="fg-recap-arrow">↓</span>
                      <span className="fg-recap-char-plain">{plainCh}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="fg-recap-explanation" style={{ background: 'rgba(255,255,255,0.015)' }}>
              💡 <strong>Vigenere Cipher Decryption:</strong> the keyword repeats across the letters. Each key letter acts like its own Caesar shift, so one basket controls every letter in that repeating slot.{' '}
              <code>Plain[i] = Cipher[i] - Key[i mod keyLength]</code>
              <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {targetKey.split('').map((letter, idx) => (
                  <span key={idx} style={{ border: '1px solid rgba(0,229,255,0.24)', borderRadius: 8, padding: '6px 10px', color: 'var(--neon-cyan)', fontFamily: 'JetBrains Mono, monospace' }}>
                    Slot {idx + 1}: {letter} = {targetShifts[idx]}
                  </span>
                ))}
              </div>
            </div>
            <div className="fg-recap-actions" style={{ marginTop: 16 }}>
              <button
                className="fg-btn fg-btn-primary"
                onClick={handleCloseExplanation}
                disabled={explanationStep < levelData.plaintext.replace(/\s+/g, '').length - 1}
                style={{ background: 'var(--neon-green)', color: '#030914' }}
              >
                Unlock Next Objective →
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="fg-header">
        <button className="fg-btn-back-nav" onClick={() => setIsMenuOpen(true)}>
          <span className="material-symbols-outlined">menu</span> Menu
        </button>
        <div className="fg-header-category">Vigenere Cipher</div>
        <div className="fg-header-stage" style={{ flex: 1, textAlign: 'center' }}>
          {tier.toUpperCase()} Mode - Stage {levelData.level}
        </div>
        <div className={`fg-header-attempts ${attemptsLeft <= 3 ? 'low-attempts' : ''}`}>
          Casts Left: {attemptsLeft}
        </div>
      </header>

      <div className="fg-game-layout">
        <aside className="fg-sidebar">
          <div className={`fg-basket-card ${levelSolved ? 'active-target' : ''} ${basketShake ? 'shake' : ''}`}>
            <div className="fg-basket-container">🧺</div>
            <div className="fg-basket-shift-value">{currentKeyGuess}</div>
            <span className="fg-basket-label">Keyword Slot #{activeSlot + 1}</span>
            {floatingXp && (
              <div className="fg-xp-pop-indicator" style={{ left: `${floatingXp.x}%`, top: `${floatingXp.y}%` }}>
                +{floatingXp.amount} XP
              </div>
            )}
          </div>

          <div className="fg-cipher-ref">
            <p className="fg-ref-title">Keyword Baskets</p>
            <div className="vg-key-slot-grid">
              {activeShifts.map((shift, idx) => {
                const solved = shift === targetShifts[idx];
                return (
                  <button
                    key={idx}
                    type="button"
                    className={`vg-key-slot-btn ${idx === activeSlot ? 'active' : ''} ${solved ? 'solved' : ''}`}
                    onClick={() => { if (!isCasting) setActiveSlot(idx); }}
                  >
                    <div>#{idx + 1}</div>
                    <strong>{idxToChar(shift)}</strong>
                    <div>Key Letter</div>
                  </button>
                );
              })}
            </div>
            <p className="fg-ref-hint">
              <span>Solved Slots:</span>
              <span className="fg-key">{solvedSlots}/{keyLen}</span>
            </p>
            <p className="fg-ref-formula">Formula:<br />Plain = Cipher - Keyword Letter</p>
          </div>

          <button
            className="fg-btn"
            onClick={handleChumWaters}
            disabled={chumCount <= 0 || isCasting}
            style={{
              width: '100%',
              flex: '0 0 auto',
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
              cursor: chumCount > 0 ? 'pointer' : 'not-allowed'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>waves</span>
            Chum the Waters ({chumCount} left)
          </button>

          <div className="fg-cipher-ref">
            <p className="fg-ref-title">Slot #{activeSlot + 1} Sample Letters</p>
            <p className="fg-ref-hint">
              <span>Guess:</span>
              <span className="fg-key">{currentKeyGuess}</span>
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '8px 0', padding: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '4px', paddingBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <span>CIPHER</span>
                <span>PLAIN</span>
              </div>
              {activeSlotSamples.slice(0, 6).map((sample, idx) => (
                <div key={`${sample.wordIdx}-${sample.charIdx}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontFamily: 'monospace' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{sample.cipherChar}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>↓</span>
                  <span style={{ color: sample.plainChar === sample.targetPlain ? 'var(--neon-green)' : 'var(--neon-yellow)', fontWeight: 'bold' }}>{sample.plainChar}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="fg-sidebar-alerts">
            {levelSolved ? (
              <div className="fg-success-panel">
                <h3>✅ SECURED!</h3>
                <p>Keyword recovered and ciphertext decrypted.</p>
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
                <strong>⚠️ Key Slot Check:</strong>
                <p style={{ marginTop: 6, fontSize: '0.82rem', lineHeight: 1.4 }}>{ruleViolation.rule}</p>
              </div>
            ) : (
              <div className="fg-alert-panel default-alert">
                <strong>🎣 Status:</strong>
                <p style={{ marginTop: 6, fontSize: '0.82rem', lineHeight: 1.4 }}>Pick a keyword slot, then catch the fish carrying the key letter for that slot.</p>
              </div>
            )}
          </div>
        </aside>

        <main className="fg-main">
          <section className="fg-word-panel">
            <div className="fg-word-segments-row">
              {words.map((word, wordIdx) => {
                const cipherWord = cipherSegs[wordIdx];
                const decWord = decryptedSegs[wordIdx];
                const prevWord = previewSegs[wordIdx];

                return (
                  <div key={wordIdx} className="fg-word-segment-card">
                    <div className="fg-letter-cells">
                      {cipherWord.split('').map((cipherCh, charIdx) => {
                        const slot = slotMap[wordIdx]?.[charIdx] ?? 0;
                        const isActiveSlot = slot === activeSlot;
                        const maskList = levelData.masks[wordIdx];
                        const isPrefilled = tier === 'easy' && maskList?.[charIdx];
                        const isCorrect = decWord[charIdx] === word[charIdx];
                        const isHovered = tier === 'easy' && hoveredFish && isActiveSlot;
                        const letterToShow = (isPrefilled || isCorrect)
                          ? word[charIdx]
                          : (isHovered ? prevWord[charIdx] : '_');
                        const cellStyle = isActiveSlot ? {
                          borderColor: 'var(--neon-cyan)',
                          boxShadow: '0 0 12px rgba(0,229,255,0.18)'
                        } : {};
                        let cellClass = 'fg-letter-cell';
                        if (isPrefilled || isCorrect) cellClass = 'fg-letter-cell correct-plain';

                        return (
                          <div
                            key={charIdx}
                            className={cellClass}
                            style={cellStyle}
                            onClick={() => { if (!isCasting) setActiveSlot(slot); }}
                          >
                            <span className="fg-cell-ciphertext">{cipherCh}</span>
                            <span className="fg-cell-plaintext">{letterToShow}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="fg-segment-basket-badge">
                      Key pattern: {slotMap[wordIdx].map(slot => idxToChar(activeShifts[slot] ?? 0)).join('')}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="fg-clue-banner">💡 Keyword clue: <strong>"{levelData.keyClue}"</strong></div>
            <div className="fg-clue-banner" style={{ marginTop: 8 }}>Hint: <strong>"{levelData.hint}"</strong></div>
          </section>

          <section className="fg-pond-wrapper">
            <div className="fg-pond-container">
              <div className="fg-wave" />
              {bubbles.map(bubble => (
                <div key={bubble.id} className="fg-bubble" style={{ left: `${bubble.x}%`, width: `${bubble.size}px`, height: `${bubble.size}px`, animationDelay: `${bubble.delay}s`, animationDuration: `${bubble.duration}s` }} />
              ))}
              {fishList.map(fish => {
                const badgeText = fish.letter;
                const badgeClass = 'fg-fish-badge positive';

                return (
                  <div
                    key={fish.id}
                    className="fg-fish-entity"
                    style={{ left: `${fish.x}%`, top: `${fish.y}px`, transform: `scaleX(${fish.direction})` }}
                    onMouseEnter={() => { if (!isCasting) setHoveredFish(fish); }}
                    onMouseLeave={() => setHoveredFish(null)}
                    onClick={() => castLineToFish(fish)}
                  >
                    <span className="fg-fish-sprite" style={{ color: fish.color }}>{fish.emoji}</span>
                    <div className={badgeClass} style={{ transform: `scaleX(${fish.direction})` }}>
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

      {isMenuOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #0f172a, #020617)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '16px',
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            minWidth: '320px',
            boxShadow: '0 0 30px rgba(0,0,0,0.8)'
          }}>
            <h2 style={{ color: 'var(--neon-cyan)', margin: 0, textAlign: 'center', fontSize: '1.6rem', marginBottom: '8px', letterSpacing: '2px' }}>PAUSED</h2>
            <button className="fg-btn fg-btn-primary" onClick={() => setIsMenuOpen(false)} style={{ padding: '14px', fontSize: '1.1rem', background: 'var(--neon-green)', color: '#000', fontWeight: 'bold' }}>
              ▶ Resume
            </button>
            <button className="fg-btn fg-btn-secondary" onClick={() => { setIsMenuOpen(false); setPhase('ready'); }} style={{ padding: '14px', fontSize: '1.1rem', background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
              📖 Tutorial
            </button>
            <button className="fg-btn" onClick={onBackToStages} style={{ padding: '14px', fontSize: '1.1rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)', marginTop: '8px' }}>
              🚪 Exit Stage
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
