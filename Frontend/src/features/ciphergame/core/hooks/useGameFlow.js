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
  // The in-flight stage-loss charge, so a game that reports the same loss twice
  // (StrictMode double-invoke, a double effect) joins the running charge
  // instead of starting a second one and spending two hearts.
  const heartFailInFlightRef = useRef(null);
  // The in-flight stage-session open, keyed by stage, so a duplicate open for
  // the same stage joins the running request instead of superseding it.
  const pendingSessionRef = useRef(null);
  // Set by requestStageSession when the server answers 409, so the
  // stage-start gate can tell "refused" apart from "network hiccup".
  const isLockedOutRef = useRef(false);
  const completingStageIdRef = useRef(null);
  const completeRunTokenRef = useRef(0);
  const [stageResult, setStageResult] = useState(null);
  const [leaderboardStage, setLeaderboardStage] = useState(null);
  const [stageFailNotice, setStageFailNotice] = useState(null);
  const [cooldownNotice, setCooldownNotice] = useState(null);
  // The post-loss heart state, published the moment a stage loss is charged.
  // Games that render their own losing screen read this so the hearts they
  // show are the server's answer rather than the profile value that is still
  // in flight from `refreshProfile()` a frame earlier.
  const [stageLoss, setStageLoss] = useState(null);
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
          // NOTE: the snapshot deliberately does NOT restore the old session id.
          // That session is already FAILED/EXPIRED on the server, so reporting a
          // loss against it would be a no-op and the player would keep the heart.
          // A fresh session is opened by startStageTimer once play begins.
          stageSessionIdRef.current = null;
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
   * SCORING: open a server-side attempt for this stage.
   *
   * Called as soon as the stage is launched (not after the loading screen) so
   * the session ALWAYS exists before the player can lose. Previously this ran
   * only when a game reported its loading screen finished, which left a window
   * where a fast loss had no session to report against - the heart was never
   * charged and the player could keep playing for free.
   *
   * Only ONE attempt is ever opened per stage. Opening a second one makes the
   * server retire the first (StageSessionRepository.expireActiveSessions), so a
   * duplicate open could leave the client holding a session the server has
   * already marked EXPIRED - and a loss reported against an expired session was
   * never charged. Concurrent opens for the same stage (startStage racing the
   * game's startStageTimer, a double-clicked stage card) now share one request.
   *
   * @returns {Promise<number|null>} the new session id, or null if refused.
   */
  const requestStageSession = async (cat, diff, stageIndex) => {
    const key = `${cat}-${diff}-${stageIndex}`;
    const pending = pendingSessionRef.current;
    if (pending && pending.key === key) return pending.promise;

    // Registered before the request starts so a re-entrant call during the
    // round trip joins this attempt instead of opening a competing one.
    const entry = { key, promise: null };
    pendingSessionRef.current = entry;

    entry.promise = (async () => {
      stageSessionIdRef.current = null;
      isLockedOutRef.current = false;
      setStageStartedAt(Date.now());
      if (!user) return null;

      try {
        const res = await scoringApi.startStage(cat.toUpperCase(), diff.toUpperCase(), stageIndex);
        stageSessionIdRef.current = res?.sessionId ?? null;
        return stageSessionIdRef.current;
      } catch (err) {
        // 409 = the server locked this operative out (no session hearts left).
        // The local profile can be stale, so trust the server: re-sync the
        // profile and show the lockout instead of silently playing unscored.
        if (err?.status === 409) {
          isLockedOutRef.current = true;
          showLockoutNotice();
          return null;
        }
        console.warn("Scoring start unavailable, using local scoring:", err.message);
        return null;
      } finally {
        // Settled either way: allow a later retry (a new attempt, or a stage
        // start that was refused and is being tried again).
        if (pendingSessionRef.current === entry) pendingSessionRef.current = null;
      }
    })();

    return entry.promise;
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

  /**
   * Raises the session-heart lockout dialog.
   *
   * Accepts the server-supplied cooldown end time when there is one; otherwise
   * falls back to the 4-hour window so the countdown is always meaningful.
   * Re-syncs the profile in the background so the HUD hearts stop disagreeing
   * with the server.
   */
  const showLockoutNotice = (cooldownEndTime = null) => {
    const endMs = cooldownEndTime ? new Date(cooldownEndTime).getTime() : NaN;
    setCooldownNotice({
      // `id` lets the notice remount per cooldown so its clock re-seeds.
      cooldownEndTime: Number.isFinite(endMs) ? endMs : Date.now() + 4 * 60 * 60 * 1000,
      id: Date.now(),
    });
    if (refreshProfile) {
      refreshProfile().catch(() => { /* offline */ });
    }
  };

  const startStage = async (cat, diff, stageIndex, options = {}) => {
    // SESSION HEART GATE (fast path). The server is the authority and refuses
    // a stage start with HTTP 409 while no session heart remains
    // (ScoringService.startStage -> UserProgressService.assertNotOnCooldown),
    // for EVERY cipher. This mirrors the rule locally so a locked-out player
    // stays on the roadmap with a clear explanation.
    //
    // Zero hearts locks play on its own: a profile with no hearts left but no
    // usable cooldown clock (stale client data) is still locked out, matching
    // UserProgressService.isLockedOut on the server.
    const heartsLeft = Number(user?.attempts);
    const hasHearts = Number.isFinite(heartsLeft) && heartsLeft > 0;
    const cooldownEndMs = user?.cooldownEndTime
      ? new Date(user.cooldownEndTime).getTime()
      : NaN;
    const cooldownActive = Number.isFinite(cooldownEndMs) && cooldownEndMs - Date.now() > 0;
    if (!hasHearts || cooldownActive) {
      showLockoutNotice(Number.isFinite(cooldownEndMs) ? cooldownEndMs : null);
      return;
    }

    completingStageIdRef.current = null;
    completeRunTokenRef.current++;
    // A fresh attempt clears the previous loss, so a game's losing screen
    // cannot linger (or keep counting down) once play resumes.
    setStageLoss(null);
    setStageFailNotice(null);
    const uid = getUserId();
    clearStageSnapshot(uid, cat, diff, stageIndex);

    if (cat) setCategory(cat);
    if (diff) setDifficulty(diff);
    setStageResult(null);
    setCompletionModalData(null);
    lastFailedSessionRef.current = null;
    setLeaderboardStage(null);

    // Open the server attempt BEFORE the stage is shown, so a loss always has
    // a session to report against and the heart is always charged. This is
    // also the authoritative lockout check: if the server answers 409 we abort
    // here and never launch the stage, so a stale local profile cannot let a
    // heartless operative play.
    const runToken = completeRunTokenRef.current;
    const sessionId = await requestStageSession(cat, diff, stageIndex);
    if (completeRunTokenRef.current !== runToken) return; // superseded
    if (sessionId == null && isLockedOutRef.current) {
      // Server refused the start: stay on the roadmap, do not launch.
      return;
    }

    const stageObj = createStageObject(cat, diff, stageIndex);
    setCurrentStage(stageObj);

    const stageNum = stageIndex + 1;
    navigate(
      `/dashboard/ciphergame?category=${cat}&difficulty=${diff}&stage=${stageNum}`,
      { replace: options.replace ?? false }
    );
  };

  // Games call this when their loading screen finishes. The server attempt is
  // already open (startStage opens it before the stage renders), so this only
  // restarts the local timer if the session has since gone missing.
  const startStageTimer = () => {
    if (!currentStage) return;
    if (!stageSessionIdRef.current) {
      const { category: cat, difficulty: diff, stageIndex } = currentStage;
      requestStageSession(cat, diff, stageIndex);
      return;
    }
    setStageStartedAt(Date.now());
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

  // -- SCORING: stage-loss flow ----------------------------------------
  // 0 points, streak -> 0, multiplier -> 1.00, total score preserved, and the
  // server spends exactly ONE session heart (ScoringService.failStage).
  // Called by games when the player runs out of IN-GAME lives / attempts.
  //
  // In-game attempts and server session hearts are deliberately separate: the
  // in-game counter is client-side and never reaches the server, while this
  // stage-loss report is what costs a heart.
  //
  // Also clears the stage snapshot so a lost stage is not resurrected by the
  // pause/resume engine, and `showNotice: false` lets a game that already
  // renders its own GAME OVER overlay keep the side-effects without a second
  // modal stacking on top of it.
  const failStage = ({ showNotice = true } = {}) => {
    // A lost stage must ALWAYS cost exactly one heart, so the whole charge is
    // resolved to a single promise. A game that reports the same loss twice
    // (StrictMode double-invoke, a duplicated effect) joins the running charge
    // instead of starting a second one and spending two hearts.
    if (heartFailInFlightRef.current) return heartFailInFlightRef.current;

    // Already settled for this exact attempt: a duplicate report must not
    // charge again. A genuinely new attempt always has a new session id.
    const sessionId = stageSessionIdRef.current;
    if (sessionId && lastFailedSessionRef.current === sessionId) {
      return Promise.resolve();
    }

    const run = (async () => {
      if (currentStage) {
        const uid = getUserId();
        clearStageSnapshot(uid, currentStage.category, currentStage.difficulty, currentStage.stageIndex);
      }

      let failResult = null;
      let charged = false;

      if (sessionId) {
        try {
          failResult = await scoringApi.failStage(sessionId);
          charged = true;
        } catch (err) {
          // The scoring report never landed (offline, expired token, 4xx/5xx or
          // the 10s timeout). Swallowing it used to make the whole loss FREE,
          // and because the duplicate guard had already marked the session as
          // handled, no retry was ever possible - the player simply kept the
          // heart and kept playing. Fall through to the standalone endpoint
          // instead, which spends exactly one heart per call and clamps at 0.
          // A timeout is the one ambiguous case (the server may have processed
          // it), but paying for a real loss is the safer failure direction for
          // an economy than giving it away.
          console.warn("Scoring fail unavailable, charging the heart directly:", err.message);
        }
      }

      // NO SESSION (the player lost before the attempt was opened, or the
      // session request failed) OR the scoring report failed. Either way the
      // heart MUST be spent, otherwise the loss is free and the lockout never
      // triggers.
      if (!charged) {
        try {
          failResult = await userApi.deductAttempt();
          charged = true;
        } catch (err) {
          console.warn("Heart deduction unavailable:", err.message);
        }
      }

      // Only remember the attempt as settled once a charge actually landed, so
      // a report that failed outright can still be retried by a later trigger
      // instead of being locked out forever as "already failed".
      if (charged && sessionId) lastFailedSessionRef.current = sessionId;

      // The session is spent: the stage is over and cannot be resumed or
      // retried through it. Deliberately NOT re-armed here - a fresh attempt
      // must be started from the roadmap, and costs another heart if lost
      // again. Only clear the id we captured, so a stage the player already
      // started while this charge was in flight keeps its own live session.
      if (stageSessionIdRef.current === sessionId) {
        stageSessionIdRef.current = null;
      }

      // FAILURE BEHAVIOR (spec 7 / 18): no score, streak reset to 0,
      // multiplier effective at 1.00x, existing total score preserved.
      //
      // Two response shapes can come back and BOTH must be read correctly:
      //   - POST /scoring/fail/{id} -> { attempts, maxAttempts, lockedOut, ... }
      //   - POST /users/attempts/deduct -> a full profile { attempts,
      //     onCooldown, cooldownEndTime, ... } with no `lockedOut` field.
      // Reading `lockedOut` only off the first shape is what let the fallback
      // path report "not locked" even at zero hearts, so the lockout dialog
      // never appeared. Normalise both into one shape instead.
      const serverHearts = failResult?.attempts;
      const left = serverHearts != null ? Number(serverHearts) : Number(user?.attempts) || 0;
      const cooldownEndTime = failResult?.cooldownEndTime ?? null;
      const hearts = {
        left,
        max: failResult?.maxAttempts ?? 3,
        // A missing `lockedOut` means the profile shape: derive it from the
        // cooldown flag and the heart count, matching
        // UserProgressService.isLockedOut on the server. One heart is NOT a
        // lockout - only zero (or a live cooldown) is.
        lockedOut: failResult?.lockedOut !== undefined
          ? Boolean(failResult.lockedOut)
          : (Boolean(failResult?.onCooldown) || left <= 0),
        cooldownEndTime,
      };

      if (showNotice) {
        setStageFailNotice({
          score: 0,
          streak: failResult?.gameStreak ?? 0,
          multiplier: failResult?.multiplier ?? 1,
          totalScore: failResult?.totalScore ?? (Number(user?.totalScore) || 0),
          heartsLeft: hearts.left,
          maxHearts: hearts.max,
          lockedOut: hearts.lockedOut,
          cooldownEndTime: hearts.cooldownEndTime,
        });
      }

      // Published for whichever losing screen the game renders. `id` is a
      // monotonically increasing token so a genuinely new loss re-renders the
      // screen (and re-seeds its countdown) even if the numbers repeat.
      setStageLoss((prev) => ({
        id: (prev?.id ?? 0) + 1,
        heartsLeft: hearts.left,
        maxHearts: hearts.max,
        lockedOut: hearts.lockedOut,
        cooldownEndTime: hearts.cooldownEndTime,
        totalScore: failResult?.totalScore ?? (Number(user?.totalScore) || 0),
        streak: failResult?.gameStreak ?? 0,
      }));

      // Re-sync from the server so the HUD hearts are never stale. Done even
      // when every charge attempt failed, so the UI still converges on truth.
      if (refreshProfile) {
        try { await refreshProfile(); } catch { /* offline */ }
      }

      // Spending the last heart locks EVERY stage immediately. When this game
      // renders its own losing screen, that screen explains the lockout with a
      // live countdown, so raising CooldownNotice as well would stack a second
      // dialog on top of it telling the player the same thing.
      if (hearts.lockedOut && showNotice) {
        showLockoutNotice(hearts.cooldownEndTime);
      }
    })();

    heartFailInFlightRef.current = run;
    // Release the in-flight slot once settled so a later, genuinely new loss
    // can charge. Kept until the promise resolves, so duplicate reports that
    // arrive mid-charge can never double-spend.
    const release = () => {
      if (heartFailInFlightRef.current === run) heartFailInFlightRef.current = null;
    };
    run.then(release, release);

    return run;
  };

  const dismissStageFailNotice = () => setStageFailNotice(null);

  const dismissCooldownNotice = () => setCooldownNotice(null);

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
    stageLoss,
    cooldownNotice, dismissCooldownNotice,
    leaderboardStage, openStageLeaderboard, closeStageLeaderboard,
  };
}

