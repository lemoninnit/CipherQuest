/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from 'react';
import './CaesarMinigameTutorial.css';

const PACMAN_STEPS = [
  {
    step: 1,
    badge: 'DIRECTIVE 01 // CHARGE FREEZE SKILL',
    desc: (
      <>
        Navigate corridors using <strong>Arrow Keys</strong> or <strong>W/A/S/D</strong>. Collect the <strong>yellow Skill Pellet</strong> to charge Decryption Freeze.
      </>
    ),
  },
  {
    step: 2,
    badge: 'DIRECTIVE 02 // ACTIVATE FREEZE',
    desc: (
      <>
        Press <strong>SPACEBAR</strong> when charged to freeze all patrolling goblins. Frozen enemies become vulnerable and reveal their shift values.
      </>
    ),
  },
  {
    step: 3,
    badge: 'DIRECTIVE 03 // HUNT TARGET GOBLIN',
    desc: (
      <>
        Eat the vulnerable <strong>+3 Goblin</strong> before freeze expires. Defeating it updates your shift and decrypts: <code>V Q R Z → S N O W</code>.
      </>
    ),
  },
  {
    step: 4,
    badge: 'DIRECTIVE 04 // CLEAR & SUBMIT',
    desc: (
      <>
        Avoid active goblins when unchilled. Once your cipher word is decrypted and verified, the dungeon operation is cleared!
      </>
    ),
  },
];

// Authentic 21x9 Caesar Easy Dungeon Grid
const REAL_EASY_GRID = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  [1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

export default function CaesarPacmanTutorialModal({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isClosing, setIsClosing] = useState(false);

  // Continuous animation loop states
  const animFrameRef = useRef(null);
  const stepStartTimeRef = useRef(Date.now());

  // Knight coordinates & animation
  const [knightPos, setKnightPos] = useState({ col: 2, row: 1 });
  const [knightFacing, setKnightFacing] = useState('');
  const [knightAction, setKnightAction] = useState('run');

  // Goblins positions & states
  const [targetGoblinPos, setTargetGoblinPos] = useState({ col: 14, row: 3, facing: '' });
  const [decoy1Pos, setDecoy1Pos] = useState({ col: 2.5, row: 5, facing: '' });
  const [decoy2Pos, setDecoy2Pos] = useState({ col: 15, row: 7, facing: '' });

  // Game mechanics events
  const [isPelletEaten, setIsPelletEaten] = useState(false);
  const [showPelletSparkle, setShowPelletSparkle] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [showFreezeWave, setShowFreezeWave] = useState(false);
  const [isTargetGhostEaten, setIsTargetGhostEaten] = useState(false);
  const [showHitSpark, setShowHitSpark] = useState(false);

  const cellSize = 30; // 21 cols * 30px = 630px width, 9 rows * 30px = 270px height

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setIsPlaying(true);
      setIsClosing(false);
      stepStartTimeRef.current = Date.now();
      setKnightPos({ col: 2, row: 1 });
      setKnightFacing('');
      setKnightAction('run');
      setIsPelletEaten(false);
      setShowPelletSparkle(false);
      setIsFrozen(false);
      setShowFreezeWave(false);
      setIsTargetGhostEaten(false);
      setShowHitSpark(false);
    }
  }, [isOpen]);

  // Record timestamp whenever currentStep changes
  useEffect(() => {
    stepStartTimeRef.current = Date.now();

    if (currentStep === 0) {
      setIsPelletEaten(false);
      setIsFrozen(false);
      setShowFreezeWave(false);
      setIsTargetGhostEaten(false);
      setShowHitSpark(false);
    } else if (currentStep === 1) {
      setIsPelletEaten(true);
      setIsTargetGhostEaten(false);
    } else if (currentStep === 2) {
      setIsPelletEaten(true);
      setIsFrozen(true);
    } else if (currentStep === 3) {
      setIsPelletEaten(true);
      setIsFrozen(true);
      setIsTargetGhostEaten(true);
    }
  }, [currentStep]);

  // Slideshow timer: strictly advances 1 slide at a time (4.5s per directive)
  // Resets cleanly whenever currentStep changes so manual clicks give a full duration
  useEffect(() => {
    if (!isOpen || !isPlaying || isClosing) return;

    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % PACMAN_STEPS.length);
    }, 4500);

    return () => clearInterval(timer);
  }, [isOpen, isPlaying, isClosing, currentStep]);

  // 60fps Continuous physics loop (No cuts, smooth movement)
  useEffect(() => {
    if (!isOpen || isClosing) return;

    let isMounted = true;
    const tick = () => {
      if (!isMounted) return;

      const elapsed = Date.now() - stepStartTimeRef.current;
      const progress = Math.min(elapsed / 4500, 1.0);
      const t = performance.now();

      // ── 1. PATROL GOBLINS SMOOTHLY ──────────────────────────────────────
      if (!isFrozen) {
        // Target goblin (+3) patrols row 3 between col 12.5 and 16.5
        const tgCol = 14.5 + Math.sin(t / 650) * 2.0;
        const tgFacing = Math.cos(t / 650) >= 0 ? '' : 'face-left';
        setTargetGoblinPos({ col: tgCol, row: 3, facing: tgFacing });

        // Decoy 1 (+1) patrols row 5 between col 1.2 and 4.2
        const d1Col = 2.7 + Math.sin(t / 850) * 1.5;
        const d1Facing = Math.cos(t / 850) >= 0 ? '' : 'face-left';
        setDecoy1Pos({ col: d1Col, row: 5, facing: d1Facing });

        // Decoy 2 (-2) patrols row 7 between col 11.5 and 18.0
        const d2Col = 14.8 + Math.sin(t / 1000) * 3.2;
        const d2Facing = Math.cos(t / 1000) >= 0 ? '' : 'face-left';
        setDecoy2Pos({ col: d2Col, row: 7, facing: d2Facing });
      } else {
        // Frozen goblins shudder gently in place
        const shudder = Math.sin(t / 50) * 0.04;
        setTargetGoblinPos((prev) => ({ col: 14 + shudder, row: 3, facing: prev.facing }));
        setDecoy1Pos((prev) => ({ col: 2.7 + shudder, row: 5, facing: prev.facing }));
        setDecoy2Pos((prev) => ({ col: 14.8 + shudder, row: 7, facing: prev.facing }));
      }

      // ── 2. KNIGHT CONTINUOUS MOVEMENT ACROSS DIRECTIVE PHASES ───────────
      if (currentStep === 0) {
        // Directive 01: Knight runs from (col 2, row 1) to (col 8, row 1)
        const subP = Math.min(elapsed / 3200, 1.0);
        const col = 2 + 6 * subP;
        setKnightPos({ col, row: 1 });
        setKnightFacing('');
        setKnightAction(subP < 1.0 ? 'run' : 'idle');

        // Reach skill pellet at col 8
        if (col >= 7.6 && !isPelletEaten) {
          setIsPelletEaten(true);
          setShowPelletSparkle(true);
          setTimeout(() => setShowPelletSparkle(false), 550);
        }
      } else if (currentStep === 1) {
        // Directive 02: Knight runs down corridor from (col 8, row 1) -> (col 8, row 3) -> (col 10, row 3)
        if (elapsed < 1400) {
          // Vertical movement down connector at col 8
          const subP = elapsed / 1400;
          setKnightPos({ col: 8, row: 1 + 2 * subP });
          setKnightFacing('face-down');
          setKnightAction('run');
        } else if (elapsed < 2400) {
          // Turn east along row 3 corridor
          const subP = (elapsed - 1400) / 1000;
          setKnightPos({ col: 8 + 2 * subP, row: 3 });
          setKnightFacing('');
          setKnightAction('run');
        } else {
          // Ready at (col 10, row 3)
          setKnightPos({ col: 10, row: 3 });
          setKnightFacing('');
          setKnightAction('idle');
        }

        // Trigger freeze shockwave at 1.5s
        if (elapsed >= 1500 && !isFrozen) {
          setIsFrozen(true);
          setShowFreezeWave(true);
          setTimeout(() => setShowFreezeWave(false), 700);
        }
      } else if (currentStep === 2) {
        // Directive 03: Knight dashes from (col 10, row 3) to (col 13.5, row 3) and strikes +3 goblin
        if (elapsed < 1600) {
          const subP = elapsed / 1600;
          setKnightPos({ col: 10 + 3.5 * subP, row: 3 });
          setKnightFacing('');
          setKnightAction('run');
        } else if (elapsed < 2500) {
          // Attack strike
          setKnightPos({ col: 13.5, row: 3 });
          setKnightFacing('');
          setKnightAction('attack');

          // Defeat goblin
          if (elapsed >= 1800 && !isTargetGhostEaten) {
            setIsTargetGhostEaten(true);
            setShowHitSpark(true);
            setTimeout(() => setShowHitSpark(false), 500);
          }
        } else {
          // Pause victorious at (col 13.8, row 3)
          setKnightPos({ col: 13.8, row: 3 });
          setKnightFacing('');
          setKnightAction('idle');
        }
      } else if (currentStep === 3) {
        // Directive 04: Knight continues running smoothly east to (col 18, row 3)
        if (elapsed < 2400) {
          const subP = elapsed / 2400;
          setKnightPos({ col: 13.8 + 4.2 * subP, row: 3 });
          setKnightFacing('');
          setKnightAction('run');
        } else {
          setKnightPos({ col: 18, row: 3 });
          setKnightFacing('');
          setKnightAction('idle');
        }
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      isMounted = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen, isClosing, currentStep, isFrozen, isPelletEaten, isTargetGhostEaten]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen || isClosing) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        triggerClose();
      } else if (e.key === 'ArrowRight') {
        setCurrentStep((s) => (s + 1) % PACMAN_STEPS.length);
      } else if (e.key === 'ArrowLeft') {
        setCurrentStep((s) => (s - 1 + PACMAN_STEPS.length) % PACMAN_STEPS.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isClosing]);

  const triggerClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      if (onClose) onClose();
    }, 220);
  };

  if (!isOpen) return null;

  const stepData = PACMAN_STEPS[currentStep];

  // Derived state for word decryption
  const activeShift = isTargetGhostEaten || currentStep >= 2 ? 3 : 0;
  const isDecrypted = isTargetGhostEaten || currentStep >= 2;

  // Dot collection logic (dots disappear smoothly behind the knight)
  const isDotCollected = (r, c) => {
    if (r === 1 && c >= 2 && c <= 8) {
      return (currentStep === 0 && knightPos.col >= c) || currentStep >= 1;
    }
    if (r === 2 && c === 8) {
      return (currentStep === 1 && knightPos.row >= 2) || currentStep >= 2;
    }
    if (r === 3 && c >= 8 && c <= 18) {
      if (currentStep === 1) return knightPos.row >= 3 && knightPos.col >= c;
      if (currentStep === 2) return (knightPos.col >= c) || c <= 10;
      if (currentStep === 3) return true;
    }
    return false;
  };

  return (
    <div className={`cq-minigame-tut-backdrop ${isClosing ? 'closing' : ''}`} onClick={triggerClose}>
      <div
        className={`cq-minigame-tut-modal ${isClosing ? 'closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER WITH REAL KNIGHT ICON */}
        <div className="cq-minigame-tut-header">
          <div className="cq-minigame-tut-header-left">
            <div className="cq-minigame-tut-header-avatar">
              <div className="cq-avatar-knight" />
            </div>
            <div>
              <div className="cq-minigame-tut-tag">OPERATIONAL GUIDE // CAESAR CIPHER</div>
              <h2 className="cq-minigame-tut-title">Caesar Pac-Man: Tactical Briefing</h2>
            </div>
          </div>

          <div className="cq-minigame-tut-header-controls">
            <div className="cq-minigame-tut-pills">
              {PACMAN_STEPS.map((s, idx) => (
                <button
                  key={s.step}
                  type="button"
                  className={`cq-minigame-tut-pill ${idx === currentStep ? 'active' : ''}`}
                  onClick={() => setCurrentStep(idx)}
                  title={`Directive ${s.step}`}
                >
                  {s.step}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="cq-minigame-tut-icon-btn"
              onClick={() => setIsPlaying(!isPlaying)}
              title={isPlaying ? 'Pause Simulation' : 'Resume Simulation'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                {isPlaying ? 'pause' : 'play_arrow'}
              </span>
            </button>

            <button
              type="button"
              className="cq-minigame-tut-icon-btn"
              onClick={() => {
                setCurrentStep(0);
                setIsPlaying(true);
                stepStartTimeRef.current = Date.now();
                setKnightPos({ col: 2, row: 1 });
                setKnightFacing('');
                setKnightAction('run');
                setIsPelletEaten(false);
                setIsFrozen(false);
                setIsTargetGhostEaten(false);
              }}
              title="Restart Simulation"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                restart_alt
              </span>
            </button>

            <button
              type="button"
              className="cq-minigame-tut-close-btn"
              onClick={triggerClose}
              title="Close Guide"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                close
              </span>
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="cq-minigame-tut-body">
          {/* TACTICAL DIRECTIVE BANNER */}
          <div className="cq-minigame-tut-step-banner">
            <div className="cq-minigame-tut-step-info">
              <span className="cq-minigame-tut-step-badge">{stepData.badge}</span>
              <div className="cq-minigame-tut-step-desc">{stepData.desc}</div>
            </div>
            <div className="cq-minigame-tut-step-progress">
              <span className="cq-minigame-tut-step-count">
                {currentStep + 1} / {PACMAN_STEPS.length}
              </span>
            </div>
          </div>

          {/* SIMULATION VIEWPORT - CENTERED CONTINUOUS DUNGEON MAZE */}
          <div className="cq-minigame-tut-viewport">
            <div className="cq-tut-arena">
              <div className="cq-tut-pacman-stage">
                <div className="cq-tut-pacman-bg-layer" />

                {/* FREEZE SHOCKWAVE EFFECT */}
                {showFreezeWave && <div className="cq-tut-freeze-wave" />}

                {/* 21x9 DUNGEON MAZE GRID WITH REAL BRICK WALL CELLS */}
                <div
                  className="maze-grid size-larger tier-easy"
                  style={{
                    gridTemplateColumns: `repeat(21, ${cellSize}px)`,
                    gridTemplateRows: `repeat(9, ${cellSize}px)`,
                    width: `${21 * cellSize}px`,
                    height: `${9 * cellSize}px`,
                    marginTop: '36px',
                  }}
                >
                  {REAL_EASY_GRID.map((rowArr, rIdx) =>
                    rowArr.map((val, cIdx) => (
                      <div
                        key={`cell-${rIdx}-${cIdx}`}
                        className={`maze-cell ${val === 1 ? 'wall' : 'path'}`}
                        style={{ width: `${cellSize}px`, height: `${cellSize}px` }}
                      >
                        {val === 0 && !(rIdx === 1 && cIdx === 8) && !isDotCollected(rIdx, cIdx) && (
                          <div className="cq-tut-dot" />
                        )}

                        {/* Real Skill Pellet at col 8, row 1 */}
                        {rIdx === 1 && cIdx === 8 && !isPelletEaten && (
                          <div
                            className="pellet-entity"
                            style={{ width: `${cellSize}px`, height: `${cellSize}px` }}
                          >
                            <div className="gold-pellet-sheet" />
                          </div>
                        )}
                      </div>
                    ))
                  )}

                  {/* PELLET EATEN SPARKLE BURST */}
                  {showPelletSparkle && (
                    <div
                      className="cq-tut-pellet-sparkle"
                      style={{
                        left: `${(8 + 0.5) * cellSize}px`,
                        top: `${(1 + 0.5) * cellSize}px`,
                      }}
                    />
                  )}

                  {/* COMBAT HIT SPARK ON DEFEATING GOBLIN */}
                  {showHitSpark && (
                    <div
                      className="cq-tut-hit-spark"
                      style={{
                        left: `${(14 + 0.5) * cellSize}px`,
                        top: `${(3 + 0.5) * cellSize}px`,
                      }}
                    />
                  )}

                  {/* REAL KNIGHT SPRITE ACTOR (Continuous 60fps Movement) */}
                  <div
                    className="cq-tut-pacman-actor"
                    style={{
                      width: `${cellSize}px`,
                      height: `${cellSize}px`,
                      left: `${knightPos.col * cellSize}px`,
                      top: `${knightPos.row * cellSize}px`,
                      transition: 'none',
                    }}
                  >
                    <div className="knight-actor">
                      <div className={`knight-sheet ${knightFacing} ${knightAction}`} />
                    </div>
                  </div>

                  {/* TARGET GHOST (+3) at row 3 (Continuous Patrol & Chilled State) */}
                  {!isTargetGhostEaten && (
                    <div
                      className={`cq-tut-ghost-actor ${isFrozen ? 'vulnerable' : ''}`}
                      style={{
                        width: `${cellSize}px`,
                        height: `${cellSize}px`,
                        left: `${targetGoblinPos.col * cellSize}px`,
                        top: `${targetGoblinPos.row * cellSize}px`,
                        transition: 'none',
                      }}
                    >
                      <div className="goblin-actor">
                        <div className={`goblin-sheet ${targetGoblinPos.facing} ${isFrozen ? 'idle' : 'run'}`} />
                        {isFrozen && <span className="cq-tut-ghost-badge correct">+3</span>}
                      </div>
                    </div>
                  )}

                  {/* DECOY GHOST 1 (+1) at row 5 */}
                  <div
                    className={`cq-tut-ghost-actor ${isFrozen ? 'vulnerable' : ''}`}
                    style={{
                      width: `${cellSize}px`,
                      height: `${cellSize}px`,
                      left: `${decoy1Pos.col * cellSize}px`,
                      top: `${decoy1Pos.row * cellSize}px`,
                      transition: 'none',
                    }}
                  >
                    <div className="goblin-actor">
                      <div className={`goblin-sheet ${decoy1Pos.facing} ${isFrozen ? 'idle' : 'run'}`} />
                      {isFrozen && <span className="cq-tut-ghost-badge">+1</span>}
                    </div>
                  </div>

                  {/* DECOY GHOST 2 (-2) at row 7 */}
                  <div
                    className={`cq-tut-ghost-actor ${isFrozen ? 'vulnerable' : ''}`}
                    style={{
                      width: `${cellSize}px`,
                      height: `${cellSize}px`,
                      left: `${decoy2Pos.col * cellSize}px`,
                      top: `${decoy2Pos.row * cellSize}px`,
                      transition: 'none',
                    }}
                  >
                    <div className="goblin-actor">
                      <div className={`goblin-sheet ${decoy2Pos.facing} ${isFrozen ? 'idle' : 'run'}`} />
                      {isFrozen && <span className="cq-tut-ghost-badge">-2</span>}
                    </div>
                  </div>
                </div>

                {/* SPACEBAR PROMPT OVERLAY (Step 2) */}
                {currentStep === 1 && (
                  <div className="cq-tut-spacebar-prompt" style={{ top: '65%' }}>
                    <span className="cq-tut-keycap">SPACEBAR</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#00e5ff', letterSpacing: '0.04em' }}>
                      PRESS TO ACTIVATE FREEZE
                    </span>
                  </div>
                )}

                {/* TARGET CROSSHAIR OVER +3 GHOST (Step 3) */}
                {currentStep === 2 && !isTargetGhostEaten && (
                  <div
                    className="cq-tut-crosshair"
                    style={{
                      left: `calc(50% + ${(targetGoblinPos.col - 10) * cellSize}px)`,
                      top: `calc(50% + ${(3 - 4) * cellSize + 20}px)`,
                    }}
                  />
                )}

                {/* STEP 1 POINTER (Eat Skill Pellet) */}
                {currentStep === 0 && !isPelletEaten && (
                  <div
                    className="cq-tut-pointer-overlay"
                    style={{
                      left: `calc(50% + ${(8 - 10) * cellSize - 45}px)`,
                      top: `calc(50% - ${(4 - 1) * cellSize + 22}px)`,
                    }}
                  >
                    <span className="material-symbols-outlined cq-tut-pointer-arrow">arrow_downward</span>
                    <span className="cq-tut-pointer-badge">Eat Skill Pellet</span>
                  </div>
                )}

                {/* STEP 3 POINTER (Eat +3 Goblin) */}
                {currentStep === 2 && !isTargetGhostEaten && (
                  <div
                    className="cq-tut-pointer-overlay"
                    style={{
                      left: `calc(50% + ${(targetGoblinPos.col - 10) * cellSize - 40}px)`,
                      top: `calc(50% + ${(3 - 4) * cellSize - 36}px)`,
                    }}
                  >
                    <span className="material-symbols-outlined cq-tut-pointer-arrow">arrow_downward</span>
                    <span className="cq-tut-pointer-badge">Eat +3 Goblin</span>
                  </div>
                )}

                {/* TOP WORD PANEL (CENTERED, CLEAN, NO ARITHMETIC CLUTTER) */}
                <div className="cq-tut-word-panel">
                  <div className="cq-tut-word-top-row">
                    <span className="cq-tut-shift-label">Active Shift:</span>
                    <span className={`cq-tut-shift-badge ${isDecrypted ? 'solved' : ''}`}>
                      {activeShift === 0 ? '0' : `+${activeShift}`}
                    </span>
                  </div>
                  <div className="cq-tut-word-letters">
                    <div className={`cq-tut-word-cell ${isDecrypted ? 'solved' : ''}`}>
                      <span className="cq-tut-cell-cipher">V</span>
                      <span className="cq-tut-cell-plain">{isDecrypted ? 'S' : '_'}</span>
                    </div>
                    <div className={`cq-tut-word-cell ${isDecrypted ? 'solved' : ''}`}>
                      <span className="cq-tut-cell-cipher">Q</span>
                      <span className="cq-tut-cell-plain">{isDecrypted ? 'N' : '_'}</span>
                    </div>
                    <div className={`cq-tut-word-cell ${isDecrypted ? 'solved' : ''}`}>
                      <span className="cq-tut-cell-cipher">R</span>
                      <span className="cq-tut-cell-plain">{isDecrypted ? 'O' : '_'}</span>
                    </div>
                    <div className={`cq-tut-word-cell ${isDecrypted ? 'solved' : ''}`}>
                      <span className="cq-tut-cell-cipher">Z</span>
                      <span className="cq-tut-cell-plain">{isDecrypted ? 'W' : '_'}</span>
                    </div>
                  </div>
                  <div className="cq-tut-clue-banner">Clue: "Cold winter climate"</div>
                </div>

                {/* BOTTOM-RIGHT SKILL FREEZE CARD */}
                <div className={`cq-tut-bottom-right-card ${isPelletEaten || currentStep >= 1 ? 'charged' : ''}`}>
                  <div className="cq-tut-card-title">Skill Freeze Charge</div>
                  <span
                    className="material-symbols-outlined"
                    style={{
                      color: isFrozen ? '#00e5ff' : isPelletEaten || currentStep >= 1 ? '#ffd700' : '#64748b',
                      fontSize: '24px',
                      transition: 'color 0.3s ease',
                    }}
                  >
                    flash_on
                  </span>
                  <span className="cq-tut-card-state" style={{ color: isFrozen ? '#00e5ff' : '#ffd700' }}>
                    {!isPelletEaten && currentStep === 0
                      ? 'Eat pellet to charge'
                      : isFrozen
                      ? 'FREEZE ACTIVE (5s)'
                      : 'READY: SPACEBAR'}
                  </span>
                </div>

                {/* VICTORY BADGE (Step 4) */}
                {currentStep === 3 && (
                  <div className="cq-tut-victory-badge">
                    <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#10b981' }}>
                      check_circle
                    </span>
                    <h3 className="cq-tut-victory-title">STAGE SECURED!</h3>
                    <p className="cq-tut-victory-sub">All letters decrypted under Caesar shift +3: SNOW</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="cq-minigame-tut-footer">
          <button type="button" className="cq-minigame-tut-close-action-btn" onClick={triggerClose}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check</span>
            <span>Close Guide</span>
          </button>
        </div>
      </div>
    </div>
  );
}
