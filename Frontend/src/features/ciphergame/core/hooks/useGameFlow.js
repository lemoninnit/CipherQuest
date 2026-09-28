/* eslint-disable react-hooks/set-state-in-effect, no-unused-vars, react-hooks/exhaustive-deps */
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

export const isTierUnlocked = (cat, diff, prog) => {
  if (!cat || !VALID_CATEGORIES.includes(cat)) return false;
  if (diff === 'easy') return true;
  const catProg = prog?.[cat] || { easy: [], medium: [], hard: [] };
  if (diff === 'medium') {
    return (catProg.easy || []).length >= 5;
  }
  if (diff === 'hard') {
    return (catProg.medium || []).length >= 5;
  }
  return false;
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
    const map = user?.progress || user?.progressMap;
    if (map) return convertBackendProgress(map);
    try {
      const saved = localStorage.getItem("cipher_progress_v2");
      if (saved) return JSON.parse(saved);
    } catch (_e) {
      /* ignore storage error */
    }
    return defaultProgress();
  });

  // Keep progress in sync when user updates
  useEffect(() => {
    if (user) {
      const map = user.progress || user.progressMap;
      if (map) {
        setProgress(convertBackendProgress(map));
      }
    }
  }, [user]);

  const initialProg = (() => {
    const map = user?.progress || user?.progressMap;
    if (map) return convertBackendProgress(map);
    try {
      const saved = localStorage.getItem("cipher_progress_v2");
      if (saved) return JSON.parse(saved);
    } catch (_e) {
      /* ignore storage error */
    }
    return defaultProgress();
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
  const [stageResult, setStageResult] = useState(null);
  const [leaderboardStage, setLeaderboardStage] = useState(null);
  const [stageFailNotice, setStageFailNotice] = useState(null);
  const [completionModalData, setCompletionModalData] = useState(null);

  // Sync state with URL / history popstate
  useEffect(() => {
    const parsed = parseUrlParams(location.search, location.state, progress);

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
      const snapshot = loadStageSnapshot(uid, parsed.category, parsed.difficulty, parsed.stageIndex);
      if (snapshot) {
        stageSessionIdRef.current = snapshot.stageSessionId ?? null;
        setStageStartedAt(Date.now() - (snapshot.elapsedMs || 0));
      }

      setCurrentStage((prev) => {
        if (
          prev?.category === parsed.category &&
          prev?.difficulty === parsed.difficulty &&
          prev?.stageIndex === parsed.stageIndex &&
          !snapshot
        ) {
          return prev;
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
  }, [location.search, progress]);

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
    if (!currentStage) return false;
    const { category: cat, difficulty: diff, stageIndex, levelData } = currentStage;
    const elapsed = stageStartedAt ? Math.max(0, Date.now() - stageStartedAt) : 0;
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
  }, [currentStage, stageStartedAt, user]);

  const clearSnapshot = useCallback(() => {
    if (!currentStage) return;
    const { category: cat, difficulty: diff, stageIndex } = currentStage;
    const uid = getUserId();
    clearStageSnapshot(uid, cat, diff, stageIndex);
  }, [currentStage, user]);

  const startStage = (cat, diff, stageIndex, options = {}) => {
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
    const uid = getUserId();
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
    const stageId = `${cat}-${diff}-${stageIndex}`;
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
      } catch (e) {
        /* ignore storage error */
      }
      return next;
    });

    try {
      const response = await userApi.saveProgress(cat, diff, stageIndex);
      if (response && response.progressMap) {
        setProgress(convertBackendProgress(response.progressMap));
      }
      if (refreshProfile) {
        await refreshProfile();
      }
    } catch (err) {
      console.warn("Could not save progress to backend, using local progress:", err.message);
    }

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
  };

  const handleContinueNextDifficulty = () => {
    if (!completionModalData) return;
    const { category: cat, nextDifficulty } = completionModalData;
    setCompletionModalData(null);
    if (nextDifficulty) {
      setDifficulty(nextDifficulty);
      startStage(cat, nextDifficulty, 0, { replace: true });
    } else {
      goToCategories();
    }
  };

  const handleCloseCompletionModal = () => {
    setCompletionModalData(null);
    goToCategories();
  };

  const replayCurrentStage = () => {
    if (!currentStage) return;
    const { category: cat, difficulty: diff, stageIndex } = currentStage;
    const uid = getUserId();
    clearStageSnapshot(uid, cat, diff, stageIndex);
    startStage(cat, diff, stageIndex, { replace: true });
  };

  const failStage = async () => {
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

    setStageFailNotice({
      score: 0,
      streak: failResult?.gameStreak ?? 0,
      multiplier: failResult?.multiplier ?? 1,
      totalScore: failResult?.totalScore ?? (Number(user?.totalScore) || 0),
    });

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
    setCompletionModalData(null);
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
    if (currentStage) {
      const uid = getUserId();
      clearStageSnapshot(uid, currentStage.category, currentStage.difficulty, currentStage.stageIndex);
    }
    setCategory(null);
    setDifficulty(null);
    setCurrentStage(null);
    setLoadingTargetStage(null);
    setCompletionModalData(null);
    setLeaderboardStage(null);
    navigate('/dashboard');
  };

  const selectCategory = (cat) => {
    if (currentStage) {
      const uid = getUserId();
      clearStageSnapshot(uid, currentStage.category, currentStage.difficulty, currentStage.stageIndex);
    }
    setCategory(cat);
    setDifficulty(null);
    setCurrentStage(null);
    setLoadingTargetStage(null);
    setCompletionModalData(null);
    setLeaderboardStage(null);
    navigate(`/dashboard/ciphergame?category=${cat}`);
  };

  const selectDifficulty = (diff) => {
    if (currentStage) {
      const uid = getUserId();
      clearStageSnapshot(uid, currentStage.category, currentStage.difficulty, currentStage.stageIndex);
    }
    setDifficulty(diff);
    setCurrentStage(null);
    setLoadingTargetStage(null);
    setCompletionModalData(null);
    setLeaderboardStage(null);
    navigate(`/dashboard/ciphergame?category=${category}&difficulty=${diff}`);
  };

  const backToDifficulty = () => {
    if (currentStage) {
      const uid = getUserId();
      clearStageSnapshot(uid, currentStage.category, currentStage.difficulty, currentStage.stageIndex);
    }
    setDifficulty(null);
    setCurrentStage(null);
    setLoadingTargetStage(null);
    setCompletionModalData(null);
    setLeaderboardStage(null);
    if (category) {
      navigate(`/dashboard/ciphergame?category=${category}`);
    } else {
      navigate('/dashboard');
    }
  };

  const backToStages = () => {
    if (currentStage) {
      const uid = getUserId();
      clearStageSnapshot(uid, currentStage.category, currentStage.difficulty, currentStage.stageIndex);
    }
    setCurrentStage(null);
    setLoadingTargetStage(null);
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

