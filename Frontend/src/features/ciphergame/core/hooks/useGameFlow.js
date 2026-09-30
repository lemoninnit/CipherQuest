/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../../context/AuthContext";
import { userApi, scoringApi } from "../../../../api/cipherQuestApi";
import {
  getCaesarLevelData, getCaesarGameType,
  getVigenereLevelData, getVigenereGameType,
  getPlayfairLevelData, getPlayfairGameType,
} from "../engine/levelData";
import {
  getBaseScore, getStreakMultiplier, calculateStageScore,
} from "../engine/scoring";
import {
  saveStageSnapshot,
  loadStageSnapshot,
  clearStageSnapshot,
} from "../engine/gameSnapshot";

const VALID_CATEGORIES = ['caesar', 'vigenere', 'playfair'];
const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'];

const defaultProgress = () => ({
  caesar:   { easy: [], medium: [], hard: [] },
  vigenere: { easy: [], medium: [], hard: [] },
  playfair: { easy: [], medium: [], hard: [] },
});

const convertBackendProgress = (backendMap) => {
  const result = defaultProgress();
  if (!backendMap) return result;
  
  for (const [cipher, diffMap] of Object.entries(backendMap)) {
    const frontendCipher = cipher.toLowerCase();
    if (!result[frontendCipher]) continue;
    
    for (const [diff, levels] of Object.entries(diffMap)) {
      const frontendDiff = diff.toLowerCase();
      if (!result[frontendCipher][frontendDiff]) continue;
      
      result[frontendCipher][frontendDiff] = levels.map(
        levelIndex => `${frontendCipher}-${frontendDiff}-${levelIndex}`
      );
    }
  }
  return result;
};

const mergeProgress = (localProg, backendProg) => {
  if (!backendProg) return localProg || defaultProgress();
  const base = localProg || defaultProgress();
  const result = defaultProgress();
  VALID_CATEGORIES.forEach((cat) => {
    VALID_DIFFICULTIES.forEach((diff) => {
      const localArr = base[cat]?.[diff] || [];
      const backendArr = backendProg[cat]?.[diff] || [];
      result[cat][diff] = Array.from(new Set([...localArr, ...backendArr]));
    });
  });
  return result;
};

// Every tier is selectable from the Difficulty Selector (all three tier cards
// render as playable, with no padlock), so the flow must not bounce a tier
// selection back to the selector screen. Progression is instead gated per
// stage inside a tier by isStageUnlocked: stage 1 is always open and each
// later stage requires the previous one to be cleared.
export const isTierUnlocked = (cat, diff, prog) => {
  if (!cat || !VALID_CATEGORIES.includes(cat)) return false;
  return VALID_DIFFICULTIES.includes(diff);
};

export const isStageUnlocked = (cat, diff, stageIndex, prog) => {
  if (!isTierUnlocked(cat, diff, prog)) return false;
  if (typeof stageIndex !== 'number' || stageIndex < 0 || stageIndex > 4) return false;
  if (stageIndex === 0) return true;
  const catProg = prog?.[cat] || { easy: [], medium: [], hard: [] };
  const diffCompleted = catProg[diff] || [];
  const prevStageId = `${cat}-${diff}-${stageIndex - 1}`;
  return diffCompleted.includes(prevStageId);
};

function createStageObject(cat, diff, stageIndex, customLevelData = null, snapshot = null) {
  let levelData, gameType;
  if (cat === 'caesar') {
    levelData = customLevelData || getCaesarLevelData(diff, stageIndex);
    gameType  = getCaesarGameType(stageIndex);
  } else if (cat === 'vigenere') {
    levelData = customLevelData || getVigenereLevelData(diff, stageIndex);
    gameType  = getVigenereGameType(stageIndex);
  } else {
    levelData = customLevelData || getPlayfairLevelData(diff, stageIndex);
    gameType  = getPlayfairGameType(stageIndex);
  }

  return {
    id: `${cat}-${diff}-${stageIndex}`,
    category: cat,
    difficulty: diff,
    stageIndex,
    gameType,
    levelData,
    snapshot,
  };
}

function parseUrlParams(search, state, currentProg) {
  const params = new URLSearchParams(search);
  const rawCat = params.get('category')?.toLowerCase() || state?.category?.toLowerCase() || null;
  const rawDiff = params.get('difficulty')?.toLowerCase() || state?.difficulty?.toLowerCase() || null;
  const rawStage = params.get('stage') ?? null;

  const validCat = VALID_CATEGORIES.includes(rawCat) ? rawCat : null;
  if (!validCat) {
    return { category: null, difficulty: null, stageIndex: null, isLockedRedirect: false };
  }

  const validDiff = (rawDiff && VALID_DIFFICULTIES.includes(rawDiff)) ? rawDiff : null;
  if (validDiff && !isTierUnlocked(validCat, validDiff, currentProg)) {
    return { category: validCat, difficulty: null, stageIndex: null, isLockedRedirect: true };
  }

  if (!validDiff) {
    return { category: validCat, difficulty: null, stageIndex: null, isLockedRedirect: false };
  }

  let validStageIndex = null;
  if (rawStage !== null && rawStage !== undefined && rawStage !== '') {
    const parsedNum = parseInt(rawStage, 10);
    if (!isNaN(parsedNum)) {
      let idx = null;
      if (parsedNum >= 1 && parsedNum <= 5) {
        idx = parsedNum - 1;
      } else if (parsedNum === 0) {
        idx = 0;
      }

      if (idx !== null) {
        if (isStageUnlocked(validCat, validDiff, idx, currentProg)) {
          validStageIndex = idx;
        } else {
          return { category: validCat, difficulty: validDiff, stageIndex: null, isLockedRedirect: true };
        }
      }
    }
  }

  return { category: validCat, difficulty: validDiff, stageIndex: validStageIndex, isLockedRedirect: false };
}

export function useGameFlow() {
  const { user, refreshProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const getUserId = () => user?.id || user?.userId || user?.username || 'anonymous';

  const [progress, setProgress] = useState(() => {
    let localSaved = null;
    try {
      const saved = localStorage.getItem("cipher_progress_v2");
      if (saved) localSaved = JSON.parse(saved);
    } catch (_e) {
      /* ignore storage error */
    }
    const map = user?.progress || user?.progressMap;
    const backendProg = map ? convertBackendProgress(map) : null;
    return mergeProgress(localSaved, backendProg);
  });

  // Keep progress in sync when user updates
  useEffect(() => {
    if (user) {
      const map = user.progress || user.progressMap;
      if (map) {
        const backendProg = convertBackendProgress(map);
        setProgress((prev) => {
          const merged = mergeProgress(prev, backendProg);
          try {
            localStorage.setItem("cipher_progress_v2", JSON.stringify(merged));
          } catch (_e) {
            /* ignore storage error */
          }
          return merged;
        });
      }
    }
  }, [user]);

  const initialProg = (() => {
    let localSaved = null;
    try {
      const saved = localStorage.getItem("cipher_progress_v2");
      if (saved) localSaved = JSON.parse(saved);
    } catch (_e) {
      /* ignore storage error */
    }
    const map = user?.progress || user?.progressMap;
    const backendProg = map ? convertBackendProgress(map) : null;
    return mergeProgress(localSaved, backendProg);
  })();
  const initialParsed = parseUrlParams(location.search, location.state, initialProg);
  const initialUid = user?.id || user?.userId || user?.username || 'anonymous';
  const initialSnapshot = (initialParsed.category && initialParsed.difficulty && typeof initialParsed.stageIndex === 'number')
    ? loadStageSnapshot(initialUid, initialParsed.category, initialParsed.difficulty, initialParsed.stageIndex)
    : null;

  const [category, setCategory] = useState(initialParsed.category);
  const [difficulty, setDifficulty] = useState(initialParsed.difficulty);
  const [currentStage, setCurrentStage] = useState(() => {
    if (initialParsed.category && initialParsed.difficulty && typeof initialParsed.stageIndex === 'number') {
      return createStageObject(
        initialParsed.category,
        initialParsed.difficulty,
        initialParsed.stageIndex,
        initialSnapshot?.levelData || null,
        initialSnapshot
      );
    }
    return null;
  });
  const [loadingTargetStage, setLoadingTargetStage] = useState(null);

  // ── SCORING SYSTEM state ──────────────────────────────────────────
  const [stageStartedAt, setStageStartedAt] = useState(() => {
    if (initialSnapshot && typeof initialSnapshot.elapsedMs === 'number') {
      return Date.now() - initialSnapshot.elapsedMs;
    }
    return null;
  });
  const stageSessionIdRef = useRef(initialSnapshot?.stageSessionId ?? null);
  const lastFailedSessionRef = useRef(null);
  const completingStageIdRef = useRef(null);
  const completeRunTokenRef = useRef(0);
  const [stageResult, setStageResult] = useState(null);
  const [leaderboardStage, setLeaderboardStage] = useState(null);
  const [stageFailNotice, setStageFailNotice] = useState(null);
  const [completionModalData, setCompletionModalData] = useState(null);

  // Stable refs for tracking latest state without triggering cascading effect re-runs
  const progressRef = useRef(progress);
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  const stageResultRef = useRef(stageResult);
  useEffect(() => {
    stageResultRef.current = stageResult;
  }, [stageResult]);

  const currentStageRef = useRef(currentStage);
  useEffect(() => {
    currentStageRef.current = currentStage;
  }, [currentStage]);

  const stageStartedAtRef = useRef(stageStartedAt);
  useEffect(() => {
    stageStartedAtRef.current = stageStartedAt;
  }, [stageStartedAt]);

  // Sync state with URL / history popstate
  useEffect(() => {
    // If the score modal is currently open, do not touch or rebuild currentStage
    if (stageResultRef.current) {
      return;
    }

    const currentProg = progressRef.current;
    const parsed = parseUrlParams(location.search, location.state, currentProg);

    if (parsed.isLockedRedirect) {
      if (parsed.category && parsed.difficulty) {
        navigate(`/dashboard/ciphergame?category=${parsed.category}&difficulty=${parsed.difficulty}`, { replace: true });
      } else if (parsed.category) {
        navigate(`/dashboard/ciphergame?category=${parsed.category}`, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
      return;
    }

    setCategory(parsed.category);
    setDifficulty(parsed.difficulty);

    const uid = getUserId();

    if (parsed.category && parsed.difficulty && typeof parsed.stageIndex === 'number') {
      setCurrentStage((prev) => {
        // Return existing stage instance if already on the requested stage
        if (
          prev?.category === parsed.category &&
          prev?.difficulty === parsed.difficulty &&
          prev?.stageIndex === parsed.stageIndex
        ) {
          return prev;
        }

        // Only load snapshot when initializing a new stage object
        const snapshot = loadStageSnapshot(uid, parsed.category, parsed.difficulty, parsed.stageIndex);
        if (snapshot) {
          stageSessionIdRef.current = snapshot.stageSessionId ?? null;
          setStageStartedAt(Date.now() - (snapshot.elapsedMs || 0));
        }

        return createStageObject(
          parsed.category,
          parsed.difficulty,
          parsed.stageIndex,
          snapshot?.levelData || null,
          snapshot
        );
      });
    } else {
      setCurrentStage(null);
    }
  }, [location.search]);

  const isUnlocked = (cat, diff) => {
    return isTierUnlocked(cat, diff, progress);
  };

  const isStageCompleted = (cat, diff, stageIndex) => {
    const stageId = `${cat}-${diff}-${stageIndex}`;
    return (progress[cat]?.[diff] ?? []).includes(stageId);
  };

  const isStageLocked = (cat, diff, stageIndex) => {
    return !isStageUnlocked(cat, diff, stageIndex, progress);
  };

  /**
   * SCORING: register a server-side attempt and restart the live stage timer.
   */
  const requestStageSession = (cat, diff, stageIndex) => {
    stageSessionIdRef.current = null;
    setStageStartedAt(Date.now());
    if (!user) return;

    scoringApi
      .startStage(cat.toUpperCase(), diff.toUpperCase(), stageIndex)
      .then((res) => { stageSessionIdRef.current = res?.sessionId ?? null; })
      .catch((err) => {
        console.warn("Scoring start unavailable, using local scoring:", err.message);
      });
  };

  const saveSnapshot = useCallback((gameState) => {
    const stage = currentStageRef.current;
    if (!stage) return false;
    const { category: cat, difficulty: diff, stageIndex, levelData } = stage;
    const started = stageStartedAtRef.current;
    const elapsed = started ? Math.max(0, Date.now() - started) : 0;
    const uid = getUserId();
    return saveStageSnapshot(uid, {
      category: cat,
      difficulty: diff,
      stageIndex,
      levelData,
      stageSessionId: stageSessionIdRef.current,
      elapsedMs: elapsed,
      gameState,
    });
  }, [user]);

  const clearSnapshot = useCallback(() => {
    const stage = currentStageRef.current;
    if (!stage) return;
    const { category: cat, difficulty: diff, stageIndex } = stage;
    const uid = getUserId();
    clearStageSnapshot(uid, cat, diff, stageIndex);
  }, [user]);

  const startStage = (cat, diff, stageIndex, options = {}) => {
    completingStageIdRef.current = null;
    completeRunTokenRef.current++;
    const uid = getUserId();
    clearStageSnapshot(uid, cat, diff, stageIndex);

    if (cat) setCategory(cat);
    if (diff) setDifficulty(diff);
    setStageResult(null);
    setCompletionModalData(null);
    lastFailedSessionRef.current = null;
    setLeaderboardStage(null);
    setStageStartedAt(null);

    const stageObj = createStageObject(cat, diff, stageIndex);
    setCurrentStage(stageObj);

    const stageNum = stageIndex + 1;
    navigate(
      `/dashboard/ciphergame?category=${cat}&difficulty=${diff}&stage=${stageNum}`,
      { replace: options.replace ?? false }
    );
  };

  const startStageTimer = () => {
    if (!currentStage) return;
    const { category: cat, difficulty: diff, stageIndex } = currentStage;
    requestStageSession(cat, diff, stageIndex);
  };

  const finishLoadingStage = () => {
    if (loadingTargetStage) {
      setCurrentStage(loadingTargetStage);
      setLoadingTargetStage(null);
    }
  };

  const completeStage = async () => {
    if (!currentStage) return;
    const { category: cat, difficulty: diff, stageIndex, id } = currentStage;
    const stageId = `${cat}-${diff}-${stageIndex}`;

    // Re-entrancy guard: if already completing this stage, log and bail immediately
    if (completingStageIdRef.current === stageId) {
      console.warn(`[completeStage] Duplicate completion call ignored for stage: ${stageId}`);
      return;
    }
    completingStageIdRef.current = stageId;
    const currentRunToken = ++completeRunTokenRef.current;

    const uid = getUserId();
    
    // Clear stage snapshot immediately before async calls or score modal display
    clearStageSnapshot(uid, cat, diff, stageIndex);

    let scoreResult = null;
    const sessionId = stageSessionIdRef.current;
    stageSessionIdRef.current = null; // consume the session — prevents duplicate complete calls (409)
    if (sessionId) {
      try {
        scoreResult = await scoringApi.completeStage(sessionId);
      } catch (err) {
        console.warn("Scoring complete failed, using local scoring:", err.message);
      }
    }

    // Check if this run has been cancelled/superceded by user navigation
    if (completeRunTokenRef.current !== currentRunToken) {
      return;
    }

    if (!scoreResult) {
      const currentStreak = Number(user?.gameStreak) || 0;
      const newStreak = currentStreak + 1;
      const multiplier = getStreakMultiplier(newStreak);
      const baseScore = getBaseScore(diff);
      scoreResult = {
        score: calculateStageScore(baseScore, multiplier),
        baseScore,
        streak: newStreak,
        multiplier,
        completionTimeMs: stageStartedAt ? Date.now() - stageStartedAt : 0,
        totalScore: (Number(user?.totalScore) || 0) + calculateStageScore(baseScore, multiplier),
        bestScore: null,
        bestTimeMs: null,
        newBestScore: false,
        newBestTime: false,
        newBadges: [],
        progressMap: null,
      };
    }
    setStageResult({ ...scoreResult, category: cat, difficulty: diff, stageIndex });

    // Optimistically record stage completion synchronously so next stage unlocks immediately
    setProgress((prev) => {
      const catProg = prev[cat] || { easy: [], medium: [], hard: [] };
      const diffArr = catProg[diff] || [];
      const next = {
        ...prev,
        [cat]: {
          ...catProg,
          [diff]: diffArr.includes(stageId) ? diffArr : [...diffArr, stageId],
        },
      };
      try {
        localStorage.setItem("cipher_progress_v2", JSON.stringify(next));
      } catch (_e) {
        /* ignore storage error */
      }
      return next;
    });

    // Set tier completion modal synchronously BEFORE network awaits so it cannot be late-resurrected
    if (stageIndex === 4) {
      const cipherNames = { caesar: 'Caesar', vigenere: 'Vigenère', playfair: 'Playfair' };
      const cipherName = cipherNames[cat] || 'Cipher';

      let type = 'tier';
      let badgeTitle = '';
      let badgeImage = '';
      let nextDiff = null;

      if (diff === 'easy') {
        type = 'tier';
        badgeTitle = `${cipherName} Initiate`;
        badgeImage = `/assets/badges/${cat}_initiate.png`;
        nextDiff = 'medium';
      } else if (diff === 'medium') {
        type = 'tier';
        badgeTitle = `${cipherName} Expert`;
        badgeImage = `/assets/badges/${cat}_expert.png`;
        nextDiff = 'hard';
      } else if (diff === 'hard') {
        type = 'grandmaster';
        badgeTitle = `${cipherName} Grandmaster`;
        badgeImage = `/assets/badges/${cat}_grandmaster.png`;
        nextDiff = null;
      }

      setCompletionModalData({
        type,
        badgeTitle,
        badgeImage,
        tierName: diff.charAt(0).toUpperCase() + diff.slice(1),
        cipherName,
        category: cat,
        difficulty: diff,
        nextDifficulty: nextDiff,
        xpAwarded: diff === 'hard' ? 500 : 250,
      });
    }

    setCurrentStage(null);
    setLoadingTargetStage(null);

    // Background asynchronous persistence — check token before writing state
    try {
      try {
        const response = await userApi.saveProgress(cat, diff, stageIndex);
        if (completeRunTokenRef.current === currentRunToken && response && response.progressMap) {
          const backendProg = convertBackendProgress(response.progressMap);
          setProgress((prev) => {
            const merged = mergeProgress(prev, backendProg);
            try {
              localStorage.setItem("cipher_progress_v2", JSON.stringify(merged));
            } catch (_e) {
              /* ignore storage error */
            }
            return merged;
          });
        }
      } catch (err) {
        console.warn("Could not save progress to backend, using local progress:", err.message);
      }

      if (refreshProfile) {
        try {
          await refreshProfile();
        } catch (err) {
          console.warn("Could not refresh profile after stage completion (ignoring):", err.message);
        }
      }
    } finally {
      if (completingStageIdRef.current === stageId && completeRunTokenRef.current === currentRunToken) {
        completingStageIdRef.current = null;
      }
    }
  };

  const handleContinueNextDifficulty = () => {
    if (!completionModalData) return;
    const { category: cat, nextDifficulty } = completionModalData;
    completingStageIdRef.current = null;
    completeRunTokenRef.current++;
    setCompletionModalData(null);
    setStageResult(null);
    if (nextDifficulty) {
      setDifficulty(nextDifficulty);
      startStage(cat, nextDifficulty, 0, { replace: true });
    } else {
      goToCategories();
    }
  };

  const handleCloseCompletionModal = () => {
    completingStageIdRef.current = null;
    completeRunTokenRef.current++;
    setCompletionModalData(null);
    setStageResult(null);
    goToCategories();
  };

  const replayCurrentStage = () => {
    if (!currentStage) return;
    const { category: cat, difficulty: diff, stageIndex } = currentStage;
    const uid = getUserId();
    clearStageSnapshot(uid, cat, diff, stageIndex);
    startStage(cat, diff, stageIndex, { replace: true });
  };

  // ── SCORING: failure flow ─────────────────────────────────────────
  // 0 points, streak -> 0, multiplier -> 1.00, total score preserved.
  // Called by games when the player runs out of lives / fails the stage.
  //
  // Also clears the stage snapshot so a lost stage is not resurrected by the
  // pause/resume engine, and `showNotice: false` lets a game that already
  // renders its own GAME OVER overlay keep the scoring side-effects (streak
  // reset, 0 score) without a second modal stacking on top of it.
  const failStage = async ({ showNotice = true } = {}) => {
    if (currentStage) {
      const uid = getUserId();
      clearStageSnapshot(uid, currentStage.category, currentStage.difficulty, currentStage.stageIndex);
    }
    const sessionId = stageSessionIdRef.current;
    if (sessionId && lastFailedSessionRef.current === sessionId) return;

    let failResult = null;
    if (sessionId) {
      lastFailedSessionRef.current = sessionId;
      try {
        failResult = await scoringApi.failStage(sessionId);
      } catch (err) {
        console.warn("Scoring fail unavailable:", err.message);
      }
    }
    stageSessionIdRef.current = null;

    // FAILURE BEHAVIOR (spec §7 / §18): no score, streak reset to 0,
    // multiplier effective at 1.00x, existing total score preserved.
    if (showNotice) {
      setStageFailNotice({
        score: 0,
        streak: failResult?.gameStreak ?? 0,
        multiplier: failResult?.multiplier ?? 1,
        totalScore: failResult?.totalScore ?? (Number(user?.totalScore) || 0),
      });
    }

    if (refreshProfile) {
      try { await refreshProfile(); } catch { /* offline */ }
    }

    if (currentStage) {
      requestStageSession(currentStage.category, currentStage.difficulty, currentStage.stageIndex);
    }
  };

  const dismissStageFailNotice = () => setStageFailNotice(null);

  const openStageLeaderboard = (cat, diff, stageIndex) => {
    setLeaderboardStage({
      cipherType: String(cat).toUpperCase(),
      difficultyTier: String(diff).toUpperCase(),
      levelIndex: stageIndex,
      category: cat,
      difficulty: diff,
      stageIndex,
    });
  };

  const closeStageLeaderboard = () => setLeaderboardStage(null);

  const dismissStageResult = () => setStageResult(null);

  const returnToRoadmap = (cat, diff) => {
    completingStageIdRef.current = null;
    completeRunTokenRef.current++;
    const targetCat = cat || category;
    const targetDiff = diff || difficulty;
    if (currentStage) {
      const uid = getUserId();
      clearStageSnapshot(uid, currentStage.category, currentStage.difficulty, currentStage.stageIndex);
    }
    if (targetCat) setCategory(targetCat);
    if (targetDiff) setDifficulty(targetDiff);
    setCurrentStage(null);
    setLoadingTargetStage(null);
    setStageResult(null);
    setLeaderboardStage(null);
    if (targetCat && targetDiff) {
      navigate(`/dashboard/ciphergame?category=${targetCat}&difficulty=${targetDiff}`, { replace: true });
    } else if (targetCat) {
      navigate(`/dashboard/ciphergame?category=${targetCat}`, { replace: true });
    } else {
      navigate('/dashboard', { replace: true });
    }
  };

  const goToCategories = () => {
    completingStageIdRef.current = null;
    completeRunTokenRef.current++;
    if (currentStage) {
      const uid = getUserId();
      clearStageSnapshot(uid, currentStage.category, currentStage.difficulty, currentStage.stageIndex);
    }
    setCategory(null);
    setDifficulty(null);
    setCurrentStage(null);
    setLoadingTargetStage(null);
    setStageResult(null);
    setCompletionModalData(null);
    setLeaderboardStage(null);
    navigate('/dashboard');
  };

  const selectCategory = (cat) => {
    completingStageIdRef.current = null;
    completeRunTokenRef.current++;
    if (currentStage) {
      const uid = getUserId();
      clearStageSnapshot(uid, currentStage.category, currentStage.difficulty, currentStage.stageIndex);
    }
    setCategory(cat);
    setDifficulty(null);
    setCurrentStage(null);
    setLoadingTargetStage(null);
    setStageResult(null);
    setCompletionModalData(null);
    setLeaderboardStage(null);
    navigate(`/dashboard/ciphergame?category=${cat}`);
  };

  const selectDifficulty = (diff) => {
    completingStageIdRef.current = null;
    completeRunTokenRef.current++;
    if (currentStage) {
      const uid = getUserId();
      clearStageSnapshot(uid, currentStage.category, currentStage.difficulty, currentStage.stageIndex);
    }
    setDifficulty(diff);
    setCurrentStage(null);
    setLoadingTargetStage(null);
    setStageResult(null);
    setCompletionModalData(null);
    setLeaderboardStage(null);
    navigate(`/dashboard/ciphergame?category=${category}&difficulty=${diff}`);
  };

  const backToDifficulty = () => {
    completingStageIdRef.current = null;
    completeRunTokenRef.current++;
    if (currentStage) {
      const uid = getUserId();
      clearStageSnapshot(uid, currentStage.category, currentStage.difficulty, currentStage.stageIndex);
    }
    setDifficulty(null);
    setCurrentStage(null);
    setLoadingTargetStage(null);
    setStageResult(null);
    setCompletionModalData(null);
    setLeaderboardStage(null);
    if (category) {
      navigate(`/dashboard/ciphergame?category=${category}`);
    } else {
      navigate('/dashboard');
    }
  };

  const backToStages = () => {
    completingStageIdRef.current = null;
    completeRunTokenRef.current++;
    if (currentStage) {
      const uid = getUserId();
      clearStageSnapshot(uid, currentStage.category, currentStage.difficulty, currentStage.stageIndex);
    }
    setCurrentStage(null);
    setLoadingTargetStage(null);
    setStageResult(null);
    setCompletionModalData(null);
    setLeaderboardStage(null);
    if (category && difficulty) {
      navigate(`/dashboard/ciphergame?category=${category}&difficulty=${difficulty}`);
    } else if (category) {
      navigate(`/dashboard/ciphergame?category=${category}`);
    } else {
      navigate('/dashboard');
    }
  };

  return {
    progress,
    category, difficulty, currentStage, loadingTargetStage,
    completionModalData,
    isUnlocked, isStageCompleted, isStageLocked,
    startStage, startStageTimer, finishLoadingStage, completeStage, replayCurrentStage,
    handleContinueNextDifficulty, handleCloseCompletionModal,
    goToCategories, selectCategory, selectDifficulty,
    backToDifficulty, backToStages, returnToRoadmap,
    saveSnapshot, clearSnapshot,
    // SCORING SYSTEM
    stageStartedAt, stageResult, dismissStageResult, failStage,
    stageFailNotice, dismissStageFailNotice,
    leaderboardStage, openStageLeaderboard, closeStageLeaderboard,
  };
}

