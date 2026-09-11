import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import '../sprint/CipherSprint.css';
import '../../CipherGame.css';
import GameHudBar from '../../ui/GameHudBar';
import { useFullscreen } from '../../core/hooks/useFullscreen';
import FullscreenButton from '../../ui/FullscreenButton';
import {
  transformPlayfairPair,
} from './PlayfairHelpers';

const BASE_SPEED = 0.22;
const BOOST_MULT = 1.5;
const COLLISION_ZONE_START = 7;
const COLLISION_ZONE_END = 28;
const GATE_TRIGGER_X = 18;
const GATE_RESET_X = 135;
const COIN_START_X = 75;

const PAD5 = (n) => String(n).padStart(5, '0');

const makeDecoyPairs = (correctPair, count, matrix) => {
  const letters = matrix.flat();
  const decoys = new Set();

  while (decoys.size < count) {
    const first = letters[Math.floor(Math.random() * letters.length)];
    const second = letters[Math.floor(Math.random() * letters.length)];
    if (first !== second) decoys.add(`${first}${second}`);
  }
  decoys.delete(correctPair);
  return [...decoys].slice(0, count);
};

export default function PlayfairSprint({
  levelData,
  tier,
  onVerifySubmit,
  onBackToStages,
  onReplayNewQuestion,
}) {
  const matrix = levelData.matrix;

  const {
    containerRef: fsContainerRef,
    isFullscreen,
    toggleFullscreen,
  } = useFullscreen();

  const pairData = useMemo(
    () =>
      levelData.cipherPairs.map((cipherPair, index) => {
        const transformed = transformPlayfairPair(cipherPair, matrix, 'decrypt');
        return {
          index,
          cipherPair,
          plainPair: transformed.result,
          rule: transformed.rule,
        };
      }),
    [levelData.cipherPairs, matrix]
  );

  const { hintIndices, maskedIndices } = useMemoLevelMeta(pairData, tier);

  const [sprintStep, setSprintStep] = useState('ready');
  const [currentMaskIndex, setCurrentMaskIndex] = useState(0);
  const [runnerLane, setRunnerLane] = useState(1);
  const [coins, setCoins] = useState([]);
  const [gateX, setGateX] = useState(GATE_RESET_X);
  const [collectedKey, setCollectedKey] = useState(null);
  const [isCrashing, setIsCrashing] = useState(false);
  const [crashMessage, setCrashMessage] = useState('');
  const [lives, setLives] = useState(5);
  const [laneChangeEffect, setLaneChangeEffect] = useState(null);
  const [speedLines, setSpeedLines] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [firstTryForCurrent, setFirstTryForCurrent] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [explanationStep, setExplanationStep] = useState(-1);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackColor, setFeedbackColor] = useState('#facc15');
  const [feedbackY, setFeedbackY] = useState(50);
  const [trackShake, setTrackShake] = useState(false);
  const [isBoosting, setIsBoosting] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [slimeFrame, setSlimeFrame] = useState(0);
  const [plantFrame, setPlantFrame] = useState(0);

  const rafRef = useRef(0);
  const collisionHandledRef = useRef(false);
  const prevLaneRef = useRef(1);
  const isBoostingRef = useRef(false);
  const runnerLaneRef = useRef(1);
  const isPausedRef = useRef(false);
  const isCrashingRef = useRef(false);
  const isMenuOpenRef = useRef(false);
  const sprintStepRef = useRef('ready');
  const collectedKeyRef = useRef(null);
  const currentMaskIndexRef = useRef(0);
  const feedbackTimeoutRef = useRef(0);
  const spinTimeoutRef = useRef(0);
  const boostTimeoutRef = useRef(0);
  const shakeTimeoutRef = useRef(0);
  const laneTiltTimeoutRef = useRef(0);
  const explanationIntervalRef = useRef(0);
  const slimeIntervalRef = useRef(0);
  const plantIntervalRef = useRef(0);

  useEffect(() => { isBoostingRef.current = isBoosting; }, [isBoosting]);
  useEffect(() => { runnerLaneRef.current = runnerLane; }, [runnerLane]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { isCrashingRef.current = isCrashing; }, [isCrashing]);
  useEffect(() => { isMenuOpenRef.current = isMenuOpen; }, [isMenuOpen]);
  useEffect(() => { sprintStepRef.current = sprintStep; }, [sprintStep]);
  useEffect(() => { collectedKeyRef.current = collectedKey; }, [collectedKey]);
  useEffect(() => { currentMaskIndexRef.current = currentMaskIndex; }, [currentMaskIndex]);

  const currentIdx = maskedIndices[currentMaskIndex] ?? 0;
  const currentBatonPair = pairData[currentIdx]?.cipherPair ?? '';
  const currentTargetPair = pairData[currentIdx]?.plainPair ?? '';

  const orangeSlimeSrc = `/assets/sprint/obstacle/obstacle1/SlimeOrange_${PAD5(slimeFrame)}.png`;
  const basicSlimeSrc = `/assets/sprint/obstacle/obstacle2/SlimeBasic_${PAD5(slimeFrame)}.png`;
  const blueFlowerSrc = `/assets/sprint/plants/Plants/BlueFlower1/BlueFlower_${PAD5(plantFrame)}.png`;

  useEffect(() => {
    if (isPausedRef.current || sprintStepRef.current !== 'running') return;
    slimeIntervalRef.current = window.setInterval(() => {
      setSlimeFrame((f) => (f + 1) % 30);
    }, 45);
    return () => window.clearInterval(slimeIntervalRef.current);
  }, [isPaused, sprintStep]);

  useEffect(() => {
    if (isPausedRef.current || sprintStepRef.current !== 'running') return;
    plantIntervalRef.current = window.setInterval(() => {
      setPlantFrame((f) => (f + 1) % 60);
    }, 55);
    return () => window.clearInterval(plantIntervalRef.current);
  }, [isPaused, sprintStep]);

  useEffect(() => {
    const list = [];
    for (let i = 0; i < 22; i++) {
      list.push({
        id: i,
        x: Math.random() * 110 - 5,
        y: Math.random() * 100,
        speed: 0.8 + Math.random() * 1.6,
        width: 15 + Math.random() * 25,
      });
    }
    setSpeedLines(list);
  }, []);

  const spawnCoinsAndGate = useCallback(
    (maskIdxOverride) => {
      const idx = typeof maskIdxOverride === 'number' ? maskIdxOverride : currentMaskIndexRef.current;
      const tempIdx = maskedIndices[idx] ?? 0;
      const tempTargetPair = pairData[tempIdx]?.plainPair ?? '';
      const [decoy1, decoy2] = makeDecoyPairs(tempTargetPair, 2, matrix);
      const correctLane = idx % 3;
      const decoyLanes = [0, 1, 2].filter((l) => l !== correctLane);

      collisionHandledRef.current = false;
      const positions = [COIN_START_X, COIN_START_X + 6, COIN_START_X + 12];
      const shuffledPos = [...positions].sort(() => Math.random() - 0.5);
      setCoins([
        { id: 1, lane: correctLane, char: tempTargetPair, x: shuffledPos[0], eaten: false },
        { id: 2, lane: decoyLanes[0], char: decoy1,        x: shuffledPos[1], eaten: false },
        { id: 3, lane: decoyLanes[1], char: decoy2,        x: shuffledPos[2], eaten: false },
      ]);
      setGateX(GATE_RESET_X);
      setCollectedKey(null);
      collectedKeyRef.current = null;
      setIsCrashing(false);
    },
    [pairData, maskedIndices, matrix]
  );

  const handleStartSprint = () => {
    clearAllFXTimeouts();
    setCurrentMaskIndex(0);
    currentMaskIndexRef.current = 0;
    setAttempts([]);
    setLives(5);
    setFirstTryForCurrent(true);
    setIsPaused(false);
    setIsMenuOpen(false);
    setSprintStep('running');
    spawnCoinsAndGate(0);
  };

  const handleRetryFromCheckpoint = () => {
    clearAllFXTimeouts();
    setLives(5);
    setFirstTryForCurrent(true);
    setIsCrashing(false);
    setIsPaused(false);
    setIsMenuOpen(false);
    setSprintStep('running');
    spawnCoinsAndGate(currentMaskIndexRef.current);
  };

  const handleContinueAfterCrash = () => {
    clearAllFXTimeouts();
    setIsCrashing(false);
    setSprintStep('running');
    spawnCoinsAndGate(currentMaskIndexRef.current);
  };

  function clearAllFXTimeouts() {
    if (feedbackTimeoutRef.current) window.clearTimeout(feedbackTimeoutRef.current);
    if (spinTimeoutRef.current)     window.clearTimeout(spinTimeoutRef.current);
    if (boostTimeoutRef.current)    window.clearTimeout(boostTimeoutRef.current);
    if (shakeTimeoutRef.current)    window.clearTimeout(shakeTimeoutRef.current);
    if (laneTiltTimeoutRef.current) window.clearTimeout(laneTiltTimeoutRef.current);
    feedbackTimeoutRef.current = spinTimeoutRef.current = boostTimeoutRef.current = 0;
    shakeTimeoutRef.current = laneTiltTimeoutRef.current = 0;
  }

  const showFeedback = useCallback((text, color, y, ms = 900) => {
    if (feedbackTimeoutRef.current) window.clearTimeout(feedbackTimeoutRef.current);
    setFeedbackText(text);
    setFeedbackColor(color);
    setFeedbackY(y);
    feedbackTimeoutRef.current = window.setTimeout(() => setFeedbackText(''), ms);
  }, []);

  const triggerSpin = useCallback(() => {
    if (spinTimeoutRef.current) window.clearTimeout(spinTimeoutRef.current);
    setIsSpinning(true);
    spinTimeoutRef.current = window.setTimeout(() => setIsSpinning(false), 500);
  }, []);

  const triggerShake = useCallback(() => {
    if (shakeTimeoutRef.current) window.clearTimeout(shakeTimeoutRef.current);
    setTrackShake(true);
    shakeTimeoutRef.current = window.setTimeout(() => setTrackShake(false), 500);
  }, []);

  const triggerBoost = useCallback((ms = 1200) => {
    if (boostTimeoutRef.current) window.clearTimeout(boostTimeoutRef.current);
    setIsBoosting(true);
    isBoostingRef.current = true;
    boostTimeoutRef.current = window.setTimeout(() => {
      setIsBoosting(false);
      isBoostingRef.current = false;
    }, ms);
  }, []);

  useEffect(() => {
    const handleFsKey = (e) => {
      if ((e.key === 'f' || e.key === 'F') &&
          !e.ctrlKey && !e.metaKey && !e.altKey &&
          !(e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA'))) {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleFsKey);
    return () => window.removeEventListener('keydown', handleFsKey);
  }, [toggleFullscreen]);

  useEffect(() => {
    if (sprintStep !== 'running' || isCrashing || isMenuOpen) return undefined;

    const handleKeyDown = (e) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsPaused((p) => !p);
        return;
      }
      if (isPausedRef.current) return;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        setRunnerLane((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        setRunnerLane((prev) => Math.min(2, prev + 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sprintStep, isCrashing, isMenuOpen]);

  useEffect(() => {
    if (runnerLane === prevLaneRef.current) return undefined;
    const dir = runnerLane < prevLaneRef.current ? 'moving-up' : 'moving-down';
    setLaneChangeEffect(dir);
    prevLaneRef.current = runnerLane;
    if (laneTiltTimeoutRef.current) window.clearTimeout(laneTiltTimeoutRef.current);
    laneTiltTimeoutRef.current = window.setTimeout(() => setLaneChangeEffect(null), 180);
    return () => { /* timer handled above */ };
  }, [runnerLane]);

  const handleGateCollision = useCallback(() => {
    const pairUsed = collectedKeyRef.current;
    const isCorrect = pairUsed === currentTargetPair;

    setAttempts((prev) => [
      ...prev,
      {
        index: currentIdx,
        cipherPair: currentBatonPair,
        keyCollected: pairUsed || 'None',
        correct: isCorrect,
        firstTry: firstTryForCurrent,
      },
    ]);

    if (isCorrect) {
      triggerBoost(1200);
      showFeedback('⚡ Checkpoint Cleared! BOOST!', '#22c55e', 10, 1100);

      if (boostTimeoutRef.current) window.clearTimeout(boostTimeoutRef.current);
      boostTimeoutRef.current = window.setTimeout(() => {
        setIsBoosting(false);
        isBoostingRef.current = false;
        const nextIndex = currentMaskIndexRef.current + 1;
        if (nextIndex < maskedIndices.length) {
          setCurrentMaskIndex(nextIndex);
          currentMaskIndexRef.current = nextIndex;
          setFirstTryForCurrent(true);
          spawnCoinsAndGate(nextIndex);
        } else {
          setSprintStep('finished');
        }
      }, 1200);
    } else {
      triggerShake();
      setIsCrashing(true);
      setFirstTryForCurrent(false);

      const nextLives = lives - 1;
      setLives(nextLives);

      if (nextLives <= 0) {
        setSprintStep('gameover');
      } else {
        const reason = pairUsed
          ? `Wrong Pair! You collected decoy pair '${pairUsed}'. Try again to decrypt cipher pair '${currentBatonPair}'!`
          : `Gate Shut! You didn't collect any pair coin to unlock the checkpoint gate. Try again to decrypt cipher pair '${currentBatonPair}'!`;
        setCrashMessage(reason);
        setSprintStep('explanation');
      }
    }
  }, [
    currentTargetPair,
    currentIdx,
    currentBatonPair,
    firstTryForCurrent,
    lives,
    maskedIndices.length,
    showFeedback,
    triggerBoost,
    triggerShake,
    spawnCoinsAndGate,
  ]);

  useEffect(() => {
    if (sprintStep !== 'running') return undefined;
    if (isCrashing || isPaused || isMenuOpen) return undefined;

    const updatePhysics = () => {
      if (isPausedRef.current || isCrashingRef.current || isMenuOpenRef.current || sprintStepRef.current !== 'running') {
        return;
      }

      const speed = isBoostingRef.current ? BASE_SPEED * BOOST_MULT : BASE_SPEED;
      const lane = runnerLaneRef.current;

      setSpeedLines((prevLines) =>
        prevLines.map((line) => {
          const lineSpeed = isBoostingRef.current ? line.speed * 4 : line.speed;
          let nextX = line.x - lineSpeed * 0.4;
          if (nextX < -15) nextX = 115;
          return { ...line, x: nextX };
        })
      );

      setCoins((prevCoins) => {
        let changed = false;
        const updated = prevCoins.map((coin) => {
          if (coin.eaten) return coin;
          const nextX = coin.x - speed;

          if (
            !coin.eaten &&
            nextX <= COLLISION_ZONE_END &&
            nextX >= COLLISION_ZONE_START &&
            coin.lane === lane &&
            !collectedKeyRef.current
          ) {
            changed = true;
            collectedKeyRef.current = coin.char;
            setCollectedKey(coin.char);
            const isCorrect = coin.char === currentTargetPair;
            if (isCorrect) {
              triggerSpin();
              showFeedback(
                `✨ Correct Pair ${coin.char} Collected!`,
                '#22c55e',
                20 + coin.lane * 30 - 8,
                1000
              );
            } else {
              triggerShake();
              showFeedback(
                `💥 Slime Hit! Decoy ${coin.char} collected!`,
                '#ef4444',
                20 + coin.lane * 30 - 8,
                1100
              );
            }
            return { ...coin, eaten: true, x: nextX };
          }
          if (nextX !== coin.x) changed = true;
          return { ...coin, x: nextX };
        });
        return changed ? updated : prevCoins;
      });

      setGateX((prevGateX) => {
        const nextGateX = prevGateX - speed;
        if (nextGateX <= GATE_TRIGGER_X) {
          if (!collisionHandledRef.current) {
            collisionHandledRef.current = true;
            window.cancelAnimationFrame(rafRef.current);
            window.setTimeout(() => handleGateCollision(), 0);
          }
          return GATE_TRIGGER_X;
        }
        return nextGateX;
      });

      rafRef.current = requestAnimationFrame(updatePhysics);
    };

    rafRef.current = requestAnimationFrame(updatePhysics);
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sprintStep, isCrashing, isPaused, isMenuOpen, currentTargetPair, handleGateCollision, triggerSpin, showFeedback]);

  useEffect(() => {
    clearAllFXTimeouts();
    if (explanationIntervalRef.current) window.clearInterval(explanationIntervalRef.current);
    setSprintStep('ready');
    setCurrentMaskIndex(0);
    currentMaskIndexRef.current = 0;
    setAttempts([]);
    setLives(5);
    setFirstTryForCurrent(true);
    setCoins([]);
    setShowExplanation(false);
    setExplanationStep(-1);
    setIsPaused(false);
    setRunnerLane(1);
    prevLaneRef.current = 1;
    runnerLaneRef.current = 1;
    collisionHandledRef.current = false;
    setGateX(GATE_RESET_X);
    setCollectedKey(null);
    collectedKeyRef.current = null;
    setFeedbackText('');
  }, [levelData]);

  useEffect(() => {
    return () => {
      clearAllFXTimeouts();
      if (explanationIntervalRef.current) window.clearInterval(explanationIntervalRef.current);
      if (slimeIntervalRef.current)         window.clearInterval(slimeIntervalRef.current);
      if (plantIntervalRef.current)         window.clearInterval(plantIntervalRef.current);
      if (rafRef.current)                   window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleVerifySubmit = () => {
    setShowExplanation(true);
    setExplanationStep(-1);
    const total = pairData.length;
    let step = -1;
    if (explanationIntervalRef.current) window.clearInterval(explanationIntervalRef.current);
    explanationIntervalRef.current = window.setInterval(() => {
      step++;
      setExplanationStep(step);
      if (step >= total - 1) window.clearInterval(explanationIntervalRef.current);
    }, 600);
  };

  const handleCloseExplanation = () => {
    setShowExplanation(false);
    onVerifySubmit();
  };

  let runnerAnim = 'idle';
  if (sprintStep === 'gameover' || isCrashing) runnerAnim = 'death';
  else if (isPaused) runnerAnim = 'idle';
  else if (laneChangeEffect !== null || isBoosting) runnerAnim = 'jump';
  else if (sprintStep === 'running') runnerAnim = 'run';

  return (
    <div
      ref={fsContainerRef}
      className={`sprint-container fg-root ${isFullscreen ? 'is-fullscreen' : ''}`}
    >
      {showExplanation && (
        <div
          className="fg-recap-overlay"
          style={{ overflowY: 'auto', padding: '30px 10px', zIndex: 9999 }}
        >
          <div
            className="fg-recap-card"
            style={{ maxWidth: '1100px', width: '95%', padding: '24px 32px' }}
          >
            <h2 className="fg-recap-title">🔬 Playfair Cipher Recap</h2>
            <p className="fg-recap-subtitle">Why Did This Work?</p>
            <div
              className="fg-recap-animation-box"
              style={{ minHeight: 'auto', padding: '16px', marginBottom: '16px' }}
            >
              <div className="fg-recap-letter-row">
                {pairData.map((pair, idx) => {
                  return (
                    <div
                      key={idx}
                      className={`fg-recap-node ${explanationStep >= idx ? 'active' : 'waiting'}`}
                    >
                      <span className="fg-recap-char-cipher">{pair.cipherPair}</span>
                      <span className="fg-recap-arrow">↓</span>
                      <span className="fg-recap-char-plain">{pair.plainPair}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div
              className="fg-recap-explanation"
              style={{ background: 'rgba(255,255,255,0.015)' }}
            >
              💡 <strong>Playfair Cipher Recap:</strong> The Playfair cipher uses a 5x5 key
              matrix to encrypt/decrypt letter pairs based on three geometric rules — same row
              (shift left), same column (shift up), or rectangle (swap corners).
              <div
                style={{
                  marginTop: 16,
                  background: 'rgba(0,229,255,0.05)',
                  border: '1px solid rgba(0,229,255,0.2)',
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    color: 'var(--neon-cyan)',
                    marginBottom: 8,
                    fontSize: '0.82rem',
                  }}
                >
                  🔑 Playfair 5x5 Key Matrix
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <table
                    style={{
                      borderCollapse: 'collapse',
                      textAlign: 'center',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '0.9rem',
                    }}
                  >
                    <tbody>
                      {levelData.matrix.map((row, rIdx) => (
                        <tr key={rIdx}>
                          {row.map((cell, cIdx) => (
                            <td
                              key={`${rIdx}-${cIdx}`}
                              style={{
                                width: '40px',
                                height: '40px',
                                border: '1px solid rgba(0, 229, 255, 0.3)',
                                background: 'rgba(0, 0, 0, 0.3)',
                                color: '#fff',
                                fontWeight: 'bold',
                              }}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="fg-recap-actions" style={{ marginTop: 16 }}>
              <button
                className="fg-btn fg-btn-primary"
                onClick={handleCloseExplanation}
                disabled={explanationStep < pairData.length - 1}
                style={{ background: 'var(--neon-green)', color: '#030914' }}
              >
                Unlock Next Objective ➔
              </button>
            </div>
          </div>
        </div>
      )}

      <GameHudBar
        title="Playfair Sprint Relay"
        stage={levelData.level}
        tier={tier}
        isReady={sprintStep === 'ready'}
        onBackToStages={onBackToStages}
        onOpenMenu={() => setIsMenuOpen(true)}
        extraRight={<FullscreenButton isFullscreen={isFullscreen} onToggle={toggleFullscreen} />}
      />

      {sprintStep === 'ready' ? (
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
                <div className="cq-dossier-sprite cq-dossier-sprite-sprint" aria-hidden="true" />
              </div>
              <div className="cq-dossier-stage-code">
                {`OP-${String(levelData.level || 1).padStart(2, '0')}`}
              </div>
            </div>

            {/* Right Column: Briefing Content */}
            <div className="cq-dossier-right-col">
              <div className="cq-dossier-tag">MISSION BRIEF</div>
              <h2 className="cq-dossier-title">Playfair Relay Run</h2>
              <p className="cq-dossier-subtitle">
                Sprint through Playfair hurdles! Decode each digraph pair using the 5×5 matrix before the timer expires.
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
              </div>
              <p className="cq-dossier-how-it-works">
                <strong>How it works:</strong>{' '}
                Switch lanes to pick the correct digraph pair for each hurdle! Press <strong>F</strong> to toggle fullscreen.
              </p>
              <button className="cq-dossier-action-btn" onClick={handleStartSprint}>
                Begin operation
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="sprint-widescreen">
          <aside className="sprint-sidebar">
            <div className="sidebar-stats-card">
              <div className="stats-header">OPERATIVE HUD</div>
              <div className="stats-content">
                <div className="stat-row">
                  <span className="stat-label">LIVES:</span>
                  <span className="stat-value hearts-glow">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        className="material-symbols-outlined"
                        style={{
                          color: i < lives ? '#ff007f' : 'rgba(255,255,255,0.15)',
                          fontVariationSettings: "'FILL' 1",
                          fontSize: '1.1rem',
                          marginRight: '2px',
                        }}
                      >
                        favorite
                      </span>
                    ))}
                  </span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">PLAYFAIR CLUE:</span>
                  <span
                    className="stat-value clue-glow"
                    style={{ fontSize: '0.9rem', color: 'var(--neon-cyan)', fontWeight: 'bold' }}
                  >
                    Use the Playfair Matrix below
                  </span>
                </div>
              </div>
            </div>

            <div className="sidebar-stats-card" style={{ padding: '12px' }}>
              <div className="stats-header" style={{ fontSize: '0.8rem', marginBottom: '8px' }}>
                🗂️ PLAYFAIR MATRIX
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <table
                  style={{
                    borderCollapse: 'collapse',
                    textAlign: 'center',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '0.75rem',
                    width: '100%',
                  }}
                >
                  <tbody>
                    {levelData.matrix.map((row, rIdx) => (
                      <tr key={rIdx}>
                        {row.map((cell, cIdx) => (
                          <td
                            key={`${rIdx}-${cIdx}`}
                            style={{
                              width: '36px',
                              height: '36px',
                              border: '1px solid rgba(0, 229, 255, 0.3)',
                              background: 'rgba(0, 0, 0, 0.3)',
                              color: '#fff',
                              fontWeight: 'bold',
                            }}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div
              className="sidebar-stats-card"
              style={{ padding: '12px', display: 'flex', justifyContent: 'center' }}
            >
              <PauseResumeButton isPaused={isPaused} toggle={() => setIsPaused((p) => !p)} />
            </div>

            <div className="sidebar-action-hud">
              {sprintStep === 'finished' && (
                <FinishedPanel
                  onVerifySubmit={handleVerifySubmit}
                  onReplayNewQuestion={onReplayNewQuestion}
                />
              )}
              {sprintStep === 'gameover' && (
                <GameOverPanel onRetry={handleRetryFromCheckpoint} />
              )}
              {sprintStep === 'explanation' && (
                <CrashPanel message={crashMessage} onContinue={handleContinueAfterCrash} />
              )}
              {sprintStep === 'running' && (
                <ObjectivesGuidePanel batonPair={currentBatonPair} />
              )}
            </div>
          </aside>

          <main className="sprint-main">
            <div
              className="sprint-baton-hud"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
            >
              <div className="baton-tag">APPROACHING GATE:</div>
              <div
                className="baton-letter"
                style={{
                  background: 'var(--neon-cyan)',
                  color: '#030914',
                  boxShadow: '0 0 15px rgba(0, 229, 255, 0.4)',
                }}
              >
                {sprintStep === 'finished' ? '🏁' : currentBatonPair}
              </div>
              <div className="baton-desc">
                {sprintStep === 'finished'
                  ? 'Relay run completed! Verify decryption in the sidebar.'
                  : `Find the plaintext pair for cipher pair '${currentBatonPair}'!`}
              </div>
            </div>

            <div
              className={[
                'sprint-track-container',
                trackShake ? 'shake-track' : '',
                isBoosting ? 'is-boosting' : '',
                isPaused ? 'is-paused' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className="sprint-parallax-layer sprint-bg-sky" />
              <div className="sprint-parallax-layer sprint-bg-hills-far" />
              <div className="sprint-parallax-layer sprint-bg-hills-near" />
              <div className="sprint-parallax-layer sprint-bg-ruins" />
              <div className="sprint-hanging-canopy" />

              {speedLines.map((line) => (
                <div
                  key={line.id}
                  className="sprint-speed-line"
                  style={{ left: `${line.x}%`, top: `${line.y}%`, width: `${line.width}px` }}
                />
              ))}

              <div
                className={`sprint-lane lane-0 ${runnerLane === 0 ? 'highlighted' : ''}`}
                onClick={() => {
                  if (sprintStep === 'running' && !isPausedRef.current) setRunnerLane(0);
                }}
              >
                <div className="sprint-lane-platform" />
                <span className="sprint-lane-badge">Top Lane</span>
              </div>
              <div
                className={`sprint-lane lane-1 ${runnerLane === 1 ? 'highlighted' : ''}`}
                onClick={() => {
                  if (sprintStep === 'running' && !isPausedRef.current) setRunnerLane(1);
                }}
              >
                <div className="sprint-lane-platform" />
                <span className="sprint-lane-badge">Middle Lane</span>
              </div>
              <div
                className={`sprint-lane lane-2 ${runnerLane === 2 ? 'highlighted' : ''}`}
                onClick={() => {
                  if (sprintStep === 'running' && !isPausedRef.current) setRunnerLane(2);
                }}
              >
                <div className="sprint-lane-platform" />
                <span className="sprint-lane-badge">Bottom Lane</span>
              </div>

              <div className="sprint-track-plants">
                <img src={blueFlowerSrc} alt="Flower" className="sprint-plant flower-1" />
                <img src={blueFlowerSrc} alt="Flower" className="sprint-plant flower-2" />
              </div>

              <div
                className={[
                  'sprint-runner-sprite',
                  `lane-${runnerLane}`,
                  isCrashing ? 'crash' : '',
                  isSpinning ? 'spin-effect' : '',
                  isBoosting ? 'boost-trail' : '',
                  laneChangeEffect || '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className={`sprint-runner-char-sprite ${runnerAnim}`} />
                <div className="runner-baton-glow">
                  {sprintStep === 'finished' ? '✓' : currentBatonPair}
                </div>
              </div>

              {sprintStep === 'running' &&
                coins.map((coin) => {
                  if (coin.eaten) return null;
                  const isTarget = coin.char === currentTargetPair;
                  return isTarget ? (
                    <div
                      key={coin.id}
                      className={`sprint-target-gem-sprite lane-${coin.lane}`}
                      style={{ left: `${coin.x}%` }}
                    >
                      <div className="target-gem-aura" />
                      <div className="target-gem-diamond">
                        <span className="target-gem-char" style={{ fontSize: '0.85rem' }}>
                          {coin.char}
                        </span>
                      </div>
                      <div className="target-gem-label">TARGET</div>
                    </div>
                  ) : (
                    <div
                      key={coin.id}
                      className={`sprint-slime-obstacle-sprite lane-${coin.lane}`}
                      style={{ left: `${coin.x}%` }}
                    >
                      <img
                        src={coin.id % 2 === 0 ? orangeSlimeSrc : basicSlimeSrc}
                        alt="Slime Decoy"
                        className="sprint-slime-img"
                      />
                      <div className="slime-decoy-plate">
                        <span className="slime-decoy-char" style={{ fontSize: '0.75rem' }}>
                          {coin.char}
                        </span>
                      </div>
                    </div>
                  );
                })}

              <div
                className={`sprint-checkpoint-gate ${
                  isBoosting || sprintStep === 'finished' ? 'gate-cleared' : ''
                }`}
                style={{ left: `${sprintStep === 'finished' ? 15 : gateX}%` }}
              >
                <div className="gate-mossy-arch">
                  <div className="gate-pillar top" />
                  <div className="gate-energy-barrier">
                    <div className="gate-rune-glyph">
                      {isBoosting || sprintStep === 'finished' ? '✓' : 'ᛟ'}
                    </div>
                  </div>
                  <div className="gate-pillar bottom" />
                </div>
                <div className="gate-badge">
                  {isBoosting || sprintStep === 'finished' ? 'CLEARED' : 'GATE'}
                </div>
              </div>

              {feedbackText && (
                <div
                  className="sprint-floating-feedback"
                  style={{ top: `${feedbackY}%`, color: feedbackColor }}
                >
                  {feedbackText}
                </div>
              )}
            </div>

            <PairProgress
              pairData={pairData}
              hintIndices={hintIndices}
              maskedIndices={maskedIndices}
              currentMaskIndex={currentMaskIndex}
              sprintStep={sprintStep}
            />
          </main>
        </div>
      )}

      {isMenuOpen && (
        <PausedMenu
          onResume={() => setIsMenuOpen(false)}
          onTutorial={() => {
            setIsMenuOpen(false);
            setSprintStep('ready');
          }}
          onExit={onBackToStages}
        />
      )}
    </div>
  );
}

function PauseResumeButton({ isPaused, toggle }) {
  return (
    <button
      onClick={toggle}
      style={{
        background: isPaused ? 'var(--neon-green)' : 'rgba(255,255,255,0.08)',
        color: isPaused ? '#000' : '#fff',
        border: isPaused ? 'none' : '1px solid rgba(255,255,255,0.15)',
        padding: '10px 16px',
        borderRadius: '24px',
        fontSize: '0.8rem',
        fontWeight: 'bold',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        transition: 'all 0.2s ease',
        width: '100%',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}
    >
      {isPaused ? '▶ Resume (Space)' : '⏸ Pause (Space)'}
    </button>
  );
}

function FinishedPanel({ onVerifySubmit, onReplayNewQuestion }) {
  return (
    <div className="fg-success-panel">
      <h3>✅ SECURED!</h3>
      <p>All checkpoints cleared successfully.</p>
      <button
        className="fg-btn fg-btn-primary"
        onClick={onVerifySubmit}
        style={{
          width: '100%',
          background: 'var(--neon-green)',
          color: '#030914',
          marginTop: '10px',
        }}
      >
        🚀 Verify & Submit
      </button>
      <button
        className="fg-btn fg-btn-secondary"
        onClick={onReplayNewQuestion}
        style={{
          width: '100%',
          marginTop: '10px',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#fff',
        }}
      >
        🔄 Play Again
      </button>
    </div>
  );
}

function GameOverPanel({ onRetry }) {
  return (
    <div
      className="fg-alert-panel"
      style={{
        borderColor: 'var(--neon-red)',
        background: 'rgba(255, 0, 127, 0.08)',
        textAlign: 'center',
      }}
    >
      <strong style={{ color: 'var(--neon-red)', fontSize: '1rem' }}>💀 SYSTEM FAILURE!</strong>
      <p style={{ fontSize: '0.88rem', lineHeight: '1.5', color: '#fda4af', margin: '12px 0' }}>
        Runner crashed too many times and ran out of lives.
      </p>
      <button
        className="fg-btn"
        onClick={onRetry}
        style={{
          width: '100%',
          background: 'var(--neon-red)',
          color: '#fff',
          border: 'none',
          marginTop: 'auto',
          fontSize: '0.9rem',
          padding: '12px',
        }}
      >
        🔄 Try Again
      </button>
    </div>
  );
}

function CrashPanel({ message, onContinue }) {
  return (
    <div
      className="fg-alert-panel"
      style={{
        borderColor: 'var(--neon-red)',
        background: 'rgba(255, 0, 127, 0.05)',
        textAlign: 'center',
      }}
    >
      <strong style={{ color: 'var(--neon-red)', fontSize: '1rem' }}>💥 CRASH! GATE STAYED SHUT</strong>
      <p
        style={{
          fontSize: '0.88rem',
          lineHeight: '1.5',
          color: '#cbd5e1',
          marginTop: '12px',
          marginBottom: '12px',
        }}
      >
        {message}
      </p>
      <button
        className="fg-btn fg-btn-secondary"
        onClick={onContinue}
        style={{
          width: '100%',
          marginTop: '10%',
          background: 'rgba(255,255,255,0.1)',
          color: '#fff',
          fontSize: '0.9rem',
          padding: '12px',
        }}
      >
        🔄 Try Checkpoint Again
      </button>
    </div>
  );
}

function ObjectivesGuidePanel({ batonPair }) {
  return (
    <div
      className="sidebar-stats-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
        flex: 1,
        overflowY: 'auto',
        textAlign: 'center',
        justifyContent: 'center',
      }}
    >
      <div className="stats-header" style={{ color: 'var(--neon-cyan)', fontSize: '0.9rem' }}>
        📝 OBJECTIVES & GUIDE
      </div>
      <div style={{ fontSize: '0.85rem', lineHeight: '1.6', color: '#cbd5e1' }}>
        • Solve the cipher pair using the 5×5 matrix above.
        <br />• Avoid decoy pairs to prevent crashing!
      </div>
      <div
        style={{
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(0, 229, 255, 0.2)',
          borderRadius: '8px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            color: 'var(--text-muted)',
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            textAlign: 'center',
          }}
        >
          Current Pair Decryption
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'rgba(255,255,255,0.05)',
              padding: '8px 14px',
              borderRadius: '8px',
              minWidth: '65px',
            }}
          >
            <span style={{ fontSize: '1.4rem', color: '#fff', fontFamily: 'monospace' }}>
              {batonPair}
            </span>
            <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              CIPHER
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--neon-cyan)' }}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '1.4rem', margin: '4px 0' }}
            >
              arrow_forward
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'rgba(0,229,255,0.05)',
              border: '1px solid rgba(0,229,255,0.3)',
              padding: '8px 14px',
              borderRadius: '8px',
              boxShadow: '0 0 10px rgba(0,229,255,0.1) inset',
              minWidth: '65px',
            }}
          >
            <span
              style={{
                fontSize: '1.4rem',
                color: 'var(--neon-green)',
                fontFamily: 'monospace',
                fontWeight: 'bold',
              }}
            >
              ??
            </span>
            <span style={{ fontSize: '0.55rem', color: 'var(--neon-cyan)', marginTop: '4px' }}>
              PLAIN
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PairProgress({ pairData, hintIndices, maskedIndices, currentMaskIndex, sprintStep }) {
  return (
    <div
      className="sprint-word-progress-card"
      style={{
        marginTop: '20px',
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: '12px',
        padding: '16px 20px',
      }}
    >
      <h3
        style={{
          fontSize: '0.9rem',
          fontWeight: '700',
          color: '#94a3b8',
          marginBottom: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        Pair Decryption Progress:
      </h3>
      <div className="sprint-letters-row">
        {pairData.map((pair, idx) => {
          const isMasked = !hintIndices.has(idx);
          const isSolved =
            isMasked && (maskedIndices.indexOf(idx) < currentMaskIndex || sprintStep === 'finished');
          const displayPair = !isMasked ? pair.plainPair : isSolved ? pair.plainPair : '__';
          const isCurrentActive =
            isMasked && idx === (maskedIndices[currentMaskIndex] ?? -1) && sprintStep === 'running';

          return (
            <div
              key={idx}
              className={[
                'sprint-letter-box',
                isSolved ? 'solved' : '',
                isCurrentActive ? 'active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className="sprint-box-cipher">{pair.cipherPair}</span>
              <span className="sprint-box-plain">{displayPair}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PausedMenu({ onResume, onTutorial, onExit }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a, #020617)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: '16px',
          padding: '32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          minWidth: '320px',
          boxShadow: '0 0 30px rgba(0,0,0,0.8)',
        }}
      >
        <h2
          style={{
            color: 'var(--neon-cyan)',
            margin: 0,
            textAlign: 'center',
            fontSize: '1.6rem',
            marginBottom: '8px',
            letterSpacing: '2px',
          }}
        >
          PAUSED
        </h2>
        <button
          className="fg-btn fg-btn-primary"
          onClick={onResume}
          style={{
            padding: '14px',
            fontSize: '1.1rem',
            background: 'var(--neon-green)',
            color: '#000',
            fontWeight: 'bold',
          }}
        >
          ▶ Resume
        </button>
        <button
          className="fg-btn fg-btn-secondary"
          onClick={onTutorial}
          style={{
            padding: '14px',
            fontSize: '1.1rem',
            background: 'rgba(255,255,255,0.08)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          📖 Tutorial
        </button>
        <button
          className="fg-btn"
          onClick={onExit}
          style={{
            padding: '14px',
            fontSize: '1.1rem',
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#ef4444',
            border: '1px solid rgba(239,68,68,0.4)',
            marginTop: '8px',
          }}
        >
          🚪 Exit Stage
        </button>
      </div>
    </div>
  );
}

function useMemoLevelMeta(pairData, tier) {
  return React.useMemo(() => {
    const hintIndices = new Set();
    if (tier === 'easy' || tier === 'medium') {
      const numHints = tier === 'easy' ? 2 : 4;
      for (let i = 0; i < Math.min(numHints, pairData.length); i++) {
        hintIndices.add(i);
      }
    }

    const maskedIndices = [];
    for (let i = 0; i < pairData.length; i++) {
      if (!hintIndices.has(i)) {
        maskedIndices.push(i);
      }
    }

    return { hintIndices, maskedIndices };
  }, [pairData, tier]);
}
