/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from 'react';
import './PlayfairMinigameTutorial.css';
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
    badge: 'DIRECTIVE 02 // COLLECT DIGRAPH DIAMONDS',
    desc: (
      <>
        Diamonds float along lanes carrying 2-letter plaintext digraphs. Target answers appear in <strong>any lane</strong> — switch lanes to collect the <strong>W I diamond</strong>!
      </>
    ),
  },
  {
    step: 3,
    badge: 'DIRECTIVE 03 // REAL-TIME RELAY DECRYPTION',
    desc: (
      <>
        Weave between lanes to collect relay digraphs: <code>X G → W I</code>, then <code>R Y → N D</code> to form <code>W I N D</code>!
      </>
    ),
  },
  {
    step: 4,
    badge: 'DIRECTIVE 04 // WORD COMPLETE & VERIFY',
    desc: (
      <>
        Complete all relay pairs to fully decrypt <code>W I N D</code>! Click <strong>Verify &amp; Submit</strong> on the floating victory panel to secure the run.
      </>
    ),
  },
];

const TARGET_CIPHER_PAIRS = ['X G', 'R Y'];
const TARGET_PLAIN_PAIRS = ['W I', 'N D'];

const INITIAL_SPEED_LINES = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  x: (i * 7.5 + Math.random() * 5) % 110,
  y: 8 + ((i * 17) % 80),
  speed: 1.1 + (i % 4) * 0.45,
  width: 18 + (i % 3) * 14,
}));

export default function PlayfairSprintTutorialModal({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isClosing, setIsClosing] = useState(false);

  // References for continuous 60fps loop
  const animFrameRef = useRef(null);
  const stepStartTimeRef = useRef(Date.now());
  const runnerLaneRef = useRef(1);
  const actionsDoneRef = useRef(new Set());

  // 30-frame animated monster (slime) loop
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
    char: 'WI',
  });

  // Decoy diamond (shows lane choices)
  const [decoyDiamond, setDecoyDiamond] = useState({
    visible: false,
    x: 115,
    lane: 0,
    char: 'IW',
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

  // FX feedback & progress states
  const [sparkle, setSparkle] = useState({ visible: false, x: 18, lane: 0 });
  const [feedback, setFeedback] = useState(null);
  const [solvedCount, setSolvedCount] = useState(0);
  const [isVictoryShown, setIsVictoryShown] = useState(false);

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
      setTargetDiamond({ visible: false, x: 105, lane: 0, char: 'WI' });
      setDecoyDiamond({ visible: true, x: 118, lane: 0, char: 'XG' });
    } else if (stepIdx === 1) {
      // Step 2: Answer in ANY Lane (Target 'WI' in Bottom Lane 2!)
      setRunnerLane(0);
      runnerLaneRef.current = 0;
      setRunnerAnim('run');
      setRunnerEffects('');
      setBatonText('0');
      setBatonCorrect(false);
      setIsBatonPopping(false);
      setSolvedCount(0);
      setIsVictoryShown(false);

      setTargetDiamond({ visible: true, x: 105, lane: 2, char: 'WI' });
      setDecoyDiamond({ visible: true, x: 115, lane: 0, char: 'IW' });
      setObstacleSlime({ visible: true, x: 130, lane: 1 });
      setSecondarySlime({ visible: false, x: 140, lane: 1 });
    } else if (stepIdx === 2) {
      // Step 3: Multi-Lane Relay Decryption
      setRunnerLane(2);
      runnerLaneRef.current = 2;
      setRunnerAnim('run');
      setRunnerEffects('');
      setBatonText('WI');
      setBatonCorrect(true);
      setIsBatonPopping(false);
      setSolvedCount(1);
      setIsVictoryShown(false);

      setTargetDiamond({ visible: true, x: 95, lane: 1, char: 'ND' });
      setDecoyDiamond({ visible: false, x: 120, lane: 0, char: 'DN' });
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
      setSolvedCount(2);
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

  // Continuous 60fps simulation engine loop
  useEffect(() => {
    if (!isOpen || isClosing) return;

    let isMounted = true;
    let lastTime = performance.now();

    const loop = (currentTime) => {
      if (!isMounted) return;
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      const elapsed = Date.now() - stepStartTimeRef.current;
      const speed = isPlaying ? 32 : 0; // % per second

      // 1. Parallax speed lines
      if (isPlaying) {
        setSpeedLines((prev) =>
          prev.map((line) => {
            let nextX = line.x - line.speed * 42 * dt;
            if (nextX < -15) nextX = 108 + Math.random() * 10;
            return { ...line, x: nextX };
          })
        );
      }

      // 2. Continuous scripted scenarios per directive
      if (isPlaying) {
        if (currentStep === 0) {
          // DIRECTIVE 01: Slime approaches on Lane 1; runner switches to Top Lane 0 to dodge!
          setObstacleSlime((s) => ({
            ...s,
            x: Math.max(s.x - speed * dt, -20),
          }));

          setDecoyDiamond((d) => ({
            ...d,
            x: Math.max(d.x - speed * dt, -20),
          }));

          if (elapsed > 1100 && !actionsDoneRef.current.has('dodgeJump')) {
            actionsDoneRef.current.add('dodgeJump');
            switchRunnerLane(0); // Up to lane 0
          }

          if (elapsed > 1600 && !actionsDoneRef.current.has('dodgeToast')) {
            actionsDoneRef.current.add('dodgeToast');
            setFeedback({
              text: 'DODGED SLIME! +100',
              x: 28,
              top: 'var(--lane-0-ground)',
            });
          }
        } else if (currentStep === 1) {
          // DIRECTIVE 02: Collect 'WI' Diamond in Bottom Lane 2!
          setTargetDiamond((td) => ({
            ...td,
            x: Math.max(td.x - speed * dt, -20),
          }));

          setDecoyDiamond((dd) => ({
            ...dd,
            x: Math.max(dd.x - speed * dt, -20),
          }));

          setObstacleSlime((os) => ({
            ...os,
            x: Math.max(os.x - speed * dt, -20),
          }));

          // Runner switches from Lane 0 -> Lane 1 at 800ms
          if (elapsed > 800 && !actionsDoneRef.current.has('jumpDown1')) {
            actionsDoneRef.current.add('jumpDown1');
            switchRunnerLane(1);
          }

          // Runner switches from Lane 1 -> Lane 2 at 1450ms
          if (elapsed > 1450 && !actionsDoneRef.current.has('jumpDown2')) {
            actionsDoneRef.current.add('jumpDown2');
            switchRunnerLane(2);
          }

          // Runner reaches Target Diamond at ~2200ms in Lane 2
          if (elapsed > 2200 && !actionsDoneRef.current.has('collectTargetH')) {
            actionsDoneRef.current.add('collectTargetH');
            setTargetDiamond((td) => ({ ...td, visible: false }));
            triggerCollection('WI', 2, 1, 'PAIR WI SECURED! +250');
          }
        } else if (currentStep === 2) {
          // DIRECTIVE 03: Multi-Lane Relay across ALL 3 Lanes!
          setTargetDiamond((td) => ({
            ...td,
            x: Math.max(td.x - speed * dt, -20),
          }));

          // Runner at Lane 2 switches up to Lane 1 at 1200ms
          if (elapsed > 1200 && !actionsDoneRef.current.has('relayMoveUp')) {
            actionsDoneRef.current.add('relayMoveUp');
            switchRunnerLane(1);
          }

          // Collects 'ND' at 2000ms
          if (elapsed > 2000 && !actionsDoneRef.current.has('collectE')) {
            actionsDoneRef.current.add('collectE');
            setTargetDiamond((td) => ({ ...td, visible: false }));
            triggerCollection('ND', 1, 2, 'PAIR ND SECURED! +250');
          }

          // Runner switches to Top Lane 0 for final victory stretch
          if (elapsed > 3500 && !actionsDoneRef.current.has('relayMoveTop')) {
            actionsDoneRef.current.add('relayMoveTop');
            switchRunnerLane(0);
          }
        } else if (currentStep === 3) {
          // DIRECTIVE 04: Word Complete & Victory Panel
          if (elapsed > 600 && !actionsDoneRef.current.has('victoryTrigger')) {
            actionsDoneRef.current.add('victoryTrigger');
            setIsVictoryShown(true);
            setBatonCorrect(true);
            setBatonText('✓');
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      isMounted = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen, isClosing, isPlaying, currentStep]);

  // Slime 30-frame animation interval
  useEffect(() => {
    if (!isOpen || isClosing) return;
    const interval = setInterval(() => {
      setSlimeFrame((prev) => (prev + 1) % 30);
    }, 45);
    return () => clearInterval(interval);
  }, [isOpen, isClosing]);

  const triggerClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      if (onClose) onClose();
    }, 220);
  };

  if (!isOpen) return null;

  const stepData = SPRINT_STEPS[currentStep];
  const activeSlimeImgSrc = `/assets/sprint/obstacle/obstacle1/SlimeOrange_${String(slimeFrame).padStart(5, '0')}.png`;

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
              <div className="cq-avatar-runner" />
            </div>
            <div>
              <div className="cq-minigame-tut-tag">OPERATIONAL GUIDE // PLAYFAIR CIPHER</div>
              <h2 className="cq-minigame-tut-title">Playfair Sprint: Tactical Briefing</h2>
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
              title={isPlaying ? 'Pause Demo' : 'Play Demo'}
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
                resetToStep(0);
              }}
              title="Restart Tutorial"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                restart_alt
              </span>
            </button>

            <button
              type="button"
              className="cq-minigame-tut-close-btn"
              onClick={triggerClose}
              title="Close Guide (ESC)"
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
              <div className="cq-minigame-tut-step-badge">{stepData.badge}</div>
              <div className="cq-minigame-tut-step-desc">{stepData.desc}</div>
            </div>
            <div className="cq-minigame-tut-step-progress">
              <span className="cq-minigame-tut-step-count">
                {currentStep + 1} / {SPRINT_STEPS.length}
              </span>
            </div>
          </div>

          {/* SIMULATION VIEWPORT */}
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

                  {/* RUNNER CHARACTER ACTOR WITH GROUNDED FEET ON STONE WALKWAY */}
                  <div
                    className={`sprint-runner-sprite lane-${runnerLane} ${runnerEffects}`}
                    style={{ left: `${runnerX}%` }}
                  >
                    <div className={`sprint-runner-char-sprite ${runnerAnim}`} />
                    <div
                      className={`runner-baton-glow pf-baton ${batonCorrect ? 'badge-correct' : ''} ${
                        isBatonPopping ? 'badge-pickup' : ''
                      }`}
                    >
                      {batonText}
                    </div>
                  </div>

                  {/* OBSTACLE SLIME SPRITE (Primary) */}
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
                        <span className="sprint-r2-diamond-char pf-char">{targetDiamond.char}</span>
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
                        <span className="sprint-r2-diamond-char pf-char">{decoyDiamond.char}</span>
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

                  {/* STEP 2: KEYBOARD PROMPT OVERLAY */}
                  {currentStep === 1 && runnerLane < 2 && (
                    <div className="cq-tut-spacebar-prompt" style={{ top: '88%', left: '50%' }}>
                      <span className="cq-tut-keycap">ARROW DOWN / S</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#00e5ff', letterSpacing: '0.04em' }}>
                        SWITCH DOWN TO BOTTOM LANE FOR 'W I'
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
                      <span className="cq-tut-pointer-badge">Target 'W I' in Bottom Lane!</span>
                    </div>
                  )}

                  {/* STEP 3 POINTER (Multi-Lane Relay Active) */}
                  {currentStep === 2 && solvedCount >= 1 && (
                    <div className="cq-tut-pointer-overlay" style={{ left: '50%', top: '94px' }}>
                      <span className="material-symbols-outlined cq-tut-pointer-arrow">check_circle</span>
                      <span className="cq-tut-pointer-badge" style={{ background: '#10b981', color: '#ffffff' }}>
                        Multi-Lane Relay: Digraphs Decrypting!
                      </span>
                    </div>
                  )}
                </div>

                {/* COMPACT TOP HUD (CENTERED, NON-INTRUSIVE) */}
                <div className="cq-tut-word-panel pf-compact-hud">
                  <div className="pf-hud-key-pill">
                    <span className="pf-hud-key-label">KEY:</span>
                    <span className="pf-hud-key-val">MONARCHY</span>
                  </div>
                  <div className="pf-hud-pairs">
                    <div className={`pf-hud-pair-chip ${solvedCount >= 1 ? 'solved' : 'active'}`}>
                      <span className="pf-hud-cipher">X G</span>
                      <span className="pf-hud-arrow">→</span>
                      <span className="pf-hud-plain">{solvedCount >= 1 ? 'W I' : '_ _'}</span>
                    </div>
                    <div className={`pf-hud-pair-chip ${solvedCount >= 2 ? 'solved' : solvedCount >= 1 ? 'active' : ''}`}>
                      <span className="pf-hud-cipher">R Y</span>
                      <span className="pf-hud-arrow">→</span>
                      <span className="pf-hud-plain">{solvedCount >= 2 ? 'N D' : '_ _'}</span>
                    </div>
                  </div>
                  <div className={`pf-hud-status-badge ${solvedCount === 2 ? 'solved' : ''}`}>
                    {solvedCount === 2 ? '✓ STAGE SECURED' : solvedCount >= 1 ? 'ACTIVE: N D' : 'ACTIVE: W I'}
                  </div>
                </div>

                {/* AUTHENTIC IN-GAME FLOATING VICTORY OUTCOME PANEL (Step 4) */}
                {isVictoryShown && (
                  <div className="caesar-floating-victory-panel">
                    <h3 className="caesar-victory-title">STAGE SECURED!</h3>
                    <p className="caesar-victory-desc">All digraphs decrypted successfully: W I N D</p>
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
