/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import '../sprint/CipherSprint.css';
import '../../CipherGame.css';
import GameHudBar from '../../ui/GameHudBar';
import PauseMenu from '../../ui/PauseMenu';
import StageLoadingScreen from '../../ui/StageLoadingScreen';
import { useFullscreen } from '../../core/hooks/useFullscreen';
import FullscreenButton from '../../ui/FullscreenButton';
import CryptographicRecap from '../../ui/CryptographicRecap';
import VictoryConfetti from '../../ui/VictoryConfetti';

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

const charToIdx = (ch) => (ch && ALPHABET.indexOf(ch.toUpperCase()) !== -1 ? ALPHABET.indexOf(ch.toUpperCase()) : 0);

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
  const crashMessage = '';
  const [lives, setLives] = useState(5);
  const [laneChangeEffect, setLaneChangeEffect] = useState(null);
  const [speedLines, setSpeedLines] = useState([]);
  const [, setAttempts] = useState([]);
  const [firstTryForCurrent, setFirstTryForCurrent] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isOperationLoading, setIsOperationLoading] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackColor, setFeedbackColor] = useState('#facc15');
  const [feedbackY, setFeedbackY] = useState(50);
  const [trackShake, setTrackShake] = useState(false);
  const [isBoosting, setIsBoosting] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [slimeFrame, setSlimeFrame] = useState(0);


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
  const slimeIntervalRef = useRef(0);


  useEffect(() => { isBoostingRef.current = isBoosting; }, [isBoosting]);
  useEffect(() => { runnerLaneRef.current = runnerLane; }, [runnerLane]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { isCrashingRef.current = isCrashing; }, [isCrashing]);
  useEffect(() => { isMenuOpenRef.current = isMenuOpen; }, [isMenuOpen]);
  useEffect(() => { sprintStepRef.current = sprintStep; }, [sprintStep]);
  useEffect(() => { collectedKeyRef.current = collectedKey; }, [collectedKey]);
  useEffect(() => { currentMaskIndexRef.current = currentMaskIndex; }, [currentMaskIndex]);

  const targetKey = levelData.targetKey || levelData.keyword || 'KEY';
  const currentIdx = maskedIndices[currentMaskIndex] ?? 0;
  const currentBatonLetter = levelData.ciphertext[currentIdx] ?? '';
  const currentTargetChar = levelData.plaintext[currentIdx] ?? '';

  let charIdxInText = 0;
  for (let i = 0; i < currentIdx; i++) {
    if (levelData.plaintext[i] !== ' ') charIdxInText++;
  }
  const currentShiftKey = levelData.targetShifts[charIdxInText % levelData.targetShifts.length];
  const currentKeyChar = targetKey[charIdxInText % targetKey.length] || 'A';

  const sprintAlignmentItems = useMemo(() => {
    const items = [];
    let letterCounter = 0;
    for (let i = 0; i < levelData.plaintext.length; i++) {
      const pChar = levelData.plaintext[i];
      const cChar = levelData.ciphertext[i] || '';
      if (pChar === ' ') {
        items.push({ isSpace: true, id: `space-${i}` });
      } else {
        const slot = letterCounter % levelData.targetShifts.length;
        const keyChar = targetKey ? (targetKey[slot % targetKey.length] || '') : '';
        const shiftVal = levelData.targetShifts[slot] ?? 0;
        const isActive = i === currentIdx;
        const isSolved = !hintIndices.has(i)
          ? (maskedIndices.indexOf(i) < currentMaskIndex || sprintStep === 'finished')
          : true;
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
  }, [levelData.plaintext, levelData.ciphertext, targetKey, levelData.targetShifts, currentIdx, maskedIndices, currentMaskIndex, sprintStep, hintIndices]);

  const orangeSlimeSrc = `/assets/sprint/obstacle/obstacle1/SlimeOrange_${PAD5(slimeFrame)}.png`;
  const basicSlimeSrc = `/assets/sprint/obstacle/obstacle2/SlimeBasic_${PAD5(slimeFrame)}.png`;


  useEffect(() => {
    if (isPausedRef.current || sprintStepRef.current !== 'running') return;
    slimeIntervalRef.current = window.setInterval(() => {
      setSlimeFrame((f) => (f + 1) % 30);
    }, 45);
    return () => window.clearInterval(slimeIntervalRef.current);
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
      isCrashingRef.current = true;
      setFirstTryForCurrent(false);

      const nextLives = lives - 1;
      setLives(nextLives);

      if (nextLives <= 0) {
        setSprintStep('gameover');
      } else {
        // Singular run: don't halt at an explanation screen.
        // Show a brief inline crash message then auto-respawn the same gate.
        const reason = charUsed
          ? `❌ Wrong: '${charUsed}'. Need to decrypt '${currentBatonLetter}'!`
          : `❌ Gate Shut! Collect a letter for '${currentBatonLetter}'!`;
        showFeedback(reason, '#ef4444', 50, 1400);
        if (boostTimeoutRef.current) window.clearTimeout(boostTimeoutRef.current);
        boostTimeoutRef.current = window.setTimeout(() => {
          setIsCrashing(false);
          isCrashingRef.current = false;
          // Respawn the same gate so the runner can try again immediately
          spawnCoinsAndGate(currentMaskIndexRef.current);
        }, 1300);
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
    if (sprintStep !== 'running' || isCrashing || isPaused || isMenuOpen || showExplanation) return undefined;

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
    setSprintStep('ready');
    setCurrentMaskIndex(0);
    currentMaskIndexRef.current = 0;
    setAttempts([]);
    setLives(5);
    setFirstTryForCurrent(true);
    setCoins([]);
    setShowExplanation(false);
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
      if (slimeIntervalRef.current) window.clearInterval(slimeIntervalRef.current);
      if (rafRef.current)           window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleVerifySubmit = () => {
    clearAllFXTimeouts();
    setShowExplanation(true);
  };

  const handleCloseExplanation = () => {
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
        <CryptographicRecap
          cipherType="vigenere"
          levelData={levelData}
          onUnlockNext={handleCloseExplanation}
        />
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
              <div className="sprint-lane-platform platform-upper" />
              <span className="sprint-lane-badge">Top Lane</span>
            </div>
            <div
              className={`sprint-lane lane-1 ${runnerLane === 1 ? 'highlighted' : ''}`}
              onClick={() => {
                if (sprintStep === 'running' && !isPausedRef.current) setRunnerLane(1);
              }}
            >
              <div className="sprint-lane-platform platform-middle" />
              <span className="sprint-lane-badge">Middle Lane</span>
            </div>
            <div
              className={`sprint-lane lane-2 ${runnerLane === 2 ? 'highlighted' : ''}`}
              onClick={() => {
                if (sprintStep === 'running' && !isPausedRef.current) setRunnerLane(2);
              }}
            >
              <div className="sprint-lane-platform platform-bottom" />
              <span className="sprint-lane-badge">Bottom Lane</span>
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

          {/* 1. Top-Center Word Segment Panel + Keyword & Hint */}
          <div className="caesar-floating-word-panel vg-sprint-top-panel">
            <div className="vg-cipher-main-row">
              {/* Keyword Badge beside cipher letters */}
              <div className="vg-cipher-key-pill" title={`Repeating Keyword: ${targetKey}`}>
                <span className="vg-pill-lbl">KEYWORD</span>
                <span className="vg-pill-val">{targetKey}</span>
              </div>

              {/* Word Letter Cells */}
              <div className="fg-word-segments-row sprint-letters-row">
                <div className="fg-word-segment-card">
                  <div className="fg-letter-cells">
                    {levelData.plaintext.split('').map((char, idx) => {
                      if (char === ' ') {
                        return <div key={`space-${idx}`} style={{ width: 12, flexShrink: 0 }} />;
                      }
                      const isMasked = !hintIndices.has(idx);
                      const isSolved = !isMasked || (maskedIndices.indexOf(idx) < currentMaskIndex || sprintStep === 'finished');
                      const isActive = isMasked && idx === currentIdx && sprintStep === 'running';
                      const displayChar = isSolved ? char : (isActive ? '?' : '_');
                      const cipherChar = levelData.ciphertext[idx] || '';

                      let cellClass = 'fg-letter-cell';
                      if (isSolved) {
                        cellClass += ' correct-plain';
                      } else if (isActive) {
                        cellClass += ' active-slot';
                      }

                      return (
                        <div
                          key={idx}
                          className={cellClass}
                          title={`Cipher: ${cipherChar}, Key: ${targetKey[charIdxInText % targetKey.length] || ''} → ${isSolved ? char : '?'}`}
                        >
                          <span className="fg-cell-ciphertext">{cipherChar}</span>
                          <span className="fg-cell-plaintext">{displayChar}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Solving Status Badge right beside cipher letters */}
              <div className="vg-cipher-solving-pill" title={`Active Target: Position #${currentIdx + 1}`}>
                <span className="vg-pill-lbl">SOLVING</span>
                <span className="vg-pill-pos">Pos #{currentIdx + 1}</span>
                <span className="vg-pill-keychar">(Key '{currentKeyChar}')</span>
              </div>
            </div>

            <div className="caesar-floating-hint">
              <span>💡 Keyword clue: <strong>"{levelData.keyClue || 'Keyword'}"</strong></span>
              <span style={{ margin: '0 8px', opacity: 0.4 }}>|</span>
              <span>Hint: <strong>"{levelData.hint}"</strong></span>
            </div>
          </div>

          {/* 2. Bottom-Left Floating Reference & Alignment Panel */}
          <div className="vg-floating-ref-panel vg-sprint-ref-panel">
            <div className="vg-floating-ref-header">
              <span className="vg-floating-ref-title">📖 Vigenère Alignment</span>
            </div>

            <div className="vg-formula-prominent">
              Formula: <strong>Plain = (Cipher − Key + 26) mod 26</strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div className="vg-alignment-labels">
                <div>CIPHER</div>
                <div>KEY</div>
                <div>SHIFT</div>
                <div>PLAIN</div>
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
                      title={`Pos ${item.index + 1}: ${item.cipherChar} (${charToIdx(item.cipherChar)}) − ${item.keyChar} (${item.shiftVal}) = ${item.isSolved ? item.plainChar : '?'}`}
                    >
                      <span className="vg-align-cipher">{item.cipherChar}</span>
                      <span className="vg-align-key">{item.keyChar}</span>
                      <span className="vg-align-shift">-{item.shiftVal}</span>
                      <span
                        className="vg-align-plain"
                        style={{ color: item.isSolved ? 'var(--neon-green)' : (item.isActive ? 'var(--neon-cyan)' : 'var(--neon-yellow)') }}
                      >
                        {item.isSolved ? item.plainChar : (item.isActive ? '?' : '_')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="vg-samples-section">
              <div className="vg-samples-title">
                <span>Target Position #{currentIdx + 1}</span>
                <span style={{ color: 'var(--neon-cyan)', fontFamily: 'JetBrains Mono, monospace' }}>
                  Key: '{currentKeyChar}' (-{currentShiftKey})
                </span>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                Cipher <strong>'{currentBatonLetter}'</strong> ({charToIdx(currentBatonLetter)}) − Key <strong>'{currentKeyChar}'</strong> ({currentShiftKey}) = Steer into lane <strong>'{currentTargetChar}'</strong>
              </div>
            </div>

            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginTop: 2, paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <span>🎮 Controls: <strong>W/S</strong> or <strong>↑/↓</strong> switch lanes</span>
              <span><strong>Space</strong> pause</span>
            </div>
          </div>

          {/* 3. Bottom-Right Floating Reference: A-Z Value Reference & Decryption Helper */}
          <div className={`vg-floating-key-panel vg-fishing-az-panel vg-sprint-az-panel ${isCrashing ? 'shake' : ''}`}>
            <div className="vg-floating-current-slot">
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  A–Z Value Reference
                </div>
                <div style={{ fontSize: '0.84rem', color: '#fff', fontWeight: 700 }}>
                  Decryption Arithmetic
                </div>
              </div>
              <div className="vg-slot-badge-lg" style={{ fontSize: '0.9rem', padding: '2px 10px' }}>
                {currentMaskIndex}/{maskedIndices.length} Cleared
              </div>
            </div>

            {/* Active calculation card */}
            <div className="vg-fishing-calc-card">
              <div className="vg-calc-top-row">
                <span className="vg-calc-label">Active Letter Decryption:</span>
                <span className="vg-calc-badge">Pos #{currentIdx + 1}</span>
              </div>
              <div className="vg-calc-formula-row">
                <div className="vg-calc-item cipher">
                  <span className="lbl">Cipher</span>
                  <strong>{currentBatonLetter}</strong>
                  <span className="val">{charToIdx(currentBatonLetter)}</span>
                </div>
                <span className="vg-calc-op">−</span>
                <div className="vg-calc-item key">
                  <span className="lbl">Key</span>
                  <strong>{currentKeyChar}</strong>
                  <span className="val">{currentShiftKey}</span>
                </div>
                <span className="vg-calc-op">=</span>
                <div className="vg-calc-item plain">
                  <span className="lbl">Target</span>
                  <strong style={{ color: 'var(--neon-green)' }}>
                    {currentTargetChar}
                  </strong>
                  <span className="val">
                    {(charToIdx(currentBatonLetter) - currentShiftKey + 26) % 26}
                  </span>
                </div>
              </div>
            </div>

            {/* 2-row x 13-col Alphabet grid */}
            <div className="vg-sprint-alphabet-grid" style={{ marginTop: '2px' }}>
              <div className="vg-alphabet-row">
                {ALPHABET.slice(0, 13).map((ch, i) => {
                  const isCipher = ch === currentBatonLetter;
                  const isKey = ch === currentKeyChar;
                  let cellClass = "vg-alphabet-cell";
                  if (isCipher) cellClass += " is-cipher";
                  if (isKey) cellClass += " is-key";
                  return (
                    <div key={ch} className={cellClass} title={`${ch} = ${i}`}>
                      <span className="vg-alpha-char">{ch}</span>
                      <span className="vg-alpha-val">{i}</span>
                    </div>
                  );
                })}
              </div>
              <div className="vg-alphabet-row">
                {ALPHABET.slice(13, 26).map((ch, i) => {
                  const val = i + 13;
                  const isCipher = ch === currentBatonLetter;
                  const isKey = ch === currentKeyChar;
                  let cellClass = "vg-alphabet-cell";
                  if (isCipher) cellClass += " is-cipher";
                  if (isKey) cellClass += " is-key";
                  return (
                    <div key={ch} className={cellClass} title={`${ch} = ${val}`}>
                      <span className="vg-alpha-char">{ch}</span>
                      <span className="vg-alpha-val">{val}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <span>Lives Remaining:</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', color: lives <= 2 ? '#f87171' : 'var(--neon-green)', fontWeight: 'bold' }}>
                {'❤️'.repeat(Math.max(0, lives))} ({lives}/5)
              </span>
            </div>
          </div>

          {/* 5. Floating Action / Outcome Panels */}
          {sprintStep === 'finished' && <VictoryConfetti isPaused={isPaused} />}
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
      <h3>SECURED!</h3>
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
        Verify & Submit
      </button>
      {onReplayNewQuestion && (
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
          Play Again
        </button>
      )}
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
      <strong style={{ color: 'var(--neon-red)', fontSize: '1rem' }}>SYSTEM FAILURE!</strong>
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
        Try Again
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
      <strong style={{ color: 'var(--neon-red)', fontSize: '1rem' }}>CRASH! GATE STAYED SHUT</strong>
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
        Try Checkpoint Again
      </button>
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
