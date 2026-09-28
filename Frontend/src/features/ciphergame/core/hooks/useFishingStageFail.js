import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { userApi } from '../../../../api/cipherQuestApi';
import { fishingSound } from '../engine/fishingSound';
/**
 * SHARED FISHING RULE — running out of attempts loses the stage.
 *
 * Every fishing game (Caesar / Vigenère / Playfair) used to just clamp
 * `attemptsLeft` at 0 and leave the player casting into a dead pond: no
 * game over, no scoring consequence. This hook centralises the three
 * consequences so the three games stay in sync:
 *
 *   1. GAME OVER overlay appears and further casting is blocked.
 *   2. Scoring failure is reported via `onStageFail` (0 pts, streak reset
 *      to 0, total score preserved) — the same path Pac-Man uses.
 *   3. One site-wide SESSION HEART is deducted (`userApi.deductAttempt`),
 *      so the Dashboard / Badges / Leaderboard hearts drop from /3.
 *
 * The trigger lives in an effect rather than inside a `setAttemptsLeft`
 * updater on purpose: updaters must stay pure, and running a network call
 * from one would double-fire under StrictMode.
 *
 * @param {number}  attemptsLeft  Current attempts remaining.
 * @param {boolean} isSolved      Stage already cleared — never fail then.
 * @param {Function} onStageFail  Scoring failure callback from CipherGame.
 */
export function useFishingStageFail({ attemptsLeft, isSolved = false, onStageFail }) {
  const [gameOver, setGameOver] = useState(false);
  const failedRef = useRef(false);
  const auth = useAuth();

  // `useAuth()` returns a fresh object literal on every AuthProvider render, so
  // putting it straight in the effect deps would re-run the failure effect
  // whenever the profile refreshes. Mirror both callbacks into refs in an
  // effect instead, and depend only on the attempt counters — the failure must
  // fire exactly once per attempt even under StrictMode's double-invoke.
  const refreshProfileRef = useRef(null);
  const onStageFailRef = useRef(null);

  useEffect(() => {
    refreshProfileRef.current = auth?.refreshProfile;
    onStageFailRef.current = onStageFail;
  });

  /** Clear the failure so a retry starts from a clean slate. */
  const resetStageFail = useCallback(() => {
    failedRef.current = false;
    setGameOver(false);
  }, []);

  useEffect(() => {
    // Still have casts left, already won, or already failed — do nothing.
    if (attemptsLeft > 0 || isSolved || failedRef.current) return;
    failedRef.current = true;

    setGameOver(true);
    fishingSound.stopBgm();
    fishingSound.playSfx('lose');

    // Streak reset + 0 score for this attempt. `showNotice: false` because
    // FishingGameOverOverlay already tells the player the stage is lost, and
    // the global StageFailNotice (z-index 1250) would stack on top of it.
    onStageFailRef.current?.({ showNotice: false });

    // Deduct one session heart, then pull the fresh profile so every
    // surface showing "x / 3" hearts updates immediately.
    (async () => {
      try {
        await userApi.deductAttempt();
        await refreshProfileRef.current?.();
      } catch (err) {
        // Offline / backend down: the stage still counts as lost, the heart
        // simply is not persisted this run.
        console.warn('Fishing: session heart deduction failed —', err?.message);
      }
    })();
  }, [attemptsLeft, isSolved]);

  return { gameOver, resetStageFail };
}

export default useFishingStageFail;