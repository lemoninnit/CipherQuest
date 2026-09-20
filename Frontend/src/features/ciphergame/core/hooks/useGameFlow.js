/* eslint-disable react-hooks/set-state-in-effect, no-unused-vars */
import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
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

const VALID_CATEGORIES = ['caesar', 'vigenere', 'playfair'];

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

export function useGameFlow() {
  const { user, refreshProfile } = useAuth();
  const location = useLocation();
  const routeCategory = location.state?.category;
  const routeDifficulty = location.state?.difficulty;

  const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'];

  const initialCategory = VALID_CATEGORIES.includes(routeCategory) ? routeCategory : null;
  const initialDifficulty = (initialCategory && VALID_DIFFICULTIES.includes(routeDifficulty)) ? routeDifficulty : null;

  const [progress, setProgress] = useState(defaultProgress());

  const [category,   setCategory]   = useState(initialCategory);
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [currentStage, setCurrentStage] = useState(null);
  const [loadingTargetStage, setLoadingTargetStage] = useState(null);

  // ── SCORING SYSTEM state ──────────────────────────────────────────
  // stageStartedAt : local timestamp captured when the stage starts (live timer)
  // stageSessionId : server-side attempt id (anti-cheat); null when offline
  // stageResult    : result of the last successful completion (score modal)
  const [stageStartedAt, setStageStartedAt] = useState(null);
  const stageSessionIdRef = useRef(null);
  // Guards against duplicate failure signals for the same attempt (games may
  // report a failure from more than one code path).
  const lastFailedSessionRef = useRef(null);
  const [stageResult, setStageResult] = useState(null);

  // ── SCORING SYSTEM: per-stage leaderboard (HIGHEST SCORE / FASTEST TIME) ──
  // leaderboardStage : stage descriptor for the leaderboard modal (null = closed)
  const [leaderboardStage, setLeaderboardStage] = useState(null);

  // ── SCORING SYSTEM: failure notice ────────────────────────────────
  // Shown briefly after a failed attempt: no score, streak reset, total preserved.
  const [stageFailNotice, setStageFailNotice] = useState(null);

  // Completion modal state for tier / grandmaster completion
  const [completionModalData, setCompletionModalData] = useState(null);

  // Sync progress state when user or user progress map changes
  useEffect(() => {
    if (user) {
      const map = user.progress || user.progressMap;
      if (map) {
        setProgress(convertBackendProgress(map));
      }
    }
  }, [user]);

  const isUnlocked = (cat, diff) => {
    return true;
  };

  const isStageCompleted = (cat, diff, stageIndex) => {
    const stageId = `${cat}-${diff}-${stageIndex}`;
    return (progress[cat]?.[diff] ?? []).includes(stageId);
  };

  /**
   * SCORING: register a server-side attempt and restart the live stage timer.
   *
   * Every attempt must start on the server (POST /api/scoring/start) so that
   * completion time is server-derived and the score cannot be forged. Shared by
   * startStage and by the post-failure re-arm, because the games retry in place
   * rather than reopening the stage.
   *
   * Offline fallback: when the backend is unreachable, scoring still works
   * locally via completeStage.
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

  const startStage = (cat, diff, stageIndex) => {
    let levelData, gameType;
    if (cat === 'caesar') {
      levelData = getCaesarLevelData(diff, stageIndex);
      gameType  = getCaesarGameType(stageIndex);
    } else if (cat === 'vigenere') {
      levelData = getVigenereLevelData(diff, stageIndex);
      gameType  = getVigenereGameType(stageIndex);
    } else {
      levelData = getPlayfairLevelData(diff, stageIndex);
      gameType  = getPlayfairGameType(stageIndex);
    }

    // ── SCORING: start the stage timer + register a server-side session ──
    lastFailedSessionRef.current = null;
    setLeaderboardStage(null);
    requestStageSession(cat, diff, stageIndex);

    setCurrentStage({
      id: `${cat}-${diff}-${stageIndex}`,
      category: cat,
      difficulty: diff,
      stageIndex,
      gameType,
      levelData,
    });
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

    // ── SCORING: server-authoritative completion ─────────────────────
    // The backend increments the streak, recalculates the multiplier from
    // the NEW streak, derives the completion time from server timestamps,
    // and updates total score + personal bests. The client sends nothing
    // but the sessionId.
    let scoreResult = null;
    const sessionId = stageSessionIdRef.current;
    if (sessionId) {
      try {
        scoreResult = await scoringApi.completeStage(sessionId);
      } catch (err) {
        console.warn("Scoring complete failed, using local scoring:", err.message);
      }
    }
    if (!scoreResult) {
      // Local fallback (offline mode): streak +1 -> multiplier from NEW streak.
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

    try {
      const response = await userApi.saveProgress(cat, diff, stageIndex);
      if (response && response.progressMap) {
        setProgress(convertBackendProgress(response.progressMap));
      }
      if (refreshProfile) {
        await refreshProfile();
      }
    } catch (err) {
      console.error("Failed to save progress to backend:", err);
      // Fallback local update if API fails (offline mode)
      setProgress(prev => {
        const catProg = prev[cat] || { easy: [], medium: [], hard: [] };
        const diffArr = catProg[diff] || [];
        const next = {
          ...prev,
          [cat]: {
            ...catProg,
            [diff]: diffArr.includes(id) ? diffArr : [...diffArr, id],
          },
        };
        try { localStorage.setItem("cipher_progress_v2", JSON.stringify(next)); } catch (e) { /* ignore storage error */ }
        return next;
      });
    }

    // Check if 5th level (index 4) of a tier was completed to trigger completion modal
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
      startStage(cat, nextDifficulty, 0);
    }
  };

  const handleCloseCompletionModal = () => {
    setCompletionModalData(null);
    goToCategories();
  };

  const replayCurrentStage = () => {
    if (!currentStage) return;
    const { category: cat, difficulty: diff, stageIndex } = currentStage;
    startStage(cat, diff, stageIndex);
  };

  // ── SCORING: failure flow ─────────────────────────────────────────
  // 0 points, streak -> 0, multiplier -> 1.00, total score preserved.
  // Called by games when the player runs out of lives / fails the stage.
  const failStage = async () => {
    const sessionId = stageSessionIdRef.current;

    // Ignore duplicate failure signals for the same attempt.
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
    setStageFailNotice({
      score: 0,
      streak: failResult?.gameStreak ?? 0,
      multiplier: failResult?.multiplier ?? 1,
      totalScore: failResult?.totalScore ?? (Number(user?.totalScore) || 0),
    });

    if (refreshProfile) {
      try { await refreshProfile(); } catch { /* offline: streak resets locally */ }
    }

    // Re-arm a fresh server-side attempt: the games retry the same stage in
    // place, so a later success must still be scored by the server.
    if (currentStage) {
      requestStageSession(currentStage.category, currentStage.difficulty, currentStage.stageIndex);
    }
  };

  const dismissStageFailNotice = () => setStageFailNotice(null);

  // ── SCORING: per-stage leaderboard (HIGHEST SCORE / FASTEST TIME) ──
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
    if (targetCat) setCategory(targetCat);
    if (targetDiff) setDifficulty(targetDiff);
    setCurrentStage(null);
    setLoadingTargetStage(null);
    setStageResult(null);
    setCompletionModalData(null);
    setLeaderboardStage(null);
  };

  const goToCategories   = () => { setCategory(null); setDifficulty(null); setCurrentStage(null); setLoadingTargetStage(null); setCompletionModalData(null); setLeaderboardStage(null); };
  const selectCategory   = (cat)  => { setCategory(cat); setDifficulty(null); setLoadingTargetStage(null); setCompletionModalData(null); setLeaderboardStage(null); };
  const selectDifficulty = (diff) => { setDifficulty(diff); setLoadingTargetStage(null); setCompletionModalData(null); setLeaderboardStage(null); };
  const backToDifficulty = () => { setDifficulty(null); setCurrentStage(null); setLoadingTargetStage(null); setCompletionModalData(null); setLeaderboardStage(null); };
  const backToStages     = () => { setCurrentStage(null); setLoadingTargetStage(null); setCompletionModalData(null); setLeaderboardStage(null); };

  return {
    progress,
    category, difficulty, currentStage, loadingTargetStage,
    completionModalData,
    isUnlocked, isStageCompleted,
    startStage, finishLoadingStage, completeStage, replayCurrentStage,
    handleContinueNextDifficulty, handleCloseCompletionModal,
    goToCategories, selectCategory, selectDifficulty,
    backToDifficulty, backToStages, returnToRoadmap,
    // SCORING SYSTEM
    stageStartedAt, stageResult, dismissStageResult, failStage,
    stageFailNotice, dismissStageFailNotice,
    leaderboardStage, openStageLeaderboard, closeStageLeaderboard,
  };
}

