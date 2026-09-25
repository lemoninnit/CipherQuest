/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './CipherSprint.css';
import '../../CipherGame.css';
import GameHudBar from '../../ui/GameHudBar';
import StageLoadingScreen from '../../ui/StageLoadingScreen';
import { useFullscreen } from '../../core/hooks/useFullscreen';
import FullscreenButton from '../../ui/FullscreenButton';
import PauseMenu from '../../ui/PauseMenu';
import CryptographicRecap from '../../ui/CryptographicRecap';
import VictoryConfetti from '../../ui/VictoryConfetti';
import { sprintSound } from './sprintSound';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
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

const caesarShiftChar = (char, shift) => {
  const code = char.charCodeAt(0);
  if (code >= 65 && code <= 90) {
    return String.fromCharCode(((code - 65 + shift) % 26 + 26) % 26 + 65);
  }
  return char;
};

const normalizeShift = (shift = 0) => ((shift % 26) + 26) % 26;
const formatShift = (shift) => (normalizeShift(shift) === 0 ? '0' : `+${normalizeShift(shift)}`);

const getMask = (levelData, idx) => {
  if (!levelData) return true;
  if (levelData.fullMask && levelData.fullMask[idx] !== undefined) {
    return levelData.fullMask[idx];
  }
  let wordStart = 0;
  const words = (levelData.plaintext || '').split(' ');
  for (let w = 0; w < words.length; w++) {
    const word = words[w];
    if (idx >= wordStart && idx < wordStart + word.length) {
      return levelData.masks?.[w]?.[idx - wordStart] ?? true;
    }
    wordStart += word.length + 1;
  }
  return true;
};

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

/**
 * Creates a diamond with a modifier value clustered around the remaining distance.
 */
const createRandomDiamond = (currentShift, target, existingCoins, lane = 0, startX = SPAWN_X, tier = 'easy') => {
  const normTier = String(tier || 'easy').toLowerCase();
  const diffNorm = normalizeShift(target - currentShift);
  const signedDist = diffNorm > 13 ? diffNorm - 26 : diffNorm;
  
  const maxLimit = normTier === 'easy' ? 7 : normTier === 'medium' ? 14 : 24;
  const radius = normTier === 'easy' ? 4 : normTier === 'medium' ? 5 : 6;
  
  const activeValues = existingCoins.map((c) => c.value);
  const pool = new Set();
  
  // 1. Direct solver if within limit and non-zero
  if (signedDist !== 0 && Math.abs(signedDist) <= maxLimit) {
    pool.add(signedDist);
  }
  
  // 2. Two-step decomposition
  if (signedDist !== 0) {
    const p1 = Math.trunc(signedDist / 2);
    const p2 = signedDist - p1;
    if (p1 !== 0 && Math.abs(p1) <= maxLimit) pool.add(p1);
    if (p2 !== 0 && Math.abs(p2) <= maxLimit) pool.add(p2);
  }
  
  // 3. Offset window around signedDist (or 1 if 0)
  const center = signedDist === 0 ? 1 : signedDist;
  const minVal = Math.max(-maxLimit, center - radius);
  const maxVal = Math.min(maxLimit, center + radius);
  for (let v = minVal; v <= maxVal; v++) {
    if (v !== 0) pool.add(v);
  }
  
  // 4. Ensure mixed signs
  const hasPos = Array.from(pool).some(v => v > 0);
  const hasNeg = Array.from(pool).some(v => v < 0);
  if (!hasPos) {
    for (let v = 1; v <= Math.min(3, maxLimit); v++) pool.add(v);
  }
  if (!hasNeg) {
    for (let v = -1; v >= Math.max(-3, -maxLimit); v--) pool.add(v);
  }

  const allCandidates = Array.from(pool);
  const availableCandidates = allCandidates.filter(v => !activeValues.includes(v));
  
  let val;
  if (signedDist !== 0 && Math.abs(signedDist) <= maxLimit && !activeValues.includes(signedDist) && Math.random() < 0.6) {
    val = signedDist;
  } else if (availableCandidates.length > 0) {
    val = availableCandidates[Math.floor(Math.random() * availableCandidates.length)];
  } else if (allCandidates.length > 0) {
    val = allCandidates[Math.floor(Math.random() * allCandidates.length)];
  } else {
    val = signedDist !== 0 ? Math.sign(signedDist) : 1;
  }

  return {
    id: `d-${Date.now()}-${Math.random()}`,
    lane,
    value: val,
    char: val > 0 ? `+${val}` : `−${Math.abs(val)}`,
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

export default function CipherSprint({
  levelData,
  tier,
  onVerifySubmit,
  onBackToStages,
  onReplayNewQuestion,
  onStartStageTimer,
}) {
  const {
    containerRef: fsContainerRef,
    isFullscreen,
    toggleFullscreen,
  } = useFullscreen();

  const targetShift = normalizeShift(
    levelData.targetShifts?.[0] ?? levelData.shift ?? levelData.targetShift ?? 0
  );

  /* ───────────────────────────────────────────────
     Pre-revealed letter hints (scale with word length)
     ─────────────────────────────────────────────── */
  const hintIndices = useMemo(() => {
    const hints = new Set();
    const normTier = String(tier || levelData?.difficulty || 'easy').toLowerCase();
    if (normTier === 'hard') {
      return hints; // Hard: reveal nothing
    }
    const plain = levelData?.plaintext || '';
    const nonSpaceIndices = [];
    for (let i = 0; i < plain.length; i++) {
      if (plain[i] !== ' ') nonSpaceIndices.push(i);
    }
    if (nonSpaceIndices.length === 0) return hints;

    // Check masks from levelData
    for (const idx of nonSpaceIndices) {
      if (getMask(levelData, idx)) {
        hints.add(idx);
      }
    }

    const minHints = 1;
    const maxHints = Math.max(1, Math.floor(nonSpaceIndices.length / 2));

    if (hints.size > maxHints) {
      const trimmed = Array.from(hints).slice(0, maxHints);
      return new Set(trimmed);
    }

    if (hints.size < minHints) {
      const seed = (levelData?.level || 1) % nonSpaceIndices.length;
      hints.add(nonSpaceIndices[seed]);
    }

    return hints;
  }, [levelData, tier]);

  /* Ciphertext letters set for highlighting in Decryption Guide */
  const cipherLettersSet = useMemo(() => {
    const set = new Set();
    const cipher = levelData?.ciphertext || '';
    for (let i = 0; i < cipher.length; i++) {
      if (cipher[i] >= 'A' && cipher[i] <= 'Z') {
        set.add(cipher[i]);
      }
    }
    return set;
  }, [levelData]);

  /* ───────────────────────────────────────────────
     Game state (visual)
     ─────────────────────────────────────────────── */
  const [sprintStep, setSprintStep] = useState('ready'); // 'ready' | 'running' | 'finished' | 'gameover'
  const [activeShift, setActiveShift] = useState(0);
  const [runnerLane, setRunnerLane] = useState(1);
  const [coins, setCoins] = useState([]);
  const [slimes, setSlimes] = useState([]);
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
     Refs — game truth inside RAF loop
     ─────────────────────────────────────────────── */
  const rafRef = useRef(0);
  const prevLaneRef = useRef(1);
  const isBoostingRef = useRef(false);
  const runnerLaneRef = useRef(1);
  const isPausedRef = useRef(false);
  const isMenuOpenRef = useRef(false);
  const sprintStepRef = useRef('ready');
  const activeShiftRef = useRef(0);
  const targetShiftRef = useRef(targetShift);
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
  useEffect(() => { activeShiftRef.current = activeShift; }, [activeShift]);
  useEffect(() => { targetShiftRef.current = targetShift; }, [targetShift]);
  useEffect(() => { coinsRef.current = coins; }, [coins]);
  useEffect(() => { slimesRef.current = slimes; }, [slimes]);

  const orangeSlimeSrc = `/assets/sprint/obstacle/obstacle1/SlimeOrange_${PAD5(slimeFrame)}.png`;
  const basicSlimeSrc = `/assets/sprint/obstacle/obstacle2/SlimeBasic_${PAD5(slimeFrame)}.png`;

  /* Animation frame intervals (slime) */
  useEffect(() => {
    if (isPausedRef.current || sprintStepRef.current !== 'running') return;
    slimeIntervalRef.current = window.setInterval(() => {
      setSlimeFrame((f) => (f + 1) % 30);
    }, 45);
    return () => window.clearInterval(slimeIntervalRef.current);
  }, [isPaused, sprintStep]);

  /* Init speed lines once */
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

  /* FX helpers */
  function clearAllFXTimeouts() {
    if (feedbackTimeoutRef.current) window.clearTimeout(feedbackTimeoutRef.current);
    if (spinTimeoutRef.current) window.clearTimeout(spinTimeoutRef.current);
    if (boostTimeoutRef.current) window.clearTimeout(boostTimeoutRef.current);
    if (shakeTimeoutRef.current) window.clearTimeout(shakeTimeoutRef.current);
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
    sprintSound.unlockAudio();
    sprintSound.playBgm();
    clearAllFXTimeouts();
    setActiveShift(0);
    activeShiftRef.current = 0;
    setLives(5);
    setIsPaused(false);
    setIsMenuOpen(false);
    setSprintStep('running');
    sprintStepRef.current = 'running';

    // Staggered initial placements with guaranteed spacing
    const initialCoins = [];
    const d1 = createRandomDiamond(0, targetShiftRef.current, initialCoins, 0, 75);
    initialCoins.push(d1);
    const d2 = createRandomDiamond(0, targetShiftRef.current, initialCoins, 1, 105);
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

  const handleRetryFromCheckpoint = () => {
    sprintSound.unlockAudio();
    sprintSound.playBgm();
    clearAllFXTimeouts();
    setActiveShift(0);
    activeShiftRef.current = 0;
    setLives(5);
    setIsPaused(false);
    setIsMenuOpen(false);
    setSprintStep('running');
    sprintStepRef.current = 'running';

    const initialCoins = [];
    const d1 = createRandomDiamond(0, targetShiftRef.current, initialCoins, 0, 75, tier);
    initialCoins.push(d1);
    const d2 = createRandomDiamond(0, targetShiftRef.current, initialCoins, 1, 105, tier);
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
      if (
        (e.key === 'f' || e.key === 'F') &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !(e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA'))
      ) {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleFsKey);
    return () => window.removeEventListener('keydown', handleFsKey);
  }, [toggleFullscreen]);

  /* ───────────────────────────────────────────────
     Keyboard steering
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

  /* ───────────────────────────────────────────────
     Lane-change tilt visual
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
    return () => {};
  }, [runnerLane]);

  /* ───────────────────────────────────────────────
     MAIN PHYSICS / GAME LOOP (RAF)
     ─────────────────────────────────────────────── */
  useEffect(() => {
    if (sprintStep !== 'running') return undefined;
    if (isPaused || isMenuOpen || showExplanation) return undefined;

    const updatePhysics = () => {
      if (
        isPausedRef.current ||
        isMenuOpenRef.current ||
        sprintStepRef.current !== 'running'
      ) {
        return;
      }

      const speed = isBoostingRef.current ? BASE_SPEED * BOOST_MULT : BASE_SPEED;
      const lane = runnerLaneRef.current;
      const target = targetShiftRef.current;
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
        triggerSpin();
        sprintSound.playSfx('collect');

        const nextShift = normalizeShift(activeShiftRef.current + collectedDiamond.value);
        activeShiftRef.current = nextShift;
        setActiveShift(nextShift);

        if (nextShift === target) {
          sprintStepRef.current = 'finished';
          setSprintStep('finished');
          sprintSound.stopBgm();
          sprintSound.playSfx('win');
          triggerBoost(2000);
          showFeedback('✨ Shift Matched! Target Decrypted!', '#22c55e', 15, 1500);
          return;
        } else {
          showFeedback(
            `${collectedDiamond.char} Shift → Active: ${formatShift(nextShift)}`,
            '#00e5ff',
            20 + collectedDiamond.lane * 30 - 8,
            900
          );
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
            const newDiamond = createRandomDiamond(
              activeShiftRef.current,
              targetShiftRef.current,
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
    setSprintStep('ready');
    sprintStepRef.current = 'ready';
    setActiveShift(0);
    activeShiftRef.current = 0;
    setLives(5);
    setCoins([]);
    coinsRef.current = [];
    setSlimes([]);
    slimesRef.current = [];
    setShowExplanation(false);
    setIsPaused(false);
    setRunnerLane(1);
    prevLaneRef.current = 1;
    runnerLaneRef.current = 1;
    setFeedbackText('');
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

  /* Unmount — hard cleanup */
  useEffect(() => {
    return () => {
      clearAllFXTimeouts();
      if (slimeIntervalRef.current) window.clearInterval(slimeIntervalRef.current);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
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

  /* ───────────────────────────────────────────────
     Explanation / submit handler
     ─────────────────────────────────────────────── */
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
  else if (isPaused) runnerAnim = 'idle';
  else if (laneChangeEffect !== null || isBoosting) runnerAnim = 'jump';
  else if (sprintStep === 'running') runnerAnim = 'run';

  const isSolved = sprintStep === 'finished' || normalizeShift(activeShift) === targetShift;

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
          cipherType="caesar"
          levelData={levelData}
          onUnlockNext={handleCloseExplanation}
        />
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
            category="caesar"
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
                <h2 className="cq-dossier-title">Cipher Sprint Relay</h2>
                <p className="cq-dossier-subtitle">
                  Collect signed shift modifiers (+N / −N) to find the Caesar shift key and decrypt the word.
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
                  <strong>How it works:</strong> Use <strong>Arrow UP/DOWN</strong> or <strong>W/S</strong> keys (or click lanes) to switch lanes. Collect diamonds carrying <strong>+</strong> and <strong>−</strong> shift modifiers to adjust your Active Shift. Watch the word decrypt live! Dodge obstacle slimes — slime contact costs a life. Press <strong>F</strong> to toggle fullscreen.
                </p>
                <button
                  className="cq-dossier-action-btn"
                  onClick={() => {
                    sprintSound.unlockAudio();
                    setIsOperationLoading(true);
                  }}
                >
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
                if (sprintStep === 'running' && !isPausedRef.current) {
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
                if (sprintStep === 'running' && !isPausedRef.current) {
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
                if (sprintStep === 'running' && !isPausedRef.current) {
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
                  sprintStep === 'finished' ? 'badge-correct' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {sprintStep === 'finished' ? '✓' : formatShift(activeShift)}
              </div>
            </div>

            {/* Modifier Diamonds */}
            {sprintStep === 'running' &&
              coins.map((coin) => (
                <div
                  key={coin.id}
                  className={`sprint-r2-diamond-sprite lane-${coin.lane}`}
                  style={{ left: `${coin.x}%` }}
                >
                  <div className="sprint-r2-diamond-inner">
                    <span
                      className="sprint-r2-diamond-char"
                      style={{ fontSize: '0.92rem', letterSpacing: '0.5px' }}
                    >
                      {coin.char}
                    </span>
                  </div>
                </div>
              ))}

            {/* Obstacle Slimes */}
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

          {/* 1. Top-Center Floating Word Panel (Matching Pac-Man Image 2 layout) */}
          <div className="caesar-pacman-floating-word-panel sprint-floating-word-panel">
            <div className="caesar-pacman-word-card">
              <div className="caesar-pacman-word-top-row">
                <span className="caesar-pacman-shift-label">Active Shift:</span>
                <span className={`caesar-pacman-shift-badge ${isBadgePopping ? 'pop' : ''}`}>
                  {formatShift(activeShift)}
                </span>
              </div>

              <div className="fg-letter-cells">
                {(levelData.plaintext || '').split('').map((char, idx) => {
                  if (char === ' ') {
                    return <div key={idx} style={{ width: 14 }} />;
                  }
                  const isHint = hintIndices.has(idx);
                  const cipherCh = levelData.ciphertext ? levelData.ciphertext[idx] : '';
                  const isCorrect = isSolved;

                  const displayChar = isHint
                    ? char
                    : isCorrect
                    ? char
                    : activeShift === 0
                    ? '_'
                    : caesarShiftChar(cipherCh, -activeShift);

                  let cellClass = 'fg-letter-cell';
                  if (isHint || (isCorrect && activeShift !== 0)) {
                    cellClass += ' correct-plain';
                  } else if (activeShift === 0) {
                    cellClass += ' masked';
                  } else {
                    cellClass += ' unmatched-plain';
                  }

                  return (
                    <div key={idx} className={cellClass}>
                      <span className="fg-cell-ciphertext">{cipherCh}</span>
                      <span className="fg-cell-plaintext">{displayChar}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {levelData.hint && (
              <div className="caesar-pacman-clue-banner">
                💡 Clue Context: "{levelData.hint}"
              </div>
            )}
          </div>

          {/* 2. Bottom-Left Floating Cipher Cheat Sheet (Matching Pac-Man Image 2 Decryption Guide) */}
          <div className="caesar-floating-cheat-sheet sprint-cheat-sheet cqs-cheat-sheet">
            <div className="caesar-cheat-header">
              <span className="caesar-cheat-title">🔐 Decryption Guide</span>
              <span className="caesar-cheat-badge">
                Shift {formatShift(activeShift)}
              </span>
            </div>
            <div className="caesar-cheat-body">
              <div className="caesar-cheat-labels cqs-labels-three">
                <span className="caesar-cheat-label-plain">PLAIN</span>
                <span className="caesar-cheat-label-shift">CIPHER</span>
                <span className="cqs-label-value">VALUE</span>
              </div>
              <div className="caesar-cheat-columns">
                {ALPHABET.map((plain, i) => {
                  const cipher = caesarShiftChar(plain, activeShift);
                  const isHighlighted = cipherLettersSet.has(cipher);
                  return (
                    <div
                      key={plain}
                      className={`caesar-cheat-col cqs-col-three ${isHighlighted ? 'highlighted' : ''}`}
                    >
                      <span className="caesar-cheat-plain">{plain}</span>
                      <span className="caesar-cheat-shifted">{cipher}</span>
                      <span className="cqs-cheat-value">{i + 1}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. Bottom-Right Floating Shift Key Clue Card */}
          <div className="caesar-floating-basket-card sprint-clue-card">
            <div className="caesar-basket-icon">🔑</div>
            <div className="caesar-basket-badge">{formatShift(activeShift)}</div>
            <span className="caesar-basket-label">Active Shift Key</span>
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
   Extracted UI components
   ═══════════════════════════════════════════════ */

function FinishedPanel({ onVerifySubmit, onReplayNewQuestion }) {
  return (
    <div className="fg-success-panel">
      <h3 className="caesar-victory-title">STAGE SECURED!</h3>
      <p className="caesar-victory-desc">Shift key identified and word decrypted successfully.</p>
      <button className="fg-btn fg-btn-primary" onClick={onVerifySubmit}>
        Verify & Submit
      </button>
      {onReplayNewQuestion && (
        <button className="fg-btn fg-btn-secondary" onClick={onReplayNewQuestion}>
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
        Runner collided with too many obstacles and ran out of lives.
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
