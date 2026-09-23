/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import '../sprint/CipherSprint.css';
import '../../CipherGame.css';
import GameHudBar from '../../ui/GameHudBar';
import StageLoadingScreen from '../../ui/StageLoadingScreen';
import { useFullscreen } from '../../core/hooks/useFullscreen';
import FullscreenButton from '../../ui/FullscreenButton';
import PauseMenu from '../../ui/PauseMenu';
import CryptographicRecap from '../../ui/CryptographicRecap';
import VictoryConfetti from '../../ui/VictoryConfetti';
import { sprintSound } from '../sprint/sprintSound';
import {
  transformPlayfairPair,
  describePlayfairRule,
} from './PlayfairHelpers';

const BASE_SPEED = 0.22;
const BOOST_MULT = 1.6;
const RUNNER_X = 14;
const DIAMOND_HITBOX_HALF = 2.2;
const SLIME_HITBOX_HALF = 4.2;
const COIN_START_X = 112;

const BRIEFING_MS = 2200;
const LOCKING_MS = 1200;
const RESOLVED_MS = 1600;

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

  /* ───────────────────────────────────────────────
     Static / memoised level data
     ─────────────────────────────────────────────── */
  const pairData = useMemo(
    () =>
      (levelData.cipherPairs || []).map((cipherPair, index) => {
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

  /* ───────────────────────────────────────────────
     Game state (visual — allowed to trigger renders)
     ─────────────────────────────────────────────── */
  const [sprintStep, setSprintStep] = useState('ready');
  const [roundPhase, setRoundPhase] = useState('briefing');
  const [currentMaskIndex, setCurrentMaskIndex] = useState(0);
  const [runnerLane, setRunnerLane] = useState(1);
  const [coins, setCoins] = useState([]);
  const [slimes, setSlimes] = useState([]);
  const [pickedPair, setPickedPair] = useState(null);
  const [pickedLane, setPickedLane] = useState(null);
  const [correctLane, setCorrectLane] = useState(1);
  const [attempts, setAttempts] = useState([]);
  const [crashMessage] = useState('');
  const [resolvedStatus, setResolvedStatus] = useState(null); // 'correct' | 'wrong' | 'missed'
  const [resolvedBannerText, setResolvedBannerText] = useState('');
  const [solvedLetters, setSolvedLetters] = useState({});
  const [isCrashing, setIsCrashing] = useState(false);
  const [lives, setLives] = useState(5);
  const [laneChangeEffect, setLaneChangeEffect] = useState(null);
  const [speedLines, setSpeedLines] = useState(() => {
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
    return list;
  });
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
  const [isBadgePopping, setIsBadgePopping] = useState(false);
  const [slimeFrame, setSlimeFrame] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  /* ───────────────────────────────────────────────
     Refs — game truth inside RAF loop, timeout tracking
     ─────────────────────────────────────────────── */
  const rafRef = useRef(0);
  const prevLaneRef = useRef(1);
  const isBoostingRef = useRef(false);
  const runnerLaneRef = useRef(1);
  const isPausedRef = useRef(false);
  const isCrashingRef = useRef(false);
  const isMenuOpenRef = useRef(false);
  const sprintStepRef = useRef('ready');
  const roundPhaseRef = useRef('briefing');
  const currentMaskIndexRef = useRef(0);
  const pickedPairRef = useRef(null);
  const pickedLaneRef = useRef(null);
  const correctLaneRef = useRef(1);
  const slimesRef = useRef([]);
  const attemptsRef = useRef([]);
  const hasPickedRef = useRef(false);
  const prevLevelIdRef = useRef(null);

  /* Timer tracking refs */
  const feedbackTimeoutRef = useRef(0);
  const spinTimeoutRef = useRef(0);
  const boostTimeoutRef = useRef(0);
  const shakeTimeoutRef = useRef(0);
  const laneTiltTimeoutRef = useRef(0);
  const slimeIntervalRef = useRef(0);
  const badgePopTimeoutRef = useRef(0);

  /* Pausable phase timer refs */
  const phaseTimeoutRef = useRef(null);
  const phaseStartTimeRef = useRef(0);
  const phaseRemainingMsRef = useRef(0);
  const phaseDurationRef = useRef(BRIEFING_MS);
  const phaseCallbackRef = useRef(null);

  /* Forward refs for phase transition functions & physics callbacks */
  const startBriefingPhaseRef = useRef(null);
  const startChoosingPhaseRef = useRef(null);
  const resolveChoiceRef = useRef(null);
  const triggerShakeRef = useRef(null);
  const showFeedbackRef = useRef(null);

  /* Sync refs whenever state changes — RAF loop reads refs only */
  useEffect(() => { isBoostingRef.current = isBoosting; }, [isBoosting]);
  useEffect(() => { runnerLaneRef.current = runnerLane; }, [runnerLane]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { isCrashingRef.current = isCrashing; }, [isCrashing]);
  useEffect(() => { isMenuOpenRef.current = isMenuOpen; }, [isMenuOpen]);
  useEffect(() => { sprintStepRef.current = sprintStep; }, [sprintStep]);
  useEffect(() => { roundPhaseRef.current = roundPhase; }, [roundPhase]);
  useEffect(() => { currentMaskIndexRef.current = currentMaskIndex; }, [currentMaskIndex]);
  useEffect(() => { pickedPairRef.current = pickedPair; }, [pickedPair]);
  useEffect(() => { pickedLaneRef.current = pickedLane; }, [pickedLane]);
  useEffect(() => { correctLaneRef.current = correctLane; }, [correctLane]);
  useEffect(() => { attemptsRef.current = attempts; }, [attempts]);
  useEffect(() => { slimesRef.current = slimes; }, [slimes]);

  /* ───────────────────────────────────────────────
     Derived (re-compute each render, cheap)
     ─────────────────────────────────────────────── */
  const currentIdx = maskedIndices[currentMaskIndex] ?? 0;
  const currentPairObj = pairData[currentIdx] || {};
  const currentBatonPair = currentPairObj.cipherPair ?? '';
  const currentTargetPair = currentPairObj.plainPair ?? '';
  const currentRule = currentPairObj.rule ?? 'rectangle';
  const currentRuleDesc = describePlayfairRule(currentRule);

  const orangeSlimeSrc = `/assets/sprint/obstacle/obstacle1/SlimeOrange_${PAD5(slimeFrame)}.png`;
  const basicSlimeSrc = `/assets/sprint/obstacle/obstacle2/SlimeBasic_${PAD5(slimeFrame)}.png`;

  /* ───────────────────────────────────────────────
     Pausable Phase Timer Helpers
     ─────────────────────────────────────────────── */
  const clearPhaseTimer = useCallback(() => {
    if (phaseTimeoutRef.current) window.clearTimeout(phaseTimeoutRef.current);
    phaseTimeoutRef.current = null;
    phaseCallbackRef.current = null;
    phaseRemainingMsRef.current = 0;
    phaseStartTimeRef.current = 0;
  }, []);

  const startPhaseTimer = useCallback((callback, durationMs) => {
    if (phaseTimeoutRef.current) window.clearTimeout(phaseTimeoutRef.current);
    phaseStartTimeRef.current = Date.now();
    phaseRemainingMsRef.current = durationMs;
    phaseDurationRef.current = durationMs;
    phaseCallbackRef.current = callback;
    phaseTimeoutRef.current = window.setTimeout(() => {
      phaseTimeoutRef.current = null;
      callback();
    }, durationMs);
  }, []);

  const pausePhaseTimer = useCallback(() => {
    if (phaseTimeoutRef.current) {
      window.clearTimeout(phaseTimeoutRef.current);
      phaseTimeoutRef.current = null;
      const elapsed = Date.now() - phaseStartTimeRef.current;
      phaseRemainingMsRef.current = Math.max(0, phaseRemainingMsRef.current - elapsed);
    }
  }, []);

  const resumePhaseTimer = useCallback(() => {
    if (phaseRemainingMsRef.current > 0 && phaseCallbackRef.current) {
      phaseStartTimeRef.current = Date.now();
      const remaining = phaseRemainingMsRef.current;
      phaseTimeoutRef.current = window.setTimeout(() => {
        phaseTimeoutRef.current = null;
        if (phaseCallbackRef.current) phaseCallbackRef.current();
      }, remaining);
    }
  }, []);

  /* Freeze/resume phase timers on pause */
  useEffect(() => {
    if (isPaused || isMenuOpen) {
      pausePhaseTimer();
    } else if (sprintStep === 'running') {
      resumePhaseTimer();
    }
  }, [isPaused, isMenuOpen, sprintStep, pausePhaseTimer, resumePhaseTimer]);

  /* ───────────────────────────────────────────────
     Animation frame intervals (slime)
     ─────────────────────────────────────────────── */
  useEffect(() => {
    if (isPausedRef.current || sprintStepRef.current !== 'running') return undefined;
    slimeIntervalRef.current = window.setInterval(() => {
      setSlimeFrame((f) => (f + 1) % 30);
    }, 45);
    return () => window.clearInterval(slimeIntervalRef.current);
  }, [isPaused, sprintStep]);

  /* ───────────────────────────────────────────────
     Init speed lines once
     ─────────────────────────────────────────────── */
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

  /* ───────────────────────────────────────────────
     FX helpers with proper cleanup tracking
     ─────────────────────────────────────────────── */
  function clearAllFXTimeouts() {
    if (feedbackTimeoutRef.current) window.clearTimeout(feedbackTimeoutRef.current);
    if (spinTimeoutRef.current)     window.clearTimeout(spinTimeoutRef.current);
    if (boostTimeoutRef.current)    window.clearTimeout(boostTimeoutRef.current);
    if (shakeTimeoutRef.current)    window.clearTimeout(shakeTimeoutRef.current);
    if (laneTiltTimeoutRef.current) window.clearTimeout(laneTiltTimeoutRef.current);
    if (phaseTimeoutRef.current)    window.clearTimeout(phaseTimeoutRef.current);
    if (badgePopTimeoutRef.current) window.clearTimeout(badgePopTimeoutRef.current);
    feedbackTimeoutRef.current = spinTimeoutRef.current = boostTimeoutRef.current = 0;
    shakeTimeoutRef.current = laneTiltTimeoutRef.current = badgePopTimeoutRef.current = 0;
    setIsBadgePopping(false);
    phaseTimeoutRef.current = null;
    phaseCallbackRef.current = null;
    phaseRemainingMsRef.current = 0;
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
    spinTimeoutRef.current = window.setTimeout(() => setIsSpinning(false), 350);
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

  /* ───────────────────────────────────────────────
     Phase 1: Briefing
     ─────────────────────────────────────────────── */
  const startBriefingPhase = useCallback(() => {
    clearPhaseTimer();
    setRoundPhase('briefing');
    roundPhaseRef.current = 'briefing';
    hasPickedRef.current = false;
    setPickedPair(null);
    pickedPairRef.current = null;
    setPickedLane(null);
    pickedLaneRef.current = null;
    setResolvedStatus(null);
    setResolvedBannerText('');

    startPhaseTimer(() => {
      if (startChoosingPhaseRef.current) startChoosingPhaseRef.current();
    }, BRIEFING_MS);
  }, [clearPhaseTimer, startPhaseTimer]);

  /* ───────────────────────────────────────────────
     Phase 2: Choosing
     ─────────────────────────────────────────────── */
  const startChoosingPhase = useCallback(() => {
    clearPhaseTimer();
    setRoundPhase('choosing');
    roundPhaseRef.current = 'choosing';
    hasPickedRef.current = false;

    // Randomize correct lane per round
    const randLane = Math.floor(Math.random() * 3);
    correctLaneRef.current = randLane;
    setCorrectLane(randLane);

    const tempIdx = maskedIndices[currentMaskIndexRef.current] ?? 0;
    const targetPair = pairData[tempIdx]?.plainPair ?? '';
    const [decoy1, decoy2] = makeDecoyPairs(targetPair, 2, matrix);
    const otherLanes = [0, 1, 2].filter((l) => l !== randLane);

    const startX = COIN_START_X;
    const newCoins = [
      { id: `c1-${Date.now()}`, lane: randLane, char: targetPair, x: startX, isCorrect: true, picked: false },
      { id: `c2-${Date.now()}`, lane: otherLanes[0], char: decoy1, x: startX, isCorrect: false, picked: false },
      { id: `c3-${Date.now()}`, lane: otherLanes[1], char: decoy2, x: startX, isCorrect: false, picked: false },
    ];
    setCoins((prev) => [...prev.filter((c) => c.x > -15), ...newCoins]);

    // Spawn obstacle slimes off-screen right, staggered
    const slimeBaseX = 118;
    const newSlimes = [
      { id: `slime-1-${Date.now()}`, lane: otherLanes[0], x: slimeBaseX + 28, hit: false },
      { id: `slime-2-${Date.now()}`, lane: otherLanes[1], x: slimeBaseX + 58, hit: false },
    ];
    setSlimes((prev) => {
      const combined = [...prev.filter((s) => s.x > -12), ...newSlimes];
      slimesRef.current = combined;
      return combined;
    });
  }, [clearPhaseTimer, pairData, maskedIndices, matrix]);

  /* ───────────────────────────────────────────────
     Phase 3: Resolved (immediate on diamond pick or miss)
     ─────────────────────────────────────────────── */
  const resolveChoice = useCallback((picked, lane, isCoinCorrect) => {
    clearPhaseTimer();
    setRoundPhase('resolved');
    roundPhaseRef.current = 'resolved';
    hasPickedRef.current = true;
    setPickedPair(picked);
    pickedPairRef.current = picked;
    setPickedLane(lane);
    pickedLaneRef.current = lane;

    const tempIdx = maskedIndices[currentMaskIndexRef.current] ?? 0;
    const cipherP = pairData[tempIdx]?.cipherPair ?? '';
    const targetPair = pairData[tempIdx]?.plainPair ?? '';
    const isCorrect = (picked && picked === targetPair) || isCoinCorrect === true;

    setAttempts((prev) => [
      ...prev,
      {
        index: tempIdx,
        cipherPair: cipherP,
        keyCollected: picked || 'Missed',
        correct: isCorrect,
        firstTry: firstTryForCurrent,
      },
    ]);

    if (isCorrect) {
      setResolvedStatus('correct');
      sprintSound.playSfx('collect');
      triggerSpin();
      triggerBoost(1200);
      showFeedback('⚡ Correct Digraph! BOOST!', '#22c55e', 10, 1100);
      // Fill into top word panel visibly in green
      setSolvedLetters((prev) => ({ ...prev, [tempIdx]: targetPair }));

      const nextMaskIdx = currentMaskIndexRef.current + 1;
      const nextIdx = maskedIndices[nextMaskIdx];
      const nextCipher = nextIdx !== undefined ? pairData[nextIdx]?.cipherPair : null;
      const bannerMsg = nextCipher
        ? `Direct hit! Now decode '${nextCipher}'!`
        : `Direct hit! Message Decrypted!`;
      setResolvedBannerText(bannerMsg);

      startPhaseTimer(() => {
        const nextIndex = currentMaskIndexRef.current + 1;
        if (nextIndex < maskedIndices.length) {
          setCurrentMaskIndex(nextIndex);
          currentMaskIndexRef.current = nextIndex;
          setFirstTryForCurrent(true);
          if (startBriefingPhaseRef.current) startBriefingPhaseRef.current();
        } else {
          setSprintStep('finished');
          sprintSound.stopBgm();
          sprintSound.playSfx('win');
        }
      }, RESOLVED_MS);
    } else {
      setResolvedStatus(picked ? 'wrong' : 'missed');
      sprintSound.playSfx('collision');
      triggerShake();
      setFirstTryForCurrent(false);

      // Worked answer banner: CF [rule] = HE
      const workedAnswer = `${cipherP} [${currentRule}] = ${targetPair}`;
      setResolvedBannerText(workedAnswer);

      setLives((prevLives) => {
        const nextLives = prevLives - 1;
        if (nextLives <= 0) {
          startPhaseTimer(() => {
            setSprintStep('gameover');
            sprintSound.stopBgm();
            sprintSound.playSfx('lose');
          }, RESOLVED_MS);
        } else {
          startPhaseTimer(() => {
            // Re-ask the same digraph from briefing
            if (startBriefingPhaseRef.current) startBriefingPhaseRef.current();
          }, RESOLVED_MS);
        }
        return nextLives;
      });
    }
  }, [
    clearPhaseTimer,
    currentRule,
    firstTryForCurrent,
    maskedIndices,
    pairData,
    startPhaseTimer,
    triggerBoost,
    showFeedback,
    triggerShake,
    triggerSpin,
  ]);

  /* Link forward refs */
  useEffect(() => {
    startBriefingPhaseRef.current = startBriefingPhase;
    startChoosingPhaseRef.current = startChoosingPhase;
    resolveChoiceRef.current = resolveChoice;
    triggerShakeRef.current = triggerShake;
    showFeedbackRef.current = showFeedback;
  }, [startBriefingPhase, startChoosingPhase, resolveChoice, triggerShake, showFeedback]);

  /* ───────────────────────────────────────────────
     Game flow actions
     ─────────────────────────────────────────────── */
  const handleStartSprint = () => {
    sprintSound.unlockAudio();
    sprintSound.playBgm();
    clearAllFXTimeouts();
    setCurrentMaskIndex(0);
    currentMaskIndexRef.current = 0;
    hasPickedRef.current = false;
    setAttempts([]);
    setLives(5);
    setFirstTryForCurrent(true);
    setIsPaused(false);
    setIsMenuOpen(false);
    setSprintStep('running');
    setCoins([]);
    setSlimes([]);
    slimesRef.current = [];

    // Initialize pre-revealed hints
    const initialSolved = {};
    hintIndices.forEach((idx) => {
      initialSolved[idx] = pairData[idx]?.plainPair;
    });
    setSolvedLetters(initialSolved);

    startBriefingPhase();
  };

  const handleRetryFromCheckpoint = () => {
    sprintSound.unlockAudio();
    sprintSound.playBgm();
    clearAllFXTimeouts();
    setLives(5);
    setFirstTryForCurrent(true);
    setIsCrashing(false);
    setIsPaused(false);
    setIsMenuOpen(false);
    hasPickedRef.current = false;
    setCoins([]);
    setSlimes([]);
    slimesRef.current = [];
    setSprintStep('running');
    startBriefingPhase();
  };

  const handleContinueAfterCrash = () => {
    clearAllFXTimeouts();
    setIsCrashing(false);
    setSprintStep('running');
    setRoundPhase('briefing');
    roundPhaseRef.current = 'briefing';
    startBriefingPhase();
  };

  /* ───────────────────────────────────────────────
     Fullscreen keybind
     ─────────────────────────────────────────────── */
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

  /* ───────────────────────────────────────────────
     Keyboard steering (free across all round phases)
     ─────────────────────────────────────────────── */
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

  /* ───────────────────────────────────────────────
     Lane-change tilt visual (tracks runnerLane)
     ─────────────────────────────────────────────── */
  useEffect(() => {
    if (runnerLane === prevLaneRef.current) return undefined;
    const dir = runnerLane < prevLaneRef.current ? 'moving-up' : 'moving-down';
    setLaneChangeEffect(dir);
    if (sprintStepRef.current === 'running') {
      sprintSound.playSfx(dir === 'moving-up' ? 'goUp' : 'goDown');
    }
    prevLaneRef.current = runnerLane;
    if (laneTiltTimeoutRef.current) window.clearTimeout(laneTiltTimeoutRef.current);
    laneTiltTimeoutRef.current = window.setTimeout(() => setLaneChangeEffect(null), 180);
    return () => { /* timer handled above */ };
  }, [runnerLane]);

  /* ───────────────────────────────────────────────
     MAIN PHYSICS / GAME LOOP (RAF)
     ─────────────────────────────────────────────── */
  useEffect(() => {
    if (sprintStep !== 'running') return undefined;
    if (isCrashing || isPaused || isMenuOpen || showExplanation) return undefined;

    const updatePhysics = () => {
      if (isPausedRef.current || isCrashingRef.current || isMenuOpenRef.current || sprintStepRef.current !== 'running') {
        return;
      }

      const speed = isBoostingRef.current ? BASE_SPEED * BOOST_MULT : BASE_SPEED;
      const lane = runnerLaneRef.current;
      const phase = roundPhaseRef.current;

      /* Speed lines */
      setSpeedLines((prevLines) =>
        prevLines.map((line) => {
          const lineSpeed = isBoostingRef.current ? line.speed * 4 : line.speed;
          let nextX = line.x - lineSpeed * 0.4;
          if (nextX < -15) nextX = 115;
          return { ...line, x: nextX };
        })
      );

      /* Diamonds continuous movement + collision in choosing phase */
      setCoins((prevCoins) => {
        if (prevCoins.length === 0) return prevCoins;

        let changed = false;
        let pickedInFrame = null;
        let allExited = true;

        const updated = [];
        for (let i = 0; i < prevCoins.length; i++) {
          const coin = prevCoins[i];
          const nextX = coin.x - speed;

          // Despawn diamonds that scroll off-screen left (below x < -15)
          if (nextX < -15) {
            changed = true;
            continue;
          }

          if (nextX >= -10) {
            allExited = false;
          }

          // Check symmetric collision ONLY in 'choosing' phase and if not picked yet
          if (
            phase === 'choosing' &&
            !pickedInFrame &&
            !hasPickedRef.current &&
            Math.abs(nextX - RUNNER_X) <= DIAMOND_HITBOX_HALF &&
            coin.lane === lane
          ) {
            hasPickedRef.current = true;
            pickedInFrame = coin;
            changed = true;
            // Picked diamond stays on track, turns green/red via coin.picked; does NOT vanish
            updated.push({ ...coin, x: nextX, picked: true });
            continue;
          }

          if (nextX !== coin.x) changed = true;
          updated.push({ ...coin, x: nextX });
        }

        if (pickedInFrame) {
          // Trigger badge pickup pop FX
          if (badgePopTimeoutRef.current) window.clearTimeout(badgePopTimeoutRef.current);
          setIsBadgePopping(true);
          badgePopTimeoutRef.current = window.setTimeout(() => setIsBadgePopping(false), 350);

          if (resolveChoiceRef.current) {
            resolveChoiceRef.current(pickedInFrame.char, pickedInFrame.lane, pickedInFrame.isCorrect);
          }
          return updated;
        }

        // If all three exited off-screen left with nothing picked in choosing phase -> miss
        if (allExited && prevCoins.length > 0 && phase === 'choosing' && !hasPickedRef.current) {
          hasPickedRef.current = true;
          if (resolveChoiceRef.current) {
            resolveChoiceRef.current(null, null, false);
          }
          return updated;
        }

        return changed ? updated : prevCoins;
      });

      /* Obstacle Slimes movement & collision */
      if (sprintStepRef.current === 'running' && slimesRef.current.length > 0) {
        setSlimes((prevSlimes) => {
          let changed = false;
          const updated = [];
          for (let i = 0; i < prevSlimes.length; i++) {
            const slime = prevSlimes[i];
            const nextX = slime.x - speed;

            // Despawn below about x < -12
            if (nextX < -12) {
              changed = true;
              continue;
            }

            if (
              !slime.hit &&
              Math.abs(nextX - RUNNER_X) <= SLIME_HITBOX_HALF &&
              slime.lane === lane
            ) {
              changed = true;
              if (triggerShakeRef.current) triggerShakeRef.current();
              sprintSound.playSfx('collision');
              setLives((l) => {
                const next = l - 1;
                if (next <= 0) {
                  setSprintStep('gameover');
                  sprintSound.stopBgm();
                  sprintSound.playSfx('lose');
                }
                return next;
              });
              if (showFeedbackRef.current) {
                showFeedbackRef.current('-1 Life! Slime Collision!', '#ef4444', 20 + slime.lane * 30 - 8, 900);
              }
              updated.push({ ...slime, x: nextX, hit: true });
              continue;
            }

            if (nextX !== slime.x) changed = true;
            updated.push({ ...slime, x: nextX });
          }
          slimesRef.current = updated;
          return changed ? updated : prevSlimes;
        });
      }

      rafRef.current = requestAnimationFrame(updatePhysics);
    };

    rafRef.current = requestAnimationFrame(updatePhysics);
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, [
    sprintStep,
    isCrashing,
    isPaused,
    isMenuOpen,
    showExplanation,
  ]);

  /* ───────────────────────────────────────────────
     Level changes -> reset everything
     ─────────────────────────────────────────────── */
  useEffect(() => {
    const currentLevelId = `${levelData?.level}-${levelData?.pairCiphertext || levelData?.ciphertext}`;
    if (prevLevelIdRef.current === currentLevelId) {
      return;
    }
    prevLevelIdRef.current = currentLevelId;

    clearAllFXTimeouts();
    setSprintStep('ready');
    setRoundPhase('briefing');
    setCurrentMaskIndex(0);
    setRunnerLane(1);
    setCoins([]);
    setSlimes([]);
    slimesRef.current = [];
    setAttempts([]);
    setResolvedStatus(null);
    setResolvedBannerText('');
    setSolvedLetters({});
    setIsCrashing(false);
    setLives(5);
    setFirstTryForCurrent(true);
    setIsPaused(false);
    setIsMenuOpen(false);
    setShowExplanation(false);
    setFeedbackText('');
    runnerLaneRef.current = 1;
  }, [levelData]);

  /* ───────────────────────────────────────────────
     Audio — BGM follows the run state
     ─────────────────────────────────────────────── */
  useEffect(() => {
    if (sprintStep === 'running' && !isPaused && !isMenuOpen && !showExplanation) {
      sprintSound.playBgm();
    } else {
      sprintSound.pauseBgm();
    }
  }, [sprintStep, isPaused, isMenuOpen, showExplanation]);

  useEffect(() => {
    return () => {
      clearAllFXTimeouts();
      if (slimeIntervalRef.current) window.clearInterval(slimeIntervalRef.current);
      if (rafRef.current)           window.cancelAnimationFrame(rafRef.current);
      sprintSound.stopBgm();
    };
  }, []);

  /* ───────────────────────────────────────────────
     Audio — mute toggle button
     ─────────────────────────────────────────────── */
  const toggleSound = () => {
    const muted = sprintSound.toggleMute();
    setIsMuted(muted);
  };

  const soundToggleButton = (
    <button
      className="fg-btn-icon"
      onClick={toggleSound}
      title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
      style={{
        background: 'rgba(255, 255, 255, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '8px',
        color: '#fff',
        padding: '4px 8px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        fontSize: '1rem',
      }}
    >
      {isMuted ? '🔇' : '🔊'}
    </button>
  );

  const handleVerifySubmit = () => {
    clearAllFXTimeouts();
    sprintSound.stopBgm();
    setShowExplanation(true);
  };

  const handleCloseExplanation = () => {
    onVerifySubmit();
  };

  /* ───────────────────────────────────────────────
     Runner animation state
     ─────────────────────────────────────────────── */
  let runnerAnim = 'idle';
  if (sprintStep === 'gameover' || isCrashing) runnerAnim = 'death';
  else if (isPaused) runnerAnim = 'idle';
  else if (laneChangeEffect !== null || isBoosting) runnerAnim = 'jump';
  else if (sprintStep === 'running') runnerAnim = 'run';

  /* ═══════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════ */
  return (
    <div
      ref={fsContainerRef}
      className={`sprint-container fg-root ${isFullscreen ? 'is-fullscreen' : ''}`}
    >
      {/* ───── Recap overlay ───── */}
      {showExplanation && (
        <CryptographicRecap
          cipherType="playfair"
          levelData={levelData}
          onUnlockNext={handleCloseExplanation}
        />
      )}

      {/* HUD Header */}
      <GameHudBar
        title="Playfair Sprint Relay"
        stage={levelData.level}
        tier={tier}
        isReady={sprintStep === 'ready'}
        onBackToStages={onBackToStages}
        onOpenMenu={() => setIsMenuOpen(true)}
        lives={sprintStep === 'ready' ? null : lives}
        customRightContent={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {soundToggleButton}
            <FullscreenButton isFullscreen={isFullscreen} onToggle={toggleFullscreen} />
          </div>
        }
        extraRight={<FullscreenButton isFullscreen={isFullscreen} onToggle={toggleFullscreen} />}
      />

      {/* ───── Ready Screen ───── */}
      {sprintStep === 'ready' ? (
        isOperationLoading ? (
          <StageLoadingScreen
            category="playfair"
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
                <h2 className="cq-dossier-title">Playfair Sprint Relay</h2>
                <p className="cq-dossier-subtitle">
                  Baton relay digraph challenge! Steer the runner into the lane carrying the correct plaintext digraph to decrypt checkpoints.
                </p>
                <hr className="cq-dossier-divider" />
                <div className="cq-dossier-data">
                  <div className="cq-dossier-row">
                    <span className="cq-dossier-label">CIPHERTEXT</span>
                    <span className="cq-dossier-value cyan-mono">{levelData.pairCiphertext || levelData.ciphertext}</span>
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
                  Use <strong>Arrow UP/DOWN</strong> or <strong>W/S</strong> keys to switch lanes. Collect the correct plaintext digraph calculated using the 5×5 Playfair key matrix. Dodge the obstacle slimes! Decoy digraphs will cause a crash! Press <strong>F</strong> to toggle fullscreen.
                </p>
                <button className="cq-dossier-action-btn" onClick={() => { sprintSound.unlockAudio(); setIsOperationLoading(true); }}>
                  Begin operation
                </button>
              </div>
            </div>
          </div>
        )
      ) : (
        /* ───── Running / Gameplay Layout (Fullscreen EdgetoEdge) ───── */
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
            {/* Parallax layers */}
            <div className="sprint-parallax-layer sprint-bg-sky" />
            <div className="sprint-parallax-layer sprint-bg-hills-far" />
            <div className="sprint-parallax-layer sprint-bg-hills-near" />
            <div className="sprint-parallax-layer sprint-bg-ruins" />
            <div className="sprint-bg-trees-front" />
            <div className="sprint-track-vignette" />

            {/* Speed lines */}
            {speedLines.map((line) => (
              <div
                key={line.id}
                className="sprint-speed-line"
                style={{ left: `${line.x}%`, top: `${line.y}%`, width: `${line.width}px` }}
              />
            ))}

            {/* Lanes */}
            <div
              className={`sprint-lane lane-0 ${runnerLane === 0 ? 'highlighted' : ''}`}
              onClick={() => {
                if (sprintStep === 'running' && !isPausedRef.current && (roundPhaseRef.current === 'choosing' || roundPhaseRef.current === 'resolved')) {
                  setRunnerLane(0);
                }
              }}
            >
              <div className="sprint-lane-platform platform-upper" />
              <span className="sprint-lane-badge">Top Lane</span>
            </div>
            <div
              className={`sprint-lane lane-1 ${runnerLane === 1 ? 'highlighted' : ''}`}
              onClick={() => {
                if (sprintStep === 'running' && !isPausedRef.current && (roundPhaseRef.current === 'choosing' || roundPhaseRef.current === 'resolved')) {
                  setRunnerLane(1);
                }
              }}
            >
              <div className="sprint-lane-platform platform-middle" />
              <span className="sprint-lane-badge">Middle Lane</span>
            </div>
            <div
              className={`sprint-lane lane-2 ${runnerLane === 2 ? 'highlighted' : ''}`}
              onClick={() => {
                if (sprintStep === 'running' && !isPausedRef.current && (roundPhaseRef.current === 'choosing' || roundPhaseRef.current === 'resolved')) {
                  setRunnerLane(2);
                }
              }}
            >
              <div className="sprint-lane-platform platform-bottom" />
              <span className="sprint-lane-badge">Bottom Lane</span>
            </div>

            {/* Decorative plant accents */}
            <div className="sprint-track-plants">
              <div className="sprint-plant-orb plant-orb-1" />
              <div className="sprint-plant-orb plant-orb-2" />
            </div>

            {/* Runner */}
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
              <div
                className={[
                  'runner-baton-glow',
                  isBadgePopping ? 'badge-pickup' : '',
                  roundPhase === 'resolved' && resolvedStatus === 'correct' ? 'badge-correct' : '',
                  roundPhase === 'resolved' && (resolvedStatus === 'wrong' || resolvedStatus === 'missed') ? 'badge-wrong' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {sprintStep === 'finished'
                  ? '✓'
                  : pickedPair
                  ? pickedPair
                  : currentBatonPair}
              </div>
            </div>

            {/* Answer Diamonds (carrying digraphs) */}
            {sprintStep === 'running' &&
              coins.map((coin) => {
                let stateClass = '';
                if (coin.picked) {
                  stateClass = coin.isCorrect ? 'correct' : 'wrong';
                }

                return (
                  <div
                    key={coin.id}
                    className={`sprint-r2-diamond-sprite lane-${coin.lane} ${stateClass}`}
                    style={{ left: `${coin.x}%` }}
                  >
                    <div className="sprint-r2-diamond-inner" style={{ width: '52px', height: '52px' }}>
                      <span className="sprint-r2-diamond-char" style={{ fontSize: '1.1rem', letterSpacing: '1px' }}>
                        {coin.char}
                      </span>
                    </div>
                  </div>
                );
              })}

            {/* Obstacle Slimes (pure obstacles, no letters) */}
            {sprintStep === 'running' &&
              slimes.map((slime) => {
                if (slime.hit) return null;
                return (
                  <div
                    key={slime.id}
                    className={`sprint-r2-obstacle-slime sprint-slime-obstacle-sprite lane-${slime.lane}`}
                    style={{ left: `${slime.x}%` }}
                  >
                    <img
                      className="sprint-slime-img"
                      src={slime.lane % 2 === 0 ? orangeSlimeSrc : basicSlimeSrc}
                      alt="Obstacle Slime"
                    />
                  </div>
                );
              })}

            {/* Centre-track Phase Banner & Filling Progress Bar */}
            {sprintStep === 'running' &&
              (roundPhase === 'briefing' ||
                roundPhase === 'locking' ||
                roundPhase === 'resolved') && (
                <div
                  key={`banner-${roundPhase}-${currentMaskIndex}-${firstTryForCurrent}`}
                  className={[
                    'sprint-r2-center-banner',
                    roundPhase === 'resolved'
                      ? resolvedStatus === 'correct'
                        ? 'state-correct'
                        : 'state-wrong'
                      : roundPhase === 'locking'
                      ? 'state-locking'
                      : 'state-briefing',
                  ].join(' ')}
                >
                  {roundPhase === 'briefing' && (
                    <>
                      <span className="sprint-r2-panel-tag">DECRYPTION BRIEF · {currentRule.toUpperCase()}</span>
                      <div className="sprint-r2-banner-title">
                        Decode Digraph '<strong>{currentBatonPair}</strong>'
                      </div>
                      <div className="sprint-r2-math-equation">
                        <span className="sprint-r2-math-chip cipher">{currentBatonPair}</span>
                        <span className="sprint-r2-math-op">[{currentRule}]</span>
                        <span className="sprint-r2-math-op">→</span>
                        <span className="sprint-r2-math-chip target mystery">??</span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                        {currentRuleDesc}
                      </div>
                    </>
                  )}

                  {roundPhase === 'locking' && (
                    <>
                      <span className="sprint-r2-panel-tag">SELECTION LOCKED</span>
                      <div className="sprint-r2-banner-title">
                        Applying Playfair Matrix Rule
                      </div>
                      <div className="sprint-r2-math-equation">
                        <span className="sprint-r2-math-chip cipher">{currentBatonPair}</span>
                        <span className="sprint-r2-math-op">[{currentRule}]</span>
                        <span className="sprint-r2-math-op">=</span>
                        <span className="sprint-r2-math-chip target locked">{pickedPair || '??'}</span>
                      </div>
                    </>
                  )}

                  {roundPhase === 'resolved' && (
                    <>
                      <span
                        className={`sprint-r2-panel-tag ${
                          resolvedStatus === 'correct' ? 'correct' : 'wrong'
                        }`}
                      >
                        {resolvedStatus === 'correct'
                          ? 'DIGRAPH DECRYPTED'
                          : resolvedStatus === 'missed'
                          ? 'TARGET MISSED'
                          : 'DECRYPTION ERROR'}
                      </span>
                      <div className="sprint-r2-math-equation">
                        <span className="sprint-r2-math-chip cipher">{currentBatonPair}</span>
                        <span className="sprint-r2-math-op">[{currentRule}]</span>
                        <span className="sprint-r2-math-op">=</span>
                        <span
                          className={`sprint-r2-math-chip target ${
                            resolvedStatus === 'correct' ? 'correct' : 'answer'
                          }`}
                        >
                          {currentTargetPair}
                        </span>
                      </div>
                      <div
                        className={`sprint-r2-banner-msg ${
                          resolvedStatus === 'correct' ? 'correct' : 'wrong'
                        }`}
                      >
                        {resolvedBannerText ||
                          (resolvedStatus === 'correct'
                            ? 'Direct Hit! Digraph Decrypted!'
                            : pickedPair
                            ? `Picked '${pickedPair}' — Correct answer is '${currentTargetPair}'`
                            : `Missed Diamond — Correct answer is '${currentTargetPair}'`)}
                      </div>
                    </>
                  )}

                  <div className="sprint-r2-progress-bar-container">
                    <div
                      key={`fill-${roundPhase}-${currentMaskIndex}-${firstTryForCurrent}`}
                      className="sprint-r2-progress-fill"
                      style={{
                        animation: `sprintR2Progress ${
                          roundPhase === 'briefing'
                            ? BRIEFING_MS
                            : roundPhase === 'locking'
                            ? LOCKING_MS
                            : RESOLVED_MS
                        }ms linear forwards`,
                      }}
                    />
                  </div>
                </div>
              )}

            {/* Floating feedback */}
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

          {/* 1. Top-Center Floating Word Panel */}
          <div className="sprint-r2-word-panel">
            <div className="sprint-r2-word-title">Decrypt Message "{levelData.pairCiphertext || levelData.ciphertext}"</div>
            <div className="sprint-r2-letters-row" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
              {pairData.map((pair, idx) => {
                const isMasked = !hintIndices.has(idx);
                const isCurrentActive = isMasked && idx === currentIdx && sprintStep === 'running';
                const isSolved = solvedLetters[idx] !== undefined;
                const plainPairStr = isSolved ? solvedLetters[idx] : '__';

                return (
                  <div
                    key={idx}
                    className={`sprint-r2-letter-box ${isSolved ? 'solved' : ''} ${isCurrentActive ? 'active' : ''}`}
                    style={{ width: '58px', minWidth: '58px' }}
                    title={`Cipher: ${pair.cipherPair} → Plain: ${isSolved ? pair.plainPair : '??'}`}
                  >
                    <span className="sprint-r2-box-cipher">{pair.cipherPair}</span>
                    <span className="sprint-r2-box-plain" style={{ fontSize: '1.05rem', letterSpacing: '1px' }}>{plainPairStr}</span>
                  </div>
                );
              })}
            </div>
            {levelData.hint && (
              <div className="sprint-r2-word-hint" style={{ marginTop: '4px' }}>
                🔑 Key: "{levelData.key}" · Hint: "{levelData.hint}"
              </div>
            )}
          </div>

          {/* 2. Bottom-Left Floating 5×5 Matrix Cheat Sheet */}
          <div className="caesar-floating-cheat-sheet sprint-cheat-sheet" style={{ maxWidth: '340px' }}>
            <div className="caesar-cheat-header">
              <span className="caesar-cheat-title">Playfair 5×5 Matrix</span>
              <span className="caesar-cheat-badge">Key: {levelData.key || 'KEY'}</span>
            </div>
            <div className="caesar-cheat-body" style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', width: '100%' }}>
                {matrix.map((row, rIdx) =>
                  row.map((letter, cIdx) => {
                    const isHighlighted =
                      currentBatonPair.includes(letter) ||
                      (letter === 'I' && currentBatonPair.includes('J')) ||
                      (letter === 'J' && currentBatonPair.includes('I'));
                    return (
                      <div
                        key={`${rIdx}-${cIdx}`}
                        style={{
                          padding: '3px 0',
                          textAlign: 'center',
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: '0.82rem',
                          fontWeight: 800,
                          borderRadius: '4px',
                          background: isHighlighted ? 'rgba(0, 229, 255, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                          color: isHighlighted ? '#00e5ff' : '#cbd5e1',
                          border: isHighlighted ? '1.5px solid #00e5ff' : '1px solid rgba(255, 255, 255, 0.1)',
                          boxShadow: isHighlighted ? '0 0 10px rgba(0, 229, 255, 0.5)' : 'none',
                        }}
                      >
                        {letter === 'I' ? 'I/J' : letter}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* 3. Bottom-Right Floating Key Clue Card */}
          <div className="caesar-floating-basket-card sprint-clue-card">
            <div className="caesar-basket-icon">🔑</div>
            <div className="caesar-basket-badge">{levelData.key || 'KEY'}</div>
            <span className="caesar-basket-label">Playfair Key Clue</span>
          </div>

          {/* 4. Floating Action / Outcome Panels */}
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

      {/* ───── Shared Pause Menu ───── */}
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

/* ═══════════════════════════════════════════════
   Small extracted UI components (kept pure, no logic)
   ═══════════════════════════════════════════════ */

function FinishedPanel({ onVerifySubmit, onReplayNewQuestion }) {
  return (
    <div className="fg-success-panel">
      <h3 className="caesar-victory-title">STAGE SECURED!</h3>
      <p className="caesar-victory-desc">All digraphs decrypted successfully.</p>
      <button
        className="fg-btn fg-btn-primary"
        onClick={onVerifySubmit}
      >
        Verify & Submit
      </button>
      {onReplayNewQuestion && (
        <button
          className="fg-btn fg-btn-secondary"
          onClick={onReplayNewQuestion}
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

/* ───────────────────────────────────────────────
   Level metadata hook (memoised)
   ─────────────────────────────────────────────── */
function useMemoLevelMeta(pairData, tier) {
  return React.useMemo(() => {
    const hintIndices = new Set();
    if (tier === 'easy' || tier === 'medium') {
      const numHints = tier === 'easy' ? 2 : 1;
      if (pairData.length > numHints) {
        for (let i = 0; i < numHints; i++) {
          hintIndices.add(i);
        }
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
