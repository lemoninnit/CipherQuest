import { useEffect, useRef, useCallback } from 'react';

/**
 * Mid-game state snapshotting using sessionStorage.
 *
 * Persists running stage state across page refreshes keyed by:
 * cq_stage_snapshot_{userId}_{category}_{difficulty}_{stageIndex}
 *
 * Stored data:
 * - exact levelData (pins generated plaintext, ciphertext, shift, masks, hints)
 * - category, difficulty, stageIndex
 * - stageSessionId (backend scoring session)
 * - elapsedMs (stage timer progress)
 * - gameState (game-specific logical state: activeShifts, lives, solved letters, skill charge, etc.)
 */

export function getSnapshotKey(userId, category, difficulty, stageIndex) {
  const u = String(userId || 'anonymous');
  const c = String(category || '').toLowerCase();
  const d = String(difficulty || '').toLowerCase();
  const s = Number(stageIndex);
  return `cq_stage_snapshot_${u}_${c}_${d}_${s}`;
}

export function saveStageSnapshot(userId, { category, difficulty, stageIndex, levelData, stageSessionId, elapsedMs, gameState }) {
  if (!userId || !category || !difficulty || typeof stageIndex !== 'number' || !levelData) {
    return false;
  }

  try {
    const key = getSnapshotKey(userId, category, difficulty, stageIndex);
    const payload = {
      version: 1,
      userId: String(userId),
      category: String(category).toLowerCase(),
      difficulty: String(difficulty).toLowerCase(),
      stageIndex: Number(stageIndex),
      levelData,
      stageSessionId: stageSessionId ?? null,
      elapsedMs: Math.max(0, Number(elapsedMs) || 0),
      savedAt: Date.now(),
      gameState: gameState || {},
    };

    sessionStorage.setItem(key, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.warn('Failed to save stage snapshot to sessionStorage:', err);
    return false;
  }
}

export function loadStageSnapshot(userId, category, difficulty, stageIndex) {
  if (!userId || !category || !difficulty || typeof stageIndex !== 'number') {
    return null;
  }

  try {
    const key = getSnapshotKey(userId, category, difficulty, stageIndex);
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;

    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;

    // Strict validation: must match current user, cipher, tier, stage index, and have valid levelData
    const isUserMatch = String(data.userId) === String(userId);
    const isCatMatch = String(data.category).toLowerCase() === String(category).toLowerCase();
    const isDiffMatch = String(data.difficulty).toLowerCase() === String(difficulty).toLowerCase();
    const isStageMatch = Number(data.stageIndex) === Number(stageIndex);
    const hasLevelData = Boolean(data.levelData && typeof data.levelData === 'object');

    if (isUserMatch && isCatMatch && isDiffMatch && isStageMatch && hasLevelData) {
      return data;
    }

    // If mismatch or malformed, purge invalid entry
    sessionStorage.removeItem(key);
    return null;
  } catch (err) {
    console.warn('Failed to load stage snapshot from sessionStorage:', err);
    return null;
  }
}

export function clearStageSnapshot(userId, category, difficulty, stageIndex) {
  if (!userId || !category || !difficulty || typeof stageIndex !== 'number') {
    return;
  }

  try {
    const key = getSnapshotKey(userId, category, difficulty, stageIndex);
    sessionStorage.removeItem(key);
  } catch (err) {
    console.warn('Failed to clear stage snapshot:', err);
  }
}

export function clearAllStageSnapshots(userId) {
  try {
    const prefix = userId ? `cq_stage_snapshot_${userId}_` : 'cq_stage_snapshot_';
    const keysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(prefix)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => sessionStorage.removeItem(k));
  } catch (err) {
    console.warn('Failed to clear stage snapshots:', err);
  }
}

/**
 * Custom hook for game components to auto-save snapshot state on throttled interval
 * and on browser events (visibilitychange, pagehide, beforeunload).
 */
export function useStageSnapshotAutoSaver(onSaveSnapshot, getGameState, isRunning) {
  const getGameStateRef = useRef(getGameState);
  useEffect(() => {
    getGameStateRef.current = getGameState;
  }, [getGameState]);

  const save = useCallback(() => {
    if (!isRunning || !onSaveSnapshot || !getGameStateRef.current) return;
    const state = getGameStateRef.current();
    if (state) {
      onSaveSnapshot(state);
    }
  }, [isRunning, onSaveSnapshot]);

  // 1. Throttled periodic save (~1000ms)
  useEffect(() => {
    if (!isRunning) return undefined;
    const timer = setInterval(() => {
      save();
    }, 1000);
    return () => clearInterval(timer);
  }, [isRunning, save]);

  // 2. Browser unload & visibility change events
  useEffect(() => {
    if (!isRunning) return undefined;

    const handleEvent = () => {
      save();
    };

    document.addEventListener('visibilitychange', handleEvent);
    window.addEventListener('pagehide', handleEvent);
    window.addEventListener('beforeunload', handleEvent);

    return () => {
      document.removeEventListener('visibilitychange', handleEvent);
      window.removeEventListener('pagehide', handleEvent);
      window.removeEventListener('beforeunload', handleEvent);
    };
  }, [isRunning, save]);

  return save;
}

