import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import './StageLostScreen.css';

/**
 * THE LOSING SCREEN — one component for every stage loss in the game.
 *
 * Every cipher used to ship its own hand-rolled game-over card, with different
 * wording ("STAGE COMPROMISED", "GAME OVER", "cryptographic operational
 * hearts"), a different layout, and different amounts of information. This
 * component is the single source of truth so losing always feels the same and
 * always tells the player what they need to know.
 *
 * Design rules, all in service of "what does this player do next?":
 *   1. Plain words. No "session heart", no "compromised", no cipher jargon.
 *   2. Show the cost AT A GLANCE - filled/empty hearts, not "1 / 3".
 *   3. Never leave the player guessing about lockout: when the last heart goes,
 *      the wait is shown with a live countdown right here, so no second dialog
 *      is needed to explain it.
 *   4. Lead with the reassurance that matters: their cleared stages and total
 *      score are intact. Losing a stage is a setback, not a dead end.
 *   5. Exactly one obvious action.
 *
 * Split into a card and a full-screen wrapper because the sprint games render
 * their game over INSIDE the board (an absolutely-positioned modal) while the
 * fishing and Pac-Man games want a full-screen overlay.
 */

const DEFAULT_REASON = 'You ran out of attempts on this stage.';

/** "2:41" - minutes:seconds. Short enough to read at a glance. */
const formatClock = (totalSeconds) => {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * Ticks once a second while `running`, and returns whole seconds until
 * `endTime`. Seeded once on mount rather than reading the clock during render,
 * so the first frame is already correct and the screen stays hydration-safe.
 */
function useCountdown(endTime, running) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  const end = endTime ? new Date(endTime).getTime() : NaN;
  if (!Number.isFinite(end)) return 0;
  return Math.max(0, Math.ceil((end - now) / 1000));
}

export function StageLostCard({
  open = true,
  reason = DEFAULT_REASON,
  title = 'Stage Lost',
  // Explicit, post-loss values straight from the server response when the
  // caller has them. Anything omitted falls back to the live profile, which
  // `refreshProfile()` keeps up to date, so the screen is never wrong - only
  // ever at worst a moment behind while that refetch is in flight.
  heartsLeft = null,
  maxHearts = 3,
  lockedOut = false,
  cooldownEndTime = null,
  totalScore = null,
  onExit,
  exitLabel = 'Back to Stages',
  exitIcon = 'logout',
  showExitIcon = true,
  compact = false,
}) {
  const { user } = useAuth();
  const actionRef = useRef(null);

  const profileHearts = Number(user?.attempts);
  const left = heartsLeft != null
    ? heartsLeft
    : (Number.isFinite(profileHearts) ? profileHearts : null);

  const end = cooldownEndTime ?? user?.cooldownEndTime ?? null;
  // A lockout is either a running clock or an empty counter. Treating both as
  // locked is what stops the screen from telling a player on 0 hearts that
  // everything is fine.
  const secondsLeft = useCountdown(end, open && (lockedOut || left === 0));
  const isLocked = lockedOut || left === 0 || secondsLeft > 0;

  const score = Number.isFinite(Number(totalScore)) ? Number(totalScore) : (Number(user?.totalScore) || 0);

  // Kept in a ref so the focus/Escape effect runs once per open instead of
  // re-firing on every render (callers pass a fresh arrow function each time).
  const onExitRef = useRef(onExit);
  useEffect(() => { onExitRef.current = onExit; });

  useEffect(() => {
    if (!open) return undefined;
    actionRef.current?.focus();
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onExitRef.current?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <div className={`sls-card${compact ? ' sls-card-compact' : ''}`}>
      <header className="sls-header">
        <span className="material-symbols-outlined sls-icon" aria-hidden="true">favorite</span>
        <div>
          <h2 className="sls-title" id="sls-title">{title}</h2>
          <p className="sls-reason">{reason}</p>
        </div>
      </header>

      {left != null && (
        <div className={`sls-hearts${isLocked ? ' is-locked' : ''}`}>
          <div
            className="sls-hearts-row"
            role="img"
            aria-label={`${left} of ${maxHearts} hearts left`}
          >
            {Array.from({ length: maxHearts }, (_, i) => (
              <span
                key={i}
                aria-hidden="true"
                className={`material-symbols-outlined sls-heart${i < left ? '' : ' is-spent'}`}
              >
                favorite
              </span>
            ))}
          </div>
          <p className="sls-hearts-text">
            {left === 0
              ? `No hearts left \u00b7 all ${maxHearts} refill shortly`
              : `You spent 1 heart \u00b7 ${left} of ${maxHearts} left`}
          </p>
        </div>
      )}

      {isLocked && (
        <div className="sls-wait">
          <span className="material-symbols-outlined sls-wait-icon" aria-hidden="true">lock_clock</span>
          <div className="sls-wait-body">
            <p className="sls-wait-title">Stages are paused for a moment</p>
            {secondsLeft > 0 && (
              <p className="sls-wait-timer" role="timer">{formatClock(secondsLeft)}</p>
            )}
            <p className="sls-wait-text">
              {secondsLeft > 0
                ? `All ${maxHearts} hearts come back automatically. You can jump straight back in.`
                : `All ${maxHearts} hearts come back automatically \u2014 try again in a moment.`}
            </p>
          </div>
        </div>
      )}

      <dl className="sls-facts">
        <div className="sls-fact">
          <dt>Total score</dt>
          <dd className="sls-fact-kept">
            {score.toLocaleString()}
            <span>kept</span>
          </dd>
        </div>
        <div className="sls-fact">
          <dt>Streak</dt>
          <dd>back to 0</dd>
        </div>
        <div className="sls-fact">
          <dt>This stage</dt>
          <dd>no points</dd>
        </div>
      </dl>

      <p className="sls-note">
        {isLocked
          ? 'Every stage you have already cleared stays cleared, and your total score is safe.'
          : 'This attempt is over, but every stage you have already cleared \u2014 and your total score \u2014 is safe.'}
      </p>

      <button ref={actionRef} type="button" className="sls-btn" onClick={onExit}>
        {showExitIcon && (
          <span className="material-symbols-outlined" aria-hidden="true">{exitIcon}</span>
        )}
        <span>{exitLabel}</span>
      </button>
    </div>
  );
}

/**
 * Full-screen variant for the fishing and Pac-Man games. Clicking the backdrop
 * exits, matching the pause dialogs those games already use.
 */
export default function StageLostScreen(props) {
  const { open = true, onExit } = props;
  if (!open) return null;

  return (
    <div
      className="sls-overlay"
      onClick={onExit}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sls-title"
    >
      {/* Stops a click on the card from bubbling out and dismissing it. */}
      <div className="sls-panel" onClick={(e) => e.stopPropagation()}>
        <StageLostCard {...props} open={open} />
      </div>
    </div>
  );
}
