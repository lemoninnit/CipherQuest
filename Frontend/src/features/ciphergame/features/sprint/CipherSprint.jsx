/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import './CipherSprint.css';
import '../../CipherGame.css';
import GameHudBar from '../../ui/GameHudBar';
import StageLoadingScreen from '../../ui/StageLoadingScreen';
import { useFullscreen } from '../../core/hooks/useFullscreen';
import FullscreenButton from '../../ui/FullscreenButton';
import PauseMenu from '../../ui/PauseMenu';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const BASE_SPEED = 0.22;
const BOOST_MULT = 1.6;
const RUNNER_X = 14;
const DIAMOND_HITBOX_HALF = 2.2;
const SLIME_HITBOX_HALF = 4.2;
const COIN_START_X = 112;

const ROUND_PHASES = ['briefing', 'choosing', 'locking', 'resolved'];
void ROUND_PHASES;
const BRIEFING_MS = 2200;
const LOCKING_MS = 1200;
const RESOLVED_MS = 1600;

const PAD5 = (n) => String(n).padStart(5, '0');

const caesarShiftChar = (char, shift) => {
  const code = char.charCodeAt(0);
  if (code >= 65 && code <= 90) {
    return String.fromCharCode(((code - 65 + shift) % 26 + 26) % 26 + 65);
  }
  return char;
};

const getRandomDecoys = (correctChar, count) => {
  const pool = ALPHABET.filter((c) => c !== correctChar);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

export default function CipherSprint({
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

  /* ───────────────────────────────────────────────
     Static / memoised level data
     ─────────────────────────────────────────────── */
  const { hintIndices, maskedIndices, words } = useMemoLevelMeta(levelData, tier);

  /* ───────────────────────────────────────────────
     Game state (visual — allowed to trigger renders)
     ─────────────────────────────────────────────── */
  const [sprintStep, setSprintStep] = useState('ready');
  const [roundPhase, setRoundPhase] = useState('briefing');
  const [currentMaskIndex, setCurrentMaskIndex] = useState(0);
  const [runnerLane, setRunnerLane] = useState(1);
  const [coins, setCoins] = useState([]);
  const [slimes, setSlimes] = useState([]);
  const [pickedChar, setPickedChar] = useState(null);
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
  const [explanationStep, setExplanationStep] = useState(-1);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackColor, setFeedbackColor] = useState('#facc15');
  const [feedbackY, setFeedbackY] = useState(50);
  const [trackShake, setTrackShake] = useState(false);
  const [isBoosting, setIsBoosting] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isBadgePopping, setIsBadgePopping] = useState(false);
  const [slimeFrame, setSlimeFrame] = useState(0);

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
  const pickedCharRef = useRef(null);
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
  const explanationIntervalRef = useRef(0);
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
  useEffect(() => { pickedCharRef.current = pickedChar; }, [pickedChar]);
  useEffect(() => { pickedLaneRef.current = pickedLane; }, [pickedLane]);
  useEffect(() => { correctLaneRef.current = correctLane; }, [correctLane]);
  useEffect(() => { attemptsRef.current = attempts; }, [attempts]);
  useEffect(() => { slimesRef.current = slimes; }, [slimes]);

  /* ───────────────────────────────────────────────
     Derived (re-compute each render, cheap)
     ─────────────────────────────────────────────── */
  const currentIdx = maskedIndices[currentMaskIndex] ?? 0;
  const currentBatonLetter = levelData.ciphertext[currentIdx] ?? '';
  const currentTargetChar = levelData.plaintext[currentIdx] ?? '';

  let segmentIdx = 0;
  let accumulated = 0;
  for (let i = 0; i < words.length; i++) {
    const segEnd = accumulated + words[i].length + (i > 0 ? 1 : 0);
    if (currentIdx < segEnd) { segmentIdx = i; break; }
    accumulated = segEnd;
  }
  const currentShiftKey = (levelData.targetShifts && levelData.targetShifts[segmentIdx % levelData.targetShifts.length]) ?? 0;

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
     Animation frame intervals (slime / plants)
     ─────────────────────────────────────────────── */
  useEffect(() => {
    if (isPausedRef.current || sprintStepRef.current !== 'running') return;
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
    setPickedChar(null);
    pickedCharRef.current = null;
    setPickedLane(null);
    pickedLaneRef.current = null;
    setResolvedStatus(null);
    setResolvedBannerText('');
    // Existing coins and slimes keep scrolling uninterrupted and exit off-screen left naturally

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
    const targetChar = currentTargetChar || (levelData.plaintext[tempIdx] ?? '');
    const [decoy1, decoy2] = getRandomDecoys(targetChar, 2);
    const otherLanes = [0, 1, 2].filter((l) => l !== randLane);

    const startX = COIN_START_X;
    const newCoins = [
      { id: `c1-${Date.now()}`, lane: randLane, char: targetChar, x: startX, isCorrect: true, picked: false },
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
  }, [clearPhaseTimer, currentTargetChar, maskedIndices, levelData.plaintext]);

  /* ───────────────────────────────────────────────
     Phase 3: Resolved (immediate on diamond pick or miss)
     ─────────────────────────────────────────────── */
  const resolveChoice = useCallback((picked, lane, isCoinCorrect) => {
    clearPhaseTimer();
    setRoundPhase('resolved');
    roundPhaseRef.current = 'resolved';
    hasPickedRef.current = true;
    setPickedChar(picked);
    pickedCharRef.current = picked;
    setPickedLane(lane);
    pickedLaneRef.current = lane;

    const tempIdx = maskedIndices[currentMaskIndexRef.current] ?? 0;
    const cipherCh = levelData.ciphertext[tempIdx] ?? '';
    const targetChar = currentTargetChar || (levelData.plaintext[tempIdx] ?? '');
    const isCorrect = (picked && picked === targetChar) || isCoinCorrect === true;

    setAttempts((prev) => [
      ...prev,
      {
        index: tempIdx,
        cipherChar: cipherCh,
        keyCollected: picked || 'Missed',
        correct: isCorrect,
        firstTry: firstTryForCurrent,
      },
    ]);

    if (isCorrect) {
      setResolvedStatus('correct');
      triggerSpin();
      triggerBoost(1200);
      showFeedback('⚡ Correct Letter! BOOST!', '#22c55e', 10, 1100);
      // Fill into top word panel visibly in green
      setSolvedLetters((prev) => ({ ...prev, [tempIdx]: targetChar }));

      const nextMaskIdx = currentMaskIndexRef.current + 1;
      const nextIdx = maskedIndices[nextMaskIdx];
      const nextCipher = nextIdx !== undefined ? levelData.ciphertext[nextIdx] : null;
      const bannerMsg = nextCipher
        ? `Direct hit! Now decode '${nextCipher}'!`
        : `Direct hit! Word Decrypted!`;
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
        }
      }, RESOLVED_MS);
    } else {
      setResolvedStatus(picked ? 'wrong' : 'missed');
      triggerShake();
      setFirstTryForCurrent(false);

      // Worked answer banner: C + 5 = H
      const workedAnswer = `${cipherCh} + ${currentShiftKey} = ${targetChar}`;
      setResolvedBannerText(workedAnswer);

      setLives((prevLives) => {
        const nextLives = prevLives - 1;
        if (nextLives <= 0) {
          startPhaseTimer(() => {
            setSprintStep('gameover');
          }, RESOLVED_MS);
        } else {
          startPhaseTimer(() => {
            // Re-ask the same letter from briefing
            if (startBriefingPhaseRef.current) startBriefingPhaseRef.current();
          }, RESOLVED_MS);
        }
        return nextLives;
      });
    }
  }, [
    clearPhaseTimer,
    currentShiftKey,
    currentTargetChar,
    firstTryForCurrent,
    levelData.ciphertext,
    levelData.plaintext,
    maskedIndices,
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
      initialSolved[idx] = levelData.plaintext[idx];
    });
    setSolvedLetters(initialSolved);

    startBriefingPhase();
  };

  const handleRetryFromCheckpoint = () => {
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
     Keyboard steering (gated to 'choosing' & 'resolved')
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

      // Gate lane steering to choosing & resolved only
      const currentPhase = roundPhaseRef.current;
      if (currentPhase !== 'choosing' && currentPhase !== 'resolved') {
        return;
      }

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
    if (isCrashing || isPaused || isMenuOpen) return undefined;

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
              setLives((l) => {
                const next = l - 1;
                if (next <= 0) setSprintStep('gameover');
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
  ]);

  /* ───────────────────────────────────────────────
     Level changes -> reset everything
     ─────────────────────────────────────────────── */
  useEffect(() => {
    const currentLevelId = `${levelData?.level}-${levelData?.ciphertext}`;
    if (prevLevelIdRef.current === currentLevelId) {
      return;
    }
    prevLevelIdRef.current = currentLevelId;

    clearAllFXTimeouts();
    if (explanationIntervalRef.current) window.clearInterval(explanationIntervalRef.current);
    setSprintStep('ready');
    setCurrentMaskIndex(0);
    currentMaskIndexRef.current = 0;
    setRoundPhase('briefing');
    roundPhaseRef.current = 'briefing';
    hasPickedRef.current = false;
    setAttempts([]);
    setLives(5);
    setFirstTryForCurrent(true);
    setCoins([]);
    setSlimes([]);
    slimesRef.current = [];
    setShowExplanation(false);
    setExplanationStep(-1);
    setIsPaused(false);
    setRunnerLane(1);
    prevLaneRef.current = 1;
    runnerLaneRef.current = 1;
    setPickedChar(null);
    pickedCharRef.current = null;
    setPickedLane(null);
    pickedLaneRef.current = null;
    setFeedbackText('');

    const initialSolved = {};
    hintIndices.forEach((idx) => {
      initialSolved[idx] = levelData.plaintext[idx];
    });
    setSolvedLetters(initialSolved);
  }, [levelData, hintIndices]);

  /* Unmount — hard cleanup of every tracked timer/interval */
  useEffect(() => {
    return () => {
      clearAllFXTimeouts();
      if (explanationIntervalRef.current) window.clearInterval(explanationIntervalRef.current);
      if (slimeIntervalRef.current)         window.clearInterval(slimeIntervalRef.current);
      if (rafRef.current)                   window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  /* ───────────────────────────────────────────────
     Explanation / submit handler
     ─────────────────────────────────────────────── */
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
        <div
          className="fg-recap-overlay"
          style={{ overflowY: 'auto', padding: '30px 10px', zIndex: 9999 }}
        >
          <div
            className="fg-recap-card"
            style={{ maxWidth: '1100px', width: '95%', padding: '24px 32px' }}
          >
            <h2 className="fg-recap-title">🔬 Cryptographic Recap</h2>
            <p className="fg-recap-subtitle">Why Did This Work?</p>
            <div
              className="fg-recap-animation-box"
              style={{ minHeight: 'auto', padding: '16px', marginBottom: '16px' }}
            >
              <div className="fg-recap-letter-row">
                {levelData.plaintext.replace(/\s+/g, '').split('').map((plainCh, idx) => {
                  const cipherCh = levelData.ciphertext.replace(/\s+/g, '')[idx];
                  let wi = 0, acc = 0;
                  for (let i = 0; i < words.length; i++) {
                    if (idx < acc + words[i].length) { wi = i; break; }
                    acc += words[i].length;
                  }
                  const seg = levelData.targetShifts[wi];
                  return (
                    <div
                      key={idx}
                      className={`fg-recap-node ${explanationStep >= idx ? 'active' : 'waiting'}`}
                    >
                      <span className="fg-recap-char-cipher">{cipherCh}</span>
                      <span className="fg-recap-math">+{seg}</span>
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
              💡 <strong>Caesar Cipher Decryption:</strong> Each ciphertext letter is decoded by applying the Caesar shift key.
              By steer-racing the runner into correct candidate lanes, you matched each secret shift.{' '}
              <code>Plain = (Cipher + Key) mod 26</code> maps each letter back uniformly.
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
                        🔑 Caesar Alphabet Shift Table
                        {levelData.targetShifts.length > 1 ? ` — Segment #${sIdx + 1}` : ''} (Key: +{shiftVal})
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
                                Cipher:
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
                                  <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>{i + 1}</div>
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
                                Plain:
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
                                  <div style={{ fontSize: '0.55rem', color: 'rgba(0,229,255,0.6)' }}>
                                    {ch.charCodeAt(0) - 64}
                                  </div>
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

      {/* HUD Header */}
      <GameHudBar
        title="Cipher Sprint Relay"
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
            category="caesar"
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
                <h2 className="cq-dossier-title">Cipher Sprint Relay</h2>
                <p className="cq-dossier-subtitle">
                  Baton relay decryption challenge! Steer the runner into the lane carrying the correct plaintext letter to decrypt checkpoints.
                </p>
                <hr className="cq-dossier-divider" />
                <div className="cq-dossier-data">
                  <div className="cq-dossier-row">
                    <span className="cq-dossier-label">CIPHERTEXT</span>
                    <span className="cq-dossier-value cyan-mono">{levelData.ciphertext}</span>
                  </div>
                  <div className="cq-dossier-row">
                    <span className="cq-dossier-label">HINT</span>
                    <span className="cq-dossier-value hint-text">{levelData.hint}</span>
                  </div>
                </div>
                <p className="cq-dossier-how-it-works">
                  <strong>How it works:</strong>{' '}
                  Use <strong>Arrow UP/DOWN</strong> or <strong>W/S</strong> keys to switch lanes. Collect the correct plaintext letter based on the Caesar Shift Key clue to decrypt each letter. Dodge the obstacle slimes! Decoy letters will cause a crash! Press <strong>F</strong> to toggle fullscreen.
                </p>
                <button className="cq-dossier-action-btn" onClick={() => setIsOperationLoading(true)}>
                  Begin operation
                </button>
              </div>
            </div>
          </div>
        )
      ) : (
        /* ───── Running / Gameplay Layout ───── */
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
                  : pickedChar
                  ? pickedChar
                  : currentBatonLetter}
              </div>
            </div>

            {/* Answer Diamonds */}
            {sprintStep === 'running' &&
              coins.map((coin) => {
                let stateClass = '';
                // Strict rules: Only the picked diamond turns green (correct) or red (wrong).
                // The two unpicked diamonds stay the default blue/cyan for their whole life, including after the result.
                if (coin.picked) {
                  stateClass = coin.isCorrect ? 'correct' : 'wrong';
                }

                return (
                  <div
                    key={coin.id}
                    className={`sprint-r2-diamond-sprite lane-${coin.lane} ${stateClass}`}
                    style={{ left: `${coin.x}%` }}
                  >
                    <div className="sprint-r2-diamond-inner">
                      <span className="sprint-r2-diamond-char">{coin.char}</span>
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
                      <span className="sprint-r2-panel-tag">DECRYPTION BRIEF</span>
                      <div className="sprint-r2-banner-title">
                        Decode Letter '<strong>{currentBatonLetter}</strong>'
                      </div>
                      <div className="sprint-r2-math-equation">
                        <span className="sprint-r2-math-chip cipher">{currentBatonLetter}</span>
                        <span className="sprint-r2-math-op">+</span>
                        <span className="sprint-r2-math-chip shift">{currentShiftKey}</span>
                        <span className="sprint-r2-math-op">→</span>
                        <span className="sprint-r2-math-chip target mystery">?</span>
                      </div>
                    </>
                  )}

                  {roundPhase === 'locking' && (
                    <>
                      <span className="sprint-r2-panel-tag">SELECTION LOCKED</span>
                      <div className="sprint-r2-banner-title">
                        Analyzing Cipher Math
                      </div>
                      <div className="sprint-r2-math-equation">
                        <span className="sprint-r2-math-chip cipher">{currentBatonLetter}</span>
                        <span className="sprint-r2-math-op">+</span>
                        <span className="sprint-r2-math-chip shift">{currentShiftKey}</span>
                        <span className="sprint-r2-math-op">=</span>
                        <span className="sprint-r2-math-chip target locked">{pickedChar || '?'}</span>
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
                          ? 'CIPHER SOLVED'
                          : resolvedStatus === 'missed'
                          ? 'TARGET MISSED'
                          : 'DECRYPTION ERROR'}
                      </span>
                      <div className="sprint-r2-math-equation">
                        <span className="sprint-r2-math-chip cipher">{currentBatonLetter}</span>
                        <span className="sprint-r2-math-op">+</span>
                        <span className="sprint-r2-math-chip shift">{currentShiftKey}</span>
                        <span className="sprint-r2-math-op">=</span>
                        <span
                          className={`sprint-r2-math-chip target ${
                            resolvedStatus === 'correct' ? 'correct' : 'answer'
                          }`}
                        >
                          {currentTargetChar}
                        </span>
                      </div>
                      <div
                        className={`sprint-r2-banner-msg ${
                          resolvedStatus === 'correct' ? 'correct' : 'wrong'
                        }`}
                      >
                        {resolvedBannerText ||
                          (resolvedStatus === 'correct'
                            ? 'Direct Hit! Letter Decrypted!'
                            : pickedChar
                            ? `Picked '${pickedChar}' — Correct answer is '${currentTargetChar}'`
                            : `Missed Diamond — Correct answer is '${currentTargetChar}'`)}
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
            <div className="sprint-r2-word-title">Decrypt the word "{levelData.ciphertext}"</div>
            <div className="sprint-r2-letters-row">
              {levelData.plaintext.split('').map((char, idx) => {
                const isSpace = char === ' ';
                if (isSpace) {
                  return <div key={idx} style={{ width: 14 }} />;
                }
                const isMasked = !hintIndices.has(idx);
                const isCurrentActive = isMasked && idx === currentIdx && sprintStep === 'running';
                const cipherCh = levelData.ciphertext[idx];
                const isSolved = solvedLetters[idx] !== undefined;
                const plainCh = isSolved ? solvedLetters[idx] : '_';

                return (
                  <div
                    key={idx}
                    className={`sprint-r2-letter-box ${isSolved ? 'solved' : ''} ${isCurrentActive ? 'active' : ''}`}
                  >
                    <span className="sprint-r2-box-cipher">{cipherCh}</span>
                    <span className="sprint-r2-box-plain">{plainCh}</span>
                  </div>
                );
              })}
            </div>
            {levelData.hint && (
              <div className="sprint-r2-word-hint">Hint "{levelData.hint}"</div>
            )}
          </div>

          {/* 2. Bottom-Left Floating Cipher Cheat Sheet (Caesar Fishing / Caesar Pac-Man) */}
          <div className="caesar-floating-cheat-sheet sprint-cheat-sheet">
            <div className="caesar-cheat-header">
              <span className="caesar-cheat-title">Cipher Cheat Sheet</span>
              <span className="caesar-cheat-badge">Shift +{currentShiftKey}</span>
            </div>
            <div className="caesar-cheat-body">
              <div className="caesar-cheat-labels">
                <span className="caesar-cheat-label-plain">CIPHER</span>
                <span className="caesar-cheat-label-shift">PLAIN</span>
              </div>
              <div className="caesar-cheat-columns">
                {ALPHABET.map((ch) => {
                  const isCurrent = ch === currentBatonLetter;
                  return (
                    <div
                      key={ch}
                      className={`caesar-cheat-col ${isCurrent ? 'highlighted' : ''}`}
                    >
                      <span className="caesar-cheat-plain">{ch}</span>
                      <span className="caesar-cheat-shifted">{caesarShiftChar(ch, currentShiftKey)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. Bottom-Right Floating Shift Key Clue Card (Caesar Pac-Man) */}
          <div className="caesar-floating-basket-card sprint-clue-card">
            <div className="caesar-basket-icon">🔑</div>
            <div className="caesar-basket-badge">+{currentShiftKey}</div>
            <span className="caesar-basket-label">Caesar Shift Key Clue</span>
          </div>

          {/* 4. Floating Action / Outcome Panels */}
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
      <h3>✅ SECURED!</h3>
      <p>All letters decrypted successfully.</p>
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
      <strong style={{ color: 'var(--neon-red)', fontSize: '1rem' }}>💥 SYSTEM CRASH!</strong>
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
        🔄 Try Again
      </button>
    </div>
  );
}

/* ───────────────────────────────────────────────
   Level metadata hook (memoised)
   ─────────────────────────────────────────────── */
function useMemoLevelMeta(levelData, tier) {
  return React.useMemo(() => {
    const hintIndices = new Set();
    if (tier === 'easy' || tier === 'medium') {
      const numHints = tier === 'easy' ? 2 : 1;
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

    const words = levelData.plaintext.split(' ');

    return { hintIndices, maskedIndices, words };
  }, [levelData, tier]);
}
