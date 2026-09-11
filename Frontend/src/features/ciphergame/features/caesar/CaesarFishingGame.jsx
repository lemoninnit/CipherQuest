import React, { useState, useEffect, useRef } from 'react';
import '../../CipherGame.css';
import GameHudBar from '../../ui/GameHudBar';
import StageLoadingScreen from '../../ui/StageLoadingScreen';
import { facingTransform, makeSwimProps, tickFish, visualsForValue } from '../../core/engine/fishPhysics';

/* ─── Caesar math ─── */
const caesarShiftChar = (char, shift) => {
  const code = char.charCodeAt(0);
  if (code >= 65 && code <= 90) {
    return String.fromCharCode(((code - 65 + shift) % 26 + 26) % 26 + 65);
  }
  return char;
};
const caesarShiftWord = (word, shift) =>
  word.split('').map(ch => caesarShiftChar(ch, shift)).join('');

const normalizeShift = (shift = 0) => ((shift % 26) + 26) % 26;

const applyShiftDelta = (curr, delta) => {
  return normalizeShift(curr + delta);
};

const formatShift = (shift) => `+${normalizeShift(shift)}`;

const FISH_VALUES = [+1, +2, +3, +4, +5, +6, +7, +8, +9, +10, -1, -2, -3, -4, -5, -6, -7, -8, -9, -10];

export default function CaesarFishingGame({ levelData, tier, onVerifySubmit, onBackToStages, onReplayNewQuestion }) {
  const words         = levelData.plaintext.split(' ');
  const cipherSegs    = levelData.ciphertext.split(' ');
  const getInitialShift = (segIdx) => normalizeShift(levelData.startShifts?.[segIdx] ?? levelData.startShifts?.[0] ?? 0);
  const getTargetShift = (segIdx) => normalizeShift(26 - (levelData.targetShifts?.[segIdx] ?? levelData.targetShifts?.[0] ?? 0));

  /* ── state ── */
  const [phase, setPhase]                     = useState('ready');
  const [isOperationLoading, setIsOperationLoading] = useState(false);
  const [activeShifts, setActiveShifts]       = useState(() => cipherSegs.map((_, idx) => getInitialShift(idx)));
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
  const [isMenuOpen, setIsMenuOpen]           = useState(false);
  const animationRef = useRef(null);
  const resumeBtnRef = useRef(null);
  const wasMenuOpenRef = useRef(false);

  /* ── ESC key to toggle pause menu ── */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (phase === 'playing' && !showExplanation) {
          e.preventDefault();
          setIsMenuOpen(prev => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, showExplanation]);

  /* ── Focus management for pause menu ── */
  useEffect(() => {
    if (isMenuOpen) {
      wasMenuOpenRef.current = true;
      setTimeout(() => resumeBtnRef.current?.focus(), 50);
    } else if (wasMenuOpenRef.current) {
      wasMenuOpenRef.current = false;
      const menuBtn = document.querySelector('.fg-header-left .fg-btn-back-nav');
      menuBtn?.focus();
    }
  }, [isMenuOpen]);

  /* ── derived ── */
  const basketShift = normalizeShift(activeShifts[0] ?? getInitialShift(0));
  const decryptedSegs = cipherSegs.map((seg, i) =>
    caesarShiftWord(seg, activeShifts[i] ?? 0)
  );

  const allCorrect = decryptedSegs.every((dec, i) => dec === words[i]);

  /* ── start game ── */
  const startGame = () => {
    setActiveShifts(cipherSegs.map((_, idx) => getInitialShift(idx)));
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
    setIsMenuOpen(false);
    setActiveShifts(cipherSegs.map((_, idx) => getInitialShift(idx)));
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
    const targetShift = normalizeShift(26 - (levelData.targetShifts?.[0] ?? 0));
    const currentShift = basketShift;
    const diff = normalizeShift(targetShift - currentShift);

    const helpers = [];
    if (diff !== 0) {
      // Direct single-fish solver
      if (FISH_VALUES.includes(diff)) {
        helpers.push(diff);
      } else if (FISH_VALUES.includes(-normalizeShift(26 - diff))) {
        helpers.push(-normalizeShift(26 - diff));
      }
      
      // Two-fish solvers
      for (const val of FISH_VALUES) {
        const remaining = normalizeShift(diff - val);
        const remNeg = -normalizeShift(26 - remaining);
        if (FISH_VALUES.includes(remaining)) {
          helpers.push(val);
          helpers.push(remaining);
          break;
        } else if (FISH_VALUES.includes(remNeg)) {
          helpers.push(val);
          helpers.push(remNeg);
          break;
        }
      }
    }

    // Build a diverse base pool: all 8 fish values shuffled, then pad with helpers/randoms
    const TOTAL_FISH = 9;
    const shuffledAll = [...FISH_VALUES].sort(() => Math.random() - 0.5);
    const valuePool = [...shuffledAll];
    // Inject helpers at the start so at least 1-2 helpful fish are guaranteed
    helpers.forEach(h => valuePool.unshift(h));

    const usedY = [];
    for (let i = 0; i < TOTAL_FISH; i++) {
      let value;
      if (i < valuePool.length) {
        value = valuePool[i];
      } else {
        value = FISH_VALUES[Math.floor(Math.random() * FISH_VALUES.length)];
      }

      // Spread fish vertically so they don't all cluster on the same row
      let y;
      let attempts = 0;
      do {
        y = 30 + Math.random() * 200;
        attempts++;
      } while (usedY.some(uy => Math.abs(uy - y) < 28) && attempts < 20);
      usedY.push(y);

      list.push({
        id: i,
        value,
        x: 2 + Math.random() * 94,
        y,
        speed: 0.3 + Math.random() * 0.5,
        ...visualsForValue(value),
        ...makeSwimProps(),
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
    if (phase !== 'playing' || isMenuOpen) return;
    const tick = () => {
      setFishList(prev => prev.map(f => tickFish(f)));
      animationRef.current = requestAnimationFrame(tick);
    };
    animationRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationRef.current);
  }, [phase, isMenuOpen]);

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
            const nextShift = applyShiftDelta(prev[0] ?? getInitialShift(0), fish.value);
            return cipherSegs.map(() => nextShift);
          });
          setBasketShake(true);
          setTimeout(() => setBasketShake(false), 400);
          setAttemptsLeft(prev => Math.max(0, prev - 1));
          
          setTimeout(() => {
            setFishList(prev => {
              const targetShift = normalizeShift(26 - (levelData.targetShifts?.[0] ?? 0));
              const currentShift = basketShift;
              const diff = normalizeShift(targetShift - currentShift);
              let value = FISH_VALUES[Math.floor(Math.random() * FISH_VALUES.length)];
              if (diff !== 0 && Math.random() > 0.4) {
                if (FISH_VALUES.includes(diff)) {
                  value = diff;
                } else if (FISH_VALUES.includes(-normalizeShift(26 - diff))) {
                  value = -normalizeShift(26 - diff);
                }
              }
              return [...prev, {
                id: Date.now(),
                value,
                x: Math.random() > 0.5 ? 94 : 2,
                y: 30 + Math.random() * 200,
                speed: 0.3 + Math.random() * 0.5,
                ...visualsForValue(value),
                ...makeSwimProps(),
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
    const pShift = normalizeShift(activeShifts[targetSegIdx] ?? 0);
    const tShift = getTargetShift(targetSegIdx);
    if (dec === tWord) return null;
    for (let i = 0; i < tWord.length; i++) {
      if (dec[i] !== tWord[i]) {
        return {
          rule: `Shift ${formatShift(pShift)} is incorrect. The correct basket shift for this ciphertext is ${formatShift(tShift)}. Keep catching fish to adjust the basket shift!`
        };
      }
    }
    return null;
  };

  /* ════ READY ════ */
  if (phase === 'ready') {
    if (isOperationLoading) {
      return (
        <StageLoadingScreen
          category="caesar"
          difficulty={tier}
          stageIndex={(levelData.level || 1) - 1}
          onLoadingComplete={() => {
            setIsOperationLoading(false);
            startGame();
          }}
        />
      );
    }

    const stageCode = `OP-${String(levelData.level || 1).padStart(2, '0')}`;
    return (
      <div className="fg-root">
        <GameHudBar
          title="Caesar Fishing"
          stage={levelData.level}
          tier={tier}
          isReady={true}
          onBackToStages={onBackToStages}
        />
        <div className="cq-brief-screen">
          <img
            className="cq-bg-img"
            src="/assets/fish/lobbybg/lobbybg.png"
            alt="Lobby Background"
            aria-hidden="true"
          />
          <div className="cq-lobby-scrim" />
          <div className="cq-dossier-card">
            {/* Left Column: Sprite Frame & Stage Code */}
            <div className="cq-dossier-left-col">
              <div className="cq-dossier-sprite-frame">
                <div className="cq-dossier-sprite cq-dossier-sprite-fish" aria-hidden="true" />
              </div>
              <div className="cq-dossier-stage-code">{stageCode}</div>
            </div>

            {/* Right Column: Briefing Content */}
            <div className="cq-dossier-right-col">
              <div className="cq-dossier-tag">MISSION BRIEF</div>
              <h2 className="cq-dossier-title">Caesar Fishing</h2>
              <p className="cq-dossier-subtitle">
                Catch fish carrying shift modifiers to dial in the correct Caesar shift and decrypt the ciphertext.
              </p>
              <hr className="cq-dossier-divider" />
              <div className="cq-dossier-data">
                <div className="cq-dossier-row">
                  <span className="cq-dossier-label">CIPHERTEXT</span>
                  <span className="cq-dossier-value cyan-mono">{levelData.ciphertext}</span>
                </div>
                <div className="cq-dossier-row">
                  <span className="cq-dossier-label">HINT</span>
                  <span className="cq-dossier-value hint-text">{levelData.hint}</span>
                </div>
              </div>
              <p className="cq-dossier-how-it-works">
                <strong>How it works:</strong>{' '}
                Click fish carrying shift modifiers (<strong>+1, -1, +2, -2, +3, -3, +5, -5</strong>) to adjust the active shift key.
                When the decrypted text matches the plaintext, submit! Formula:{' '}
                <code>Plain = (Cipher + Basket Shift) mod 26</code>
              </p>
              <button className="cq-dossier-action-btn" onClick={() => setIsOperationLoading(true)}>
                Begin operation
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ════ PLAYING ════ */
  const currentShift = basketShift;

  return (
    <div className="fg-root caesar-fishing-fullscreen">
      <style>{`
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
                  const seg = getTargetShift(wi);
                  return (
                    <div key={idx} className={`fg-recap-node ${explanationStep >= idx ? 'active' : 'waiting'}`}>
                      <span className="fg-recap-char-cipher">{cipherCh}</span>
                      <span className="fg-recap-math">+{seg}</span>
                      <span className="fg-recap-arrow">↓</span>
                      <span className="fg-recap-char-plain">{plainCh}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="fg-recap-explanation" style={{ background: 'rgba(255,255,255,0.015)' }}>
              💡 <strong>Caesar Cipher Decryption:</strong> Each ciphertext letter is shifted forward by the basket correction value.
              By catching fish with numeric modifiers, you tuned the basket shift to match the playable decryption key.{' '}
              <code>Plain = (Cipher + Basket Shift) mod 26</code> maps every letter back uniformly.
              {levelData.targetShifts && levelData.targetShifts.map((shiftVal, sIdx) => {
                const decryptShift = normalizeShift(26 - shiftVal);
                const sAlph = alphabet.map((_, i) => alphabet[(i + decryptShift) % 26]);
                return (
                  <div key={sIdx} style={{ marginTop: 16, background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 12, padding: 12 }}>
                    <div style={{ fontWeight: 700, color: 'var(--neon-cyan)', marginBottom: 8, fontSize: '0.82rem' }}>
                      🔑 Caesar Decryption Shift Table {levelData.targetShifts.length > 1 ? `— Segment #${sIdx + 1}` : ''} (Basket: +{decryptShift})
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ borderCollapse: 'collapse', textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', minWidth: 850 }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <th style={{ padding: '4px 2px', textAlign: 'left', color: 'var(--text-muted)' }}>Cipher:</th>
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
                            <th style={{ padding: '4px 2px', textAlign: 'left', color: 'var(--text-muted)' }}>Plain:</th>
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

      <GameHudBar
        title="Caesar Fishing"
        stage={levelData.level}
        tier={tier}
        isReady={false}
        onOpenMenu={() => setIsMenuOpen(true)}
        attempts={attemptsLeft}
      />

      <div className="caesar-fullscreen-stage">
        {/* Fullscreen Ocean Background Video */}
        <video
          className="fg-pond-video"
          src="/assets/fish/ocean_bg.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
        <div className="fg-pond-overlay" />
        <div className="fg-wave" />
        {bubbles.map(b => (
          <div key={b.id} className="fg-bubble" style={{ left: `${b.x}%`, width: `${b.size}px`, height: `${b.size}px`, animationDelay: `${b.delay}s`, animationDuration: `${b.duration}s` }} />
        ))}

        {/* Fish Swim Lane & Rod */}
        <div className="caesar-fish-swim-lane">
          {fishList.map(f => {
            const badgeText = f.value > 0 ? `+${f.value}` : `${f.value}`;
            const badgeClass = `fg-fish-badge ${f.value > 0 ? 'positive' : 'negative'}`;

            return (
              <div
                key={f.id}
                className="fg-fish-entity"
                style={{ left: `${f.x}%`, top: `${f.y}px` }}
                onClick={() => castLineToFish(f)}
              >
                <div className="fg-fish-facing" style={{ transform: facingTransform(f.facing) }}>
                  <img
                    className="fg-fish-sprite-img"
                    src={f.imgSrc}
                    alt="fish"
                    draggable={false}
                  />
                </div>
                <div className={badgeClass}>
                  {badgeText}
                </div>
              </div>
            );
          })}
          {isCasting && caughtFish && castProgress < 1 && (
            <div className="fg-fish-entity" style={{ left: `${(hookX / 500) * 100}%`, top: `${hookY - 20}px`, transform: 'scale(1.2)' }}>
              <div className="fg-fish-facing" style={{ transform: facingTransform(caughtFish.facing) }}>
                <img
                  className="fg-fish-sprite-img"
                  src={caughtFish.imgSrc}
                  alt="fish"
                  draggable={false}
                />
              </div>
            </div>
          )}
          <svg className="fg-pond-svg" viewBox="0 0 500 260" preserveAspectRatio="none">
            <line x1={rodBaseX} y1={rodBaseY} x2={rodTipX} y2={rodTipY} className="fg-fishing-rod-line" />
            {isCasting && <line x1={rodTipX} y1={rodTipY} x2={hookX} y2={hookY} className="fg-fishing-line" />}
          </svg>
          {splash.show && (
            <div className="fg-splash-effect" style={{ left: `${splash.x}%`, top: `${splash.y}px` }}>💦</div>
          )}
        </div>

        {/* Floating Overlays */}
        {/* 1. Top-Center Word Segment Panel + Hint */}
        <div className="caesar-floating-word-panel">
          <div className="fg-word-segments-row">
            {words.map((word, wIdx) => {
              const isTargeted = targetSegIdx === wIdx;
              const segShift = normalizeShift(activeShifts[wIdx] ?? 0);
              const cipherWord = cipherSegs[wIdx];
              const decWord = decryptedSegs[wIdx];

              return (
                <div
                  key={wIdx}
                  className={`fg-word-segment-card ${isTargeted ? 'targeted' : ''}`}
                  tabIndex={0}
                  role="button"
                  aria-label={`Segment ${wIdx + 1}`}
                  onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !isCasting) setTargetSegIdx(wIdx); }}
                  onClick={() => { if (!isCasting) setTargetSegIdx(wIdx); }}
                >
                  <div className="caesar-segment-top-row">
                    <span className="caesar-active-shift-label">Active Shift:</span>
                    <span className="caesar-active-shift-badge">{formatShift(segShift)}</span>
                  </div>
                  <div className="fg-letter-cells">
                    {cipherWord.split('').map((cipherCh, chIdx) => {
                      const maskList = levelData.masks[wIdx];
                      const isPrefilled = tier === 'easy' && maskList?.[chIdx];
                      const isCorrect = decWord[chIdx] === word[chIdx];
                      const letterToShow = isPrefilled ? word[chIdx] : decWord[chIdx];

                      const cellClass = (isPrefilled || isCorrect)
                        ? 'fg-letter-cell correct-plain'
                        : 'fg-letter-cell unmatched-plain';

                      return (
                        <div key={chIdx} className={cellClass}>
                          <span className="fg-cell-ciphertext">{cipherCh}</span>
                          <span className="fg-cell-plaintext">{letterToShow}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="fg-segment-basket-badge">Basket Shift: {formatShift(segShift)}</div>
                </div>
              );
            })}
          </div>
          <div className="caesar-floating-hint">Hint: “{levelData.hint}”</div>
        </div>

        {/* 2. Floating Caesar Guide (Bottom-Left) */}
        <div className="caesar-floating-guide">
          <h3 className="caesar-guide-title">Ceasar Guide</h3>
          <p className="caesar-guide-desc">
            The Caesar cipher shifts each letter forward. To decrypt, we must shift it further to complete the 26-letter rotation
          </p>
          <p className="caesar-guide-tip">
            Catch fish with + / - modifiers to adjust the Basket Shift until words look readable!
          </p>
        </div>

        {/* 3. Floating Chum the Waters Button (Bottom-Right, above Basket Key) */}
        <button
          className="caesar-floating-chum-btn"
          onClick={handleChumWaters}
          disabled={chumCount <= 0 || isCasting}
          aria-label={`Chum the Waters, ${chumCount} left`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>waves</span>
          Chum the Waters ({chumCount} left)
        </button>

        {/* 4. Floating Basket Shift Key Card (Bottom-Right) */}
        <div className={`caesar-floating-basket-card ${basketShake ? 'shake' : ''}`}>
          <div className="caesar-basket-icon">🧺</div>
          <div className="caesar-basket-badge">{formatShift(currentShift)}</div>
          <div className="caesar-basket-label">BASKET SHIFT KEY</div>
          {floatingXp && (
            <div className="fg-xp-pop-indicator" style={{ left: `${floatingXp.x}%`, top: `${floatingXp.y}%` }}>
              +{floatingXp.amount} XP
            </div>
          )}
        </div>

        {/* 5. Floating Cipher Cheat Sheet (Top-Left) */}
        <div className="caesar-floating-cheat-sheet">
          <div className="caesar-cheat-header">
            <span className="caesar-cheat-title">Cipher Cheat Sheet</span>
            <span className="caesar-cheat-badge">Shift {formatShift(currentShift)}</span>
          </div>
          <div className="caesar-cheat-body">
            <div className="caesar-cheat-labels">
              <span className="caesar-cheat-label-plain">PLAIN</span>
              <span className="caesar-cheat-label-shift">SHIFT</span>
            </div>
            <div className="caesar-cheat-columns">
              {alphabet.map(ch => (
                <div key={ch} className="caesar-cheat-col">
                  <span className="caesar-cheat-plain">{ch}</span>
                  <span className="caesar-cheat-shifted">{caesarShiftChar(ch, currentShift)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 6. Floating Secured Victory Panel when level solved */}
        {levelSolved && (
          <div className="caesar-floating-victory-panel">
            <h3 className="caesar-victory-title">✅ SECURED!</h3>
            <p className="caesar-victory-desc">All segments decrypted successfully.</p>
            <button
              className="fg-btn fg-btn-primary"
              onClick={handleVerifySubmit}
              style={{ width: '100%', background: 'var(--neon-green)', color: '#030914', marginTop: 10 }}
            >
              🚀 Verify & Submit
            </button>
            {onReplayNewQuestion && (
              <button
                className="fg-btn fg-btn-secondary"
                onClick={onReplayNewQuestion}
                style={{ width: '100%', marginTop: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              >
                🔄 Play Again
              </button>
            )}
          </div>
        )}
      </div>

      {/* Menu / Pause Modal */}
      {isMenuOpen && (
        <div
          className="caesar-pause-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="caesar-pause-title"
          onClick={(e) => { if (e.target === e.currentTarget) setIsMenuOpen(false); }}
        >
          <div className="caesar-pause-card">
            <h2 id="caesar-pause-title" className="caesar-pause-title">PAUSED</h2>
            <button
              ref={resumeBtnRef}
              className="caesar-pause-btn caesar-pause-btn-resume"
              onClick={() => setIsMenuOpen(false)}
            >
              <span className="material-symbols-outlined">play_arrow</span>
              Resume
            </button>
            <button
              className="caesar-pause-btn caesar-pause-btn-tutorial"
              onClick={() => { setIsMenuOpen(false); setPhase('ready'); }}
            >
              <span className="material-symbols-outlined">menu_book</span>
              Tutorial
            </button>
            <button
              className="caesar-pause-btn caesar-pause-btn-exit"
              onClick={onBackToStages}
            >
              <span className="material-symbols-outlined">logout</span>
              Exit Stage
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
