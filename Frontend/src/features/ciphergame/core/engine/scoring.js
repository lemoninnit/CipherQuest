/**
 * SCORING SYSTEM — client-side mirror of the backend ScoringService.
 *
 * The BACKEND is authoritative for all competitive values (score, streak,
 * multiplier, completion time). This module exists so the UI can:
 *   - display live values during a stage (streak, multiplier, timer),
 *   - fall back to local calculation when the backend is unreachable.
 *
 * Core formula : Final Stage Score = round(Base Score x Streak Multiplier)
 * Streak       : +1 on every successful completion, 0 on failure (global).
 * Multiplier   : always recalculated from the current streak.
 */

// ── Configurable balancing values (keep in sync with backend) ────────

/** Base score per difficulty (PHASE 1). */
export const BASE_SCORES = {
  easy: 100,
  medium: 200,
  hard: 300,
};

/**
 * Streak multiplier tiers (PHASE 5).
 * Each tier: { minStreak, maxStreak (null = 20+), multiplier }.
 * Change here to rebalance — the backend has its own copy.
 */
export const STREAK_MULTIPLIER_TIERS = [
  { minStreak: 0,  maxStreak: 2,  multiplier: 1.0 },
  { minStreak: 3,  maxStreak: 4,  multiplier: 1.1 },
  { minStreak: 5,  maxStreak: 5,  multiplier: 1.2 },
  { minStreak: 6,  maxStreak: 9,  multiplier: 1.25 },
  { minStreak: 10, maxStreak: 14, multiplier: 1.5 },
  { minStreak: 15, maxStreak: 19, multiplier: 1.75 },
  { minStreak: 20, maxStreak: null, multiplier: 2.0 },
];

// ── Core functions ───────────────────────────────────────────────────

/** Returns the base score for a difficulty ('easy' | 'medium' | 'hard'). */
export function getBaseScore(difficulty) {
  const base = BASE_SCORES[String(difficulty || '').toLowerCase()];
  if (base == null) return 100;
  return base;
}

/**
 * Returns the multiplier for the current streak.
 * The streak is the source of truth — never store the multiplier as state.
 */
export function getStreakMultiplier(streak) {
  const s = Math.max(0, Number(streak) || 0);
  for (const tier of STREAK_MULTIPLIER_TIERS) {
    if (s >= tier.minStreak && (tier.maxStreak === null || s <= tier.maxStreak)) {
      return tier.multiplier;
    }
  }
  return 1.0;
}

/** Final stage score with one consistent rounding rule (PHASE 6 / 22). */
export function calculateStageScore(baseScore, multiplier) {
  return Math.round(baseScore * multiplier);
}

/** Formats milliseconds as MM:SS.mmm (e.g. 18450 -> "00:18.450"). */
export function formatCompletionTime(ms) {
  const total = Math.max(0, Math.floor(Number(ms) || 0));
  const minutes = Math.floor(total / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  const millis = total % 1000;
  const pad = (n, len = 2) => String(n).padStart(len, '0');
  return `${pad(minutes)}:${pad(seconds)}.${pad(millis, 3)}`;
}

/** Formats a multiplier for display (1.1 -> "1.10x"). */
export function formatMultiplier(multiplier) {
  return `${(Number(multiplier) || 1).toFixed(2)}x`;
}