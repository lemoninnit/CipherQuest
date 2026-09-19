import { createContext, useContext, useEffect, useState } from 'react';
import { getStreakMultiplier, formatCompletionTime, formatMultiplier } from '../engine/scoring';

/**
 * SCORING SYSTEM — live in-stage scoring context (UI REQUIREMENTS, section 24).
 *
 * Provided by CipherGame while a stage is active. Any component inside the
 * stage tree (e.g. GameHudBar) can read:
 *   - totalScore   : player's accumulated total score
 *   - streak       : current global game streak
 *   - multiplier   : streak multiplier (recalculated from streak, never stored)
 *   - elapsedMs    : live stage timer (ms since stage start)
 *   - formattedTime: MM:SS.mmm display string
 *
 * The backend remains authoritative for competitive values; this context is
 * display state only.
 */
const ScoringContext = createContext(null);

export function ScoringProvider({ stageStartedAt, totalScore = 0, streak = 0, children }) {
  const [elapsedMs, setElapsedMs] = useState(0);

  // Live stage timer (PHASE 7/8): ticks while the stage is active.
  useEffect(() => {
    if (!stageStartedAt) {
      setElapsedMs(0);
      return undefined;
    }
    const tick = () => setElapsedMs(Date.now() - stageStartedAt);
    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [stageStartedAt]);

  // Multiplier is ALWAYS derived from the streak — never stored as state.
  const multiplier = getStreakMultiplier(streak);

  const value = {
    stageStartedAt,
    totalScore,
    streak,
    multiplier,
    elapsedMs,
    formattedTime: formatCompletionTime(elapsedMs),
    formattedMultiplier: formatMultiplier(multiplier),
  };

  return (
    <ScoringContext.Provider value={value}>
      {children}
    </ScoringContext.Provider>
  );
}

/** Returns live scoring state, or null when outside an active stage. */
export function useScoring() {
  return useContext(ScoringContext);
}