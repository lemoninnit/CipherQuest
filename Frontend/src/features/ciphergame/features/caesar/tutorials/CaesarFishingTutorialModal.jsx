/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from 'react';
import './CaesarMinigameTutorial.css';
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
    badge: 'DIRECTIVE 01 // TARGET SHIFT VALUE',
    desc: (
      <>
        Inspect swimming fish for the correct shift modifier. You need a <strong>+3 shift</strong> to decrypt cipher{' '}
        <code>Z L Q G</code>{' '}into{' '}
        <code>W I N D</code>.
      </>
    ),
  },
  {
    step: 2,
    badge: 'DIRECTIVE 02 // CAST FISHING LINE',
    desc: (
      <>
        <strong>Click or tap</strong> the swimming <strong>+3 fish</strong> to cast your fishing line. Timing is key — aim carefully as fish swim!
      </>
    ),
  },
  {
    step: 3,
    badge: 'DIRECTIVE 03 // REEL & UPDATE BASKET',
    desc: (
      <>
        Hooking the fish adjusts your <strong>Basket Shift Key</strong>. The top word panel decrypts immediately to match the target plaintext.
      </>
    ),
  },
  {
    step: 4,
    badge: 'DIRECTIVE 04 // CHUM WATERS & CLEAR',
    desc: (
      <>
        Use <strong>Chum the Waters</strong> if fish are out of reach. Once all letters are decrypted, submit to clear the stage!
      </>
    ),
  },
];

const SWIM_BOUNDS = { minX: 16, maxX: 84, minY: 165, maxY: 335 };

const createInitialFishList = () => [
  {
    id: 'target-3',
    isTarget: true,
    value: 3,
    x: 52,
    y: 190,
    speed: 0.44,
    ...spriteForFishValue(3),
    ...makeSwimProps(),
  },
  {
    id: 'decoy-1',
    isTarget: false,
    value: 1,
    x: 22,
    y: 140,
    speed: 0.38,
    ...spriteForFishValue(1),
    ...makeSwimProps(),
  },
  {
    id: 'decoy-neg2',
    isTarget: false,
    value: -2,
    x: 76,
    y: 250,
    speed: 0.42,
    ...spriteForFishValue(-2),
    ...makeSwimProps(),
  },
  {
    id: 'decoy-2',
    isTarget: false,
    value: 2,
    x: 36,
    y: 290,
    speed: 0.36,
    ...spriteForFishValue(2),
    ...makeSwimProps(),
  },
];

export default function CaesarFishingTutorialModal({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isClosing, setIsClosing] = useState(false);

  // Smooth continuous fish physics state
  const [fishList, setFishList] = useState(createInitialFishList);
  const animFrameRef = useRef(null);

  // Dynamic simulation timing & animation states (no cuts)
  const [castProgress, setCastProgress] = useState(0); // 0 to 1
  const [reelProgress, setReelProgress] = useState(0); // 0 to 1
  const [hookedTargetPos, setHookedTargetPos] = useState({ x: 52, y: 190 });
  const [showSplash, setShowSplash] = useState(false);
  const [splashPos, setSplashPos] = useState({ x: 52, y: 190 });
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
      setShowSplash(false);
      setBasketShake(false);
    }
  }, [isOpen]);

  // Main slideshow timer: advances 1 step every 4.5 seconds
  // Resets cleanly whenever currentStep changes so manual clicks give a full duration
  useEffect(() => {
    if (!isOpen || !isPlaying || isClosing) return;

    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % FISHING_STEPS.length);
    }, 4500);

    return () => clearInterval(timer);
  }, [isOpen, isPlaying, isClosing, currentStep]);

  // Handle step-specific continuous animations (cast line, reel in, splash)
  useEffect(() => {
    if (!isOpen) return;

    if (currentStep === 0) {
      // Step 1: Target Shift - swimming smoothly, reset cast/reel
      setCastProgress(0);
      setReelProgress(0);
      setShowSplash(false);
      // Ensure target fish is swimming if missing
      setFishList((prev) => {
        if (prev.some((f) => f.isTarget)) return prev;
        return [
          {
            id: `target-3-${Date.now()}`,
            isTarget: true,
            value: 3,
            x: 14,
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
      const target = fishList.find((f) => f.isTarget) || { x: 55, y: 200 };
      setHookedTargetPos({ x: target.x, y: target.y });

      // Animate line shooting out from rod to fish over 400ms
      let start = null;
      let frameId;
      const animateCast = (ts) => {
        if (!start) start = ts;
        const progress = Math.min((ts - start) / 400, 1);
        setCastProgress(progress);
        if (progress < 1) {
          frameId = requestAnimationFrame(animateCast);
        } else {
          // Line reaches fish -> trigger ripple splash
          setSplashPos({ x: target.x, y: target.y });
          setShowSplash(true);
          setTimeout(() => setShowSplash(false), 550);
        }
      };
      frameId = requestAnimationFrame(animateCast);
      return () => cancelAnimationFrame(frameId);
    } else if (currentStep === 2) {
      // Step 3: Reel in the hooked fish down to the basket over 750ms
      setCastProgress(1);
      let start = null;
      let frameId;
      const animateReel = (ts) => {
        if (!start) start = ts;
        const progress = Math.min((ts - start) / 750, 1);
        setReelProgress(progress);
        if (progress < 1) {
          frameId = requestAnimationFrame(animateReel);
        } else {
          // Fish enters basket -> shake and activate shift
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
          // If this is the target fish and it is currently being reeled in during step 2 or 3, don't move it freely
          if (f.isTarget && (currentStep === 2 || currentStep === 3)) {
            return f;
          }
          // Swim naturally using CipherQuest physics
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
  }, [isOpen, isClosing, currentStep]);

  // Keyboard controls (Arrow navigation & Escape)
  useEffect(() => {
    if (!isOpen || isClosing) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        triggerClose();
      } else if (e.key === 'ArrowRight') {
        setCurrentStep((s) => (s + 1) % FISHING_STEPS.length);
      } else if (e.key === 'ArrowLeft') {
        setCurrentStep((s) => (s - 1 + FISHING_STEPS.length) % FISHING_STEPS.length);
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

  const stepData = FISHING_STEPS[currentStep];

  // Active target fish
  const targetFish = fishList.find((f) => f.isTarget) || { x: 50, y: 190, facing: 'left', imgSrc: '' };

  // Derived state for basket & decryption
  const isReeledIn = currentStep >= 2 && reelProgress >= 0.8;
  const basketShift = isReeledIn || currentStep === 3 ? 3 : 0;
  const isDecrypted = isReeledIn || currentStep === 3;

  // Rod facing: flips toward the target fish position
  const rodFacingRight = (currentStep === 1 || currentStep === 2 ? hookedTargetPos.x : targetFish.x) > 50;

  // SVG coordinate calculations (viewBox: 0 0 1000 520)
  const rodTipSvg = rodFacingRight ? { x: 670, y: 310 } : { x: 330, y: 310 };
  const targetSvgX = (hookedTargetPos.x / 100) * 1000;
  const targetSvgY = hookedTargetPos.y;

  // Hook point calculation:
  // During cast (step 1): interpolates from rod tip to target fish
  // During reel (step 2): interpolates from target fish down to left basket (100, 460)
  let currentHookSvgX = rodTipSvg.x;
  let currentHookSvgY = rodTipSvg.y;

  if (currentStep === 1) {
    currentHookSvgX = rodTipSvg.x + (targetSvgX - rodTipSvg.x) * castProgress;
    currentHookSvgY = rodTipSvg.y + (targetSvgY - rodTipSvg.y) * castProgress;
  } else if (currentStep === 2) {
    const basketSvgX = 100;
    const basketSvgY = 460;
    currentHookSvgX = targetSvgX + (basketSvgX - targetSvgX) * reelProgress;
    currentHookSvgY = targetSvgY + (basketSvgY - targetSvgY) * reelProgress;
  }

  // Hooked fish DOM position during reel
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
              <div className="cq-minigame-tut-tag">OPERATIONAL GUIDE // CAESAR CIPHER</div>
              <h2 className="cq-minigame-tut-title">Caesar Fishing: Tactical Briefing</h2>
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

                {/* SVG FISHING LINE */}
                <svg
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 42 }}
                  viewBox="0 0 1000 520"
                  preserveAspectRatio="none"
                >
                  {(currentStep === 1 || (currentStep === 2 && reelProgress < 1)) && (
                    <line
                      x1={rodTipSvg.x}
                      y1={rodTipSvg.y}
                      x2={currentHookSvgX}
                      y2={currentHookSvgY}
                      stroke="#00e5ff"
                      strokeWidth="2.5"
                      strokeDasharray="5 3"
                    />
                  )}
                </svg>

                {/* ACTIVE SWIMMING FISH */}
                {fishList.map((f) => {
                  // If target fish is being reeled in (step 2), render it following the hook line
                  if (f.isTarget && currentStep === 2 && reelProgress < 1) {
                    return (
                      <div
                        key={f.id}
                        className="fg-fish-entity"
                        style={{
                          left: `${hookedFishDomX}%`,
                          top: `${hookedFishDomY}px`,
                          transform: 'scale(1.15)',
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
                        <div className="fg-fish-badge positive">+3</div>
                      </div>
                    );
                  }

                  // If target fish has already been deposited in the basket (step 2 finish or step 3), hide it
                  if (f.isTarget && (currentStep === 3 || (currentStep === 2 && reelProgress >= 1))) {
                    return null;
                  }

                  // Normal free-swimming fish
                  const badgeText = f.value > 0 ? `+${f.value}` : `${f.value}`;
                  const badgeClass = `fg-fish-badge ${f.value > 0 ? 'positive' : 'negative'}`;

                  return (
                    <div
                      key={f.id}
                      className="fg-fish-entity"
                      style={{
                        left: `${f.x}%`,
                        top: `${f.y}px`,
                        transition: 'none', // Smooth continuous requestAnimationFrame physics
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
                      <div className={badgeClass}>{badgeText}</div>
                    </div>
                  );
                })}

                {/* WATER SPLASH EFFECT (No Emojis, clean cyan ripple) */}
                {showSplash && (
                  <div
                    className="cq-tut-water-splash"
                    style={{ left: `${splashPos.x}%`, top: `${splashPos.y + 10}px` }}
                  />
                )}

                {/* AUTHENTIC FISHING ROD SPRITE */}
                <div
                  className={`caesar-fishing-rod-sprite ${rodFacingRight ? 'facing-right' : ''}`}
                  aria-hidden="true"
                />

                {/* STEP 1: TARGETING RETICLE DYNAMICALLY TRACKING THE SWIMMING +3 FISH */}
                {currentStep === 0 && (
                  <div
                    className="cq-tut-crosshair"
                    style={{
                      left: `${targetFish.x + 3}%`,
                      top: `${targetFish.y + 24}px`,
                      transition: 'none',
                    }}
                  />
                )}

                {/* STEP 1 POINTER (Tracks swimming fish) */}
                {currentStep === 0 && (
                  <div
                    className="cq-tut-pointer-overlay"
                    style={{
                      left: `calc(${targetFish.x}% - 40px)`,
                      top: targetFish.y < 210 ? `${targetFish.y + 65}px` : `${targetFish.y - 48}px`,
                      transition: 'none',
                    }}
                  >
                    <span className="material-symbols-outlined cq-tut-pointer-arrow">
                      {targetFish.y < 210 ? 'arrow_upward' : 'arrow_downward'}
                    </span>
                    <span className="cq-tut-pointer-badge">Target +3 Fish</span>
                  </div>
                )}

                {/* STEP 2 POINTER (Click to Cast) */}
                {currentStep === 1 && (
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

                {/* STEP 3 POINTER (Hooked & Reeling to Basket) */}
                {currentStep === 2 && (
                  <div
                    className="cq-tut-pointer-overlay"
                    style={{
                      left: '24px',
                      bottom: '105px',
                    }}
                  >
                    <span className="material-symbols-outlined cq-tut-pointer-arrow">downloading</span>
                    <span className="cq-tut-pointer-badge" style={{ background: '#10b981', color: '#ffffff' }}>
                      Hooked &amp; Shift +3 Applied!
                    </span>
                  </div>
                )}

                {/* REAL BASKET SHIFT KEY CARD (LEFT BOTTOM) */}
                <div
                  className={`caesar-floating-basket-card ${basketShake ? 'shake' : ''}`}
                  style={{
                    position: 'absolute',
                    bottom: '16px',
                    left: '18px',
                    zIndex: 60,
                  }}
                >
                  <div className="caesar-basket-icon">
                    <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#ffd700' }}>
                      shopping_basket
                    </span>
                  </div>
                  <div className={`caesar-basket-badge ${basketShift > 0 ? 'solved' : ''}`}>
                    {basketShift === 0 ? '0' : `+${basketShift}`}
                  </div>
                  <div className="caesar-basket-label">BASKET SHIFT KEY</div>
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

                {/* TOP WORD PANEL (CENTERED, CLEAN, MATCHES GAMEPLAY) */}
                <div className="cq-tut-word-panel">
                  <div className="cq-tut-word-top-row">
                    <span className="cq-tut-shift-label">Active Shift:</span>
                    <span className={`cq-tut-shift-badge ${isDecrypted ? 'solved' : ''}`}>
                      {basketShift === 0 ? '0' : `+${basketShift}`}
                    </span>
                  </div>
                  <div className="cq-tut-word-letters">
                    <div className={`cq-tut-word-cell ${isDecrypted ? 'solved' : ''}`}>
                      <span className="cq-tut-cell-cipher">Z</span>
                      <span className="cq-tut-cell-plain">{isDecrypted ? 'W' : '_'}</span>
                    </div>
                    <div className={`cq-tut-word-cell ${isDecrypted ? 'solved' : ''}`}>
                      <span className="cq-tut-cell-cipher">L</span>
                      <span className="cq-tut-cell-plain">{isDecrypted ? 'I' : '_'}</span>
                    </div>
                    <div className={`cq-tut-word-cell ${isDecrypted ? 'solved' : ''}`}>
                      <span className="cq-tut-cell-cipher">Q</span>
                      <span className="cq-tut-cell-plain">{isDecrypted ? 'N' : '_'}</span>
                    </div>
                    <div className={`cq-tut-word-cell ${isDecrypted ? 'solved' : ''}`}>
                      <span className="cq-tut-cell-cipher">G</span>
                      <span className="cq-tut-cell-plain">{isDecrypted ? 'D' : '_'}</span>
                    </div>
                  </div>
                  <div className="cq-tut-clue-banner">Clue: "Moving air that fills a ship's sails"</div>
                </div>

                {/* VICTORY BADGE (Step 4) */}
                {currentStep === 3 && (
                  <div className="cq-tut-victory-badge">
                    <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#10b981' }}>
                      check_circle
                    </span>
                    <h3 className="cq-tut-victory-title">STAGE SECURED!</h3>
                    <p className="cq-tut-victory-sub">All segments decrypted under Basket Shift +3: WIND</p>
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
