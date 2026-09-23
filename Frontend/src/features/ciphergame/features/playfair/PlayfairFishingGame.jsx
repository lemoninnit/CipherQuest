/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useRef, useState } from 'react';
import './PlayfairGame.css';
import '../../CipherGame.css';
import GameHudBar from '../../ui/GameHudBar';
import PauseMenu from '../../ui/PauseMenu';
import StageLoadingScreen from '../../ui/StageLoadingScreen';
import CryptographicRecap from '../../ui/CryptographicRecap';
import VictoryConfetti from '../../ui/VictoryConfetti';
import {
  describePlayfairRule,
  transformPlayfairPair,
} from './PlayfairHelpers';
import { facingTransform, makeSwimProps, randomVisualFrames, tickFish } from '../../core/engine/fishPhysics';
import { fishingSound } from '../../core/engine/fishingSound';



const normalizePair = (value) => String(value || '').replace(/[^A-Z]/g, '').slice(0, 2);

const makeBubbles = () => Array.from({ length: 16 }, (_, index) => ({
  id: index,
  x: Math.random() * 100,
  size: 3 + Math.random() * 7,
  delay: Math.random() * 6,
  duration: 5 + Math.random() * 5,
}));

function makeDecoyPairs(correctPair, matrix, count) {
  const letters = matrix.flat();
  const decoys = new Set();
  const [a, b] = correctPair;

  decoys.add(`${b}${a}`);
  decoys.add(`${a}${letters[(letters.indexOf(b) + 1) % letters.length]}`);
  decoys.add(`${letters[(letters.indexOf(a) + 4) % letters.length]}${b}`);

  while (decoys.size < count) {
    const first = letters[Math.floor(Math.random() * letters.length)];
    const second = letters[Math.floor(Math.random() * letters.length)];
    if (first !== second) decoys.add(`${first}${second}`);
  }

  decoys.delete(correctPair);
  return [...decoys].slice(0, count);
}

function makeFishForPair(pair, matrix, tier) {
  const decoyCount = tier === 'easy' ? 7 : tier === 'medium' ? 8 : 9;
  const choices = [pair, ...makeDecoyPairs(pair, matrix, decoyCount)]
    .sort(() => Math.random() - 0.5);

  const usedY = [];
  return choices.map((candidate, index) => {
    let y;
    let attempts = 0;
    do {
      y = 30 + Math.random() * 200;
      attempts++;
    } while (usedY.some(uy => Math.abs(uy - y) < 26) && attempts < 20);
    usedY.push(y);
    return {
      id: `${Date.now()}-${index}-${candidate}`,
      pair: candidate,
      x: 2 + Math.random() * 94,
      y,
      speed: 0.11 + Math.random() * 0.18,
      ...randomVisualFrames(),
      ...makeSwimProps(),
    };
  });
}

function positionKey(pos) {
  return `${pos.row}-${pos.col}`;
}

export default function PlayfairFishingGame({
  levelData,
  tier,
  onVerifySubmit,
  onBackToStages,
  onReplayNewQuestion,
}) {
  const matrix = levelData.matrix;
  const pairData = useMemo(() => levelData.cipherPairs.map((cipherPair, index) => {
    const transformed = transformPlayfairPair(cipherPair, matrix, 'decrypt');
    return {
      index,
      cipherPair,
      plainPair: transformed.result,
      rule: transformed.rule,
      cipherPositions: transformed.positions,
    };
  }), [levelData.cipherPairs, matrix]);

  const [phase, setPhase] = useState('ready');
  const [isOperationLoading, setIsOperationLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [solvedPairs, setSolvedPairs] = useState([]);
  const [misses, setMisses] = useState(0);
  const [streak, setStreak] = useState(0);
  const [fishList, setFishList] = useState([]);
  const [bubbles, setBubbles] = useState([]);
  const [isCasting, setIsCasting] = useState(false);
  const [caughtFish, setCaughtFish] = useState(null);
  const [castTarget, setCastTarget] = useState({ x: 0, y: 0 });
  const [castProgress, setCastProgress] = useState(0);
  const [splash, setSplash] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [levelSolved, setLevelSolved] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    return () => {
      fishingSound.stopBgm();
    };
  }, []);

  useEffect(() => {
    if (phase === 'playing' && !isMenuOpen) {
      fishingSound.playBgm();
    } else {
      fishingSound.pauseBgm();
    }
  }, [phase, isMenuOpen]);

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

  const animationRef = useRef(null);
  const feedbackTimer = useRef(null);
  const rodFrameRef = useRef(null);
  // Ref to the pond container — needed to convert DOM-px fish.y → SVG viewBox units
  const pondRef = useRef(null);
  const [pondHeight, setPondHeight] = useState(270);

  // Fishing rod sprite sheet: 8 frames in one horizontal row
  // 0-1 = idle, 2-4 = casting out, 5-7 = reeling in
  const ROD_TOTAL_FRAMES = 8;
  const [rodFrame, setRodFrame] = useState(0);
  const [rodFacingRight, setRodFacingRight] = useState(false);

  const activePair = pairData[activeIndex];
  const solvedCount = solvedPairs.filter(Boolean).length;
  const progress = pairData.length ? solvedCount / pairData.length : 0;
  const currentRuleHint = activePair ? describePlayfairRule(activePair.rule, 'decrypt') : '';
  const revealRule = tier === 'easy' || misses >= 2;

  const startGame = () => {
    fishingSound.unlockAudio();
    fishingSound.playBgm();
    setPhase('playing');
    setActiveIndex(0);
    setSolvedPairs(Array(pairData.length).fill(null));
    setMisses(0);
    setStreak(0);
    setLevelSolved(false);
    setShowExplanation(false);
    setBubbles(makeBubbles());
    setFishList(makeFishForPair(pairData[0].plainPair, matrix, tier));
  };

  useEffect(() => {
    setPhase('ready');
    setActiveIndex(0);
    setSolvedPairs(Array(pairData.length).fill(null));
    setMisses(0);
    setStreak(0);
    setLevelSolved(false);
    setShowExplanation(false);
    setIsMenuOpen(false);
  }, [levelData, pairData.length]);

  /* ── ESC key to toggle pause menu ── */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.code === 'Escape') {
        if (phase === 'playing') {
          e.preventDefault();
          setIsMenuOpen((prev) => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase]);

  const showFeedback = (message, tone = 'info') => {
    clearTimeout(feedbackTimer.current);
    setFeedback({ message, tone });
    feedbackTimer.current = setTimeout(() => setFeedback(null), 2600);
  };

  useEffect(() => {
    if (phase !== 'playing' || isMenuOpen || levelSolved) return undefined;

    const tick = () => {
      setFishList((prev) => prev.map((fish) => tickFish(fish, { minY: 28, maxY: 196 })));
      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationRef.current);
  }, [phase, isMenuOpen, levelSolved]);

  const handleCatch = (fish) => {
    const candidate = normalizePair(fish.pair);
    if (candidate === activePair.plainPair) {
      fishingSound.playSfx('catch');
      const nextSolved = [...solvedPairs];
      nextSolved[activeIndex] = activePair.plainPair;
      setSolvedPairs(nextSolved);
      setMisses(0);
      setStreak((value) => value + 1);
      showFeedback(`${candidate} is correct. ${currentRuleHint}`, 'success');

      if (activeIndex >= pairData.length - 1) {
        fishingSound.stopBgm();
        fishingSound.playSfx('win');
        setLevelSolved(true);
      } else {
        const nextIndex = activeIndex + 1;
        setTimeout(() => {
          setActiveIndex(nextIndex);
          setFishList(makeFishForPair(pairData[nextIndex].plainPair, matrix, tier));
        }, 500);
      }
      return;
    }

    fishingSound.playSfx('lose');
    const nextMisses = misses + 1;
    setMisses(nextMisses);
    setStreak(0);
    showFeedback(`${candidate} does not fit. ${currentRuleHint}`, 'error');
    setTimeout(() => {
      setFishList((prev) => [
        ...prev,
        {
          ...fish,
          id: `${Date.now()}-${fish.pair}`,
          x: Math.random() > 0.5 ? 94 : 2,
          y: 30 + Math.random() * 200,
        },
      ]);
    }, 500);
  };

  const castAt = (fish) => {
    if (isCasting || phase !== 'playing' || levelSolved) return;
    fishingSound.unlockAudio();
    fishingSound.playSfx('cast');
    setIsCasting(true);
    setCaughtFish(fish);
    // Remove immediately so the fish doesn't appear in both fishList and the hooked position
    setFishList((prev) => prev.filter((item) => item.id !== fish.id));
    // x: fish.x is a % → map to SVG viewBox width (700). Do NOT use DOM pond width.
    const tx = (fish.x / 100) * 700;
    // y: fish.y is DOM px → convert to SVG viewBox height (240)
    const currentPondHeight = pondRef.current?.offsetHeight || 270;
    setPondHeight(currentPondHeight);
    const ty = (fish.y / currentPondHeight) * 240;
    setCastTarget({ x: tx, y: ty });
    // Flip sprite toward the fish (centre of 700-wide viewBox is 350)
    setRodFacingRight(tx > 350);

    // Animate rod frames during cast-out (frames 2-4)
    let castFrameIndex = 2;
    const castFrameInterval = setInterval(() => {
      setRodFrame((prev) => {
        if (prev < 4) return prev + 1;
        return 4;
      });
      castFrameIndex++;
      if (castFrameIndex > 4) clearInterval(castFrameInterval);
    }, 90);
    rodFrameRef.current = castFrameInterval;

    let start = null;
    const castOut = (timestamp) => {
      if (!start) start = timestamp;
      const progressValue = Math.min((timestamp - start) / 320, 1);
      setCastProgress(progressValue);
      if (progressValue < 1) {
        requestAnimationFrame(castOut);
        return;
      }

      setSplash({ x: fish.x, y: fish.y });
      setTimeout(() => setSplash(null), 450);
      // Fish already removed from list at cast start

      // Hold at cast frame 4 briefly, then animate reel-in frames (5-7)
      setTimeout(() => {
        let reelFrameIndex = 5;
        const reelFrameInterval = setInterval(() => {
          setRodFrame(reelFrameIndex);
          reelFrameIndex++;
          if (reelFrameIndex > 7) clearInterval(reelFrameInterval);
        }, 90);

        let reelStart = null;
        const reelIn = (reelTimestamp) => {
          if (!reelStart) reelStart = reelTimestamp;
          const reelProgress = Math.min((reelTimestamp - reelStart) / 380, 1);
          setCastProgress(1 - reelProgress);
          if (reelProgress < 1) {
            requestAnimationFrame(reelIn);
            return;
          }
          // Return to idle frame
          setRodFrame(0);
          setIsCasting(false);
          setCaughtFish(null);
          handleCatch(fish);
        };
        requestAnimationFrame(reelIn);
      }, 60);
    };

    requestAnimationFrame(castOut);
  };

  const cipherHighlight = new Set(activePair?.cipherPositions.map(positionKey) || []);
  const pondWidth = 700; // SVG viewBox width
  // rodTipX/Y: fixed anchor on the sprite where the fishing line starts.
  // Flips to the opposite side when the sprite is mirrored (facing right).
  const rodTipX = rodFacingRight ? 555 : 145;
  const rodTipY = 80;
  const hookX = caughtFish ? rodTipX + (castTarget.x - rodTipX) * castProgress : rodTipX;
  const hookY = caughtFish ? rodTipY + (castTarget.y - rodTipY) * castProgress : rodTipY;

  if (phase === 'ready') {
    if (isOperationLoading) {
      return (
        <StageLoadingScreen
          category="playfair"
          difficulty={tier}
          stageIndex={(levelData.level || 1) - 1}
          onLoadingComplete={() => {
            setIsOperationLoading(false);
            startGame();
          }}
        />
      );
    }

    return (
      <div className="pf-root">
        <GameHudBar
          title="Playfair Fishing"
          stage={levelData.level}
          tier={tier}
          isReady={true}
          onBackToStages={onBackToStages}
          customRightContent={soundToggleButton}
        />

        <main className="cq-brief-screen">
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
              <div className="cq-dossier-stage-code">
                {`OP-${String(levelData.level || 1).padStart(2, '0')}`}
              </div>
            </div>

            {/* Right Column: Briefing Content */}
            <div className="cq-dossier-right-col">
              <div className="cq-dossier-tag">MISSION BRIEF</div>
              <h2 className="cq-dossier-title">Playfair Fishing</h2>
              <p className="cq-dossier-subtitle">
                Playfair encrypts letter pairs through a 5×5 matrix. Use row, column, and rectangle rules to recover candidate plaintext pairs.
              </p>
              <hr className="cq-dossier-divider" />
              <div className="cq-dossier-data">
                <div className="cq-dossier-row">
                  <span className="cq-dossier-label">CIPHERTEXT</span>
                  <span className="cq-dossier-value cyan-mono">{levelData.pairCiphertext}</span>
                </div>
                <div className="cq-dossier-row">
                  <span className="cq-dossier-label">KEYWORD</span>
                  <span className="cq-dossier-value yellow-mono">{levelData.key}</span>
                </div>
                <div className="cq-dossier-row">
                  <span className="cq-dossier-label">HINT</span>
                  <span className="cq-dossier-value hint-text">{levelData.hint}</span>
                </div>
                {levelData.keyClue && (
                  <div className="cq-dossier-row">
                    <span className="cq-dossier-label">KEY CLUE</span>
                    <span className="cq-dossier-value yellow-mono">{levelData.keyClue}</span>
                  </div>
                )}
              </div>

              <div className="pf-matrix-preview" aria-label="Playfair key matrix" style={{ margin: '8px auto 16px' }}>
                {matrix.flat().map((letter) => (
                  <span key={letter}>{letter}</span>
                ))}
              </div>

              <p className="cq-dossier-how-it-works">
                <strong>Fishing rule:</strong> each fish carries a two-letter plaintext candidate. Correct catches fill the message. Wrong catches explain the matrix rule you missed.
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
        </main>
      </div>
    );
  }



  return (
    <div className="pf-root">
      {showExplanation && (
        <CryptographicRecap
          cipherType="playfair"
          levelData={levelData}
          onUnlockNext={onVerifySubmit}
        />
      )}

      <GameHudBar
        title="Playfair Fishing"
        stage={levelData.level}
        tier={tier}
        isReady={false}
        onOpenMenu={() => setIsMenuOpen(true)}
        customRightContent={soundToggleButton}
      />

      <main className="pf-game">
        <aside className="pf-sidebar">
          <section className="vg-sidebar-card">
            <div className="vg-sidebar-title">Key Matrix</div>
            <div className="pf-matrix">
              {matrix.map((row, rowIndex) => row.map((letter, colIndex) => {
                const key = `${rowIndex}-${colIndex}`;
                const classes = cipherHighlight.has(key) ? 'cipher-cell' : '';
                return (
                  <span key={letter} className={classes}>{letter}</span>
                );
              }))}
            </div>
            <div className="pf-matrix-legend">
              <span><i className="cipher-dot" /> cipher pair</span>
            </div>
          </section>

          <section className="vg-sidebar-card">
            <div className="vg-sidebar-title">Active Digraph</div>
            <div className="pf-active-pair">
              <span>{activePair.cipherPair}</span>
              <small>catch plaintext pair #{activeIndex + 1}</small>
            </div>
            <div className="vg-progress-bar">
              <div className="vg-progress-fill" style={{ width: `${progress * 100}%` }} />
            </div>
            <div className="pf-stat-row">
              <span>Solved</span>
              <strong>{solvedCount} / {pairData.length}</strong>
            </div>
            <div className="pf-stat-row">
              <span>Streak</span>
              <strong>{streak}</strong>
            </div>
          </section>

          <section className="vg-sidebar-card">
            <div className="vg-sidebar-title">Rule Scanner</div>
            <div className={`pf-rule-pill ${revealRule ? 'revealed' : ''}`}>
              {revealRule ? activePair.rule : 'hidden'}
            </div>
            <p className="pf-sidebar-note">
              {revealRule
                ? currentRuleHint
                : 'Inspect the highlighted square positions. Two misses reveal the rule, but the answer still has to be caught.'}
            </p>
          </section>

          <section className="vg-formula-box">
            <strong>Playfair Decrypt</strong><br />
            Row: move left. Column: move up.<br />
            Rectangle: swap columns.<br />
            I and J share one cell.
          </section>
        </aside>

        <section className="pf-board">
          <div className="pf-word-panel">
            <div className="vg-word-panel-title">Recovered Message</div>
            <div className="pf-pair-row">
              {pairData.map((pair, index) => (
                <button
                  key={`${pair.cipherPair}-${index}`}
                  className={`pf-pair-card ${index === activeIndex ? 'active' : ''} ${solvedPairs[index] ? 'solved' : ''}`}
                  type="button"
                  onClick={() => {
                    if (!solvedPairs[index] && !isCasting) {
                      setActiveIndex(index);
                      setMisses(0);
                      setFishList(makeFishForPair(pairData[index].plainPair, matrix, tier));
                    }
                  }}
                >
                  <span className="pf-cipher">{pair.cipherPair}</span>
                  <span className="pf-arrow">to</span>
                  <strong>{pair.plainPair}</strong>
                </button>
              ))}
            </div>
            <div className="vg-hint-banner">
              <strong>Message hint:</strong> {levelData.hint}
            </div>
          </div>

          <section className="pf-pond" ref={pondRef}>
              {/* Ocean background video */}
              <video
                className="fg-pond-video"
                src="/assets/fish/ocean_bg.mp4"
                autoPlay
                loop
                muted
                playsInline
              />
              <div className="fg-pond-overlay" />
            <div className="vg-pond-surface" />
            {bubbles.map((bubble) => (
              <div
                key={bubble.id}
                className="vg-bubble"
                style={{
                  left: `${bubble.x}%`,
                  width: bubble.size,
                  height: bubble.size,
                  animationDelay: `${bubble.delay}s`,
                  animationDuration: `${bubble.duration}s`,
                }}
              />
            ))}
            {fishList.map((fish) => (
              <button
                key={fish.id}
                className="pf-fish"
                type="button"
                style={{ left: `${fish.x}%`, top: fish.y }}
                onClick={() => castAt(fish)}
              >
                <div className="fg-fish-facing" style={{ transform: facingTransform(fish.facing) }}>
                  <img
                    className="fg-fish-sprite-img pf-fish-img"
                    src={fish.imgSrc}
                    alt="fish"
                    draggable={false}
                  />
                </div>
                <span className="pf-fish-badge">{fish.pair}</span>
              </button>
            ))}
            {caughtFish && (
              <div className="pf-reel-fish" style={{
                left: `${(hookX / 700) * 100}%`,
                // Convert SVG y back to DOM px so the fish tracks the line endpoint
                top: `${(hookY / 240) * pondHeight - 10}px`,
              }}>
                <div className="fg-fish-facing" style={{ transform: facingTransform(caughtFish.facing) }}>
                  <img
                    className="fg-fish-sprite-img pf-fish-img"
                    src={caughtFish.imgSrc}
                    alt="fish"
                    draggable={false}
                  />
                </div>
                <span className="pf-fish-badge">{caughtFish.pair}</span>
              </div>
            )}
            {splash && <div className="pf-splash" style={{ left: `${splash.x}%`, top: splash.y }} />}
            {/* Fishing rod sprite — flips toward the clicked fish */}
            <div
              className={`pf-fishing-rod${rodFacingRight ? ' facing-right' : ''}`}
              style={{
                '--rod-frame': rodFrame,
                '--rod-total': ROD_TOTAL_FRAMES,
              }}
              aria-hidden="true"
            />
            <svg className="vg-pond-svg" viewBox={`0 0 ${pondWidth} 240`} preserveAspectRatio="none">
              {caughtFish && <line x1={rodTipX} y1={rodTipY} x2={hookX} y2={hookY} className="vg-fish-line" />}
            </svg>
          </section>
        </section>
      </main>

      {feedback && (
        <div className={`pf-feedback ${feedback.tone}`}>
          {feedback.message}
        </div>
      )}

      {/* Floating Victory Panel */}
      {levelSolved && <VictoryConfetti isPaused={isMenuOpen} />}
      {levelSolved && (
        <div className="caesar-floating-victory-panel sprint-floating-victory-panel" style={{ zIndex: 100 }}>
          <div className="fg-success-panel">
            <h3 className="caesar-victory-title">STAGE SECURED!</h3>
            <p className="caesar-victory-desc">All pairs decrypted successfully.</p>
            <button
              className="fg-btn fg-btn-primary"
              onClick={() => {
                fishingSound.stopBgm();
                setShowExplanation(true);
              }}
            >
              Verify & Submit
            </button>
            {onReplayNewQuestion && (
              <button
                className="fg-btn fg-btn-secondary"
                onClick={() => {
                  setLevelSolved(false);
                  onReplayNewQuestion();
                }}
              >
                Play Again
              </button>
            )}
          </div>
        </div>
      )}

      {/* Menu Modal */}
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
