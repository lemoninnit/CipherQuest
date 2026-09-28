import { useEffect, useRef } from 'react';
import '../CipherGame.css';

/**
 * GAME OVER overlay for the fishing games, shown when attempts run out.
 *
 * Deliberately reuses the existing pause/game-over classes from
 * CipherGame.css so the failure UX matches Pac-Man's overlay instead of
 * introducing a fourth visual language.
 *
 * @param {boolean} open      Whether the overlay is visible.
 * @param {number}  heartsLost Session hearts deducted (currently always 1).
 * @param {Function} onRetry  Restart the same stage.
 * @param {Function} onExit   Leave to the stage list.
 */
export default function FishingGameOverOverlay({ open, heartsLost = 1, onRetry, onExit }) {
  const retryBtnRef = useRef(null);

  useEffect(() => {
    if (open) retryBtnRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="caesar-pause-overlay pacman-gameover-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fishing-gameover-title"
    >
      <div className="caesar-pause-card pacman-gameover-card">
        <h2 id="fishing-gameover-title" className="caesar-pause-title">
          STAGE LOST
        </h2>
        <p className="pacman-gameover-text">
          You ran out of attempts — the pond is gone for good.
        </p>
        <p className="fishing-gameover-hearts">
          <span
            className="material-symbols-outlined"
            style={{ fontVariationSettings: "'FILL' 1", color: '#ff007f' }}
          >
            favorite
          </span>
          <span>
            {heartsLost === 1 ? '1 heart lost' : `${heartsLost} hearts lost`}
          </span>
        </p>
        {/* The global StageFailNotice is suppressed for this overlay, so its
            scoring consequences are restated here (spec §7 / §18). */}
        <p className="fishing-gameover-score">
          No score awarded · streak reset to 0 · total score preserved
        </p>
        <button
          ref={retryBtnRef}
          className="caesar-pause-btn caesar-pause-btn-resume"
          onClick={onRetry}
        >
          <span className="material-symbols-outlined">restart_alt</span>
          <span>Retry Level</span>
        </button>
        <button
          className="caesar-pause-btn caesar-pause-btn-exit"
          onClick={onExit}
        >
          <span className="material-symbols-outlined">logout</span>
          <span>Exit Stage</span>
        </button>
      </div>
    </div>
  );
}