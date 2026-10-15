/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from 'react';
import './VigenereMinigameTutorial.css';
import {
  facingTransform,
  isLargeFish,
  makeSwimProps,
  onFishImgError,
  spriteForFishValue,
  tickFish,
} from '../../../core/engine/fishPhysics';

const FISHING_STEPS = [
  {
    step: 1,
    badge: 'DIRECTIVE 01 // TARGET PLAINTEXT LETTER',
    desc: (
      <>
        Inspect the active blank position. For cipher <code>I</code> and key <code>B</code> (shift 1),{' '}
        calculate <code>I (8) − B (1) = H (7)</code> to find the target fish <strong>H</strong>.
      </>
    ),
  },
  {
    step: 2,
    badge: 'DIRECTIVE 02 // CAST FISHING LINE',
    desc: (
      <>
        <strong>Click or tap</strong> the swimming <strong>H fish</strong> to cast your fishing line. Timing is key — aim carefully as fish swim!
      </>
    ),
  },
  {
    step: 3,
    badge: 'DIRECTIVE 03 // REEL & DECRYPT LETTER',
    desc: (
      <>
        Hooking the fish reels letter <strong>H</strong> to your boat. The active position instantly decrypts to reveal <strong>H</strong> in the word panel.
      </>
    ),
  },
  {
    step: 4,
    badge: 'DIRECTIVE 04 // CHUM WATERS & SECURE STAGE',
    desc: (
      <>
        Use <strong>Chum the Waters</strong> if fish are out of reach. Repeat for each keyword letter to decrypt <code>H E L L O</code> and clear the stage!
      </>
    ),
  },
];

const SWIM_BOUNDS = { minX: 16, maxX: 84, minY: 165, maxY: 335 };

const createInitialFishList = () => [
  {
    id: 'target-h',
    isTarget: true,
    letter: 'H',
    value: 3,
    x: 52,
    y: 190,
    speed: 0.44,
    ...spriteForFishValue(3),
    ...makeSwimProps(),
  },
  {
    id: 'decoy-e',
    isTarget: false,
    letter: 'E',
    value: 1,
    x: 22,
    y: 140,
    speed: 0.38,
    ...spriteForFishValue(1),
    ...makeSwimProps(),
  },
  {
    id: 'decoy-p',
    isTarget: false,
    letter: 'P',
    value: -2,
    x: 76,
    y: 250,
    speed: 0.42,
    ...spriteForFishValue(-2),
    ...makeSwimProps(),
  },
  {
    id: 'decoy-k',
    isTarget: false,
    letter: 'K',
    value: 2,
    x: 36,
    y: 290,
    speed: 0.36,
    ...spriteForFishValue(2),
    ...makeSwimProps(),
  },
];

export default function VigenereFishingTutorialModal({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isClosing, setIsClosing] = useState(false);

  // Smooth continuous fish physics state
  const [fishList, setFishList] = useState(createInitialFishList);
  const animFrameRef = useRef(null);

  // Dynamic simulation timing & animation states (no cuts)
  const [castProgress, setCastProgress] = useState(0); // 0 to 1
  const [reelProgress, setReelProgress] = useState(0); // 0 to 1
  const [isHooked, setIsHooked] = useState(false);
  const [hookedTargetPos, setHookedTargetPos] = useState({ x: 52, y: 190 });
  const [showSplash, setShowSplash] = useState(false);
  const [splashPos, setSplashPos] = useState({ x: 52, y: 190 });
  const [showCatchToast, setShowCatchToast] = useState(false);
  const [showClickPointer, setShowClickPointer] = useState(false);
  const [basketShake, setBasketShake] = useState(false);

  // Reset or restart when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setIsPlaying(true);
      setIsClosing(false);
      setFishList(createInitialFishList());
      setCastProgress(0);
      setReelProgress(0);
      setIsHooked(false);
      setShowCatchToast(false);
      setShowClickPointer(false);
      setShowSplash(false);
      setBasketShake(false);
    }
  }, [isOpen]);

  // Main slideshow timer: advances 1 step every 4.8 seconds
  useEffect(() => {
    if (!isOpen || !isPlaying || isClosing) return;

    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % FISHING_STEPS.length);
    }, 4800);

    return () => clearInterval(timer);
  }, [isOpen, isPlaying, isClosing, currentStep]);

  // Handle step-specific continuous animations (cast line, reel in, splash)
  useEffect(() => {
    if (!isOpen) return;

    if (currentStep === 0) {
      // Step 1: Target Plaintext Letter - swimming smoothly, reset cast/reel
      setCastProgress(0);
      setReelProgress(0);
      setIsHooked(false);
      setShowCatchToast(false);
      setShowClickPointer(false);
      setShowSplash(false);
      setFishList((prev) => {
        if (prev.some((f) => f.isTarget)) return prev;
        return [
          {
            id: `target-h-${Date.now()}`,
            isTarget: true,
            letter: 'H',
            value: 3,
            x: 20,
            y: 200,
            speed: 0.44,
            ...spriteForFishValue(3),
            ...makeSwimProps(),
          },
          ...prev,
        ];
      });
    } else if (currentStep === 1) {
      // Step 2: Cast line out smoothly to the swimming target fish
      setReelProgress(0);
      setIsHooked(false);
      setShowCatchToast(false);
      setShowClickPointer(true);

      const target = fishList.find((f) => f.isTarget) || { x: 55, y: 200 };
      setHookedTargetPos({ x: target.x, y: target.y });

      // First show click pointer for 250ms, then cast line over 380ms
      const castTimer = setTimeout(() => {
        setShowClickPointer(false);
        let start = null;
        let frameId;
        const animateCast = (ts) => {
          if (!start) start = ts;
          const progress = Math.min((ts - start) / 380, 1);
          setCastProgress(progress);
          if (progress < 1) {
            frameId = requestAnimationFrame(animateCast);
          } else {
            // Line reaches fish -> HOOK IMPACT & SPLASH!
            setIsHooked(true);
            setSplashPos({ x: target.x, y: target.y });
            setShowSplash(true);
            setTimeout(() => setShowSplash(false), 550);
          }
        };
        frameId = requestAnimationFrame(animateCast);
      }, 250);

      return () => clearTimeout(castTimer);
    } else if (currentStep === 2) {
      // Step 3: Reel in the hooked fish directly back along line to boat over 650ms
      setCastProgress(1);
      setIsHooked(true);
      setShowClickPointer(false);
      let start = null;
      let frameId;
      const animateReel = (ts) => {
        if (!start) start = ts;
        const progress = Math.min((ts - start) / 650, 1);
        setReelProgress(progress);
        if (progress < 1) {
          frameId = requestAnimationFrame(animateReel);
        } else {
          // Fish lands in boat -> Catch Splash + Catch Toast + Word Decrypt!
          setShowCatchToast(true);
          setSplashPos({ x: 50, y: 470 });
          setShowSplash(true);
          setTimeout(() => setShowSplash(false), 500);
          setBasketShake(true);
          setTimeout(() => setBasketShake(false), 450);
        }
      };
      frameId = requestAnimationFrame(animateReel);
      return () => cancelAnimationFrame(frameId);
    } else if (currentStep === 3) {
      // Step 4: Solved / Victory state
      setCastProgress(0);
      setReelProgress(1);
      setIsHooked(false);
      setShowCatchToast(false);
      setShowClickPointer(false);
    }
  }, [currentStep, isOpen]);

  // Continuous 60fps fish swimming physics loop
  useEffect(() => {
    if (!isOpen || isClosing) return;

    let isMounted = true;
    const tick = () => {
      if (!isMounted) return;

      setFishList((prev) =>
        prev.map((f) => {
          // If this is the target fish and it is currently hooked in step 1 or reeled in step 2/3, don't move freely
          if (f.isTarget && ((currentStep === 1 && isHooked) || currentStep === 2 || currentStep === 3)) {
            return f;
          }
          return tickFish(f, SWIM_BOUNDS);
        })
      );

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      isMounted = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen, isClosing, currentStep, isHooked]);

  // Keyboard controls (Arrow navigation & Escape)
  useEffect(() => {
    if (!isOpen || isClosing) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        triggerClose();
      } else if (e.key === 'ArrowRight') {
        setCurrentStep((prev) => (prev + 1) % FISHING_STEPS.length);
      } else if (e.key === 'ArrowLeft') {
        setCurrentStep((prev) => (prev - 1 + FISHING_STEPS.length) % FISHING_STEPS.length);
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((p) => !p);
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

  const stepData = FISHING_STEPS[currentStep];

  // Authentic in-game coordinates (Matching VigenereFishingGame.jsx 1:1)
  const rodBaseX = 500;
  const rodBaseY = 515;

  const targetFish = fishList.find((f) => f.isTarget) || { x: 52, y: 190 };
  const targetSvgX = (currentStep === 1 || currentStep === 2 ? hookedTargetPos.x : targetFish.x) * 10;
  const targetSvgY = (currentStep === 1 || currentStep === 2 ? hookedTargetPos.y : targetFish.y) + 24;

  const dx = targetSvgX - rodBaseX;
  const dy = targetSvgY - rodBaseY;
  const len = Math.hypot(dx, dy) || 1;
  const rodLength = 100;

  // Dynamic rod tip pointing toward target fish with realistic flex under tension
  let rodTipX = rodBaseX + (dx / len) * rodLength;
  let rodTipY = rodBaseY + (dy / len) * rodLength;
  if (currentStep === 2 && reelProgress < 1) {
    rodTipY += (1 - reelProgress) * 12; // Flex downward under line tension
  }

  // Rod guide rings along the shaft
  const guide1X = rodBaseX + (dx / len) * (rodLength * 0.35);
  const guide1Y = rodBaseY + (dy / len) * (rodLength * 0.35);
  const guide2X = rodBaseX + (dx / len) * (rodLength * 0.7);
  const guide2Y = rodBaseY + (dy / len) * (rodLength * 0.7);

  // Exact hook coordinates along the line
  let currentHookSvgX = rodTipX;
  let currentHookSvgY = rodTipY;

  if (currentStep === 0) {
    currentHookSvgX = rodTipX;
    currentHookSvgY = rodTipY + 18;
  } else if (currentStep === 1) {
    currentHookSvgX = rodTipX + (targetSvgX - rodTipX) * castProgress;
    currentHookSvgY = rodTipY + (targetSvgY - rodTipY) * castProgress;
  } else if (currentStep === 2) {
    currentHookSvgX = rodTipX + (targetSvgX - rodTipX) * (1 - reelProgress);
    currentHookSvgY = rodTipY + (targetSvgY - rodTipY) * (1 - reelProgress);
  } else if (currentStep === 3) {
    currentHookSvgX = rodTipX;
    currentHookSvgY = rodTipY + 16;
  }

  // Active word panel state
  const isPos1Decrypted = currentStep >= 2;
  const isAllDecrypted = currentStep === 3;

  const hookedFishDomX = (currentHookSvgX / 1000) * 100;
  const hookedFishDomY = currentHookSvgY;

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
              <img
                src="/assets/fish/positive fish (freshwater)/P Fish 1.1.png"
                alt="Fishing Avatar"
                className="cq-avatar-fish-img"
              />
            </div>
            <div>
              <div className="cq-minigame-tut-tag">OPERATIONAL GUIDE // VIGENÈRE CIPHER</div>
              <h2 className="cq-minigame-tut-title">Vigenère Fishing: Tactical Briefing</h2>
            </div>
          </div>

          <div className="cq-minigame-tut-header-controls">
            <div className="cq-minigame-tut-pills">
              {FISHING_STEPS.map((s, idx) => (
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
                setFishList(createInitialFishList());
                setIsHooked(false);
                setShowCatchToast(false);
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
                {currentStep + 1} / {FISHING_STEPS.length}
              </span>
            </div>
          </div>

          {/* SIMULATION VIEWPORT - FULL CONTINUOUS UNDERWATER ARENA */}
          <div className="cq-minigame-tut-viewport">
            <div className="cq-tut-arena">
              <div className="cq-tut-fishing-stage">
                {/* Fullscreen Ocean Background Video */}
                <video
                  className="fg-pond-video"
                  src="/assets/fish/ocean_bg.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div className="fg-pond-overlay" />
                <div className="fg-wave" />

                {/* Animated Rising Bubbles */}
                <div className="fg-bubble" style={{ left: '16%', bottom: '20px', width: '14px', height: '14px' }} />
                <div className="fg-bubble" style={{ left: '38%', bottom: '15px', width: '22px', height: '22px' }} />
                <div className="fg-bubble" style={{ left: '62%', bottom: '25px', width: '16px', height: '16px' }} />
                <div className="fg-bubble" style={{ left: '84%', bottom: '18px', width: '20px', height: '20px' }} />

                {/* AUTHENTIC SVG FISHING ROD & LINE (Aligned with actual game physics) */}
                <svg
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 38 }}
                  viewBox="0 0 1000 520"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <filter id="cqRodGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#00e5ff" floodOpacity="0.8" />
                    </filter>
                    <filter id="cqHookGlow" x="-30%" y="-30%" width="160%" height="160%">
                      <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#ffd700" floodOpacity="0.9" />
                    </filter>
                  </defs>

                  {/* Fishing Rod Base Mount */}
                  <circle cx={rodBaseX} cy={rodBaseY} r="9" fill="#090e17" stroke="#00e5ff" strokeWidth="2" />
                  <circle cx={rodBaseX} cy={rodBaseY} r="5" fill="#ffd700" />

                  {/* Fishing Rod Shaft */}
                  <line
                    x1={rodBaseX}
                    y1={rodBaseY}
                    x2={rodTipX}
                    y2={rodTipY}
                    stroke="#1e293b"
                    strokeWidth="7"
                    strokeLinecap="round"
                  />
                  <line
                    x1={rodBaseX}
                    y1={rodBaseY}
                    x2={rodTipX}
                    y2={rodTipY}
                    stroke="#00e5ff"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    filter="url(#cqRodGlow)"
                  />

                  {/* Rod Guide Rings */}
                  <circle cx={guide1X} cy={guide1Y} r="3.5" fill="#ffd700" stroke="#00e5ff" strokeWidth="1" />
                  <circle cx={guide2X} cy={guide2Y} r="3" fill="#ffd700" stroke="#00e5ff" strokeWidth="1" />

                  {/* Rod Tip Eyelet */}
                  <circle
                    cx={rodTipX}
                    cy={rodTipY}
                    r="4.5"
                    fill="#ffd700"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    filter="url(#cqHookGlow)"
                  />

                  {/* Dynamic Fishing Line */}
                  {(currentStep === 1 || (currentStep === 2 && reelProgress < 1)) && (
                    <>
                      <line
                        x1={rodTipX}
                        y1={rodTipY}
                        x2={currentHookSvgX}
                        y2={currentHookSvgY}
                        stroke="#ffffff"
                        strokeWidth="1.8"
                        strokeDasharray="4 2.5"
                        filter="url(#cqRodGlow)"
                      />
                      {/* Luminous Hook at line end */}
                      <circle
                        cx={currentHookSvgX}
                        cy={currentHookSvgY}
                        r="4"
                        fill="#ffd700"
                        stroke="#ffffff"
                        strokeWidth="1.2"
                        filter="url(#cqHookGlow)"
                      />
                    </>
                  )}
                </svg>

                {/* TACTICAL SKIFF BOAT AT BOTTOM CENTER */}
                <div className="cq-tut-boat-dock">
                  <span className="cq-tut-boat-dock-label">TACTICAL SKIFF</span>
                  <div className="cq-tut-boat-dock-bar" />
                </div>

                {/* ACTIVE SWIMMING & HOOKED FISH */}
                {fishList.map((f) => {
                  // Step 2 Reeling state: target fish travels attached to hook along line
                  if (f.isTarget && currentStep === 2 && reelProgress < 1) {
                    return (
                      <div
                        key={f.id}
                        className="fg-fish-entity is-hooked is-reeling"
                        style={{
                          left: `${hookedFishDomX}%`,
                          top: `${hookedFishDomY - 24}px`,
                          transform: 'scale(1.2)',
                          transition: 'none',
                        }}
                      >
                        <div className="fg-fish-facing" style={{ transform: facingTransform(f.facing) }}>
                          <img
                            className={`fg-fish-sprite-img${isLargeFish(f.imgSrc) ? ' fg-large-fish' : ''}`}
                            src={f.imgSrc}
                            alt=""
                            draggable={false}
                            onError={onFishImgError}
                          />
                        </div>
                        <div className="fg-fish-badge positive letter-target">{f.letter}</div>
                      </div>
                    );
                  }

                  // Step 1 Hooked state: target fish locked on hook with struggle animation
                  if (f.isTarget && currentStep === 1 && isHooked) {
                    return (
                      <div
                        key={f.id}
                        className="fg-fish-entity is-hooked"
                        style={{
                          left: `${hookedTargetPos.x}%`,
                          top: `${hookedTargetPos.y}px`,
                          transition: 'none',
                        }}
                      >
                        <div className="fg-fish-facing" style={{ transform: facingTransform(f.facing) }}>
                          <img
                            className={`fg-fish-sprite-img${isLargeFish(f.imgSrc) ? ' fg-large-fish' : ''}`}
                            src={f.imgSrc}
                            alt=""
                            draggable={false}
                            onError={onFishImgError}
                          />
                        </div>
                        <div className="fg-fish-badge positive letter-target">{f.letter}</div>
                      </div>
                    );
                  }

                  // Landed fish inside boat in Step 2 (finished) & Step 3
                  if (f.isTarget && (currentStep === 3 || (currentStep === 2 && reelProgress >= 1))) {
                    return (
                      <div
                        key={f.id}
                        className="fg-fish-entity"
                        style={{
                          left: '50%',
                          top: '475px',
                          transform: 'translate(-50%, -50%) scale(0.95)',
                          transition: 'all 0.3s ease',
                          zIndex: 40,
                        }}
                      >
                        <div className="fg-fish-facing" style={{ transform: facingTransform(f.facing) }}>
                          <img
                            className={`fg-fish-sprite-img${isLargeFish(f.imgSrc) ? ' fg-large-fish' : ''}`}
                            src={f.imgSrc}
                            alt=""
                            draggable={false}
                            onError={onFishImgError}
                          />
                        </div>
                        <div className="fg-fish-badge positive letter-target">✓ {f.letter}</div>
                      </div>
                    );
                  }

                  const badgeClass = f.isTarget
                    ? 'fg-fish-badge positive letter-target'
                    : 'fg-fish-badge letter-decoy';

                  return (
                    <div
                      key={f.id}
                      className="fg-fish-entity"
                      style={{
                        left: `${f.x}%`,
                        top: `${f.y}px`,
                        transition: 'none',
                      }}
                    >
                      <div className="fg-fish-facing" style={{ transform: facingTransform(f.facing) }}>
                        <img
                          className={`fg-fish-sprite-img${isLargeFish(f.imgSrc) ? ' fg-large-fish' : ''}`}
                          src={f.imgSrc}
                          alt=""
                          draggable={false}
                          onError={onFishImgError}
                        />
                      </div>
                      <div className={badgeClass}>{f.letter}</div>
                    </div>
                  );
                })}

                {/* WATER SPLASH EFFECT */}
                {showSplash && (
                  <div
                    className="cq-tut-water-splash"
                    style={{ left: `${splashPos.x}%`, top: `${splashPos.y + 10}px` }}
                  />
                )}

                {/* CATCH CELEBRATION TOAST */}
                {showCatchToast && (
                  <div className="cq-tut-catch-toast">
                    <span className="cq-tut-catch-toast-xp">+50 XP</span>
                    <span className="cq-tut-catch-toast-msg">Decrypted 'H' Fish Landed!</span>
                  </div>
                )}

                {/* STEP 1: TARGETING RETICLE TRACKING THE SWIMMING 'H' FISH */}
                {currentStep === 0 && (
                  <div
                    className="cq-tut-crosshair"
                    style={{
                      left: `${targetFish.x}%`,
                      top: `${targetFish.y + 20}px`,
                      transition: 'none',
                    }}
                  />
                )}

                {/* STEP 1 POINTER (Tracks swimming 'H' fish) */}
                {currentStep === 0 && (
                  <div
                    className="cq-tut-pointer-overlay"
                    style={{
                      left: `calc(${targetFish.x}% - 42px)`,
                      top: targetFish.y < 210 ? `${targetFish.y + 65}px` : `${targetFish.y - 48}px`,
                      transition: 'none',
                    }}
                  >
                    <span className="material-symbols-outlined cq-tut-pointer-arrow">
                      {targetFish.y < 210 ? 'arrow_upward' : 'arrow_downward'}
                    </span>
                    <span className="cq-tut-pointer-badge">Target 'H' Fish</span>
                  </div>
                )}

                {/* STEP 2 POINTER (Tap to Cast) */}
                {currentStep === 1 && showClickPointer && (
                  <div
                    className="cq-tut-pointer-overlay"
                    style={{
                      left: `calc(${hookedTargetPos.x}% - 50px)`,
                      top: `${hookedTargetPos.y - 46}px`,
                    }}
                  >
                    <span className="material-symbols-outlined cq-tut-pointer-arrow">touch_app</span>
                    <span className="cq-tut-pointer-badge">Click to Cast Line</span>
                  </div>
                )}

                {/* STEP 2 HOOKED BADGE */}
                {currentStep === 1 && isHooked && (
                  <div
                    className="cq-tut-pointer-overlay"
                    style={{
                      left: `calc(${hookedTargetPos.x}% - 60px)`,
                      top: `${hookedTargetPos.y - 48}px`,
                    }}
                  >
                    <span className="material-symbols-outlined cq-tut-pointer-arrow" style={{ color: '#00e5ff' }}>
                      lock
                    </span>
                    <span className="cq-tut-pointer-badge" style={{ background: '#00e5ff', color: '#020611', fontWeight: 800 }}>
                      HOOKED! READY TO REEL
                    </span>
                  </div>
                )}

                {/* STEP 3 POINTER (Reeling to Boat) */}
                {currentStep === 2 && reelProgress < 1 && (
                  <div
                    className="cq-tut-pointer-overlay"
                    style={{
                      left: 'calc(50% - 75px)',
                      bottom: '72px',
                    }}
                  >
                    <span className="material-symbols-outlined cq-tut-pointer-arrow">downloading</span>
                    <span className="cq-tut-pointer-badge" style={{ background: '#10b981', color: '#ffffff' }}>
                      Reeling Letter 'H' to Boat!
                    </span>
                  </div>
                )}

                {/* VIGENÈRE KEYWORD CARD (BOTTOM LEFT) */}
                <div
                  className={`vigenere-floating-key-card ${basketShake ? 'shake' : ''}`}
                >
                  <div className="vigenere-key-icon">
                    <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#ffd700' }}>
                      vpn_key
                    </span>
                  </div>
                  <div className="vigenere-key-details">
                    <div className="vigenere-key-badge-row">
                      <span className="vigenere-key-val-badge">KEY: BED</span>
                      <span className={`vigenere-key-val-badge ${isPos1Decrypted ? 'solved' : ''}`}>
                        {isPos1Decrypted ? '✓ POS #1' : 'B (+1)'}
                      </span>
                    </div>
                    <div className="vigenere-key-label">VIGENÈRE KEYWORD</div>
                  </div>
                </div>

                {/* CHUM THE WATERS PANEL (BOTTOM RIGHT) */}
                <div
                  className={`skill-charge-card fishing-skill-card ${currentStep === 3 ? 'charged' : ''}`}
                  style={{ position: 'absolute', bottom: '16px', right: '18px', zIndex: 60 }}
                >
                  <div className="skill-charge-title">Chum the Waters</div>
                  <div className="skill-pellet-icon-wrapper">
                    <span className="material-symbols-outlined skill-bolt">waves</span>
                  </div>
                  <div className="skill-hint-label">Attract Letters (3 Left)</div>
                </div>

                {/* TOP WORD PANEL (CENTERED, EXACT HUD STYLING MATCHING GAMEPLAY) */}
                <div className="cq-tut-word-panel">
                  <div className="cq-tut-word-top-row">
                    <span className="cq-tut-shift-label">Keyword: BED</span>
                    <span className={`cq-tut-shift-badge ${isAllDecrypted ? 'solved' : ''}`}>
                      {isAllDecrypted ? 'SOLVED' : 'ACTIVE: B (+1)'}
                    </span>
                  </div>
                  <div className="cq-tut-word-letters">
                    <div className={`cq-tut-word-cell ${isPos1Decrypted ? 'solved' : 'active-slot'}`}>
                      <span className="cq-tut-cell-cipher">I</span>
                      <span className="cq-tut-cell-plain">{isPos1Decrypted ? 'H' : '_'}</span>
                    </div>
                    <div className={`cq-tut-word-cell ${isAllDecrypted ? 'solved' : ''}`}>
                      <span className="cq-tut-cell-cipher">I</span>
                      <span className="cq-tut-cell-plain">{isAllDecrypted ? 'E' : '_'}</span>
                    </div>
                    <div className={`cq-tut-word-cell ${isAllDecrypted ? 'solved' : ''}`}>
                      <span className="cq-tut-cell-cipher">O</span>
                      <span className="cq-tut-cell-plain">{isAllDecrypted ? 'L' : '_'}</span>
                    </div>
                    <div className={`cq-tut-word-cell ${isAllDecrypted ? 'solved' : ''}`}>
                      <span className="cq-tut-cell-cipher">M</span>
                      <span className="cq-tut-cell-plain">{isAllDecrypted ? 'L' : '_'}</span>
                    </div>
                    <div className={`cq-tut-word-cell ${isAllDecrypted ? 'solved' : ''}`}>
                      <span className="cq-tut-cell-cipher">S</span>
                      <span className="cq-tut-cell-plain">{isAllDecrypted ? 'O' : '_'}</span>
                    </div>
                  </div>
                  <div className="cq-tut-clue-banner">Clue: "A common warm and friendly greeting"</div>
                </div>

                {/* VICTORY BADGE (Step 4) */}
                {currentStep === 3 && (
                  <div className="cq-tut-victory-badge">
                    <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#10b981' }}>
                      check_circle
                    </span>
                    <h3 className="cq-tut-victory-title">STAGE SECURED!</h3>
                    <p className="cq-tut-victory-sub">All letters decrypted under Keyword BED: HELLO</p>
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
