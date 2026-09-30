/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import '../sprint/CipherSprint.css';
import '../../CipherGame.css';
import GameHudBar from '../../ui/GameHudBar';
import StageLoadingScreen from '../../ui/StageLoadingScreen';
import { useFullscreen } from '../../core/hooks/useFullscreen';
import { useGameShortcuts } from '../../core/hooks/useGameShortcuts';
import { useStageSnapshotAutoSaver } from '../../core/engine/gameSnapshot';
import PauseMenu from '../../ui/PauseMenu';
import { StageLostCard } from '../../ui/StageLostScreen';
import CryptographicRecap from '../../ui/CryptographicRecap';
import VictoryConfetti from '../../ui/VictoryConfetti';
import { sprintSound } from '../sprint/sprintSound';
import {
  transformPlayfairPair,
} from './PlayfairHelpers';

const BASE_SPEED = 0.22;
const BOOST_MULT = 1.6;
const RUNNER_X = 14;
const DIAMOND_HITBOX_HALF = 3.8;
const SLIME_HITBOX_HALF = 4.2;
const SPAWN_X = 112;

// Minimum horizontal gaps to prevent overlap at any speed
const MIN_SAME_LANE_GAP = 30; // % of track width between entities in the same lane
const MIN_ANY_LANE_GAP = 12;  // % of track width stagger across any lane

const PAD5 = (n) => String(n).padStart(5, '0');

/**
 * Returns lanes where the nearest existing entity is at least minGap behind spawnX.
 */
const getAvailableLanes = (existingCoins, existingSlimes, minGap = MIN_SAME_LANE_GAP, spawnX = SPAWN_X) => {
  const all = [...existingCoins, ...existingSlimes];
  const lanes = [0, 1, 2];
  return lanes.filter((lane) => {
    const laneEntities = all.filter((e) => e.lane === lane);
    if (laneEntities.length === 0) return true;
    const maxLaneX = Math.max(...laneEntities.map((e) => e.x));
    return spawnX - maxLaneX >= minGap;
  });
};

const makeDecoyPairs = (correctPair, count, matrix) => {
  if (!matrix || !correctPair || correctPair.length < 2) {
    return ['AB', 'CD'].slice(0, count);
  }
  const [a, b] = correctPair;
  let posA = { r: 0, c: 0 }, posB = { r: 0, c: 0 };
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (matrix[r]?.[c] === a) posA = { r, c };
      if (matrix[r]?.[c] === b) posB = { r, c };
    }
  }

  const decoys = new Set();
  
  // 1. Inverted pair
  if (b !== a) decoys.add(`${b}${a}`);
  
  // 2. Offsets around position A and B in 5x5 grid (±1, ±2)
  const offsets = [
    [0, 1], [0, -1], [1, 0], [-1, 0],
    [1, 1], [1, -1], [-1, 1], [-1, -1],
    [0, 2], [0, -2], [2, 0], [-2, 0]
  ];
  
  for (const [dr, dc] of offsets) {
    const nearA = matrix[(posA.r + dr + 5) % 5]?.[(posA.c + dc + 5) % 5];
    const nearB = matrix[(posB.r + dr + 5) % 5]?.[(posB.c + dc + 5) % 5];
    if (nearA && nearB) {
      if (nearA !== b) decoys.add(`${nearA}${b}`);
      if (nearB !== a) decoys.add(`${a}${nearB}`);
      if (nearA !== nearB) decoys.add(`${nearA}${nearB}`);
    }
    if (decoys.size >= count + 6) break;
  }
  
  decoys.delete(correctPair);
  const candidateArray = Array.from(decoys).filter((p) => p !== correctPair);
  if (candidateArray.length >= count) {
    return candidateArray.sort(() => Math.random() - 0.5).slice(0, count);
  }
  
  // Fallback if needed
  const letters = matrix.flat();
  let attempts = 0;
  while (decoys.size < count + 5 && attempts < 50) {
    attempts++;
    const first = letters[Math.floor(Math.random() * letters.length)];
    const second = letters[Math.floor(Math.random() * letters.length)];
    if (first && second && first !== second) decoys.add(`${first}${second}`);
  }
  decoys.delete(correctPair);
  return Array.from(decoys).filter((p) => p !== correctPair).sort(() => Math.random() - 0.5).slice(0, count);
};

const createRandomDiamond = (correctPair, matrix, existingCoins, lane = 0, startX = SPAWN_X) => {
  const activeValues = existingCoins.map((c) => c.char);
  const hasCorrectOnScreen = activeValues.includes(correctPair);

  let chosen;
  // If correct answer is not on screen yet, 50% chance to spawn it
  if (!hasCorrectOnScreen && Math.random() < 0.5) {
    chosen = correctPair;
  } else {
    // Generate decoys and filter out already active values and the correct answer
    const decoys = makeDecoyPairs(correctPair, 12, matrix);
    const availableDecoys = decoys.filter((d) => d !== correctPair && !activeValues.includes(d));
    if (availableDecoys.length > 0) {
      chosen = availableDecoys[Math.floor(Math.random() * availableDecoys.length)];
    } else if (!hasCorrectOnScreen) {
      chosen = correctPair;
    } else {
      // Fallback: generate a random pair from matrix not in activeValues
      const letters = (matrix || []).flat();
      let attempts = 0;
      let randPair = '';
      while (attempts < 20) {
        const c1 = letters[Math.floor(Math.random() * letters.length)] || 'A';
        const c2 = letters[Math.floor(Math.random() * letters.length)] || 'B';
        if (c1 !== c2) {
          const cand = `${c1}${c2}`;
          if (cand !== correctPair && !activeValues.includes(cand)) {
            randPair = cand;
            break;
          }
        }
        attempts++;
      }
      chosen = randPair || (decoys[0] ?? 'XY');
    }
  }

  return {
    id: `d-${Date.now()}-${Math.random()}`,
    lane,
    char: chosen,
    value: chosen,
    x: startX,
  };
};

const createRandomSlime = (lane = 0, startX = SPAWN_X) => {
  return {
    id: `slime-${Date.now()}-${Math.random()}`,
    lane,
    x: startX,
    hit: false,
  };
};

export default function PlayfairSprint({
  levelData,
  tier,
  snapshot,
  onVerifySubmit,
  onBackToStages,
  onReplayNewQuestion,
  onStartStageTimer,
  onSaveSnapshot,
  onClearSnapshot,
  onStageFail,
  // Authoritative post-loss heart state, so the losing screen shows the
  // server's answer rather than the profile value still in flight.
  stageLoss,
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

  const { hintIndices, maskedIndices } = useMemoLevelMeta(pairData, tier, levelData);

  const hasSnapshot = Boolean(
    snapshot?.gameState &&
      (snapshot.gameState.sprintStep === 'running' || snapshot.gameState.phase === 'playing')
  );

  /* ───────────────────────────────────────────────
     Game state (visual)
     ─────────────────────────────────────────────── */
  const [sprintStep, setSprintStep] = useState(() => (hasSnapshot ? 'running' : 'ready'));

  /* Report the stage loss exactly once per run: this resets the streak and
     spends ONE server session heart. The runner's in-game lives are a
     separate, client-side economy and never reach the server. */
  const stageFailReportedRef = useRef(false);
  useEffect(() => {
    if (sprintStep !== 'gameover') {
      stageFailReportedRef.current = false;
      return;
    }
    if (stageFailReportedRef.current) return;
    stageFailReportedRef.current = true;
    onStageFail?.({ showNotice: false });
  }, [sprintStep, onStageFail]);
  const [currentMaskIndex, setCurrentMaskIndex] = useState(() => (hasSnapshot && typeof snapshot.gameState.currentMaskIndex === 'number' ? snapshot.gameState.currentMaskIndex : 0));
  const [runnerLane, setRunnerLane] = useState(() => (hasSnapshot && typeof snapshot.gameState.runnerLane === 'number' ? snapshot.gameState.runnerLane : 1));
  const [coins, setCoins] = useState([]);
  const [slimes, setSlimes] = useState([]);
  const [solvedLetters, setSolvedLetters] = useState(() => {
    if (hasSnapshot && snapshot.gameState.solvedLetters) {
      return { ...snapshot.gameState.solvedLetters };
    }
    const initialSolved = {};
    hintIndices.forEach((idx) => {
      initialSolved[idx] = pairData[idx]?.plainPair;
    });
    return initialSolved;
  });
  const [lives, setLives] = useState(() => (hasSnapshot && typeof snapshot.gameState.lives === 'number' ? snapshot.gameState.lives : 5));
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
  const [isPaused, setIsPaused] = useState(() => (hasSnapshot ? true : false));
  const [isMenuOpen, setIsMenuOpen] = useState(() => (hasSnapshot ? true : false));
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
  const [selectedViewingIndex, setSelectedViewingIndex] = useState(null);

  const isRunning = sprintStep === 'running';
  useStageSnapshotAutoSaver(
    onSaveSnapshot,
    useCallback(() => ({
      sprintStep: 'running',
      currentMaskIndex,
      runnerLane,
      lives,
      solvedLetters,
    }), [currentMaskIndex, runnerLane, lives, solvedLetters]),
    isRunning
  );

  const toggleSound = useCallback(() => {
    const muted = sprintSound.toggleMute();
    setIsMuted(muted);
  }, []);

  useGameShortcuts({
    onToggleFullscreen: toggleFullscreen,
    onToggleMute: toggleSound,
  });

  /* ───────────────────────────────────────────────
     Refs — game truth inside RAF loop
     ─────────────────────────────────────────────── */
  const rafRef = useRef(0);
  const prevLaneRef = useRef(1);
  const isBoostingRef = useRef(false);
  const runnerLaneRef = useRef(1);
  const isPausedRef = useRef(false);
  const isMenuOpenRef = useRef(false);
  const sprintStepRef = useRef('ready');
  const currentMaskIndexRef = useRef(0);
  const coinsRef = useRef([]);
  const slimesRef = useRef([]);
  const prevLevelIdRef = useRef(null);

  /* Spawner timers */
  const lastDiamondSpawnTimeRef = useRef(0);
  const lastSlimeSpawnTimeRef = useRef(0);
  const nextDiamondDelayRef = useRef(1500);
  const nextSlimeDelayRef = useRef(2500);

  /* Timer tracking refs */
  const feedbackTimeoutRef = useRef(0);
  const spinTimeoutRef = useRef(0);
  const boostTimeoutRef = useRef(0);
  const shakeTimeoutRef = useRef(0);
  const laneTiltTimeoutRef = useRef(0);
  const slimeIntervalRef = useRef(0);
  const badgePopTimeoutRef = useRef(0);

  /* Sync refs whenever state changes */
  useEffect(() => { isBoostingRef.current = isBoosting; }, [isBoosting]);
  useEffect(() => { runnerLaneRef.current = runnerLane; }, [runnerLane]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { isMenuOpenRef.current = isMenuOpen; }, [isMenuOpen]);
  useEffect(() => { sprintStepRef.current = sprintStep; }, [sprintStep]);
  useEffect(() => { currentMaskIndexRef.current = currentMaskIndex; }, [currentMaskIndex]);
  useEffect(() => { coinsRef.current = coins; }, [coins]);
  useEffect(() => { slimesRef.current = slimes; }, [slimes]);

  /* ───────────────────────────────────────────────
     Derived values
     ─────────────────────────────────────────────── */
  const currentIdx = maskedIndices[currentMaskIndex] ?? 0;
  const currentPairObj = pairData[currentIdx] || {};
  const currentBatonPair = currentPairObj.cipherPair ?? '';

  const unsolvedIndices = useMemo(() => {
    return pairData
      .map((_, idx) => idx)
      .filter((idx) => solvedLetters[idx] === undefined);
  }, [pairData, solvedLetters]);

  const viewingIndex = (selectedViewingIndex !== null && unsolvedIndices.includes(selectedViewingIndex))
    ? selectedViewingIndex
    : (unsolvedIndices.includes(currentIdx) ? currentIdx : (unsolvedIndices[0] ?? currentIdx));

  const viewingPair = pairData[viewingIndex] || pairData[0] || {
    index: 0,
    cipherPair: '',
    plainPair: '',
    rule: 'RULE',
    cipherPositions: [],
  };

  const isViewingSolved = solvedLetters[viewingIndex] !== undefined;

  const handlePrevViewingPair = (e) => {
    e?.stopPropagation?.();
    if (unsolvedIndices.length <= 1) return;
    const currentPos = unsolvedIndices.indexOf(viewingIndex);
    const prevPos = (currentPos - 1 + unsolvedIndices.length) % unsolvedIndices.length;
    setSelectedViewingIndex(unsolvedIndices[prevPos]);
  };

  const handleNextViewingPair = (e) => {
    e?.stopPropagation?.();
    if (unsolvedIndices.length <= 1) return;
    const currentPos = unsolvedIndices.indexOf(viewingIndex);
    const nextPos = (currentPos + 1) % unsolvedIndices.length;
    setSelectedViewingIndex(unsolvedIndices[nextPos]);
  };

  const pfMatrixLookup = useMemo(() => {
    const lookup = {};
    if (Array.isArray(matrix)) {
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          const letter = matrix[r]?.[c];
          if (letter) {
            lookup[letter] = { r, c };
            if (letter === 'I') lookup['J'] = { r, c };
          }
        }
      }
    }
    return lookup;
  }, [matrix]);

  const viewingC1 = viewingPair?.cipherPair?.[0] || '';
  const viewingC2 = viewingPair?.cipherPair?.[1] || '';
  const viewingPosA = viewingC1 ? pfMatrixLookup[viewingC1] : null;
  const viewingPosB = viewingC2 ? pfMatrixLookup[viewingC2] : null;

  let viewingEffectiveRule = (viewingPair?.rule || '').toLowerCase();
  if (viewingPosA && viewingPosB) {
    if (viewingPosA.r === viewingPosB.r) viewingEffectiveRule = 'row';
    else if (viewingPosA.c === viewingPosB.c) viewingEffectiveRule = 'column';
    else viewingEffectiveRule = 'rectangle';
  }

  let viewingTargetPosA = null;
  let viewingTargetPosB = null;
  if (viewingPosA && viewingPosB) {
    if (viewingEffectiveRule === 'row') {
      viewingTargetPosA = { r: viewingPosA.r, c: (viewingPosA.c + 4) % 5 };
      viewingTargetPosB = { r: viewingPosB.r, c: (viewingPosB.c + 4) % 5 };
    } else if (viewingEffectiveRule === 'column') {
      viewingTargetPosA = { r: (viewingPosA.r + 4) % 5, c: viewingPosA.c };
      viewingTargetPosB = { r: (viewingPosB.r + 4) % 5, c: viewingPosB.c };
    } else {
      viewingTargetPosA = { r: viewingPosA.r, c: viewingPosB.c };
      viewingTargetPosB = { r: viewingPosB.r, c: viewingPosA.c };
    }
  }

  const viewingT1Actual = viewingTargetPosA ? (matrix[viewingTargetPosA.r]?.[viewingTargetPosA.c] || viewingPair?.plainPair?.[0] || '?') : (viewingPair?.plainPair?.[0] || '?');
  const viewingT2Actual = viewingTargetPosB ? (matrix[viewingTargetPosB.r]?.[viewingTargetPosB.c] || viewingPair?.plainPair?.[1] || '?') : (viewingPair?.plainPair?.[1] || '?');

  const viewingHasHint0 = Boolean(levelData.fullMask?.[viewingIndex * 2]);
  const viewingHasHint1 = Boolean(levelData.fullMask?.[viewingIndex * 2 + 1]);

  const viewingT1Disp = (isViewingSolved || viewingHasHint0) ? viewingT1Actual : '?';
  const viewingT2Disp = (isViewingSolved || viewingHasHint1) ? viewingT2Actual : '?';

  let viewingRuleChipText = '⇄ RECTANGLE';
  if (viewingEffectiveRule === 'row') viewingRuleChipText = '← SAME ROW';
  else if (viewingEffectiveRule === 'column') viewingRuleChipText = '↑ SAME COLUMN';

  const orangeSlimeSrc = `/assets/sprint/obstacle/obstacle1/SlimeOrange_${PAD5(slimeFrame)}.png`;
  const basicSlimeSrc = `/assets/sprint/obstacle/obstacle2/SlimeBasic_${PAD5(slimeFrame)}.png`;

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
    if (badgePopTimeoutRef.current) window.clearTimeout(badgePopTimeoutRef.current);
    feedbackTimeoutRef.current = spinTimeoutRef.current = boostTimeoutRef.current = 0;
    shakeTimeoutRef.current = laneTiltTimeoutRef.current = badgePopTimeoutRef.current = 0;
    setIsBadgePopping(false);
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
     Game flow actions
     ─────────────────────────────────────────────── */
  const handleStartSprint = () => {
    onClearSnapshot?.();
    sprintSound.unlockAudio();
    sprintSound.playBgm();
    clearAllFXTimeouts();
    setCurrentMaskIndex(0);
    currentMaskIndexRef.current = 0;
    setLives(5);
    setIsPaused(false);
    setIsMenuOpen(false);
    setSprintStep('running');
    sprintStepRef.current = 'running';

    const curTargetPair = pairData[maskedIndices[0] ?? 0]?.plainPair ?? '';

    // Initialize pre-revealed hints
    const initialSolved = {};
    hintIndices.forEach((idx) => {
      initialSolved[idx] = pairData[idx]?.plainPair;
    });
    setSolvedLetters(initialSolved);

    // Staggered initial placements with guaranteed spacing
    const initialCoins = [];
    const d1 = createRandomDiamond(curTargetPair, matrix, initialCoins, 0, 75, tier);
    initialCoins.push(d1);
    const d2 = createRandomDiamond(curTargetPair, matrix, initialCoins, 1, 105, tier);
    initialCoins.push(d2);

    const initialSlimes = [createRandomSlime(2, 135)];

    setCoins(initialCoins);
    coinsRef.current = initialCoins;
    setSlimes(initialSlimes);
    slimesRef.current = initialSlimes;

    lastDiamondSpawnTimeRef.current = performance.now();
    lastSlimeSpawnTimeRef.current = performance.now();
    nextDiamondDelayRef.current = 1500 + Math.random() * 800;
    nextSlimeDelayRef.current = 2600 + Math.random() * 1200;
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
     Keyboard steering (free in running state)
     ─────────────────────────────────────────────── */
  useEffect(() => {
    if (sprintStep !== 'running') return undefined;

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
  }, [sprintStep, isMenuOpen]);

  /* ── reset on levelData change ── */
  useEffect(() => {
    const curId = levelData.id || `${levelData.plaintext || ''}-${levelData.pairCiphertext || ''}`;
    if (prevLevelIdRef.current && prevLevelIdRef.current !== curId) {
      prevLevelIdRef.current = curId;
      clearAllFXTimeouts();
      setSprintStep('ready');
      sprintStepRef.current = 'ready';
      setCurrentMaskIndex(0);
      currentMaskIndexRef.current = 0;
      setLives(5);
      setCoins([]);
      coinsRef.current = [];
      setSlimes([]);
      slimesRef.current = [];
      setShowExplanation(false);
      setIsPaused(false);
      setIsMenuOpen(false);
      setRunnerLane(1);
      prevLaneRef.current = 1;
      runnerLaneRef.current = 1;
      setFeedbackText('');
      setSelectedViewingIndex(null);

      const initialSolved = {};
      hintIndices.forEach((idx) => {
        initialSolved[idx] = pairData[idx]?.plainPair;
      });
      setSolvedLetters(initialSolved);
    }
  }, [levelData, hintIndices, pairData]);

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
    if (isPaused || isMenuOpen || showExplanation) return undefined;

    const updatePhysics = () => {
      if (isPausedRef.current || isMenuOpenRef.current || sprintStepRef.current !== 'running') {
        return;
      }

      const speed = isBoostingRef.current ? BASE_SPEED * BOOST_MULT : BASE_SPEED;
      const lane = runnerLaneRef.current;
      const now = performance.now();

      /* Speed lines */
      setSpeedLines((prevLines) =>
        prevLines.map((line) => {
          const lineSpeed = isBoostingRef.current ? line.speed * 4 : line.speed;
          let nextX = line.x - lineSpeed * 0.4;
          if (nextX < -15) nextX = 115;
          return { ...line, x: nextX };
        })
      );

      /* 1. Diamonds movement & immediate consumption on collision */
      let collectedDiamond = null;
      const currentCoins = coinsRef.current;
      const nextCoins = [];

      for (let i = 0; i < currentCoins.length; i++) {
        const coin = currentCoins[i];
        const nextX = coin.x - speed;

        if (nextX < -15) {
          continue; // Despawn off-screen left
        }

        if (
          !collectedDiamond &&
          Math.abs(nextX - RUNNER_X) <= DIAMOND_HITBOX_HALF &&
          coin.lane === lane
        ) {
          collectedDiamond = coin;
          // Consumed immediately: not pushed into nextCoins
          continue;
        }

        nextCoins.push({ ...coin, x: nextX });
      }

      coinsRef.current = nextCoins;
      setCoins(nextCoins);

      if (collectedDiamond) {
        if (badgePopTimeoutRef.current) window.clearTimeout(badgePopTimeoutRef.current);
        setIsBadgePopping(true);
        badgePopTimeoutRef.current = window.setTimeout(() => setIsBadgePopping(false), 350);

        const curMaskIdx = currentMaskIndexRef.current;
        const curIdx = maskedIndices[curMaskIdx] ?? 0;
        const curTargetPair = pairData[curIdx]?.plainPair ?? '';

        if (collectedDiamond.char === curTargetPair) {
          triggerSpin();
          sprintSound.playSfx('collect');
          triggerBoost(1200);
          showFeedback('⚡ Correct Digraph! BOOST!', '#22c55e', 10, 1100);

          setSolvedLetters((prev) => ({ ...prev, [curIdx]: curTargetPair }));

          const nextMaskIdx = curMaskIdx + 1;
          if (nextMaskIdx < maskedIndices.length) {
            setCurrentMaskIndex(nextMaskIdx);
            currentMaskIndexRef.current = nextMaskIdx;
            // Clear coins on track to immediately spawn fresh candidates for next pair
            coinsRef.current = [];
            setCoins([]);
            lastDiamondSpawnTimeRef.current = performance.now();
          } else {
            onClearSnapshot?.();
            sprintStepRef.current = 'finished';
            setSprintStep('finished');
            sprintSound.stopBgm();
            sprintSound.playSfx('win');
            triggerBoost(2000);
            showFeedback('✨ Message Decrypted! Mission Complete!', '#22c55e', 15, 1500);
            return;
          }
        } else {
          triggerShake();
          sprintSound.playSfx('collision');
          showFeedback(`❌ Wrong '${collectedDiamond.char}'! -1 Life`, '#ef4444', 20 + collectedDiamond.lane * 30 - 8, 900);
          setLives((l) => {
            const next = l - 1;
            if (next <= 0) {
              onClearSnapshot?.();
              sprintStepRef.current = 'gameover';
              setSprintStep('gameover');
              sprintSound.stopBgm();
              sprintSound.playSfx('lose');
            }
            return next;
          });
        }
      }

      /* 2. Obstacle Slimes movement & collision */
      const currentSlimes = slimesRef.current;
      const nextSlimes = [];

      for (let i = 0; i < currentSlimes.length; i++) {
        const slime = currentSlimes[i];
        const nextX = slime.x - speed;

        if (nextX < -15) {
          continue;
        }

        if (
          !slime.hit &&
          Math.abs(nextX - RUNNER_X) <= SLIME_HITBOX_HALF &&
          slime.lane === lane
        ) {
          triggerShake();
          sprintSound.playSfx('collision');
          showFeedback('-1 Life! Slime Collision!', '#ef4444', 20 + slime.lane * 30 - 8, 900);
          setLives((l) => {
            const next = l - 1;
            if (next <= 0) {
              onClearSnapshot?.();
              sprintStepRef.current = 'gameover';
              setSprintStep('gameover');
              sprintSound.stopBgm();
              sprintSound.playSfx('lose');
            }
            return next;
          });
          nextSlimes.push({ ...slime, x: nextX, hit: true });
          continue;
        }

        nextSlimes.push({ ...slime, x: nextX });
      }

      slimesRef.current = nextSlimes;
      setSlimes(nextSlimes);

      /* 3. Enforced Gap & Staggered Spawning */
      const allActive = [...coinsRef.current, ...slimesRef.current];
      const maxOverallX = allActive.length > 0 ? Math.max(...allActive.map((e) => e.x)) : -999;

      // Spawn diamond if interval elapsed and global stagger condition is satisfied
      if (now - lastDiamondSpawnTimeRef.current >= nextDiamondDelayRef.current) {
        if (SPAWN_X - maxOverallX >= MIN_ANY_LANE_GAP) {
          const availableLanes = getAvailableLanes(
            coinsRef.current,
            slimesRef.current,
            MIN_SAME_LANE_GAP,
            SPAWN_X
          );
          if (availableLanes.length > 0) {
            lastDiamondSpawnTimeRef.current = now;
            nextDiamondDelayRef.current = 1400 + Math.random() * 1000;
            const chosenLane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
            const curMaskIdx = currentMaskIndexRef.current;
            const curIdx = maskedIndices[curMaskIdx] ?? 0;
            const curTargetPair = pairData[curIdx]?.plainPair ?? '';
            const newDiamond = createRandomDiamond(
              curTargetPair,
              matrix,
              coinsRef.current,
              chosenLane,
              SPAWN_X,
              tier
            );
            coinsRef.current = [...coinsRef.current, newDiamond];
            setCoins(coinsRef.current);
          }
        }
      }

      // Spawn slime if interval elapsed and global stagger condition is satisfied
      if (now - lastSlimeSpawnTimeRef.current >= nextSlimeDelayRef.current) {
        if (SPAWN_X - maxOverallX >= MIN_ANY_LANE_GAP) {
          const availableLanes = getAvailableLanes(
            coinsRef.current,
            slimesRef.current,
            MIN_SAME_LANE_GAP,
            SPAWN_X
          );
          if (availableLanes.length > 0) {
            lastSlimeSpawnTimeRef.current = now;
            nextSlimeDelayRef.current = 2400 + Math.random() * 1600;
            const chosenLane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
            const newSlime = createRandomSlime(chosenLane, SPAWN_X);
            slimesRef.current = [...slimesRef.current, newSlime];
            setSlimes(slimesRef.current);
          }
        }
      }

      rafRef.current = requestAnimationFrame(updatePhysics);
    };

    rafRef.current = requestAnimationFrame(updatePhysics);
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, [
    sprintStep,
    isPaused,
    isMenuOpen,
    showExplanation,
    showFeedback,
    triggerBoost,
    triggerShake,
    triggerSpin,
    tier,
    matrix,
    maskedIndices,
    pairData,
    onClearSnapshot,
  ]);

  /* ───────────────────────────────────────────────
     Audio — BGM follows the run state (continues playing on space pause)
     ─────────────────────────────────────────────── */
  useEffect(() => {
    if (sprintStep === 'running' && !isMenuOpen && !showExplanation) {
      sprintSound.playBgm();
    } else {
      sprintSound.pauseBgm();
    }
  }, [sprintStep, isMenuOpen, showExplanation]);

  useEffect(() => {
    return () => {
      clearAllFXTimeouts();
      if (slimeIntervalRef.current) window.clearInterval(slimeIntervalRef.current);
      if (rafRef.current)           window.cancelAnimationFrame(rafRef.current);
      sprintSound.stopBgm();
    };
  }, []);

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
  if (sprintStep === 'gameover') runnerAnim = 'death';
  else if (isPaused || isMenuOpen || sprintStep === 'finished') runnerAnim = 'idle';
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
      {!isOperationLoading && (
        <GameHudBar
          title="Playfair Sprint Relay"
          stage={levelData.level}
          tier={tier}
          isReady={sprintStep === 'ready'}
          onBackToStages={onBackToStages}
          onOpenMenu={() => setIsMenuOpen(true)}
          lives={sprintStep === 'ready' ? null : lives}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          isMuted={isMuted}
          onToggleMute={toggleSound}
        />
      )}

      {/* ───── Ready Screen ───── */}
      {sprintStep === 'ready' ? (
        isOperationLoading ? (
          <StageLoadingScreen
            category="playfair"
            difficulty={tier}
            stageIndex={(levelData.level || 1) - 1}
            onLoadingComplete={() => {
              setIsOperationLoading(false);
              onStartStageTimer?.();
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
                  {levelData.hint && (
                    <div className="cq-dossier-row">
                      <span className="cq-dossier-label">HINT</span>
                      <span className="cq-dossier-value hint-text">{levelData.hint}</span>
                    </div>
                  )}
                </div>
                <p className="cq-dossier-how-it-works">
                  <strong>How it works:</strong>{' '}
                  Use <strong>Arrow UP/DOWN</strong> or <strong>W/S</strong> keys to switch lanes. Collect the correct plaintext digraph calculated using the 5×5 Playfair key matrix. Dodge the obstacle slimes! Decoy digraphs will cost a life! Press <strong>Space</strong> to pause running, and <strong>F</strong> to toggle fullscreen.
                </p>
                <button className="cq-dossier-action-btn" onClick={() => { sprintSound.unlockAudio(); setIsOperationLoading(true); }}>
                  Begin operation
                </button>
              </div>
            </div>
          </div>
        )
      ) : (
        /* ───── Running / Gameplay Layout (Fullscreen Edge-to-Edge) ───── */
        <div className="caesar-sprint-fullscreen sprint-fullscreen-stage">
          {/* Edge-to-edge 3-lane Track */}
          <div
            className={[
              'sprint-track-container',
              'sprint-track-fullscreen',
              trackShake ? 'shake-track' : '',
              isBoosting && sprintStep === 'running' && !isPaused && !isMenuOpen ? 'is-boosting' : '',
              (isPaused || isMenuOpen || sprintStep === 'finished' || sprintStep === 'gameover') ? 'is-paused' : '',
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
                if (sprintStep === 'running' && !isPausedRef.current && !isMenuOpenRef.current) {
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
                if (sprintStep === 'running' && !isPausedRef.current && !isMenuOpenRef.current) {
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
                if (sprintStep === 'running' && !isPausedRef.current && !isMenuOpenRef.current) {
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
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {sprintStep === 'finished' ? '✓' : currentBatonPair}
              </div>
            </div>

            {/* Answer Diamonds (carrying candidate digraphs) */}
            {sprintStep === 'running' &&
              coins.map((coin) => (
                <div
                  key={coin.id}
                  className={`sprint-r2-diamond-sprite lane-${coin.lane}`}
                  style={{ left: `${coin.x}%` }}
                >
                  <div className="sprint-r2-diamond-inner" style={{ width: '52px', height: '52px' }}>
                    <span className="sprint-r2-diamond-char" style={{ fontSize: '1.1rem', letterSpacing: '1px' }}>
                      {coin.char}
                    </span>
                  </div>
                </div>
              ))}

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

          {/* 1. Top-Center Word Progress Header */}
          <div className="caesar-floating-word-panel vg-sprint-word-panel">
            <div className="caesar-floating-segment-card is-active">
              <div className="fg-letter-cells">
                {pairData.map((pair, idx) => {
                  const isMasked = !hintIndices.has(idx);
                  const isCurrentActive = isMasked && idx === currentIdx && sprintStep === 'running';
                  const isSolved = solvedLetters[idx] !== undefined;
                  const hasHint0 = levelData?.fullMask?.[idx * 2] === true;
                  const hasHint1 = levelData?.fullMask?.[idx * 2 + 1] === true;

                  let cellClass = "fg-letter-cell pf-digraph-cell";
                  if (isSolved || !isMasked) {
                    cellClass += " correct-plain";
                  } else if (isCurrentActive) {
                    cellClass += " active-target";
                  }

                  return (
                    <div
                      key={idx}
                      className={cellClass}
                      title={`Cipher: ${pair.cipherPair} → Plain: ${isSolved ? pair.plainPair : '??'}`}
                    >
                      <span className="fg-cell-ciphertext">{pair.cipherPair}</span>
                      <span className="fg-cell-plaintext">
                        {isSolved ? (
                          pair.plainPair
                        ) : (
                          <>
                            {hasHint0 ? <span className="pf-hint-char">{pair.plainPair[0]}</span> : '_'}
                            {hasHint1 ? <span className="pf-hint-char">{pair.plainPair[1]}</span> : '_'}
                          </>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            {levelData.hint && (
              <div className="caesar-floating-hint">
                💡 Hint: <strong>"{levelData.hint}"</strong>
              </div>
            )}
          </div>

          {/* 2. Unified Playfair Bottom-Left Group (Matrix + Decryption Panel) */}
          <div className="pf-bottom-left-group pf-sprint-group">
            {/* 5x5 Matrix Panel */}
            <div className="caesar-floating-cheat-sheet pf-matrix-panel">
              <div className="vg-floating-current-slot" style={{ marginBottom: '4px' }}>
                <div className="vg-arithmetic-title-stacked">
                  <span className="vg-arithmetic-title-line">PLAYFAIR</span>
                  <span className="vg-arithmetic-title-line">5×5 MATRIX</span>
                </div>
                <span className="vg-calc-badge">Key: {levelData.key || 'KEY'}</span>
              </div>
              <div className="caesar-cheat-body playfair-cheat-body">
                <div className="pf-template-matrix-grid">
                  {matrix.map((row, rIdx) =>
                    row.map((letter, cIdx) => {
                      const isCipherActive = (viewingPosA && viewingPosA.r === rIdx && viewingPosA.c === cIdx) || (viewingPosB && viewingPosB.r === rIdx && viewingPosB.c === cIdx);
                      const isTargetAActive = (isViewingSolved || viewingHasHint0) && viewingTargetPosA && viewingTargetPosA.r === rIdx && viewingTargetPosA.c === cIdx;
                      const isTargetBActive = (isViewingSolved || viewingHasHint1) && viewingTargetPosB && viewingTargetPosB.r === rIdx && viewingTargetPosB.c === cIdx;
                      const isTargetActive = isTargetAActive || isTargetBActive;
                      const displayLetter = letter === 'I' ? 'I/J' : letter;
                      let cellClass = 'pf-template-cell';
                      if (isCipherActive) cellClass += ' cipher-active active';
                      else if (isTargetActive) cellClass += ' target-active';

                      return (
                        <div
                          key={`${rIdx}-${cIdx}`}
                          className={cellClass}
                        >
                          {displayLetter}
                        </div>
                      );
                    })
                  )}
                  {(viewingEffectiveRule === 'row' || viewingEffectiveRule === 'column') && viewingPosA && viewingPosB && (
                    <svg
                      className="pf-matrix-lines-overlay"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <marker
                          id="pf-arrow-amber-sprint"
                          viewBox="0 0 6 6"
                          refX="5"
                          refY="3"
                          markerWidth="4"
                          markerHeight="4"
                          orient="auto-start-reverse"
                        >
                          <path d="M 0 0 L 6 3 L 0 6 z" fill="#ffc146" />
                        </marker>
                      </defs>
                      {viewingEffectiveRule === 'row' && (
                        <>
                          {viewingPosA.c > 0 ? (
                            <line
                              x1={(viewingPosA.c + 0.5) * 20}
                              y1={(viewingPosA.r + 0.5) * 20}
                              x2={(viewingPosA.c - 1 + 0.5) * 20}
                              y2={(viewingPosA.r + 0.5) * 20}
                              stroke="#ffc146"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              markerEnd="url(#pf-arrow-amber-sprint)"
                            />
                          ) : (
                            <>
                              <line
                                x1={(viewingPosA.c + 0.5) * 20}
                                y1={(viewingPosA.r + 0.5) * 20}
                                x2="0"
                                y2={(viewingPosA.r + 0.5) * 20}
                                stroke="#ffc146"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                              />
                              <line
                                x1="100"
                                y1={(viewingPosA.r + 0.5) * 20}
                                x2={(4 + 0.5) * 20}
                                y2={(viewingPosA.r + 0.5) * 20}
                                stroke="#ffc146"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                markerEnd="url(#pf-arrow-amber-sprint)"
                              />
                            </>
                          )}
                          {viewingPosB.c > 0 ? (
                            <line
                              x1={(viewingPosB.c + 0.5) * 20}
                              y1={(viewingPosB.r + 0.5) * 20}
                              x2={(viewingPosB.c - 1 + 0.5) * 20}
                              y2={(viewingPosB.r + 0.5) * 20}
                              stroke="#ffc146"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              markerEnd="url(#pf-arrow-amber-sprint)"
                            />
                          ) : (
                            <>
                              <line
                                x1={(viewingPosB.c + 0.5) * 20}
                                y1={(viewingPosB.r + 0.5) * 20}
                                x2="0"
                                y2={(viewingPosB.r + 0.5) * 20}
                                stroke="#ffc146"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                              />
                              <line
                                x1="100"
                                y1={(viewingPosB.r + 0.5) * 20}
                                x2={(4 + 0.5) * 20}
                                y2={(viewingPosB.r + 0.5) * 20}
                                stroke="#ffc146"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                markerEnd="url(#pf-arrow-amber-sprint)"
                              />
                            </>
                          )}
                        </>
                      )}
                      {viewingEffectiveRule === 'column' && (
                        <>
                          {viewingPosA.r > 0 ? (
                            <line
                              x1={(viewingPosA.c + 0.5) * 20}
                              y1={(viewingPosA.r + 0.5) * 20}
                              x2={(viewingPosA.c + 0.5) * 20}
                              y2={(viewingPosA.r - 1 + 0.5) * 20}
                              stroke="#ffc146"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              markerEnd="url(#pf-arrow-amber-sprint)"
                            />
                          ) : (
                            <>
                              <line
                                x1={(viewingPosA.c + 0.5) * 20}
                                y1={(viewingPosA.r + 0.5) * 20}
                                x2={(viewingPosA.c + 0.5) * 20}
                                y2="0"
                                stroke="#ffc146"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                              />
                              <line
                                x1={(viewingPosA.c + 0.5) * 20}
                                y1="100"
                                x2={(viewingPosA.c + 0.5) * 20}
                                y2={(4 + 0.5) * 20}
                                stroke="#ffc146"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                markerEnd="url(#pf-arrow-amber-sprint)"
                              />
                            </>
                          )}
                          {viewingPosB.r > 0 ? (
                            <line
                              x1={(viewingPosB.c + 0.5) * 20}
                              y1={(viewingPosB.r + 0.5) * 20}
                              x2={(viewingPosB.c + 0.5) * 20}
                              y2={(viewingPosB.r - 1 + 0.5) * 20}
                              stroke="#ffc146"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              markerEnd="url(#pf-arrow-amber-sprint)"
                            />
                          ) : (
                            <>
                              <line
                                x1={(viewingPosB.c + 0.5) * 20}
                                y1={(viewingPosB.r + 0.5) * 20}
                                x2={(viewingPosB.c + 0.5) * 20}
                                y2="0"
                                stroke="#ffc146"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                              />
                              <line
                                x1="100"
                                y1={(viewingPosB.r + 0.5) * 20}
                                x2={(4 + 0.5) * 20}
                                y2={(viewingPosB.r + 0.5) * 20}
                                stroke="#ffc146"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                markerEnd="url(#pf-arrow-amber-sprint)"
                              />
                            </>
                          )}
                        </>
                      )}
                    </svg>
                  )}
                </div>
              </div>
            </div>

            {/* Active Digraph Decryption Panel */}
            {viewingPair && (
              <div className="caesar-floating-cheat-sheet pf-digraph-panel">
                <div className="vg-fishing-calc-card">
                  <div className="vg-calc-top-row">
                    <span className="vg-calc-label">ACTIVE DIGRAPH DECRYPTION</span>
                    <span className="vg-calc-badge vg-pos-stepper">
                      <button
                        type="button"
                        className="vg-pos-stepper-btn"
                        onClick={handlePrevViewingPair}
                        disabled={unsolvedIndices.length <= 1}
                        aria-label="Previous unsolved pair"
                      >
                        ‹
                      </button>
                      <span className="vg-pos-stepper-label">Pair #{viewingIndex + 1}</span>
                      <button
                        type="button"
                        className="vg-pos-stepper-btn"
                        onClick={handleNextViewingPair}
                        disabled={unsolvedIndices.length <= 1}
                        aria-label="Next unsolved pair"
                      >
                        ›
                      </button>
                    </span>
                  </div>
                  <div className="pf-calc-formula-row">
                    <div className="pf-calc-box cipher">
                      <span className="lbl">CIPHER</span>
                      <strong className="val">{viewingPair.cipherPair}</strong>
                    </div>
                    <div className="pf-calc-box rule-chip">
                      <span className="lbl">RULE</span>
                      <strong className="val">{viewingRuleChipText}</strong>
                    </div>
                    <div className={`pf-calc-box target ${isViewingSolved ? 'is-solved' : ''}`}>
                      <span className="lbl">TARGET</span>
                      <strong className="val">
                        {isViewingSolved ? (
                          viewingPair.plainPair
                        ) : (
                          <>
                            {viewingHasHint0 ? (
                              <span className="pf-hint-char">{viewingPair.plainPair[0]}</span>
                            ) : (
                              '?'
                            )}
                            {viewingHasHint1 ? (
                              <span className="pf-hint-char">{viewingPair.plainPair[1]}</span>
                            ) : (
                              '?'
                            )}
                          </>
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="pf-trace-block">
                    <div className="pf-trace-line cipher-line">
                      {viewingPosA && viewingPosB
                        ? `${viewingC1} r${viewingPosA.r} c${viewingPosA.c}   ${viewingC2} r${viewingPosB.r} c${viewingPosB.c}`
                        : `${viewingPair.cipherPair}`}
                    </div>
                    <div className="pf-trace-line rule-line">
                      {viewingEffectiveRule === 'row'
                        ? `same row (r${viewingPosA?.r ?? 0})`
                        : viewingEffectiveRule === 'column'
                        ? `same column (c${viewingPosA?.c ?? 0})`
                        : 'different row + column'}
                    </div>
                    <div className="pf-trace-line rule-line">
                      {viewingEffectiveRule === 'row'
                        ? 'same row → wrap around'
                        : viewingEffectiveRule === 'column'
                        ? 'same column ↓ wrap around'
                        : 'rectangle ⇄ swap'}
                    </div>
                    <div className="pf-trace-line target-line">
                      {viewingTargetPosA && viewingTargetPosB
                        ? `${viewingT1Disp} r${viewingTargetPosA.r} c${viewingTargetPosA.c}   ${viewingT2Disp} r${viewingTargetPosB.r} c${viewingTargetPosB.c}`
                        : `${viewingT1Disp}${viewingT2Disp}`}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Bottom-Right Floating Key Clue Card */}
          <div className="caesar-floating-basket-card sprint-clue-card">
            <div className="caesar-basket-icon">🔑</div>
            <div className="caesar-basket-badge">{levelData.key || 'KEY'}</div>
            <span className="caesar-basket-label">Playfair Key Clue</span>
          </div>

          {/* 4. Floating Action / Outcome Panels */}
          {sprintStep === 'finished' && <VictoryConfetti isPaused={isMenuOpen} />}
          {sprintStep === 'finished' && (
            <div className="caesar-floating-victory-panel">
              <FinishedPanel
                onVerifySubmit={handleVerifySubmit}
                onReplayNewQuestion={onReplayNewQuestion}
              />
            </div>
          )}

          {sprintStep === 'gameover' && (
            <div className="caesar-floating-rule-violation sprint-floating-action-modal">
              <GameOverPanel stageLoss={stageLoss} onExit={onBackToStages} />
            </div>
          )}
        </div>
      )}

      {/* ───── Shared Pause Menu ───── */}
      <PauseMenu
        open={isMenuOpen}
        onResume={() => {
          setIsMenuOpen(false);
          setIsPaused(false);
        }}
        onTutorial={() => {
          onClearSnapshot?.();
          setIsMenuOpen(false);
          setSprintStep('ready');
        }}
        onExit={() => {
          onClearSnapshot?.();
          onBackToStages();
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Small extracted UI components (kept pure, no logic)
   ═══════════════════════════════════════════════ */

function FinishedPanel({ onVerifySubmit, onReplayNewQuestion }) {
  return (
    <>
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
    </>
  );
}

function GameOverPanel({ stageLoss, onExit }) {
  // The shared losing screen owns the wording, the heart display, the lockout
  // countdown and the single action. `compact` drops the card's own chrome
  // because the sprint board already renders a bordered modal around it.
  return (
    <StageLostCard
      compact
      reason="Your runner hit too many obstacles and ran out of lives."
      heartsLeft={stageLoss?.heartsLeft ?? null}
      maxHearts={stageLoss?.maxHearts ?? 3}
      lockedOut={stageLoss?.lockedOut ?? false}
      cooldownEndTime={stageLoss?.cooldownEndTime ?? null}
      totalScore={stageLoss?.totalScore ?? null}
      onExit={onExit}
    />
  );
}

/* ───────────────────────────────────────────────
   Level metadata hook (memoised)
   ─────────────────────────────────────────────── */
function useMemoLevelMeta(pairData, tier, levelData) {
  return useMemo(() => {
    const hintIndices = new Set();
    const normTier = String(tier || levelData?.difficulty || 'easy').toLowerCase();
    
    if (normTier !== 'hard') {
      for (let i = 0; i < pairData.length; i++) {
        const c1 = i * 2;
        const c2 = i * 2 + 1;
        const m1 = levelData?.fullMask?.[c1];
        const m2 = levelData?.fullMask?.[c2];
        if (m1 === true || m2 === true) {
          hintIndices.add(i);
        }
      }
      if (hintIndices.size >= pairData.length && pairData.length > 0) {
        hintIndices.delete(pairData.length - 1);
      }
    }

    const maskedIndices = [];
    for (let i = 0; i < pairData.length; i++) {
      if (!hintIndices.has(i)) {
        maskedIndices.push(i);
      }
    }

    return { hintIndices, maskedIndices };
  }, [pairData, tier, levelData]);
}
