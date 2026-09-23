/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef } from 'react';
import '../../CipherGame.css';
import GameHudBar from '../../ui/GameHudBar';
import StageLoadingScreen from '../../ui/StageLoadingScreen';
import PauseMenu from '../../ui/PauseMenu';
import CryptographicRecap from '../../ui/CryptographicRecap';
import VictoryConfetti from '../../ui/VictoryConfetti';
import { facingTransform, makeSwimProps, tickFish, visualsForValue } from '../../core/engine/fishPhysics';
import { fishingSound } from '../../core/engine/fishingSound';

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

export default function CaesarFishingGame({ levelData, tier, onVerifySubmit, onBackToStages, onReplayNewQuestion, onStartStageTimer }) {
  const words         = levelData.plaintext.split(' ');
  const cipherSegs    = levelData.ciphertext.split(' ');
  const getInitialShift = (segIdx) => normalizeShift(levelData.startShifts?.[segIdx] ?? levelData.startShifts?.[0] ?? 0);

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
  const [chumCount, setChumCount]             = useState(3);
  const [isMenuOpen, setIsMenuOpen]           = useState(false);
  const [rodFacingRight, setRodFacingRight]   = useState(false);
  const [isMuted, setIsMuted]                 = useState(false);
  const [rodTip, setRodTip]                   = useState({ x: 110, y: 55 });
  const [laneHeight, setLaneHeight]           = useState(500);
  const animationRef = useRef(null);
  const swimLaneRef = useRef(null);        // the swim-lane container div

  useEffect(() => {
    return () => {
      fishingSound.stopBgm();
    };
  }, []);

  useEffect(() => {
    if (phase === 'playing' && !isMenuOpen && !showExplanation) {
      fishingSound.playBgm();
    } else {
      fishingSound.pauseBgm();
    }
  }, [phase, isMenuOpen, showExplanation]);

  const toggleSound = () => {
    const muted = fishingSound.toggleMute();
    setIsMuted(muted);
  };

  const soundToggleButton = (
    <button
      className="fg-btn-icon"
      onClick={toggleSound}
      title={isMuted ? "Unmute Sound" : "Mute Sound"}
      style={{
        background: 'rgba(255, 255, 255, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '8px',
        color: '#fff',
        padding: '4px 8px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        fontSize: '1rem'
      }}
    >
      {isMuted ? '🔇' : '🔊'}
    </button>
  );

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
  }, [phase, showExplanation]);  /* ── derived ── */
  const basketShift = normalizeShift(activeShifts[0] ?? getInitialShift(0));
  const decryptedSegs = cipherSegs.map((seg, i) =>
    caesarShiftWord(seg, activeShifts[i] ?? 0)
  );

  const allCorrect = decryptedSegs.every((dec, i) => dec === words[i]);

  /* ── start game ── */
  const startGame = () => {
    fishingSound.unlockAudio();
    fishingSound.playBgm();
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
    if (allCorrect && !levelSolved) {
      setLevelSolved(true);
      fishingSound.stopBgm();
      fishingSound.playSfx('win');
    }
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
    if (phase !== 'playing' || isMenuOpen || levelSolved) return;
    const tick = () => {
      setFishList(prev => prev.map(f => tickFish(f)));
      animationRef.current = requestAnimationFrame(tick);
    };
    animationRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationRef.current);
  }, [phase, isMenuOpen, levelSolved]);

  /* ── casting ── */

  const handleChumWaters = () => {
    if (chumCount <= 0 || isCasting) return;
    fishingSound.playSfx('chum');
    setChumCount(prev => prev - 1);
    spawnFish();
    setSplash({ show: true, x: 50, y: 120 });
    setTimeout(() => setSplash({ show: false, x: 0, y: 0 }), 600);
  };

  const castLineToFish = (fish) => {
    if (isCasting || levelSolved) return;
    fishingSound.unlockAudio();
    fishingSound.playSfx('cast');
    setIsCasting(true);
    setCaughtFish(fish);
    // Remove from the swim list immediately so the fish doesn't appear in two places
    setFishList(prev => prev.filter(f => f.id !== fish.id));
    // x: fish.x is a % → map to SVG viewBox width (500)
    const tx = (fish.x / 100) * 500;
    // y: fish.y is DOM px → must convert to SVG viewBox height (260)
    const containerHeight = swimLaneRef.current?.offsetHeight || 500;
    const ty = (fish.y / containerHeight) * 260;
    setCastTarget({ x: tx, y: ty });
    // --- Determine facing direction & compute SVG tip coords ---
    const facingRight = tx > 250;
    setRodFacingRight(facingRight);
    /*
     * Sprite dimensions (must match CSS):
     *   SPRITE = 500px, handle at 88% → 440px from left,  tip at 12% → 60px.
     * For left-facing:  element left = 50% - 440, visual tip x = 50% - 440 + 60 = 50% - 380
     * For right-facing: element left = 50% - 60,  visual tip x = 50% - 60  + 440 = 50% + 380
     * Either way:  tipDomX = laneW/2 ± 380
     * tipDomY = laneH - 440  (sprite height 500, tip at 12% from top = 60px → bottom-60px)
     */
    {
      const SPRITE = 500;
      const HANDLE = SPRITE * 0.88; // 440
      const TIP    = SPRITE * 0.12; // 60
      const laneW  = swimLaneRef.current?.offsetWidth || 1024;
      const laneH  = containerHeight;
      const tipDomX = laneW / 2 + (facingRight ? (HANDLE - TIP) : -(HANDLE - TIP));
      const tipDomY = laneH - HANDLE; // sprite bottom = laneH, tip 12% from top = laneH - HANDLE
      setLaneHeight(containerHeight);
      setRodTip({
        x: (tipDomX / laneW) * 500,
        y: (tipDomY / laneH) * 260,
      });
    }

    let startTime = null;
    const castOut = (ts) => {
      if (!startTime) startTime = ts;
      const p = Math.min((ts - startTime) / 350, 1);
      setCastProgress(p);
      if (p < 1) { requestAnimationFrame(castOut); return; }

      setSplash({ show: true, x: fish.x, y: fish.y });
      setTimeout(() => setSplash({ show: false, x: 0, y: 0 }), 500);
      // Fish is already removed from fishList — no second filter needed

      setTimeout(() => {
        let rs = null;
        const reelIn = (ts2) => {
          if (!rs) rs = ts2;
          const rp = Math.min((ts2 - rs) / 450, 1);
          setCastProgress(1 - rp);
          if (rp < 1) { requestAnimationFrame(reelIn); return; }

          setIsCasting(false);
          setCaughtFish(null);
          fishingSound.playSfx('catch');
          setActiveShifts(prev => {
            const nextShift = applyShiftDelta(prev[0] ?? getInitialShift(0), fish.value);
            return cipherSegs.map(() => nextShift);
          });
          setBasketShake(true);
          setTimeout(() => setBasketShake(false), 400);
          setAttemptsLeft(prev => {
            const next = Math.max(0, prev - 1);
            if (next <= 0 && !allCorrect) {
              fishingSound.playSfx('lose');
            }
            return next;
          });
          
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
    fishingSound.stopBgm();
    setShowExplanation(true);
    const xpReward = 100;
    setFloatingXp({ amount: xpReward, x: 80, y: 80 });
    setTimeout(() => setFloatingXp(null), 1200);
  };

  const handleCloseExplanation = () => {
    onVerifySubmit();
  };

  /* ── rod SVG coords ── */
  const rodTipX = rodTip.x;
  const rodTipY = rodTip.y;
  let hookX = rodTipX, hookY = rodTipY;
  if (isCasting && caughtFish && castTarget) {
    hookX = rodTipX + (castTarget.x - rodTipX) * castProgress;
    hookY = rodTipY + (castTarget.y - rodTipY) * castProgress;
  }

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

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
            onStartStageTimer?.();
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
          customRightContent={soundToggleButton}
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
              <button
                className="cq-dossier-action-btn"
                onClick={() => {
                  fishingSound.unlockAudio();
                  fishingSound.playBgm();
                  setIsOperationLoading(true);
                }}
              >
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
        <CryptographicRecap
          cipherType="caesar"
          levelData={levelData}
          onUnlockNext={handleCloseExplanation}
        />
      )}

      <GameHudBar
        title="Caesar Fishing"
        stage={levelData.level}
        tier={tier}
        isReady={false}
        onOpenMenu={() => setIsMenuOpen(true)}
        attempts={attemptsLeft}
        customRightContent={soundToggleButton}
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
        <div className="caesar-fish-swim-lane" ref={swimLaneRef}>
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
          {isCasting && caughtFish && (
            <div className="fg-fish-entity" style={{
              left: `${(hookX / 500) * 100}%`,
              // Convert SVG y back to DOM px so the fish tracks the line endpoint
              top: `${(hookY / 260) * laneHeight - 20}px`,
              transform: 'scale(1.2)',
              pointerEvents: 'none',
            }}>
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
          {/* Fishing rod sprite — flips toward the clicked fish */}
          <div
            className={`caesar-fishing-rod-sprite${rodFacingRight ? ' facing-right' : ''}`}
            aria-hidden="true"
          />
          <svg className="fg-pond-svg" viewBox="0 0 500 260" preserveAspectRatio="none">
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
        {levelSolved && <VictoryConfetti isPaused={isMenuOpen} />}
        {levelSolved && (
          <div className="caesar-floating-victory-panel">
            <h3 className="caesar-victory-title">STAGE SECURED!</h3>
            <p className="caesar-victory-desc">All segments decrypted successfully.</p>
            <button
              className="fg-btn fg-btn-primary"
              onClick={handleVerifySubmit}
            >
              Verify & Submit
            </button>
            {onReplayNewQuestion && (
              <button
                className="fg-btn fg-btn-secondary"
                onClick={onReplayNewQuestion}
              >
                Play Again
              </button>
            )}
          </div>
        )}
      </div>

      {/* Shared Pause Menu */}
      <PauseMenu
        open={isMenuOpen}
        onResume={() => setIsMenuOpen(false)}
        onTutorial={() => {
          setIsMenuOpen(false);
          setPhase('ready');
        }}
        onExit={onBackToStages}
      />
    </div>
  );
}
