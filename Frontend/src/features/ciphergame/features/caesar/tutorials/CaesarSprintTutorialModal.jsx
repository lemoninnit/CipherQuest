/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from 'react';
import './CaesarMinigameTutorial.css';
import '../../sprint/CipherSprint.css';

const SPRINT_STEPS = [
  {
    step: 1,
    badge: 'DIRECTIVE 01 // LANE SWITCHING & DODGING',
    desc: (
      <>
        Use <strong>Arrow UP/DOWN</strong> or <strong>W/S</strong> keys to switch lanes. Dodge approaching obstacle slimes — slime contact costs a life!
      </>
    ),
  },
  {
    step: 2,
    badge: 'DIRECTIVE 02 // COLLECT SHIFT DIAMONDS',
    desc: (
      <>
        Diamonds float along lanes carrying <strong>+</strong> and <strong>−</strong> shift values. Switch to any lane to collect the <strong>+3 diamond</strong>!
      </>
    ),
  },
  {
    step: 3,
    badge: 'DIRECTIVE 03 // REAL-TIME DECRYPTION',
    desc: (
      <>
        Your active shift updates your baton key. The top word panel live-decrypts as letters match the target word: <code>Z L Q G → W I N D</code>.
      </>
    ),
  },
  {
    step: 4,
    badge: 'DIRECTIVE 04 // TARGET MATCH & VERIFY',
    desc: (
      <>
        When your active shift matches the key, your message is fully decrypted! Click <strong>Verify &amp; Submit</strong> to secure the operation.
      </>
    ),
  },
];

const TARGET_CIPHER = ['Z', 'L', 'Q', 'G'];
const TARGET_PLAIN = ['W', 'I', 'N', 'D'];

const PAD5 = (n) => String(n).padStart(5, '0');

const INITIAL_SPEED_LINES = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  x: (i * 7.5 + Math.random() * 5) % 110,
  y: 8 + ((i * 17) % 80),
  speed: 1.1 + (i % 4) * 0.45,
  width: 18 + (i % 3) * 14,
}));

export default function CaesarSprintTutorialModal({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isClosing, setIsClosing] = useState(false);

  // Continuous animation loop references
  const animFrameRef = useRef(null);
  const stepStartTimeRef = useRef(Date.now());

  // 30-frame animated monster (slime) loop (45ms interval)
  const [slimeFrame, setSlimeFrame] = useState(0);

  // Speed lines state
  const [speedLines, setSpeedLines] = useState(INITIAL_SPEED_LINES);

  // Dynamic simulation actor states
  const [runnerLane, setRunnerLane] = useState(1); // 1 = Middle, 0 = Top
  const [runnerX, setRunnerX] = useState(18); // percentage along track
  const [runnerAnim, setRunnerAnim] = useState('run'); // 'run' | 'jump' | 'idle'
  const [runnerEffects, setRunnerEffects] = useState(''); // 'boost-trail' | 'spin-effect' | ''
  const [activeShift, setActiveShift] = useState(0);
  const [isBatonPopping, setIsBatonPopping] = useState(false);

  // Obstacle Slime
  const [slimeX, setSlimeX] = useState(105);
  const [slimeLane, setSlimeLane] = useState(1);
  const [isSlimeVisible, setIsSlimeVisible] = useState(true);

  // Modifier Diamond
  const [diamondX, setDiamondX] = useState(95);
  const [diamondLane, setDiamondLane] = useState(0);
  const [isDiamondVisible, setIsDiamondVisible] = useState(false);
  const [showDiamondSparkle, setShowDiamondSparkle] = useState(false);

  // Victory Panel
  const [isVictoryShown, setIsVictoryShown] = useState(false);

  // Word Decryption
  const [solvedCount, setSolvedCount] = useState(0); // 0 to 4 letters solved

  // Floating feedback toast
  const [feedback, setFeedback] = useState(null); // { text, x, top }

  // Cycle slime sprite animation frames (30 frames, 45ms per frame)
  useEffect(() => {
    if (!isOpen || isClosing || !isPlaying) return;
    const timer = setInterval(() => {
      setSlimeFrame((f) => (f + 1) % 30);
    }, 45);
    return () => clearInterval(timer);
  }, [isOpen, isClosing, isPlaying]);

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setIsPlaying(true);
      setIsClosing(false);
      stepStartTimeRef.current = Date.now();
      setRunnerLane(1);
      setRunnerX(18);
      setRunnerAnim('run');
      setRunnerEffects('');
      setActiveShift(0);
      setIsBatonPopping(false);
      setSlimeX(105);
      setSlimeLane(1);
      setIsSlimeVisible(true);
      setDiamondX(105);
      setDiamondLane(0);
      setIsDiamondVisible(false);
      setShowDiamondSparkle(false);
      setIsVictoryShown(false);
      setSolvedCount(0);
      setFeedback(null);
    }
  }, [isOpen]);

  // Synchronize base states whenever currentStep changes
  useEffect(() => {
    stepStartTimeRef.current = Date.now();
    setFeedback(null);

    if (currentStep === 0) {
      setRunnerLane(1);
      setRunnerX(18);
      setRunnerAnim('run');
      setRunnerEffects('');
      setActiveShift(0);
      setSlimeX(105);
      setSlimeLane(1);
      setIsSlimeVisible(true);
      setIsDiamondVisible(false);
      setShowDiamondSparkle(false);
      setIsVictoryShown(false);
      setSolvedCount(0);
    } else if (currentStep === 1) {
      setRunnerLane(0);
      setRunnerX(18);
      setRunnerAnim('run');
      setRunnerEffects('');
      setActiveShift(0);
      setIsSlimeVisible(false);
      setDiamondX(105);
      setDiamondLane(2);
      setIsDiamondVisible(true);
      setShowDiamondSparkle(false);
      setIsVictoryShown(false);
      setSolvedCount(0);
    } else if (currentStep === 2) {
      setRunnerLane(2);
      setRunnerX(18);
      setRunnerAnim('run');
      setRunnerEffects('');
      setActiveShift(3);
      setIsSlimeVisible(false);
      setIsDiamondVisible(false);
      setShowDiamondSparkle(false);
      setIsVictoryShown(false);
      setSolvedCount(0);
    } else if (currentStep === 3) {
      setRunnerLane(0);
      setRunnerX(20);
      setRunnerAnim('run');
      setRunnerEffects('boost-trail');
      setActiveShift(3);
      setIsSlimeVisible(false);
      setIsDiamondVisible(false);
      setShowDiamondSparkle(false);
      setIsVictoryShown(true);
      setSolvedCount(4);
    }
  }, [currentStep]);

  // Slideshow timer: strictly advances 1 slide at a time (4.5s per directive)
  useEffect(() => {
    if (!isOpen || !isPlaying || isClosing) return;

    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % SPRINT_STEPS.length);
    }, 4500);

    return () => clearInterval(timer);
  }, [isOpen, isPlaying, isClosing, currentStep]);

  // Keyboard navigation & escape close
  useEffect(() => {
    if (!isOpen || isClosing) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        triggerClose();
      } else if (e.key === 'ArrowRight') {
        setCurrentStep((s) => (s + 1) % SPRINT_STEPS.length);
      } else if (e.key === 'ArrowLeft') {
        setCurrentStep((s) => (s - 1 + SPRINT_STEPS.length) % SPRINT_STEPS.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isClosing]);

  // 60FPS CONTINUOUS SIMULATION PHYSICS LOOP (No cuts, perfectly smooth)
  useEffect(() => {
    if (!isOpen || isClosing) return;

    let isMounted = true;
    const tick = () => {
      if (!isMounted) return;

      if (!isPlaying) {
        animFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      const elapsed = Date.now() - stepStartTimeRef.current;
      const progress = Math.min(elapsed / 4500, 1.0);

      // Continuously animate background speed lines across all steps
      setSpeedLines((prevLines) =>
        prevLines.map((line) => {
          let nextX = line.x - line.speed * 0.45;
          if (nextX < -15) nextX = 115;
          return { ...line, x: nextX };
        })
      );

      // ── STEP 0: LANE SWITCHING & DODGING ──────────────────────────────────
      if (currentStep === 0) {
        // Slime travels from right (105%) to left (-25%)
        const sx = 105 - progress * 130;
        setSlimeX(sx);
        setIsSlimeVisible(sx > -20 && sx < 105);
        setIsDiamondVisible(false);
        setIsVictoryShown(false);
        setActiveShift(0);
        setSolvedCount(0);

        if (progress < 0.35) {
          // Running on Middle Lane 1
          setRunnerLane(1);
          setRunnerX(18);
          setRunnerAnim('run');
          setRunnerEffects('');
          setFeedback(null);
        } else if (progress >= 0.35 && progress < 0.44) {
          // Smooth jump up to Lane 0
          setRunnerLane(0);
          setRunnerX(18);
          setRunnerAnim('jump');
          setRunnerEffects('');
        } else {
          // Landed safely on Top Lane 0, slime slides safely underneath
          setRunnerLane(0);
          setRunnerX(18);
          setRunnerAnim('run');
          setRunnerEffects('');

          if (progress >= 0.46 && progress < 0.70) {
            setFeedback({
              text: 'DODGED SLIME!',
              x: 36,
              top: 'var(--lane-1-ground)',
            });
          } else {
            setFeedback(null);
          }
        }
      }

      // ── STEP 1: COLLECT SHIFT DIAMONDS IN ANY LANE (Bottom Lane 2) ───────
      else if (currentStep === 1) {
        setIsSlimeVisible(false);
        setIsVictoryShown(false);
        setDiamondLane(2);

        // Runner starts in Top Lane 0, spots target +3 in Bottom Lane 2:
        if (progress < 0.16) {
          setRunnerLane(0);
          setRunnerAnim('run');
          setRunnerEffects('');
        } else if (progress >= 0.16 && progress < 0.24) {
          setRunnerLane(1);
          setRunnerAnim('jump');
          setRunnerEffects('moving-down');
        } else if (progress >= 0.24 && progress < 0.32) {
          setRunnerLane(2);
          setRunnerAnim('jump');
          setRunnerEffects('moving-down');
        } else {
          setRunnerLane(2);
          setRunnerAnim('run');
          setRunnerEffects('');
        }

        // Diamond glides along Bottom Lane 2 towards the runner
        if (progress < 0.44) {
          const dx = 105 - (progress / 0.44) * 87;
          setDiamondX(dx);
          setIsDiamondVisible(true);
          setShowDiamondSparkle(false);
          setActiveShift(0);
          setIsBatonPopping(false);
          setFeedback(null);
        } else if (progress >= 0.44 && progress < 0.55) {
          // Collection moment: sparkle burst & spin effect in Bottom Lane
          setIsDiamondVisible(false);
          setShowDiamondSparkle(true);
          setRunnerEffects('spin-effect');
          setActiveShift(3);
          setIsBatonPopping(true);
          setFeedback({
            text: 'SHIFT +3 ACQUIRED IN BOTTOM LANE!',
            x: 28,
            top: 'var(--lane-2-ground)',
          });
        } else {
          // Continues running in Bottom Lane with active +3 baton
          setIsDiamondVisible(false);
          setShowDiamondSparkle(false);
          setActiveShift(3);
          setIsBatonPopping(false);
          setFeedback(null);
        }
      }

      // ── STEP 2: REAL-TIME DECRYPTION ─────────────────────────────────────
      else if (currentStep === 2) {
        setIsSlimeVisible(false);
        setIsDiamondVisible(false);
        setIsVictoryShown(false);
        setRunnerLane(0);
        setRunnerX(18);
        setRunnerAnim('run');
        setRunnerEffects('');
        setActiveShift(3);

        // Sequential letter decryption: ZLQG -> WIND
        if (progress < 0.18) {
          setSolvedCount(0);
          setFeedback(null);
        } else if (progress < 0.38) {
          setSolvedCount(1);
        } else if (progress < 0.58) {
          setSolvedCount(2);
        } else if (progress < 0.78) {
          setSolvedCount(3);
        } else {
          setSolvedCount(4);
          if (progress >= 0.82) {
            setFeedback({
              text: 'CIPHERTEXT DECRYPTED: WIND',
              x: 50,
              top: '96px',
            });
          }
        }
      }

      // ── STEP 3: TARGET MATCH & VERIFY ────────────────────────────────────
      else if (currentStep === 3) {
        setIsSlimeVisible(false);
        setIsDiamondVisible(false);
        setActiveShift(3);
        setSolvedCount(4);
        setRunnerLane(0);
        setRunnerX(20);
        setRunnerAnim('run');
        setRunnerEffects('boost-trail');
        setIsVictoryShown(true);

        if (progress < 0.40) {
          setFeedback({
            text: 'Shift Matched! Target Decrypted!',
            x: 50,
            top: '96px',
          });
        } else {
          setFeedback(null);
        }
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      isMounted = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen, isClosing, isPlaying, currentStep]);

  const triggerClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      if (onClose) onClose();
    }, 220);
  };

  if (!isOpen) return null;

  const stepData = SPRINT_STEPS[currentStep];

  return (
    <div className={`cq-minigame-tut-backdrop ${isClosing ? 'closing' : ''}`} onClick={triggerClose}>
      <div
        className={`cq-minigame-tut-modal ${isClosing ? 'closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="cq-minigame-tut-header">
          <div className="cq-minigame-tut-header-left">
            <div className="cq-minigame-tut-header-avatar">
              <div className="cq-avatar-runner" />
            </div>
            <div>
              <div className="cq-minigame-tut-tag">OPERATIONAL GUIDE // CAESAR CIPHER</div>
              <h2 className="cq-minigame-tut-title">Caesar Sprint: Tactical Briefing</h2>
            </div>
          </div>

          <div className="cq-minigame-tut-header-controls">
            <div className="cq-minigame-tut-pills">
              {SPRINT_STEPS.map((s, idx) => (
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
                {currentStep + 1} / {SPRINT_STEPS.length}
              </span>
            </div>
          </div>

          {/* SIMULATION VIEWPORT - FULL UNOBSTRUCTED TRACK */}
          <div className="cq-minigame-tut-viewport">
            <div className="cq-tut-arena">
              <div className="cq-tut-sprint-stage">
                {/* 3-LANE TRACK WITH REAL PLATFORMS & PARALLAX BACKGROUND */}
                <div className="sprint-track-container sprint-track-fullscreen">
                  {/* Sky Parallax Layer */}
                  <div className="sprint-parallax-layer sprint-bg-sky" />
                  <div className="sprint-track-vignette" />

                  {/* Dynamic Fast Speed Lines */}
                  <div
                    className="sprint-speed-lines"
                    style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3 }}
                  >
                    {speedLines.map((line) => (
                      <div
                        key={line.id}
                        className="sprint-speed-line"
                        style={{
                          left: `${line.x}%`,
                          top: `${line.y}%`,
                          width: `${line.width}px`,
                        }}
                      />
                    ))}
                  </div>

                  {/* 3 Authentic Platforms / Lanes Mathematically Grounded */}
                  <div className={`sprint-lane lane-0 ${runnerLane === 0 ? 'highlighted' : ''}`}>
                    <div className="sprint-lane-platform platform-upper" />
                    <span className="sprint-lane-badge">Top Lane</span>
                  </div>
                  <div className={`sprint-lane lane-1 ${runnerLane === 1 ? 'highlighted' : ''}`}>
                    <div className="sprint-lane-platform platform-middle" />
                    <span className="sprint-lane-badge">Middle Lane</span>
                  </div>
                  <div className={`sprint-lane lane-2 ${runnerLane === 2 ? 'highlighted' : ''}`}>
                    <div className="sprint-lane-platform platform-bottom" />
                    <span className="sprint-lane-badge">Bottom Lane</span>
                  </div>

                  {/* REAL RUNNER CHARACTER ACTOR WITH GROUNDED FEET ON STONE WALKWAY */}
                  <div
                    className={`sprint-runner-sprite lane-${runnerLane} ${runnerEffects}`}
                    style={{ left: `${runnerX}%` }}
                  >
                    <div className={`sprint-runner-char-sprite ${runnerAnim}`} />
                    <div
                      className={`runner-baton-glow ${activeShift > 0 ? 'badge-correct' : ''} ${
                        isBatonPopping ? 'badge-pickup' : ''
                      }`}
                    >
                      {currentStep === 3 ? '✓' : activeShift === 0 ? '0' : `+${activeShift}`}
                    </div>
                  </div>

                  {/* REAL OBSTACLE SLIME SPRITE (Middle Lane - Step 0) */}
                  {isSlimeVisible && (
                    <div
                      className={`sprint-r2-obstacle-slime sprint-slime-obstacle-sprite lane-${slimeLane}`}
                      style={{ left: `${slimeX}%` }}
                    >
                      <img
                        className="sprint-slime-img"
                        src={`/assets/sprint/obstacle/obstacle1/SlimeOrange_${PAD5(slimeFrame)}.png`}
                        alt="Obstacle Slime"
                      />
                    </div>
                  )}

                  {/* REAL SHIFT DIAMOND (+3) SPRITE (Top Lane - Step 1) */}
                  {isDiamondVisible && (
                    <div
                      className={`sprint-r2-diamond-sprite lane-${diamondLane}`}
                      style={{ left: `${diamondX}%` }}
                    >
                      <div className="sprint-r2-diamond-inner">
                        <span className="sprint-r2-diamond-char">+3</span>
                      </div>
                    </div>
                  )}

                  {/* DIAMOND COLLECTION BURST SPARKLE */}
                  {showDiamondSparkle && (
                    <div
                      className="cq-tut-pellet-sparkle"
                      style={{
                        left: `${runnerX}%`,
                        top: 'var(--lane-2-ground)',
                      }}
                    />
                  )}

                  {/* FLOATING REAL-TIME EVENT FEEDBACK TOAST */}
                  {feedback && (
                    <div
                      className="cq-tut-sprint-feedback"
                      style={{ left: `${feedback.x}%`, top: feedback.top }}
                    >
                      {feedback.text}
                    </div>
                  )}

                  {/* STEP 1: KEYBOARD PROMPT OVERLAY */}
                  {currentStep === 0 && (
                    <div className="cq-tut-spacebar-prompt" style={{ top: '88%', left: '50%' }}>
                      <span className="cq-tut-keycap">ARROW UP / W</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#00e5ff', letterSpacing: '0.04em' }}>
                        SWITCH LANE TO DODGE
                      </span>
                    </div>
                  )}

                  {/* STEP 1 POINTER */}
                  {currentStep === 0 && slimeX > 30 && (
                    <div
                      className="cq-tut-pointer-overlay"
                      style={{ left: `${Math.max(slimeX - 2, 28)}%`, top: 'var(--lane-1-ground)' }}
                    >
                      <span className="material-symbols-outlined cq-tut-pointer-arrow">warning</span>
                      <span className="cq-tut-pointer-badge">Dodge Slime!</span>
                    </div>
                  )}

                  {/* STEP 2 POINTER */}
                  {currentStep === 1 && isDiamondVisible && (
                    <div
                      className="cq-tut-pointer-overlay"
                      style={{ left: `${Math.max(diamondX, 26)}%`, top: 'var(--lane-2-ground)' }}
                    >
                      <span className="material-symbols-outlined cq-tut-pointer-arrow">arrow_downward</span>
                      <span className="cq-tut-pointer-badge">Collect +3 in Bottom Lane</span>
                    </div>
                  )}

                  {/* STEP 3 POINTER */}
                  {currentStep === 2 && solvedCount === 4 && (
                    <div className="cq-tut-pointer-overlay" style={{ left: '50%', top: '94px' }}>
                      <span className="material-symbols-outlined cq-tut-pointer-arrow">check_circle</span>
                      <span className="cq-tut-pointer-badge" style={{ background: '#10b981', color: '#ffffff' }}>
                        Shift +3 Active: WIND Decrypted!
                      </span>
                    </div>
                  )}
                </div>

                {/* TOP WORD PANEL (CENTERED, CLEAN, NO ARITHMETIC CLUTTER) */}
                <div className="cq-tut-word-panel">
                  <div className="cq-tut-word-top-row">
                    <span className="cq-tut-shift-label">Active Shift:</span>
                    <span className={`cq-tut-shift-badge ${solvedCount === 4 ? 'solved' : ''}`}>
                      {currentStep === 3 ? '✓' : activeShift === 0 ? '0' : `+${activeShift}`}
                    </span>
                  </div>
                  <div className="cq-tut-word-letters">
                    {TARGET_CIPHER.map((cipherCh, idx) => {
                      const isLetterSolved = idx < solvedCount;
                      const plainCh = TARGET_PLAIN[idx];
                      return (
                        <div
                          key={idx}
                          className={`cq-tut-word-cell ${isLetterSolved ? 'solved' : ''}`}
                        >
                          <span className="cq-tut-cell-cipher">{cipherCh}</span>
                          <span className="cq-tut-cell-plain">
                            {isLetterSolved ? plainCh : '_'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="cq-tut-clue-banner">Clue: "Moving air that fills a ship's sails"</div>
                </div>

                {/* AUTHENTIC IN-GAME FLOATING VICTORY OUTCOME PANEL (Step 4) */}
                {isVictoryShown && (
                  <div className="caesar-floating-victory-panel">
                    <h3 className="caesar-victory-title">STAGE SECURED!</h3>
                    <p className="caesar-victory-desc">All segments decrypted successfully: WIND</p>
                    <button
                      type="button"
                      className="fg-btn fg-btn-primary"
                      onClick={triggerClose}
                    >
                      Verify &amp; Submit
                    </button>
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
