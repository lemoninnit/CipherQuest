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

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const BASE_SPEED = 0.22;
const BOOST_MULT = 1.6;
const RUNNER_X = 14;
const DIAMOND_HITBOX_HALF = 3.8;
const SLIME_HITBOX_HALF = 4.2;
const SPAWN_X = 112;

// Minimum horizontal gaps to prevent overlap and guarantee safe lane switching
const MIN_SAME_LANE_GAP = 36; // % of track width between entities in the same lane
const MIN_ANY_LANE_GAP = 18;  // % of track width stagger across any lane
const MIN_SLIME_GAP = 28;     // % horizontal buffer specifically between slimes/monsters and diamonds
const CLUSTER_WINDOW = 35;    // % window where at least 1 lane MUST remain completely open

const PAD5 = (n) => String(n).padStart(5, '0');

const charToIdx = (c) => (c ? c.toUpperCase().charCodeAt(0) - 65 : 0);

const vigenereDecryptChar = (cipherChar, keyShift) => {
  const code = cipherChar.charCodeAt(0);
  if (code >= 65 && code <= 90) {
    return String.fromCharCode(((code - 65 - keyShift + 26) % 26) + 65);
  }
  return cipherChar;
};

const getRandomDecoys = (correctChar, count, tier = 'easy') => {
  const normTier = String(tier || 'easy').toLowerCase();
  const radius = normTier === 'easy' ? 4 : normTier === 'medium' ? 5 : 6;
  const targetIdx = (correctChar || 'A').toUpperCase().charCodeAt(0) - 65;
  const pool = [];
  for (let offset = 1; offset <= radius; offset++) {
    pool.push(ALPHABET[(targetIdx + offset) % 26]);
    pool.push(ALPHABET[(targetIdx - offset + 26) % 26]);
  }
  const uniquePool = Array.from(new Set(pool)).filter((c) => c !== correctChar);
  const shuffled = uniquePool.sort(() => Math.random() - 0.5);
  if (shuffled.length >= count) return shuffled.slice(0, count);
  const allOther = ALPHABET.filter((c) => c !== correctChar && !shuffled.includes(c)).sort(() => Math.random() - 0.5);
  return [...shuffled, ...allOther].slice(0, count);
};

const tabulaRow = (keyLetter) => {
  const shift = keyLetter.charCodeAt(0) - 65;
  const row = [];
  for (let i = 0; i < 26; i++) {
    const cipherIdx = (i + shift) % 26;
    row.push(ALPHABET[cipherIdx]);
  }
  return row;
};

/**
 * Returns lanes where:
 * 1) Same-lane clearance is at least minGap behind spawnX.
 * 2) Entities in adjacent/all lanes maintain adequate clearance, especially around monsters.
 * 3) Spawning here does not cause all 3 lanes to be blocked within the CLUSTER_WINDOW.
 */
const getAvailableLanes = (existingCoins, existingSlimes, minGap = MIN_SAME_LANE_GAP, spawnX = SPAWN_X, isSlime = false) => {
  const all = [...existingCoins, ...existingSlimes];
  const lanes = [0, 1, 2];

  // Find which lanes already have entities in the spawn cluster [spawnX - CLUSTER_WINDOW, spawnX + 10]
  const clusterEntities = all.filter((e) => e.x >= spawnX - CLUSTER_WINDOW);
  const occupiedClusterLanes = new Set(clusterEntities.map((e) => e.lane));

  return lanes.filter((lane) => {
    // 1. Same-lane clearance check
    const laneEntities = all.filter((e) => e.lane === lane);
    if (laneEntities.length > 0) {
      const maxLaneX = Math.max(...laneEntities.map((e) => e.x));
      const requiredSameGap = isSlime ? Math.max(minGap, 40) : minGap;
      if (spawnX - maxLaneX < requiredSameGap) return false;
    }

    // 2. Slime-to-Diamond & Diamond-to-Slime cross-lane spacing check
    if (isSlime) {
      // If spawning a slime, ensure any diamond in ANY lane is at least MIN_SLIME_GAP away
      const nearbyDiamonds = existingCoins.filter((c) => Math.abs(spawnX - c.x) < MIN_SLIME_GAP);
      if (nearbyDiamonds.length > 0) return false;
    } else {
      // If spawning a diamond, ensure any slime in ANY lane is at least MIN_SLIME_GAP away
      const nearbySlimes = existingSlimes.filter((s) => Math.abs(spawnX - s.x) < MIN_SLIME_GAP);
      if (nearbySlimes.length > 0) return false;
    }

    // 3. Safe passage guarantee: Spawning here must NOT cause all 3 lanes to be occupied in the cluster
    const wouldOccupy = new Set(occupiedClusterLanes);
    wouldOccupy.add(lane);
    if (wouldOccupy.size >= 3) {
      return false; // Guarantee at least 1 lane is always completely clear!
    }

    return true;
  });
};

const createRandomDiamond = (correctChar, existingCoins, lane = 0, startX = SPAWN_X, tier = 'easy') => {
  const activeValues = existingCoins.map((c) => c.char);
  const hasCorrectOnScreen = activeValues.includes(correctChar);

  let chosen;
  // If correct answer is not on screen yet, 50% chance to spawn it
  if (!hasCorrectOnScreen && Math.random() < 0.5) {
    chosen = correctChar;
  } else {
    // Generate decoys and filter out already active values and the correct answer
    const decoys = getRandomDecoys(correctChar, 10, tier);
    const availableDecoys = decoys.filter((d) => d !== correctChar && !activeValues.includes(d));
    if (availableDecoys.length > 0) {
      chosen = availableDecoys[Math.floor(Math.random() * availableDecoys.length)];
    } else if (!hasCorrectOnScreen) {
      chosen = correctChar;
    } else {
      const remainingLetters = ALPHABET.filter(c => c !== correctChar && !activeValues.includes(c));
      chosen = remainingLetters.length > 0
        ? remainingLetters[Math.floor(Math.random() * remainingLetters.length)]
        : (decoys[0] || 'A');
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

export default function VigenereSprint({
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
  const {
    containerRef: fsContainerRef,
    isFullscreen,
    toggleFullscreen,
  } = useFullscreen();

  /* ───────────────────────────────────────────────
     Static / memoised level data
     ─────────────────────────────────────────────── */
  const { hintIndices, maskedIndices } = useMemoLevelMeta(levelData, tier);

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
      initialSolved[idx] = levelData.plaintext[idx];
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
  const [showTabula, setShowTabula] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackColor, setFeedbackColor] = useState('#facc15');
  const [feedbackY, setFeedbackY] = useState(50);
  const [trackShake, setTrackShake] = useState(false);
  const [isBoosting, setIsBoosting] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isBadgePopping, setIsBadgePopping] = useState(false);
  const [slimeFrame, setSlimeFrame] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedGlobalIdx, setSelectedGlobalIdx] = useState(null);

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
  const runnerLaneRef = useRef(hasSnapshot && typeof snapshot?.gameState?.runnerLane === 'number' ? snapshot.gameState.runnerLane : 1);
  const isPausedRef = useRef(hasSnapshot ? true : false);
  const isMenuOpenRef = useRef(hasSnapshot ? true : false);
  const sprintStepRef = useRef(hasSnapshot ? 'running' : 'ready');
  const currentMaskIndexRef = useRef(hasSnapshot && typeof snapshot?.gameState?.currentMaskIndex === 'number' ? snapshot.gameState.currentMaskIndex : 0);
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
  const targetKey = levelData?.targetKey || levelData?.keyword || levelData?.key || 'KEY';
  const cleanHint = levelData?.hint ? levelData.hint.trim() : '';
  const currentIdx = maskedIndices[currentMaskIndex] ?? 0;
  const currentBatonLetter = levelData.ciphertext[currentIdx] ?? '';

  let charIdxInText = 0;
  for (let i = 0; i < currentIdx; i++) {
    if (levelData.plaintext[i] !== ' ') charIdxInText++;
  }
  const currentShiftKey = (levelData.targetShifts && levelData.targetShifts[charIdxInText % levelData.targetShifts.length]) ?? 0;
  const currentKeyChar = targetKey[charIdxInText % targetKey.length] || 'A';
  const currentTargetChar = levelData.plaintext[currentIdx] ?? vigenereDecryptChar(currentBatonLetter, currentShiftKey);

  const letterPositions = useMemo(() => {
    if (!levelData.plaintext) return [];
    const list = [];
    let count = 0;
    for (let i = 0; i < levelData.plaintext.length; i++) {
      const p = levelData.plaintext[i];
      if (p !== ' ') {
        const slot = count % targetKey.length;
        const kChar = targetKey[slot] || 'A';
        const sVal = (levelData.targetShifts && levelData.targetShifts[count % levelData.targetShifts.length]) ?? charToIdx(kChar);
        list.push({
          globalIdx: count,
          charIdx: i,
          plainChar: p,
          cipherChar: levelData.ciphertext[i] || '',
          keyChar: kChar,
          shiftVal: sVal,
        });
        count++;
      }
    }
    return list;
  }, [levelData, targetKey]);

  const isPositionSolved = (p) => solvedLetters[p.charIdx] !== undefined;
  const unsolvedPositions = letterPositions.filter(p => !isPositionSolved(p));

  const activeTargetPos = letterPositions.find(p => p.charIdx === currentIdx) || letterPositions[0] || {
    globalIdx: 0,
    charIdx: 0,
    plainChar: 'A',
    cipherChar: 'A',
    keyChar: 'A',
    shiftVal: 0,
  };

  const activeViewingTarget = (selectedGlobalIdx !== null && unsolvedPositions.find(p => p.globalIdx === selectedGlobalIdx))
    || unsolvedPositions[0]
    || activeTargetPos;

  const handlePrevPos = (e) => {
    e?.stopPropagation?.();
    if (unsolvedPositions.length <= 1) return;
    const currentUnsolvedIdx = unsolvedPositions.findIndex(p => p.globalIdx === activeViewingTarget.globalIdx);
    const prevIdx = (currentUnsolvedIdx - 1 + unsolvedPositions.length) % unsolvedPositions.length;
    setSelectedGlobalIdx(unsolvedPositions[prevIdx].globalIdx);
  };

  const handleNextPos = (e) => {
    e?.stopPropagation?.();
    if (unsolvedPositions.length <= 1) return;
    const currentUnsolvedIdx = unsolvedPositions.findIndex(p => p.globalIdx === activeViewingTarget.globalIdx);
    const nextIdx = (currentUnsolvedIdx + 1) % unsolvedPositions.length;
    setSelectedGlobalIdx(unsolvedPositions[nextIdx].globalIdx);
  };

  const viewingCipherChar = activeViewingTarget.cipherChar;
  const viewingCipherVal = charToIdx(viewingCipherChar);
  const viewingKeyChar = activeViewingTarget.keyChar;
  const viewingShiftKey = activeViewingTarget.shiftVal;
  const viewingPlainChar = activeViewingTarget.plainChar;
  const viewingPlainVal = charToIdx(viewingPlainChar);
  const isViewingSolved = isPositionSolved(activeViewingTarget);

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

    const firstMaskIdx = maskedIndices[0] ?? 0;
    const firstTargetChar = levelData.plaintext[firstMaskIdx] || 'A';

    // Initialize pre-revealed hints
    const initialSolved = {};
    hintIndices.forEach((idx) => {
      initialSolved[idx] = levelData.plaintext[idx];
    });
    setSolvedLetters(initialSolved);

    // Staggered initial placements with guaranteed spacing
    const initialCoins = [];
    const d1 = createRandomDiamond(firstTargetChar, initialCoins, 0, 80, tier);
    initialCoins.push(d1);
    const d2 = createRandomDiamond(firstTargetChar, initialCoins, 1, 125, tier);
    initialCoins.push(d2);

    const initialSlimes = [createRandomSlime(2, 170)];

    setCoins(initialCoins);
    coinsRef.current = initialCoins;
    setSlimes(initialSlimes);
    slimesRef.current = initialSlimes;

    lastDiamondSpawnTimeRef.current = performance.now();
    lastSlimeSpawnTimeRef.current = performance.now();
    nextDiamondDelayRef.current = 1800 + Math.random() * 800;
    nextSlimeDelayRef.current = 3400 + Math.random() * 1200;
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

      if (e.key === 'ArrowUp' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.code === 'KeyW') {
        e.preventDefault();
        setRunnerLane((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowDown' || e.code === 'ArrowDown' || e.key === 's' || e.key === 'S' || e.code === 'KeyS') {
        e.preventDefault();
        setRunnerLane((prev) => Math.min(2, prev + 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sprintStep, isMenuOpen]);

  /* ── reset on levelData change ── */
  useEffect(() => {
    const curId = levelData.id || `${levelData.plaintext || ''}-${levelData.ciphertext || ''}`;
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
      setSelectedGlobalIdx(null);

      const initialSolved = {};
      hintIndices.forEach((idx) => {
        initialSolved[idx] = levelData.plaintext[idx];
      });
      setSolvedLetters(initialSolved);
    }
  }, [levelData, hintIndices]);

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

      const speed = BASE_SPEED;
      const lane = runnerLaneRef.current;
      const now = performance.now();

      /* Speed lines */
      setSpeedLines((prevLines) =>
        prevLines.map((line) => {
          let nextX = line.x - line.speed * 0.4;
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
        let cIdxInText = 0;
        for (let i = 0; i < curIdx; i++) {
          if (levelData.plaintext[i] !== ' ') cIdxInText++;
        }
        const sKey = (levelData.targetShifts && levelData.targetShifts[cIdxInText % levelData.targetShifts.length]) ?? 0;
        const cBaton = levelData.ciphertext[curIdx] ?? '';
        const curTargetChar = levelData.plaintext[curIdx] ?? vigenereDecryptChar(cBaton, sKey);

        if (collectedDiamond.char === curTargetChar) {
          triggerSpin();
          sprintSound.playSfx('collect');
          showFeedback('⚡ Correct Letter!', '#22c55e', 10, 1100);

          setSolvedLetters((prev) => ({ ...prev, [curIdx]: curTargetChar }));

          const nextMaskIdx = curMaskIdx + 1;
          if (nextMaskIdx < maskedIndices.length) {
            setCurrentMaskIndex(nextMaskIdx);
            currentMaskIndexRef.current = nextMaskIdx;
            // Clear coins on track to immediately spawn fresh candidates for next letter
            coinsRef.current = [];
            setCoins([]);
            lastDiamondSpawnTimeRef.current = performance.now();
          } else {
            onClearSnapshot?.();
            sprintStepRef.current = 'finished';
            setSprintStep('finished');
            sprintSound.stopBgm();
            sprintSound.playSfx('win');
            showFeedback('✨ Keyword & Cipher Solved! Mission Complete!', '#22c55e', 15, 1500);
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
            SPAWN_X,
            false
          );
          if (availableLanes.length > 0) {
            lastDiamondSpawnTimeRef.current = now;
            nextDiamondDelayRef.current = 1800 + Math.random() * 1000;
            const chosenLane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
            const curMaskIdx = currentMaskIndexRef.current;
            const curIdx = maskedIndices[curMaskIdx] ?? 0;
            let cIdxInText = 0;
            for (let i = 0; i < curIdx; i++) {
              if (levelData.plaintext[i] !== ' ') cIdxInText++;
            }
            const sKey = (levelData.targetShifts && levelData.targetShifts[cIdxInText % levelData.targetShifts.length]) ?? 0;
            const cBaton = levelData.ciphertext[curIdx] ?? '';
            const curTargetChar = levelData.plaintext[curIdx] ?? vigenereDecryptChar(cBaton, sKey);

            const newDiamond = createRandomDiamond(
              curTargetChar,
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
        if (SPAWN_X - maxOverallX >= MIN_SLIME_GAP) {
          const availableLanes = getAvailableLanes(
            coinsRef.current,
            slimesRef.current,
            MIN_SAME_LANE_GAP,
            SPAWN_X,
            true
          );
          // Prefer lanes without another slime closely trailing behind
          const slimeCandidates = availableLanes.filter((l) => {
            const laneSlimes = slimesRef.current.filter((s) => s.lane === l && s.x >= SPAWN_X - 45);
            return laneSlimes.length === 0;
          });
          const candidatePool = slimeCandidates.length > 0 ? slimeCandidates : availableLanes;

          if (candidatePool.length > 0) {
            lastSlimeSpawnTimeRef.current = now;
            nextSlimeDelayRef.current = 3200 + Math.random() * 1800;
            const chosenLane = candidatePool[Math.floor(Math.random() * candidatePool.length)];
            const newSlime = createRandomSlime(chosenLane, SPAWN_X);
            slimesRef.current = [...slimesRef.current, newSlime];
            setSlimes(slimesRef.current);
          }
        }
      }

      rafRef.current = window.requestAnimationFrame(updatePhysics);
    };

    rafRef.current = window.requestAnimationFrame(updatePhysics);
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, [sprintStep, isPaused, isMenuOpen, showExplanation, maskedIndices, levelData, tier, triggerSpin, triggerBoost, showFeedback, triggerShake]);

  /* ───────────────────────────────────────────────
     Unmount cleanup
     ─────────────────────────────────────────────── */
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
  else if (laneChangeEffect !== null) runnerAnim = 'jump';
  else if (sprintStep === 'running') runnerAnim = 'run';

  /* ═══════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════ */
  return (
    <div
      ref={fsContainerRef}
      className={`sprint-container fg-root vigenere-sprint-fullscreen ${isFullscreen ? 'is-fullscreen' : ''}`}
    >
      {/* ───── Recap overlay ───── */}
      {showExplanation && (
        <CryptographicRecap
          cipherType="vigenere"
          levelData={levelData}
          onUnlockNext={handleCloseExplanation}
        />
      )}

      {/* HUD Header */}
      {!isOperationLoading && (
        <GameHudBar
          title="Vigenère Sprint Relay"
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
            category="vigenere"
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
                <h2 className="cq-dossier-title">Vigenère Sprint Relay</h2>
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
                    <span className="cq-dossier-label">KEYWORD</span>
                    <span className="cq-dossier-value yellow-mono">{targetKey}</span>
                  </div>
                  {cleanHint && (
                    <div className="cq-dossier-row">
                      <span className="cq-dossier-label">HINT</span>
                      <span className="cq-dossier-value hint-text">{cleanHint}</span>
                    </div>
                  )}
                </div>
                <p className="cq-dossier-how-it-works">
                  <strong>How it works:</strong>{' '}
                  Use <strong>Arrow UP/DOWN</strong> or <strong>W/S</strong> keys to switch lanes. Collect the correct plaintext letter calculated using the Vigenère keyword and shift value. Dodge the obstacle slimes! Decoy letters will cost a heart! Press <strong>F</strong> to toggle fullscreen.
                </p>
                <button className="cq-dossier-action-btn" onClick={() => { sprintSound.unlockAudio(); setIsOperationLoading(true); }}>
                  Begin operation
                </button>
              </div>
            </div>
          </div>
        )
      ) : (
        /* ───── Running / Gameplay Layout ───── */
        <div className="caesar-sprint-fullscreen sprint-fullscreen-stage vigenere-sprint-fullscreen">
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
                {sprintStep === 'finished' ? '✓' : currentBatonLetter}
              </div>
            </div>

            {/* Answer Diamonds (carrying candidate plain letters) */}
            {sprintStep === 'running' &&
              coins.map((coin) => (
                <div
                  key={coin.id}
                  className={`sprint-r2-diamond-sprite lane-${coin.lane}`}
                  style={{ left: `${coin.x}%` }}
                >
                  <div className="sprint-r2-diamond-inner">
                    <span className="sprint-r2-diamond-char">{coin.char}</span>
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

          {/* 1. Top-Center Floating Word Panel */}
          <div className="caesar-floating-word-panel vg-sprint-word-panel">
            <div className="fg-word-segments-row">
              <div className="fg-word-segment-card">
                <div className="fg-letter-cells">
                  {(levelData?.plaintext || '').split('').map((char, idx) => {
                    if (char === ' ') {
                      return <div key={idx} style={{ width: 10 }} />;
                    }
                    const isMasked = !hintIndices.has(idx);
                    const isCurrentActive = isMasked && idx === currentIdx && sprintStep === 'running';
                    const cipherCh = levelData?.ciphertext?.[idx] || '';
                    const isSolved = solvedLetters[idx] !== undefined;
                    const plainCh = isSolved ? solvedLetters[idx] : hintIndices.has(idx) ? char : '_';

                    let cellClass = "fg-letter-cell";
                    if (isSolved || hintIndices.has(idx)) {
                      cellClass += " correct-plain";
                    } else if (isCurrentActive) {
                      cellClass += " active-target";
                    }

                    return (
                      <div key={idx} className={cellClass} title={`Cipher: ${cipherCh} → ${isSolved ? plainCh : '?'}`}>
                        <span className="fg-cell-ciphertext">{cipherCh}</span>
                        <span className="fg-cell-plaintext">{plainCh}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            {cleanHint && (
              <div className="caesar-floating-hint">
                💡 Hint: <strong>"{cleanHint}"</strong>
              </div>
            )}
          </div>

          {/* 2. Bottom-Center Floating Keyword Pill */}
          {targetKey && (
            <div className="vg-fishing-bottom-keyword" title={`Repeating Keyword: ${targetKey}`}>
              <span className="vg-pill-lbl">KEYWORD</span>
              <span className="vg-pill-val">{targetKey}</span>
            </div>
          )}

          {/* 3. Bottom-Left Decryption Arithmetic & A-Z Reference */}
          <div className="vg-floating-key-panel vg-fishing-az-panel vg-sprint-az-panel">
            <div className="vg-floating-current-slot">
              <div className="vg-arithmetic-title-stacked">
                <span className="vg-arithmetic-title-line">DECRYPTION</span>
                <span className="vg-arithmetic-title-line">ARITHMETIC</span>
              </div>
              <button
                type="button"
                className="vg-tabula-modal-btn vg-tabula-btn-compact"
                onClick={() => setShowTabula(true)}
                title="Open Interactive Tabula Recta"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '0.85rem' }}>grid_on</span>
                <span>Tabula Recta</span>
              </button>
            </div>

            {/* Active calculation card */}
            <div className="vg-fishing-calc-card">
              <div className="vg-calc-top-row">
                <span className="vg-calc-label">ACTIVE LETTER DECRYPTION</span>
                <span className="vg-calc-badge vg-pos-stepper">
                  <button
                    type="button"
                    className="vg-pos-stepper-btn"
                    onClick={handlePrevPos}
                    disabled={unsolvedPositions.length <= 1}
                    aria-label="Previous unsolved position"
                  >
                    ‹
                  </button>
                  <span className="vg-pos-stepper-label">Pos #{activeViewingTarget.globalIdx + 1}</span>
                  <button
                    type="button"
                    className="vg-pos-stepper-btn"
                    onClick={handleNextPos}
                    disabled={unsolvedPositions.length <= 1}
                    aria-label="Next unsolved position"
                  >
                    ›
                  </button>
                </span>
              </div>
              <div className="vg-calc-formula-row">
                <div className="vg-calc-item cipher">
                  <span className="lbl">Cipher</span>
                  <strong>{viewingCipherChar || '-'}</strong>
                  <span className="val">{viewingCipherVal}</span>
                </div>
                <span className="vg-calc-op">−</span>
                <div className="vg-calc-item key">
                  <span className="lbl">Key</span>
                  <strong>{viewingKeyChar || '-'}</strong>
                  <span className="val">{viewingShiftKey}</span>
                </div>
                <span className="vg-calc-op">=</span>
                <div className={`vg-calc-item plain ${isViewingSolved ? 'is-solved' : ''}`}>
                  <span className="lbl">Target</span>
                  <strong style={{ color: isViewingSolved ? 'var(--neon-green)' : '#ffffff' }}>
                    {isViewingSolved ? viewingPlainChar : '?'}
                  </strong>
                  <span
                    className="val"
                    style={{ visibility: isViewingSolved ? 'visible' : 'hidden' }}
                  >
                    {viewingPlainVal}
                  </span>
                </div>
              </div>

              {/* Calculate prompt line */}
              <div className="vg-calc-help-row">
                {isViewingSolved ? (
                  <span className="vg-calc-help-text solved">
                    ✅ Solved: {viewingCipherChar} ({viewingCipherVal}) − {viewingKeyChar} ({viewingShiftKey}) {viewingCipherVal - viewingShiftKey < 0 ? '+ 26 ' : ''}= {viewingPlainChar} ({viewingPlainVal})
                  </span>
                ) : (viewingCipherVal - viewingShiftKey < 0) ? (
                  <span className="vg-calc-help-text wrap-around">
                    ⚠️ Wrap-Around: Calculate ({viewingCipherVal} − {viewingShiftKey} + 26) = <strong>?</strong>
                  </span>
                ) : (
                  <span className="vg-calc-help-text normal">
                    💡 Calculate: {viewingCipherVal} − {viewingShiftKey} = <strong>?</strong>
                  </span>
                )}
              </div>
            </div>

            {/* 2-row x 13-col Alphabet grid */}
            <div className="vg-sprint-alphabet-grid">
              <div className="vg-alphabet-row">
                {ALPHABET.slice(0, 13).map((ch, i) => {
                  const isCipher = ch === viewingCipherChar;
                  const isKey = ch === viewingKeyChar;
                  const isTarget = isViewingSolved && ch === viewingPlainChar;
                  let cellClass = "vg-alphabet-cell";
                  if (isCipher) cellClass += " is-cipher";
                  if (isKey) cellClass += " is-key";
                  if (isTarget) cellClass += " is-target";
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
                  const isCipher = ch === viewingCipherChar;
                  const isKey = ch === viewingKeyChar;
                  const isTarget = isViewingSolved && ch === viewingPlainChar;
                  let cellClass = "vg-alphabet-cell";
                  if (isCipher) cellClass += " is-cipher";
                  if (isKey) cellClass += " is-key";
                  if (isTarget) cellClass += " is-target";
                  return (
                    <div key={ch} className={cellClass} title={`${ch} = ${val}`}>
                      <span className="vg-alpha-char">{ch}</span>
                      <span className="vg-alpha-val">{val}</span>
                    </div>
                  );
                })}
              </div>
            </div>
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
            <div className="caesar-floating-failure-panel">
              <GameOverPanel stageLoss={stageLoss} onExit={onBackToStages} />
            </div>
          )}
        </div>
      )}

      {/* Tabula Recta Modal for Vigenère Mode */}
      {showTabula && (
        <div className="vg-modal-overlay" onClick={() => setShowTabula(false)}>
          <div className="vg-modal-card tabula-modal" onClick={e => e.stopPropagation()}>
            <div className="vg-modal-header">
              <h3>📊 Interactive Tabula Recta</h3>
              <button className="vg-modal-close" onClick={() => setShowTabula(false)}>×</button>
            </div>
            <div className="vg-modal-body">
              <p className="vg-modal-instructions">
                The Tabula Recta is a 26×26 grid of shifted alphabets. Find the column of your <strong>Cipher letter (C)</strong>,
                then look at the row of your <strong>Key letter (K)</strong> to find the intersection, which is the <strong>Plain letter (P)</strong>!
                <br />
                <span style={{ color: 'var(--neon-yellow)' }}>★ Gold Rows: rows containing key letters for this level's key ("{targetKey}") are highlighted.</span>
              </p>
              <div className="vg-tabula-scroll-wrapper">
                <table className="vg-tabula-full-grid">
                  <thead>
                    <tr>
                      <th className="corner-cell">K \ P</th>
                      {ALPHABET.map(ch => (
                        <th key={ch} className="col-header">{ch}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ALPHABET.map((kChar) => {
                      const isCorrectKey = targetKey ? targetKey.includes(kChar) : false;
                      const rowLetters = tabulaRow(kChar);
                      return (
                        <tr key={kChar} className={isCorrectKey ? 'correct-key-row' : ''}>
                          <td className="row-header">{kChar}</td>
                          {rowLetters.map((cChar, cIdx) => {
                            const plainLetter = ALPHABET[cIdx];
                            return (
                              <td
                                key={cIdx}
                                className="cell"
                                title={`Key: ${kChar}, Plain: ${plainLetter} → Cipher: ${cChar}`}
                              >
                                {cChar}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
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
      <p className="caesar-victory-desc">All segments decrypted successfully.</p>
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
function useMemoLevelMeta(levelData, tier) {
  return useMemo(() => {
    const hintIndices = new Set();
    const normTier = String(tier || levelData?.difficulty || 'easy').toLowerCase();
    const plain = levelData?.plaintext || '';

    if (normTier !== 'hard') {
      const getMask = (idx) => {
        if (!levelData) return false;
        if (levelData.fullMask && levelData.fullMask[idx] !== undefined) {
          return levelData.fullMask[idx];
        }
        let wordStart = 0;
        const words = plain.split(' ');
        for (let w = 0; w < words.length; w++) {
          const word = words[w];
          if (idx >= wordStart && idx < wordStart + word.length) {
            return levelData.masks?.[w]?.[idx - wordStart] ?? false;
          }
          wordStart += word.length + 1;
        }
        return false;
      };

      for (let i = 0; i < plain.length; i++) {
        if (plain[i] !== ' ' && getMask(i)) {
          hintIndices.add(i);
        }
      }
    }

    const maskedIndices = [];
    for (let i = 0; i < plain.length; i++) {
      if (plain[i] !== ' ' && !hintIndices.has(i)) {
        maskedIndices.push(i);
      }
    }

    const words = plain.split(' ');

    return { hintIndices, maskedIndices, words };
  }, [levelData, tier]);
}
