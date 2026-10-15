/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from 'react';
import './PlayfairMinigameTutorial.css';

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
    badge: 'DIRECTIVE 02 // MATRIX DECRYPTION FREEZE',
    desc: (
      <>
        Press <strong>SPACEBAR</strong> when charged to freeze all patrolling goblins. Frozen enemies become vulnerable and reveal their carried digraphs.
      </>
    ),
  },
  {
    step: 3,
    badge: 'DIRECTIVE 03 // HUNT TARGET GOBLIN',
    desc: (
      <>
        Hunt the vulnerable <strong>W I Goblin</strong> before freeze expires. Striking it triggers combat hit sparks and decrypts: <code>X G → W I</code>.
      </>
    ),
  },
  {
    step: 4,
    badge: 'DIRECTIVE 04 // CLEAR & SECURE DUNGEON',
    desc: (
      <>
        Avoid active goblins when unchilled. Defeat remaining digraph goblins to decrypt <code>W I N D</code> and clear the dungeon operation!
      </>
    ),
  },
];

// Authentic 21x9 Easy Dungeon Grid
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

export default function PlayfairPacmanTutorialModal({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isClosing, setIsClosing] = useState(false);

  // Continuous animation loop references
  const animFrameRef = useRef(null);
  const stepStartTimeRef = useRef(Date.now());

  // Dynamic simulation actors
  const [knightPos, setKnightPos] = useState({ row: 1, col: 2.5 });
  const [knightFacing, setKnightFacing] = useState('');
  const [knightAction, setKnightAction] = useState('run');
  const [targetGoblinPos, setTargetGoblinPos] = useState({ row: 3, col: 14, facing: 'face-left' });
  const [decoy1Pos, setDecoy1Pos] = useState({ row: 5, col: 8, facing: '' });
  const [decoy2Pos, setDecoy2Pos] = useState({ row: 7, col: 16, facing: 'face-left' });

  // Skill & FX states
  const [isPelletEaten, setIsPelletEaten] = useState(false);
  const [isSkillCharged, setIsSkillCharged] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [isTargetGhostEaten, setIsTargetGhostEaten] = useState(false);
  const [showFreezeShockwave, setShowFreezeShockwave] = useState(false);
  const [showHitSpark, setShowHitSpark] = useState(false);
  const [showPelletSparkle, setShowPelletSparkle] = useState(false);

  // Reset or restart when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setIsPlaying(true);
      setIsClosing(false);
      resetSimulation();
    }
  }, [isOpen]);

  const resetSimulation = () => {
    setKnightPos({ row: 1, col: 2.5 });
    setKnightFacing('');
    setKnightAction('run');
    setTargetGoblinPos({ row: 3, col: 14, facing: 'face-left' });
    setDecoy1Pos({ row: 5, col: 8, facing: '' });
    setDecoy2Pos({ row: 7, col: 16, facing: 'face-left' });
    setIsPelletEaten(false);
    setIsSkillCharged(false);
    setIsFrozen(false);
    setIsTargetGhostEaten(false);
    setShowFreezeShockwave(false);
    setShowHitSpark(false);
    setShowPelletSparkle(false);
    stepStartTimeRef.current = Date.now();
  };

  // Main slideshow timer: advances 1 step every 4.8 seconds
  useEffect(() => {
    if (!isOpen || !isPlaying || isClosing) return;

    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % PACMAN_STEPS.length);
    }, 4800);

    return () => clearInterval(timer);
  }, [isOpen, isPlaying, isClosing, currentStep]);

  // Step transitions
  useEffect(() => {
    if (!isOpen) return;
    stepStartTimeRef.current = Date.now();

    if (currentStep === 0) {
      setIsPelletEaten(false);
      setIsSkillCharged(false);
      setIsFrozen(false);
      setIsTargetGhostEaten(false);
      setShowFreezeShockwave(false);
      setShowHitSpark(false);
      setKnightAction('run');
      setKnightFacing('');
    } else if (currentStep === 1) {
      setIsPelletEaten(true);
      setIsSkillCharged(true);
      setIsFrozen(false);
      setIsTargetGhostEaten(false);
      setShowHitSpark(false);
    } else if (currentStep === 2) {
      setIsPelletEaten(true);
      setIsSkillCharged(true);
      setIsFrozen(true);
      setIsTargetGhostEaten(false);
    } else if (currentStep === 3) {
      setIsPelletEaten(true);
      setIsSkillCharged(true);
      setIsFrozen(false);
      setIsTargetGhostEaten(true);
      setKnightAction('run');
    }
  }, [currentStep, isOpen]);

  // Continuous 60fps simulation loop with ZERO wall clipping
  useEffect(() => {
    if (!isOpen || isClosing) return;

    let isMounted = true;
    const animate = () => {
      if (!isMounted) return;

      const elapsed = Date.now() - stepStartTimeRef.current;

      // 1. Goblin patrols (only when not frozen)
      if (!isFrozen) {
        // Target goblin 'WI' patrols along open row 3 (col 13 to 16)
        const gt = (Date.now() / 1200) % 2;
        const gCol = gt < 1 ? 13 + gt * 3 : 16 - (gt - 1) * 3;
        setTargetGoblinPos({ row: 3, col: gCol, facing: gt < 1 ? '' : 'face-left' });

        // Decoy 1 'IW' patrols open row 5 (col 7 to 11)
        const d1t = (Date.now() / 1100) % 2;
        const d1Col = d1t < 1 ? 7 + d1t * 4 : 11 - (d1t - 1) * 4;
        setDecoy1Pos({ row: 5, col: d1Col, facing: d1t < 1 ? '' : 'face-left' });

        // Decoy 2 'ND' patrols open row 7 (col 14 to 18)
        const d2t = (Date.now() / 1300) % 2;
        const d2Col = d2t < 1 ? 14 + d2t * 4 : 18 - (d2t - 1) * 4;
        setDecoy2Pos({ row: 7, col: d2Col, facing: d2t < 1 ? '' : 'face-left' });
      } else {
        // Frozen in place
        setTargetGoblinPos((p) => ({ ...p, col: 14, facing: 'face-left' }));
      }

      // 2. Knight Scripted Movement along true open maze hallways
      if (currentStep === 0) {
        // Directive 01: Knight runs from (col 2.5, row 1) east along open row 1 to (col 8, row 1)
        if (elapsed < 2000) {
          const subP = elapsed / 2000;
          const col = 2.5 + 5.5 * subP;
          setKnightPos({ row: 1, col });
          setKnightFacing('');
          setKnightAction('run');

          if (col >= 7.6 && !isPelletEaten) {
            setIsPelletEaten(true);
            setIsSkillCharged(true);
            setShowPelletSparkle(true);
            setTimeout(() => setShowPelletSparkle(false), 500);
          }
        } else {
          setKnightPos({ row: 1, col: 8 });
          setKnightFacing('face-down');
          setKnightAction('idle');

          if (!isPelletEaten) {
            setIsPelletEaten(true);
            setIsSkillCharged(true);
            setShowPelletSparkle(true);
            setTimeout(() => setShowPelletSparkle(false), 500);
          }
        }
      } else if (currentStep === 1) {
        // Directive 02: Knight navigates down open connector at col 8, then east along row 3 corridor
        if (elapsed < 1200) {
          // Down vertical hallway at col 8: row 1 -> row 3
          const subP = elapsed / 1200;
          setKnightPos({ row: 1 + 2 * subP, col: 8 });
          setKnightFacing('face-down');
          setKnightAction('run');
        } else if (elapsed < 2200) {
          // East along row 3 corridor: col 8 -> col 10
          const subP = (elapsed - 1200) / 1000;
          setKnightPos({ row: 3, col: 8 + 2 * subP });
          setKnightFacing('');
          setKnightAction('run');
        } else {
          setKnightPos({ row: 3, col: 10 });
          setKnightFacing('');
          setKnightAction('idle');
        }

        // Trigger freeze shockwave at 1.4s
        if (elapsed >= 1400 && !isFrozen) {
          setIsFrozen(true);
          setShowFreezeShockwave(true);
          setTimeout(() => setShowFreezeShockwave(false), 700);
        }
      } else if (currentStep === 2) {
        // Directive 03: Knight dashes along open row 3 from col 10 to col 13.4 and strikes Goblin 'WI'
        if (elapsed < 1400) {
          const subP = elapsed / 1400;
          setKnightPos({ row: 3, col: 10 + 3.4 * subP });
          setKnightFacing('');
          setKnightAction('run');
        } else if (elapsed < 2400) {
          setKnightPos({ row: 3, col: 13.4 });
          setKnightFacing('');
          setKnightAction('attack');

          if (elapsed >= 1600 && !isTargetGhostEaten) {
            setIsTargetGhostEaten(true);
            setShowHitSpark(true);
            setTimeout(() => setShowHitSpark(false), 500);
          }
        } else {
          setKnightPos({ row: 3, col: 13.5 });
          setKnightFacing('');
          setKnightAction('idle');
        }
      } else if (currentStep === 3) {
        // Directive 04: Knight smoothly trots along open row 3 to col 18 (victory clear)
        if (elapsed < 2000) {
          const subP = elapsed / 2000;
          setKnightPos({ row: 3, col: 13.5 + 4.5 * subP });
          setKnightFacing('');
          setKnightAction('run');
        } else {
          setKnightPos({ row: 3, col: 18 });
          setKnightFacing('');
          setKnightAction('idle');
        }
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      isMounted = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen, isClosing, currentStep, isFrozen, isPelletEaten, isTargetGhostEaten]);

  // Keyboard navigation & Escape
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
      onClose();
      setIsClosing(false);
    }, 220);
  };

  if (!isOpen) return null;

  const stepData = PACMAN_STEPS[currentStep];

  // Cell size for 21x9 grid inside 900px wide modal
  const cellSize = 38;

  // Active word states
  const isSlot1Decrypted = currentStep >= 2;
  const isAllDecrypted = currentStep === 3;

  return (
    <div className={`cq-minigame-tut-backdrop ${isClosing ? 'closing' : ''}`} onClick={triggerClose}>
      <div
        className={`cq-minigame-tut-modal ${isClosing ? 'closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="cq-minigame-tut-header">
          <div className="cq-minigame-tut-header-left">
            <div className="cq-minigame-tut-header-avatar">
              <div className="cq-avatar-knight" />
            </div>
            <div>
              <div className="cq-minigame-tut-tag">OPERATIONAL GUIDE // PLAYFAIR CIPHER</div>
              <h2 className="cq-minigame-tut-title">Playfair Pac-Man: Tactical Briefing</h2>
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
                resetSimulation();
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

        {/* MODAL BODY */}
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

          {/* SIMULATION VIEWPORT - CENTERED AUTHENTIC DUNGEON */}
          <div className="cq-minigame-tut-viewport">
            <div className="cq-tut-arena">
              <div className="cq-tut-pacman-stage">
                {/* Dungeon Wall Background */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: 'url(/assets/pacman/dungeon-wall.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: 'brightness(0.38)',
                    zIndex: 1,
                  }}
                />

                {/* AUTHENTIC 21x9 DUNGEON MAZE GRID */}
                <div
                  className="cq-tut-maze-grid"
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '56%',
                    transform: 'translate(-50%, -50%)',
                    width: `${21 * cellSize}px`,
                    height: `${9 * cellSize}px`,
                    display: 'grid',
                    gridTemplateColumns: `repeat(21, ${cellSize}px)`,
                    gridTemplateRows: `repeat(9, ${cellSize}px)`,
                    zIndex: 10,
                    boxShadow: '0 0 30px rgba(0, 0, 0, 0.9)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                  }}
                >
                  {REAL_EASY_GRID.map((rowArr, rIdx) =>
                    rowArr.map((cellType, cIdx) => {
                      const isWall = cellType === 1;
                      const isSkillPelletLocation = rIdx === 1 && cIdx === 8;
                      const hasStandardDot = !isWall && !isSkillPelletLocation && (rIdx + cIdx) % 2 === 0;

                      return (
                        <div
                          key={`${rIdx}-${cIdx}`}
                          className={`cq-tut-maze-cell ${isWall ? 'is-wall' : 'is-path'}`}
                          style={{
                            width: `${cellSize}px`,
                            height: `${cellSize}px`,
                            position: 'relative',
                            backgroundImage: isWall ? 'url(/assets/pacman/pacman-brick.png)' : 'none',
                            backgroundSize: 'cover',
                            backgroundColor: isWall ? 'transparent' : 'rgba(10, 16, 28, 0.88)',
                          }}
                        >
                          {/* Golden Skill Pellet at (col 8, row 1) */}
                          {isSkillPelletLocation && !isPelletEaten && (
                            <div className="cq-tut-skill-pellet pellet-entity" title="Golden Skill Pellet">
                              <div className="cq-tut-skill-pellet-inner gold-pellet-sheet" />
                            </div>
                          )}

                          {/* Standard White Dots */}
                          {hasStandardDot && (
                            <div className="cq-tut-dot" />
                          )}
                        </div>
                      );
                    })
                  )}

                  {/* FREEZE SHOCKWAVE EXPANSION EFFECT (Step 2) */}
                  {showFreezeShockwave && (
                    <div
                      className="cq-tut-shockwave"
                      style={{
                        left: `${(knightPos.col + 0.5) * cellSize}px`,
                        top: `${(knightPos.row + 0.5) * cellSize}px`,
                      }}
                    />
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
                        left: `${(13.8 + 0.5) * cellSize}px`,
                        top: `${(3 + 0.5) * cellSize}px`,
                      }}
                    />
                  )}

                  {/* REAL KNIGHT SPRITE ACTOR (60fps Movement adhering to open maze corridors) */}
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

                  {/* TARGET GOBLIN ('WI') at row 3 */}
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
                        <span className={`cq-tut-ghost-badge ${isFrozen ? 'correct' : ''}`}>WI</span>
                      </div>
                    </div>
                  )}

                  {/* DECOY GHOST 1 ('IW') at row 5 */}
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
                      <span className="cq-tut-ghost-badge">IW</span>
                    </div>
                  </div>

                  {/* DECOY GHOST 2 ('ND') at row 7 */}
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
                      <span className="cq-tut-ghost-badge">ND</span>
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

                {/* TARGET CROSSHAIR OVER 'WI' GHOST (Step 3) */}
                {currentStep === 2 && !isTargetGhostEaten && (
                  <div
                    className="cq-tut-crosshair"
                    style={{
                      left: `calc(50% + ${(targetGoblinPos.col - 10) * cellSize}px)`,
                      top: `calc(50% + ${(3 - 4) * cellSize + 20}px)`,
                      transition: 'none',
                    }}
                  />
                )}

                {/* STEP 1 POINTER: EAT SKILL PELLET */}
                {currentStep === 0 && !isPelletEaten && (
                  <div
                    className="cq-tut-pointer-overlay"
                    style={{
                      left: 'calc(50% - 70px)',
                      top: 'calc(50% - 95px)',
                    }}
                  >
                    <span className="material-symbols-outlined cq-tut-pointer-arrow">arrow_downward</span>
                    <span className="cq-tut-pointer-badge">Eat Skill Pellet</span>
                  </div>
                )}

                {/* STEP 3 POINTER: HUNT TARGET GOBLIN */}
                {currentStep === 2 && !isTargetGhostEaten && (
                  <div
                    className="cq-tut-pointer-overlay"
                    style={{
                      left: 'calc(50% + 50px)',
                      top: 'calc(50% - 40px)',
                    }}
                  >
                    <span className="material-symbols-outlined cq-tut-pointer-arrow">sports_martial_arts</span>
                    <span className="cq-tut-pointer-badge" style={{ background: '#10b981', color: '#ffffff' }}>
                      Strike Target 'WI' Goblin!
                    </span>
                  </div>
                )}

                {/* COMPACT TOP HUD (CENTERED, NON-INTRUSIVE) */}
                <div className="cq-tut-word-panel pf-compact-hud">
                  <div className="pf-hud-key-pill">
                    <span className="pf-hud-key-label">KEY:</span>
                    <span className="pf-hud-key-val">MONARCHY</span>
                  </div>
                  <div className="pf-hud-pairs">
                    <div className={`pf-hud-pair-chip ${isSlot1Decrypted ? 'solved' : 'active'}`}>
                      <span className="pf-hud-cipher">X G</span>
                      <span className="pf-hud-arrow">→</span>
                      <span className="pf-hud-plain">{isSlot1Decrypted ? 'W I' : '_ _'}</span>
                    </div>
                    <div className={`pf-hud-pair-chip ${isAllDecrypted ? 'solved' : isSlot1Decrypted ? 'active' : ''}`}>
                      <span className="pf-hud-cipher">R Y</span>
                      <span className="pf-hud-arrow">→</span>
                      <span className="pf-hud-plain">{isAllDecrypted ? 'N D' : '_ _'}</span>
                    </div>
                  </div>
                  <div className={`pf-hud-status-badge ${isAllDecrypted ? 'solved' : ''}`}>
                    {isAllDecrypted ? '✓ STAGE SECURED' : isSlot1Decrypted ? 'ACTIVE: N D' : 'ACTIVE: W I'}
                  </div>
                </div>

                {/* VICTORY BADGE (Step 4) */}
                {currentStep === 3 && (
                  <div className="cq-tut-victory-badge">
                    <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#10b981' }}>
                      check_circle
                    </span>
                    <h3 className="cq-tut-victory-title">DUNGEON SECURED!</h3>
                    <p className="cq-tut-victory-sub">Defeated target goblins to decrypt W I N D</p>
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
