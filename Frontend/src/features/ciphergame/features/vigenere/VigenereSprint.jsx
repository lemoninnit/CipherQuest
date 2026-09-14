import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import '../sprint/CipherSprint.css';
import '../../CipherGame.css';
import GameHudBar from '../../ui/GameHudBar';
import PauseMenu from '../../ui/PauseMenu';
import StageLoadingScreen from '../../ui/StageLoadingScreen';
import { useFullscreen } from '../../core/hooks/useFullscreen';
import FullscreenButton from '../../ui/FullscreenButton';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const BASE_SPEED = 0.22;
const BOOST_MULT = 1.5;
const COLLISION_ZONE_START = 7;
const COLLISION_ZONE_END = 28;
const GATE_TRIGGER_X = 18;
const GATE_RESET_X = 135;
const COIN_START_X = 75;

const PAD5 = (n) => String(n).padStart(5, '0');

const getRandomDecoys = (correctChar, count) => {
  const pool = ALPHABET.filter((c) => c !== correctChar);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

export default function VigenereSprint({
  levelData,
  tier,
  onVerifySubmit,
  onBackToStages,
  onReplayNewQuestion,
}) {
  const {
    containerRef: fsContainerRef,
    isFullscreen,
    toggleFullscreen,
  } = useFullscreen();
  const { hintIndices, maskedIndices } = useMemoLevelMeta(levelData, tier);

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
  const [, setAttempts] = useState([]);
  const [firstTryForCurrent, setFirstTryForCurrent] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isOperationLoading, setIsOperationLoading] = useState(false);
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
  const currentBatonLetter = levelData.ciphertext[currentIdx] ?? '';
  const currentTargetChar = levelData.plaintext[currentIdx] ?? '';

  let charIdxInText = 0;
  for (let i = 0; i < currentIdx; i++) {
    if (levelData.plaintext[i] !== ' ') charIdxInText++;
  }
  const currentShiftKey = levelData.targetShifts[charIdxInText % levelData.targetShifts.length];

  const sprintAlignmentItems = React.useMemo(() => {
    const items = [];
    let letterCounter = 0;
    for (let i = 0; i < levelData.plaintext.length; i++) {
      const pChar = levelData.plaintext[i];
      const cChar = levelData.ciphertext[i] || '';
      if (pChar === ' ') {
        items.push({ isSpace: true, id: `space-${i}` });
      } else {
        const slot = letterCounter % levelData.targetShifts.length;
        const keyChar = levelData.keyword ? (levelData.keyword[slot % levelData.keyword.length] || '') : '';
        const shiftVal = levelData.targetShifts[slot] ?? 0;
        const isActive = i === currentIdx;
        const isSolved = maskedIndices.indexOf(i) < currentMaskIndex || sprintStep === 'finished';
        items.push({
          id: `item-${i}`,
          index: i,
          cipherChar: cChar,
          plainChar: pChar,
          keyChar,
          shiftVal,
          isActive,
          isSolved,
        });
        letterCounter++;
      }
    }
    return items;
  }, [levelData.plaintext, levelData.ciphertext, levelData.keyword, levelData.targetShifts, currentIdx, maskedIndices, currentMaskIndex, sprintStep]);

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

  const spawnCoinsAndGate = useCallback((maskIdxOverride) => {
    const idx = typeof maskIdxOverride === 'number' ? maskIdxOverride : currentMaskIndexRef.current;
    const tempIdx = maskedIndices[idx] ?? 0;
    const tempTargetChar = levelData.plaintext[tempIdx] ?? '';
    const [decoy1, decoy2] = getRandomDecoys(tempTargetChar, 2);
    const correctLane = idx % 3;
    const decoyLanes = [0, 1, 2].filter((l) => l !== correctLane);

    collisionHandledRef.current = false;
    const positions = [COIN_START_X, COIN_START_X + 6, COIN_START_X + 12];
    const shuffledPos = [...positions].sort(() => Math.random() - 0.5);
    setCoins([
      { id: 1, lane: correctLane, char: tempTargetChar, x: shuffledPos[0], eaten: false },
      { id: 2, lane: decoyLanes[0], char: decoy1,        x: shuffledPos[1], eaten: false },
      { id: 3, lane: decoyLanes[1], char: decoy2,        x: shuffledPos[2], eaten: false },
    ]);
    setGateX(GATE_RESET_X);
    setCollectedKey(null);
    collectedKeyRef.current = null;
    setIsCrashing(false);
  }, [levelData.plaintext, maskedIndices]);

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
    if (sprintStep !== 'running' || isCrashing) return undefined;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.code === 'Escape') {
        e.preventDefault();
        setIsMenuOpen((prev) => !prev);
        return;
      }
      if (isMenuOpen) return;
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
    const charUsed = collectedKeyRef.current;
    const isCorrect = charUsed === currentTargetChar;

    setAttempts((prev) => [
      ...prev,
      {
        index: currentIdx,
        cipherChar: currentBatonLetter,
        keyCollected: charUsed || 'None',
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
        const reason = charUsed
          ? `Wrong Letter! You collected decoy letter '${charUsed}'. Try again to decrypt cipher '${currentBatonLetter}'!`
          : `Gate Shut! You didn't collect any letter coin to unlock the checkpoint gate. Try again to decrypt cipher '${currentBatonLetter}'!`;
        setCrashMessage(reason);
        setSprintStep('explanation');
      }
    }
  }, [
    currentTargetChar,
    currentIdx,
    currentBatonLetter,
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
            const isCorrect = coin.char === currentTargetChar;
            if (isCorrect) {
              triggerSpin();
              showFeedback(
                `✨ Correct Letter ${coin.char} Collected!`,
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
  }, [sprintStep, isCrashing, isPaused, isMenuOpen, currentTargetChar, handleGateCollision, triggerSpin, showFeedback]);

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
    const total = levelData.plaintext.replace(/\s+/g, '').length;
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
            <h2 className="fg-recap-title">🔬 Vigenère Cipher Recap</h2>
            <p className="fg-recap-subtitle">Why Did This Work?</p>
            <div
              className="fg-recap-animation-box"
              style={{ minHeight: 'auto', padding: '16px', marginBottom: '16px' }}
            >
              <div className="fg-recap-letter-row">
                {levelData.plaintext.replace(/\s+/g, '').split('').map((plainCh, idx) => {
                  const cipherCh = levelData.ciphertext.replace(/\s+/g, '')[idx];
                  const seg = levelData.targetShifts[idx % levelData.targetShifts.length];
                  return (
                    <div
                      key={idx}
                      className={`fg-recap-node ${explanationStep >= idx ? 'active' : 'waiting'}`}
                    >
                      <span className="fg-recap-char-cipher">{cipherCh}</span>
                      <span className="fg-recap-math">-{seg}</span>
                      <span className="fg-recap-arrow">↓</span>
                      <span className="fg-recap-char-plain">{plainCh}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div
              className="fg-recap-explanation"
              style={{ background: 'rgba(255,255,255,0.015)' }}
            >
              💡 <strong>Vigenère Cipher Decryption:</strong> Each ciphertext letter is shifted
              backward by a repeating keyword-derived key value.
              {levelData.targetShifts &&
                levelData.targetShifts.map((shiftVal, sIdx) => {
                  const sAlph = ALPHABET.map((_, i) => ALPHABET[(i + shiftVal) % 26]);
                  return (
                    <div
                      key={sIdx}
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
                        🔑 Alphabet Value Table — Position #{sIdx + 1} of the keyword (Shift: +{shiftVal})
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table
                          style={{
                            borderCollapse: 'collapse',
                            textAlign: 'center',
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: '0.7rem',
                            minWidth: 850,
                          }}
                        >
                          <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                              <th
                                style={{
                                  padding: '4px 2px',
                                  textAlign: 'left',
                                  color: 'var(--text-muted)',
                                }}
                              >
                                Letter:
                              </th>
                              {ALPHABET.map((ch, i) => (
                                <td
                                  key={i}
                                  style={{
                                    padding: '4px 2px',
                                    color: '#fff',
                                    background: 'rgba(255,255,255,0.02)',
                                  }}
                                >
                                  <div style={{ fontWeight: 'bold' }}>{ch}</div>
                                </td>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <th
                                style={{
                                  padding: '4px 2px',
                                  textAlign: 'left',
                                  color: 'var(--text-muted)',
                                }}
                              >
                                Value:
                              </th>
                              {ALPHABET.map((ch, i) => (
                                <td
                                  key={i}
                                  style={{
                                    padding: '4px 2px',
                                    color: 'var(--neon-yellow)',
                                    background: 'rgba(251, 191, 36, 0.02)',
                                  }}
                                >
                                  <div style={{ fontWeight: 'bold' }}>{i}</div>
                                </td>
                              ))}
                            </tr>
                            <tr style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                              <th
                                style={{
                                  padding: '4px 2px',
                                  textAlign: 'left',
                                  color: 'var(--text-muted)',
                                }}
                              >
                                +{shiftVal}:
                              </th>
                              {sAlph.map((ch, i) => (
                                <td
                                  key={i}
                                  style={{
                                    padding: '4px 2px',
                                    color: 'var(--neon-cyan)',
                                    background: 'rgba(0,229,255,0.02)',
                                  }}
                                >
                                  <div style={{ fontWeight: 'bold' }}>{ch}</div>
                                </td>
                              ))}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
            </div>
            <div className="fg-recap-actions" style={{ marginTop: 16 }}>
              <button
                className="fg-btn fg-btn-primary"
                onClick={handleCloseExplanation}
                disabled={explanationStep < levelData.plaintext.replace(/\s+/g, '').length - 1}
                style={{ background: 'var(--neon-green)', color: '#030914' }}
              >
                Unlock Next Objective ➔
              </button>
            </div>
          </div>
        </div>
      )}

      <GameHudBar
        title="Vigenère Sprint Relay"
        stage={levelData.level}
        tier={tier}
        isReady={sprintStep === 'ready'}
        onBackToStages={onBackToStages}
        onOpenMenu={() => setIsMenuOpen(true)}
        lives={sprintStep === 'ready' ? null : lives}
        customRightContent={<FullscreenButton isFullscreen={isFullscreen} onToggle={toggleFullscreen} />}
        extraRight={<FullscreenButton isFullscreen={isFullscreen} onToggle={toggleFullscreen} />}
      />

      {/* ───── Ready Screen ───── */}
      {sprintStep === 'ready' ? (
        isOperationLoading ? (
          <StageLoadingScreen
            category="vigenere"
            difficulty={tier}
            stageIndex={(levelData.level || 1) - 1}
            onLoadingComplete={() => {
              setIsOperationLoading(false);
              handleStartSprint();
            }}
          />
        ) : (
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
                <h2 className="cq-dossier-title">Vigenère Relay Run</h2>
                <p className="cq-dossier-subtitle">
                  Sprint through Vigenère hurdles using the repeating keyword! Match each letter to clear the checkpoint.
                </p>
                <hr className="cq-dossier-divider" />
                <div className="cq-dossier-data">
                  <div className="cq-dossier-row">
                    <span className="cq-dossier-label">CIPHERTEXT</span>
                    <span className="cq-dossier-value cyan-mono">{levelData.ciphertext}</span>
                  </div>
                  <div className="cq-dossier-row">
                    <span className="cq-dossier-label">KEYWORD CLUE</span>
                    <span className="cq-dossier-value yellow-mono">{levelData.keyClue}</span>
                  </div>
                  <div className="cq-dossier-row">
                    <span className="cq-dossier-label">HINT</span>
                    <span className="cq-dossier-value hint-text">{levelData.hint}</span>
                  </div>
                </div>
                <p className="cq-dossier-how-it-works">
                  <strong>How it works:</strong>{' '}
                  Switch lanes to pick the correct plaintext letter for the repeating keyword slot! Press <strong>F</strong> to toggle fullscreen.
                </p>
                <button className="cq-dossier-action-btn" onClick={() => setIsOperationLoading(true)}>
                  Begin operation
                </button>
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="caesar-sprint-fullscreen sprint-fullscreen-stage">
          {/* Edge-to-edge 3-lane Track */}
          <div
            className={[
              'sprint-track-container',
              'sprint-track-fullscreen',
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
                {sprintStep === 'finished' ? '✓' : currentBatonLetter}
              </div>
            </div>

            {sprintStep === 'running' &&
              coins.map((coin) => {
                if (coin.eaten) return null;
                const isTarget = coin.char === currentTargetChar;
                return isTarget ? (
                  <div
                    key={coin.id}
                    className={`sprint-target-gem-sprite lane-${coin.lane}`}
                    style={{ left: `${coin.x}%` }}
                  >
                    <div className="target-gem-aura" />
                    <div className="target-gem-diamond">
                      <span className="target-gem-char">{coin.char}</span>
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
                      <span className="slime-decoy-char">{coin.char}</span>
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

          {/* ───── Floating Overlays ───── */}

          {/* 1. Top-Center Approaching Gate HUD */}
          <div className="caesar-floating-word-panel sprint-floating-gate-panel">
            <div className="sprint-baton-hud">
              <div className="baton-tag">APPROACHING GATE:</div>
              <div
                className="baton-letter"
                style={{
                  background: 'var(--neon-cyan)',
                  color: '#030914',
                  boxShadow: '0 0 15px rgba(0, 229, 255, 0.4)',
                }}
              >
                {sprintStep === 'finished' ? '🏁' : currentBatonLetter}
              </div>
              <div className="baton-desc">
                {sprintStep === 'finished'
                  ? 'Relay run completed! Verify decryption.'
                  : `Decrypt '${currentBatonLetter}' using Keyword Shift -${currentShiftKey}!`}
              </div>
            </div>
          </div>

          {/* 2. Bottom-Left Floating Reference & Alignment Panel */}
          <div className="vg-floating-ref-panel vg-sprint-ref-panel">
            <div className="vg-floating-ref-header">
              <span className="vg-floating-ref-title">📖 Vigenère Alignment</span>
              <span className="vg-floating-ref-slot-badge">
                Current: '{currentBatonLetter}' (Shift -{currentShiftKey})
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div className="vg-alignment-labels">
                <div>CIPHER</div>
                <div>KEY</div>
                <div>SHIFT</div>
              </div>
              <div className="vg-alignment-container">
                {sprintAlignmentItems.map((item) => {
                  if (item.isSpace) {
                    return <div key={item.id} style={{ width: 8, flexShrink: 0 }} />;
                  }
                  return (
                    <div
                      key={item.id}
                      className={`vg-alignment-col ${item.isActive ? 'active-slot' : ''}`}
                      title={`Pos ${item.index + 1}: ${item.cipherChar} - ${item.keyChar} = ${item.plainChar}`}
                    >
                      <span className="vg-align-cipher">{item.cipherChar}</span>
                      <span
                        className="vg-align-key"
                        style={{ color: item.isSolved ? 'var(--neon-green)' : 'var(--neon-cyan)' }}
                      >
                        {item.keyChar}
                      </span>
                      <span className="vg-align-shift">-{item.shiftVal}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="vg-samples-section" style={{ marginTop: 6, paddingTop: 6 }}>
              <div className="vg-samples-title" style={{ marginBottom: 4 }}>
                <span>Alphabet Values (A=0 .. Z=25)</span>
                <span style={{ color: 'var(--neon-cyan)', fontSize: '0.68rem' }}>Plain = Cipher - Key</span>
              </div>
              <div className="vg-sprint-alphabet-grid">
                <div className="vg-alphabet-row">
                  {ALPHABET.slice(0, 13).map((ch, i) => (
                    <div key={ch} className="vg-alphabet-cell">
                      <span className="vg-alpha-char">{ch}</span>
                      <span className="vg-alpha-val">{i}</span>
                    </div>
                  ))}
                </div>
                <div className="vg-alphabet-row">
                  {ALPHABET.slice(13, 26).map((ch, i) => (
                    <div key={ch} className="vg-alphabet-cell">
                      <span className="vg-alpha-char">{ch}</span>
                      <span className="vg-alpha-val">{i + 13}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span>🎮 Controls: <strong>W/S</strong> or <strong>↑/↓</strong> switch lanes</span>
              <span><strong>Space</strong> pause</span>
            </div>
          </div>

          {/* 3. Bottom-Center Floating Word Decryption Progress */}
          <div className="sprint-floating-word-progress">
            <WordProgress
              levelData={levelData}
              hintIndices={hintIndices}
              maskedIndices={maskedIndices}
              currentMaskIndex={currentMaskIndex}
              sprintStep={sprintStep}
            />
          </div>

          {/* 4. Bottom-Right Floating Current Letter Decryption Key */}
          {sprintStep === 'running' && (
            <div className="caesar-floating-basket-card sprint-floating-shift-card">
              <div className="caesar-basket-icon">🔑</div>
              <div className="sprint-decryption-flow">
                <div className="sprint-flow-box cipher-box">
                  <span className="sprint-flow-char">{currentBatonLetter}</span>
                  <span className="sprint-flow-label">CIPHER</span>
                </div>
                <div className="sprint-flow-arrow">
                  <span className="sprint-shift-badge">Shift -{currentShiftKey}</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>
                    arrow_forward
                  </span>
                </div>
                <div className="sprint-flow-box plain-box">
                  <span className="sprint-flow-char plain">?</span>
                  <span className="sprint-flow-label plain">PLAIN</span>
                </div>
              </div>
              <span className="caesar-basket-label">Current Letter Decryption</span>
            </div>
          )}

          {/* 5. Floating Action / Outcome Panels */}
          {sprintStep === 'finished' && (
            <div className="caesar-floating-victory-panel sprint-floating-victory-panel">
              <FinishedPanel
                onVerifySubmit={handleVerifySubmit}
                onReplayNewQuestion={onReplayNewQuestion}
              />
            </div>
          )}

          {sprintStep === 'gameover' && (
            <div className="caesar-floating-rule-violation sprint-floating-action-modal">
              <GameOverPanel onRetry={handleRetryFromCheckpoint} />
            </div>
          )}

          {sprintStep === 'explanation' && (
            <div className="caesar-floating-rule-violation sprint-floating-action-modal">
              <CrashPanel message={crashMessage} onContinue={handleContinueAfterCrash} />
            </div>
          )}
        </div>
      )}

      <PauseMenu
        open={isMenuOpen}
        onResume={() => setIsMenuOpen(false)}
        onTutorial={() => {
          setIsMenuOpen(false);
          setSprintStep('ready');
        }}
        onExit={onBackToStages}
      />
    </div>
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

function WordProgress({ levelData, hintIndices, maskedIndices, currentMaskIndex, sprintStep }) {
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
        Word Decryption Progress:
      </h3>
      <div className="sprint-letters-row">
        {levelData.plaintext.split('').map((char, idx) => {
          const isMasked = char !== ' ' && !hintIndices.has(idx);
          const isSolved =
            isMasked && (maskedIndices.indexOf(idx) < currentMaskIndex || sprintStep === 'finished');
          const displayChar = !isMasked ? char : isSolved ? char : '_';
          const cipherChar = levelData.ciphertext[idx] !== ' ' ? levelData.ciphertext[idx] : ' ';
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
              style={char === ' ' ? { visibility: 'hidden', width: '20px', border: 'none', background: 'transparent' } : {}}
            >
              <span className="sprint-box-cipher">{cipherChar}</span>
              <span className="sprint-box-plain">{displayChar}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}


function useMemoLevelMeta(levelData, tier) {
  return React.useMemo(() => {
    const hintIndices = new Set();
    if (tier === 'easy' || tier === 'medium') {
      const numHints = tier === 'easy' ? 2 : 14;
      let hintsFound = 0;
      for (let i = 0; i < levelData.plaintext.length; i++) {
        if (
          levelData.plaintext[i] !== ' ' &&
          levelData.masks &&
          levelData.masks[0] &&
          levelData.masks[0][i]
        ) {
          hintIndices.add(i);
          hintsFound++;
          if (hintsFound >= numHints) break;
        }
      }
      if (hintsFound < numHints) {
        for (let i = 0; i < levelData.plaintext.length; i++) {
          if (levelData.plaintext[i] !== ' ' && !hintIndices.has(i)) {
            hintIndices.add(i);
            hintsFound++;
            if (hintsFound >= numHints) break;
          }
        }
      }
    }

    const maskedIndices = [];
    for (let i = 0; i < levelData.plaintext.length; i++) {
      if (levelData.plaintext[i] !== ' ' && !hintIndices.has(i)) {
        maskedIndices.push(i);
      }
    }

    return { hintIndices, maskedIndices };
  }, [levelData, tier]);
}
