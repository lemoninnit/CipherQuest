/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from 'react';
import './VigenereMinigameTutorial.css';
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
    badge: 'DIRECTIVE 02 // COLLECT PLAINTEXT DIAMONDS',
    desc: (
      <>
        Diamonds float along lanes carrying plaintext letters. Target answers appear in <strong>any lane</strong> — switch lanes to collect the <strong>H diamond</strong>!
      </>
    ),
  },
  {
    step: 3,
    badge: 'DIRECTIVE 03 // REAL-TIME RELAY DECRYPTION',
    desc: (
      <>
        Weave between all 3 lanes to collect relay letters: <code>I I O M S → H E L L O</code>!
      </>
    ),
  },
  {
    step: 4,
    badge: 'DIRECTIVE 04 // WORD COMPLETE & VERIFY',
    desc: (
      <>
        Complete all relay letters to fully decrypt <code>H E L L O</code>! Click <strong>Verify &amp; Submit</strong> on the floating victory panel to secure the run.
      </>
    ),
  },
];

const TARGET_CIPHER = ['I', 'I', 'O', 'M', 'S'];
const TARGET_PLAIN = ['H', 'E', 'L', 'L', 'O'];

const PAD5 = (n) => String(n).padStart(5, '0');

const INITIAL_SPEED_LINES = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  x: (i * 7.5 + Math.random() * 5) % 110,
  y: 8 + ((i * 17) % 80),
  speed: 1.1 + (i % 4) * 0.45,
  width: 18 + (i % 3) * 14,
}));

export default function VigenereSprintTutorialModal({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isClosing, setIsClosing] = useState(false);

  // References for continuous 60fps loop
  const animFrameRef = useRef(null);
  const stepStartTimeRef = useRef(Date.now());
  const runnerLaneRef = useRef(1);
  const actionsDoneRef = useRef(new Set());

  // 30-frame animated monster (slime) loop (45ms interval, exact match to game)
  const [slimeFrame, setSlimeFrame] = useState(0);

  // Speed lines state
  const [speedLines, setSpeedLines] = useState(INITIAL_SPEED_LINES);

  // Runner actor states
  const [runnerLane, setRunnerLane] = useState(1); // 0 = Top, 1 = Middle, 2 = Bottom
  const [runnerX] = useState(18); // fixed track position matching game RUNNER_X
  const [runnerAnim, setRunnerAnim] = useState('run'); // 'run' | 'jump' | 'idle'
  const [runnerEffects, setRunnerEffects] = useState(''); // 'spin-effect' | 'boost-trail' | 'moving-up' | 'moving-down'
  const [isBatonPopping, setIsBatonPopping] = useState(false);
  const [batonText, setBatonText] = useState('0');
  const [batonCorrect, setBatonCorrect] = useState(false);

  // Primary target diamond (collectible in any lane)
  const [targetDiamond, setTargetDiamond] = useState({
    visible: false,
    x: 105,
    lane: 2,
    char: 'H',
  });

  // Decoy diamond (shows lane choices)
  const [decoyDiamond, setDecoyDiamond] = useState({
    visible: false,
    x: 115,
    lane: 0,
    char: 'K',
  });

  // Obstacle slimes (moving monsters)
  const [obstacleSlime, setObstacleSlime] = useState({
    visible: false,
    x: 105,
    lane: 1,
  });

  const [secondarySlime, setSecondarySlime] = useState({
    visible: false,
    x: 130,
    lane: 1,
  });

  // Sparkle collection burst state
  const [sparkle, setSparkle] = useState({ visible: false, x: 18, lane: 0 });

  // Word decryption & feedback states
  const [solvedCount, setSolvedCount] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [isVictoryShown, setIsVictoryShown] = useState(false);

  // Cycle slime sprite animation frames (30 frames, 45ms per frame)
  useEffect(() => {
    if (!isOpen || isClosing || !isPlaying) return;
    const timer = setInterval(() => {
      setSlimeFrame((f) => (f + 1) % 30);
    }, 45);
    return () => clearInterval(timer);
  }, [isOpen, isClosing, isPlaying]);

  // Reset simulation when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setIsPlaying(true);
      setIsClosing(false);
      resetToStep(0);
    }
  }, [isOpen]);

  // Initialize track entities and runner position for the given step
  const resetToStep = (stepIdx) => {
    stepStartTimeRef.current = Date.now();
    actionsDoneRef.current = new Set();
    setFeedback(null);
    setSparkle({ visible: false, x: 18, lane: 0 });

    if (stepIdx === 0) {
      // Step 1: Dodging Slime
      // Runner starts in Middle Lane 1
      setRunnerLane(1);
      runnerLaneRef.current = 1;
      setRunnerAnim('run');
      setRunnerEffects('');
      setBatonText('0');
      setBatonCorrect(false);
      setIsBatonPopping(false);
      setSolvedCount(0);
      setIsVictoryShown(false);

      setObstacleSlime({ visible: true, x: 105, lane: 1 });
      setSecondarySlime({ visible: false, x: 130, lane: 1 });
      setTargetDiamond({ visible: false, x: 105, lane: 0, char: 'H' });
      setDecoyDiamond({ visible: true, x: 118, lane: 0, char: 'B' });
    } else if (stepIdx === 1) {
      // Step 2: Answer in ANY Lane (Target 'H' in Bottom Lane 2!)
      // Runner starts in Top Lane 0, will jump down across lanes to collect 'H'
      setRunnerLane(0);
      runnerLaneRef.current = 0;
      setRunnerAnim('run');
      setRunnerEffects('');
      setBatonText('0');
      setBatonCorrect(false);
      setIsBatonPopping(false);
      setSolvedCount(0);
      setIsVictoryShown(false);

      setTargetDiamond({ visible: true, x: 105, lane: 2, char: 'H' });
      setDecoyDiamond({ visible: true, x: 115, lane: 0, char: 'K' });
      setObstacleSlime({ visible: true, x: 130, lane: 1 });
      setSecondarySlime({ visible: false, x: 140, lane: 1 });
    } else if (stepIdx === 2) {
      // Step 3: Multi-Lane Relay Decryption across ALL 3 LANES
      // Runner starts in Bottom Lane 2
      setRunnerLane(2);
      runnerLaneRef.current = 2;
      setRunnerAnim('run');
      setRunnerEffects('');
      setBatonText('H');
      setBatonCorrect(true);
      setIsBatonPopping(false);
      setSolvedCount(1);
      setIsVictoryShown(false);

      setTargetDiamond({ visible: true, x: 95, lane: 1, char: 'E' });
      setDecoyDiamond({ visible: false, x: 120, lane: 0, char: 'X' });
      setObstacleSlime({ visible: false, x: 130, lane: 0 });
      setSecondarySlime({ visible: false, x: 140, lane: 1 });
    } else if (stepIdx === 3) {
      // Step 4: Word Complete & Verify
      setRunnerLane(1);
      runnerLaneRef.current = 1;
      setRunnerAnim('run');
      setRunnerEffects('boost-trail');
      setBatonText('✓');
      setBatonCorrect(true);
      setIsBatonPopping(false);
      setSolvedCount(5);
      setIsVictoryShown(true);

      setTargetDiamond({ visible: false, x: 105, lane: 0, char: '' });
      setDecoyDiamond({ visible: false, x: 105, lane: 0, char: '' });
      setObstacleSlime({ visible: false, x: 105, lane: 0 });
      setSecondarySlime({ visible: false, x: 105, lane: 0 });
    }
  };

  // Main slideshow timer: advances 1 directive at a time
  useEffect(() => {
    if (!isOpen || !isPlaying || isClosing) return;

    // Step duration: 5000ms for steps 0, 1, 3; 6400ms for multi-lane relay step 2
    const duration = currentStep === 2 ? 6400 : 5000;
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % SPRINT_STEPS.length);
    }, duration);

    return () => clearInterval(timer);
  }, [isOpen, isPlaying, isClosing, currentStep]);

  // Sync step resets
  useEffect(() => {
    if (!isOpen) return;
    resetToStep(currentStep);
  }, [currentStep, isOpen]);

  // Keyboard navigation & escape close
  useEffect(() => {
    if (!isOpen || isClosing) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        triggerClose();
      } else if (e.key === 'ArrowRight') {
        setCurrentStep((prev) => (prev + 1) % SPRINT_STEPS.length);
      } else if (e.key === 'ArrowLeft') {
        setCurrentStep((prev) => (prev - 1 + SPRINT_STEPS.length) % SPRINT_STEPS.length);
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isClosing]);

  // Helper to trigger runner lane switch
  const switchRunnerLane = (targetLane) => {
    const currentLane = runnerLaneRef.current;
    if (targetLane === currentLane) return;
    const dir = targetLane < currentLane ? 'moving-up' : 'moving-down';
    setRunnerLane(targetLane);
    runnerLaneRef.current = targetLane;
    setRunnerAnim('jump');
    setRunnerEffects(dir);
    setTimeout(() => {
      setRunnerAnim('run');
      setRunnerEffects('');
    }, 280);
  };

  // Helper to trigger diamond collection feedback
  const triggerCollection = (char, lane, solvedNum, toastText) => {
    setSparkle({ visible: true, x: 18, lane });
    setRunnerEffects('spin-effect');
    setIsBatonPopping(true);
    setBatonText(char);
    setBatonCorrect(true);
    setSolvedCount(solvedNum);
    setFeedback({
      text: toastText,
      x: 28,
      top: lane === 0 ? 'var(--lane-0-ground)' : lane === 1 ? 'var(--lane-1-ground)' : 'var(--lane-2-ground)',
    });

    setTimeout(() => setSparkle((s) => ({ ...s, visible: false })), 420);
    setTimeout(() => setIsBatonPopping(false), 380);
    setTimeout(() => setRunnerEffects(''), 450);
  };

  // 60FPS CONTINUOUS ULTRA-SMOOTH SIMULATION LOOP
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

      // Animate background speed lines continuously
      setSpeedLines((prevLines) =>
        prevLines.map((line) => {
          let nextX = line.x - line.speed * 0.45;
          if (nextX < -15) nextX = 115;
          return { ...line, x: nextX };
        })
      );

      // ─────────────────────────────────────────────────────────────────────
      // DIRECTIVE 01: LANE SWITCHING & DODGING (Slime in Lane 1, Dodge to Lane 0)
      // ─────────────────────────────────────────────────────────────────────
      if (currentStep === 0) {
        // Slime travels steadily from 105% to -20% over 4000ms
        const sx = 105 - (elapsed / 4000) * 125;
        setObstacleSlime({
          visible: sx > -20 && sx < 105,
          x: sx,
          lane: 1,
        });

        // Decoy diamond in Top Lane 0
        const decX = 118 - (elapsed / 4000) * 125;
        setDecoyDiamond({
          visible: decX > -15 && decX < 110,
          x: decX,
          lane: 0,
          char: 'B',
        });

        // Slime reaches ~45% at 1800ms -> runner jumps up to Top Lane 0
        if (elapsed >= 1800 && !actionsDoneRef.current.has('dodge-jump')) {
          actionsDoneRef.current.add('dodge-jump');
          switchRunnerLane(0);
        }

        // Slime slides underneath runner at ~2300ms
        if (elapsed >= 2300 && !actionsDoneRef.current.has('dodge-toast')) {
          actionsDoneRef.current.add('dodge-toast');
          setFeedback({
            text: 'DODGED SLIME! SAFELY IN TOP LANE',
            x: 36,
            top: 'var(--lane-1-ground)',
          });
        }

        if (elapsed >= 4200 && feedback) {
          setFeedback(null);
        }
      }

      // ─────────────────────────────────────────────────────────────────────
      // DIRECTIVE 02: TARGET IN ANY LANE (Target 'H' in Bottom Lane 2!)
      // ─────────────────────────────────────────────────────────────────────
      else if (currentStep === 1) {
        // Target 'H' glides along Bottom Lane 2 from 105% to 18% in exactly 2400ms!
        if (elapsed < 2400) {
          const dx = 105 - (elapsed / 2400) * 87; // 105 -> 18 at 2400ms
          setTargetDiamond({
            visible: true,
            x: dx,
            lane: 2,
            char: 'H',
          });
        } else {
          // Consumed on collision at 2400ms
          if (!actionsDoneRef.current.has('collect-H')) {
            actionsDoneRef.current.add('collect-H');
            setTargetDiamond((prev) => ({ ...prev, visible: false }));
            triggerCollection('H', 2, 1, "LETTER 'H' ACQUIRED IN BOTTOM LANE!");
          }
        }

        // Decoy 'K' in Top Lane 0
        const decX = 115 - (elapsed / 4000) * 125;
        setDecoyDiamond({
          visible: decX > -15 && decX < 110,
          x: decX,
          lane: 0,
          char: 'K',
        });

        // Slime in Middle Lane 1
        const sX = 130 - (elapsed / 4000) * 125;
        setObstacleSlime({
          visible: sX > -20 && sX < 110,
          x: sX,
          lane: 1,
        });

        // Runner starts in Lane 0, jumps down to Lane 1 at 800ms
        if (elapsed >= 800 && !actionsDoneRef.current.has('lane-to-mid')) {
          actionsDoneRef.current.add('lane-to-mid');
          switchRunnerLane(1);
        }
        // Runner jumps down to Lane 2 at 1120ms
        if (elapsed >= 1120 && !actionsDoneRef.current.has('lane-to-bot')) {
          actionsDoneRef.current.add('lane-to-bot');
          switchRunnerLane(2);
        }

        if (elapsed >= 4600 && feedback) {
          setFeedback(null);
        }
      }

      // ─────────────────────────────────────────────────────────────────────
      // DIRECTIVE 03: MULTI-LANE RELAY (Letter 'E', 'L', 'L', 'O' across all lanes)
      // ─────────────────────────────────────────────────────────────────────
      else if (currentStep === 2) {
        setDecoyDiamond({ visible: false, x: 120, lane: 0, char: '' });
        setObstacleSlime({ visible: false, x: 120, lane: 0 });

        // Letter 1: 'E' in Middle Lane 1 (0ms -> 1600ms, hits at 1300ms)
        if (elapsed < 1600) {
          if (elapsed >= 400 && !actionsDoneRef.current.has('jump-to-E')) {
            actionsDoneRef.current.add('jump-to-E');
            switchRunnerLane(1); // Jump up to Middle Lane 1
          }

          if (elapsed < 1300) {
            const dx = 95 - (elapsed / 1300) * 77;
            setTargetDiamond({ visible: true, x: dx, lane: 1, char: 'E' });
          } else if (!actionsDoneRef.current.has('collect-E')) {
            actionsDoneRef.current.add('collect-E');
            setTargetDiamond((prev) => ({ ...prev, visible: false }));
            triggerCollection('E', 1, 2, "RELAY: 'E' IN MIDDLE LANE!");
          }
        }
        // Letter 2: 'L' in Top Lane 0 (1600ms -> 3200ms, hits at 2900ms)
        else if (elapsed < 3200) {
          const lt = elapsed - 1600;
          if (lt >= 400 && !actionsDoneRef.current.has('jump-to-L1')) {
            actionsDoneRef.current.add('jump-to-L1');
            switchRunnerLane(0); // Jump up to Top Lane 0
          }

          if (lt < 1300) {
            const dx = 95 - (lt / 1300) * 77;
            setTargetDiamond({ visible: true, x: dx, lane: 0, char: 'L' });
          } else if (!actionsDoneRef.current.has('collect-L1')) {
            actionsDoneRef.current.add('collect-L1');
            setTargetDiamond((prev) => ({ ...prev, visible: false }));
            triggerCollection('L', 0, 3, "RELAY: 'L' IN TOP LANE!");
          }
        }
        // Letter 3: 'L' in Bottom Lane 2 (3200ms -> 4800ms, hits at 4500ms)
        else if (elapsed < 4800) {
          const lt = elapsed - 3200;
          if (lt >= 300 && !actionsDoneRef.current.has('jump-down-mid')) {
            actionsDoneRef.current.add('jump-down-mid');
            switchRunnerLane(1); // Jump down to Middle Lane 1
          }
          if (lt >= 620 && !actionsDoneRef.current.has('jump-down-bot')) {
            actionsDoneRef.current.add('jump-down-bot');
            switchRunnerLane(2); // Jump down to Bottom Lane 2
          }

          if (lt < 1300) {
            const dx = 95 - (lt / 1300) * 77;
            setTargetDiamond({ visible: true, x: dx, lane: 2, char: 'L' });
          } else if (!actionsDoneRef.current.has('collect-L2')) {
            actionsDoneRef.current.add('collect-L2');
            setTargetDiamond((prev) => ({ ...prev, visible: false }));
            triggerCollection('L', 2, 4, "RELAY: 'L' IN BOTTOM LANE!");
          }
        }
        // Letter 4: 'O' in Middle Lane 1 (4800ms -> 6400ms, hits at 5900ms)
        else {
          const lt = elapsed - 4800;
          if (lt >= 350 && !actionsDoneRef.current.has('jump-to-O')) {
            actionsDoneRef.current.add('jump-to-O');
            switchRunnerLane(1); // Jump up to Middle Lane 1
          }

          if (lt < 1100) {
            const dx = 95 - (lt / 1100) * 77;
            setTargetDiamond({ visible: true, x: dx, lane: 1, char: 'O' });
          } else if (!actionsDoneRef.current.has('collect-O')) {
            actionsDoneRef.current.add('collect-O');
            setTargetDiamond((prev) => ({ ...prev, visible: false }));
            triggerCollection('O', 1, 5, 'WORD FULLY DECRYPTED: HELLO!');
          }
        }
      }

      // ─────────────────────────────────────────────────────────────────────
      // DIRECTIVE 04: VICTORY & VERIFY
      // ─────────────────────────────────────────────────────────────────────
      else if (currentStep === 3) {
        setTargetDiamond({ visible: false, x: 0, lane: 0, char: '' });
        setDecoyDiamond({ visible: false, x: 0, lane: 0, char: '' });
        setObstacleSlime({ visible: false, x: 0, lane: 0 });

        if (elapsed < 2400) {
          setFeedback({
            text: 'STAGE SECURED // VERIFY & SUBMIT',
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
      setIsClosing(false);
    }, 220);
  };

  if (!isOpen) return null;

  const stepData = SPRINT_STEPS[currentStep];
  const activeSlimeImgSrc = `/assets/sprint/obstacle/obstacle1/SlimeOrange_${PAD5(slimeFrame)}.png`;

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
              <div className="cq-minigame-tut-tag">OPERATIONAL GUIDE // VIGENÈRE CIPHER</div>
              <h2 className="cq-minigame-tut-title">Vigenère Sprint: Tactical Briefing</h2>
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
                resetToStep(0);
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
                      className={`runner-baton-glow ${batonCorrect ? 'badge-correct' : ''} ${
                        isBatonPopping ? 'badge-pickup' : ''
                      }`}
                    >
                      {batonText}
                    </div>
                  </div>

                  {/* OBSTACLE SLIME SPRITE (Primary - Animated 30-Frame Pixel Art) */}
                  {obstacleSlime.visible && (
                    <div
                      className={`sprint-r2-obstacle-slime sprint-slime-obstacle-sprite lane-${obstacleSlime.lane}`}
                      style={{ left: `${obstacleSlime.x}%` }}
                    >
                      <img
                        className="sprint-slime-img"
                        src={activeSlimeImgSrc}
                        alt="Obstacle Slime"
                      />
                    </div>
                  )}

                  {/* SECONDARY OBSTACLE SLIME */}
                  {secondarySlime.visible && (
                    <div
                      className={`sprint-r2-obstacle-slime sprint-slime-obstacle-sprite lane-${secondarySlime.lane}`}
                      style={{ left: `${secondarySlime.x}%` }}
                    >
                      <img
                        className="sprint-slime-img"
                        src={activeSlimeImgSrc}
                        alt="Obstacle Slime"
                      />
                    </div>
                  )}

                  {/* TARGET DIAMOND SPRITE (In ANY Lane) */}
                  {targetDiamond.visible && (
                    <div
                      className={`sprint-r2-diamond-sprite lane-${targetDiamond.lane}`}
                      style={{ left: `${targetDiamond.x}%` }}
                    >
                      <div className="sprint-r2-diamond-inner">
                        <span className="sprint-r2-diamond-char">{targetDiamond.char}</span>
                      </div>
                    </div>
                  )}

                  {/* DECOY DIAMOND SPRITE */}
                  {decoyDiamond.visible && (
                    <div
                      className={`sprint-r2-diamond-sprite lane-${decoyDiamond.lane} dimmed`}
                      style={{ left: `${decoyDiamond.x}%` }}
                    >
                      <div className="sprint-r2-diamond-inner">
                        <span className="sprint-r2-diamond-char">{decoyDiamond.char}</span>
                      </div>
                    </div>
                  )}

                  {/* DIAMOND COLLECTION BURST SPARKLE */}
                  {sparkle.visible && (
                    <div
                      className="cq-tut-pellet-sparkle"
                      style={{
                        left: `${sparkle.x}%`,
                        top:
                          sparkle.lane === 0
                            ? 'var(--lane-0-ground)'
                            : sparkle.lane === 1
                            ? 'var(--lane-1-ground)'
                            : 'var(--lane-2-ground)',
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
                        SWITCH TO TOP LANE TO DODGE
                      </span>
                    </div>
                  )}

                  {/* STEP 2: KEYBOARD PROMPT OVERLAY (Switch down to Bottom Lane) */}
                  {currentStep === 1 && runnerLane < 2 && (
                    <div className="cq-tut-spacebar-prompt" style={{ top: '88%', left: '50%' }}>
                      <span className="cq-tut-keycap">ARROW DOWN / S</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#00e5ff', letterSpacing: '0.04em' }}>
                        SWITCH DOWN TO BOTTOM LANE FOR 'H'
                      </span>
                    </div>
                  )}

                  {/* STEP 1 POINTER (Dodge Slime) */}
                  {currentStep === 0 && obstacleSlime.visible && obstacleSlime.x > 30 && (
                    <div
                      className="cq-tut-pointer-overlay"
                      style={{
                        left: `${Math.max(obstacleSlime.x - 2, 28)}%`,
                        top: 'var(--lane-1-ground)',
                      }}
                    >
                      <span className="material-symbols-outlined cq-tut-pointer-arrow">warning</span>
                      <span className="cq-tut-pointer-badge">Dodge Slime!</span>
                    </div>
                  )}

                  {/* STEP 2 POINTER (Target in Bottom Lane) */}
                  {currentStep === 1 && targetDiamond.visible && (
                    <div
                      className="cq-tut-pointer-overlay"
                      style={{
                        left: `${Math.max(targetDiamond.x, 26)}%`,
                        top: 'var(--lane-2-ground)',
                      }}
                    >
                      <span className="material-symbols-outlined cq-tut-pointer-arrow">arrow_downward</span>
                      <span className="cq-tut-pointer-badge">Target 'H' in Bottom Lane!</span>
                    </div>
                  )}

                  {/* STEP 3 POINTER (Multi-Lane Relay Active) */}
                  {currentStep === 2 && solvedCount >= 2 && (
                    <div className="cq-tut-pointer-overlay" style={{ left: '50%', top: '94px' }}>
                      <span className="material-symbols-outlined cq-tut-pointer-arrow">check_circle</span>
                      <span className="cq-tut-pointer-badge" style={{ background: '#10b981', color: '#ffffff' }}>
                        Multi-Lane Relay: Checkpoints Decrypting!
                      </span>
                    </div>
                  )}
                </div>

                {/* TOP WORD PANEL (MATCHING SCREENSHOT 1) */}
                <div className="cq-tut-word-panel">
                  <div className="cq-tut-word-top-row">
                    <span className="cq-tut-shift-label">Keyword: BED</span>
                    <span className={`cq-tut-shift-badge ${solvedCount === 5 ? 'solved' : ''}`}>
                      {solvedCount === 5 ? '✓ SOLVED' : `ACTIVE: ${TARGET_PLAIN[Math.min(solvedCount, 4)]}`}
                    </span>
                  </div>
                  <div className="cq-tut-word-letters">
                    {TARGET_CIPHER.map((cipherCh, idx) => {
                      const isLetterSolved = idx < solvedCount;
                      const plainCh = TARGET_PLAIN[idx];
                      const isActive = idx === solvedCount && solvedCount < 5;
                      return (
                        <div
                          key={idx}
                          className={`cq-tut-word-cell ${isLetterSolved ? 'solved' : isActive ? 'active-slot' : ''}`}
                        >
                          <span className="cq-tut-cell-cipher">{cipherCh}</span>
                          <span className="cq-tut-cell-plain">
                            {isLetterSolved ? plainCh : '_'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="cq-tut-clue-banner">Clue: "A common warm and friendly greeting"</div>
                </div>

                {/* AUTHENTIC IN-GAME FLOATING VICTORY OUTCOME PANEL (Step 4) */}
                {isVictoryShown && (
                  <div className="caesar-floating-victory-panel">
                    <h3 className="caesar-victory-title">STAGE SECURED!</h3>
                    <p className="caesar-victory-desc">All segments decrypted successfully: HELLO</p>
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
