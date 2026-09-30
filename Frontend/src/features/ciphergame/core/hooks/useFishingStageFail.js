import { useCallback, useEffect, useRef, useState } from 'react';
import { fishingSound } from '../engine/fishingSound';
/**
 * SHARED FISHING RULE - running out of in-game attempts loses the stage.
 *
 * Every fishing game (Caesar / Vigenere / Playfair) used to just clamp
 * `attemptsLeft` at 0 and leave the player casting into a dead pond: no
 * game over, no scoring consequence. This hook centralises the consequences so
 * the three games stay in sync:
 *
 *   1. GAME OVER overlay appears and further casting is blocked.
 *   2. The stage is reported as lost via `onStageFail`, which is what resets
 *      the streak and costs ONE server session heart (ScoringService.failStage).
 *
 * TWO DIFFERENT ECONOMIES - do not conflate them:
 *   - `attemptsLeft` is an IN-GAME attempt counter. It is client-side only,
 *     resets with the stage, and is unrelated to session hearts.
 *   - Session hearts are server-side. This hook deliberately does NOT deduct
 *     them itself; the stage-loss report does, on the server, so the cost cannot
 *     be skipped and stays identical across every cipher and mini-game.
 *
 * The trigger lives in an effect rather than inside a `setAttemptsLeft`
 * updater on purpose: updaters must stay pure, and running a network call
 * from one would double-fire under StrictMode.
 *
 * @param {number}  attemptsLeft  Current in-game attempts remaining.
 * @param {boolean} isSolved      Stage already cleared - never fail then.
 * @param {Function} onStageFail  Stage-loss callback from CipherGame.
 */
export function useFishingStageFail({ attemptsLeft, isSolved = false, onStageFail }) {
  const [gameOver, setGameOver] = useState(false);
  const failedRef = useRef(false);

  // The parent hands down a fresh callback on every render, so putting it
  // straight in the effect deps would re-run the failure effect whenever
  // anything upstream re-renders. Mirror it into a ref in an effect instead,
  // and depend only on the attempt counters - the failure must fire exactly
  // once per attempt even under StrictMode's double-invoke.
  const onStageFailRef = useRef(null);

  useEffect(() => {
    onStageFailRef.current = onStageFail;
  });

  /** Clear the failure so a retry starts from a clean slate. */
  const resetStageFail = useCallback(() => {
    failedRef.current = false;
    setGameOver(false);
  }, []);

  useEffect(() => {
    // Still have casts left, already won, or already failed - do nothing.
    if (attemptsLeft > 0 || isSolved || failedRef.current) return;
    failedRef.current = true;

    setGameOver(true);
    fishingSound.stopBgm();
    fishingSound.playSfx('lose');

    // Streak reset + 0 score + one session heart spent, all server-side.
    // `showNotice: false` because FishingGameOverOverlay already tells the
    // player the stage is lost, and the global StageFailNotice
    // (z-index 1250) would stack on top of it.
    onStageFailRef.current?.({ showNotice: false });
  }, [attemptsLeft, isSolved]);

  return { gameOver, resetStageFail };
}

export default useFishingStageFail;