import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import './CooldownNotice.css';

/**
 * SESSION HEARTS — cooldown lockout notice.
 *
 * Mirrors the proposal documented on the User entity: spending the last heart
 * starts a cooldown, and while that cooldown is running the operative is locked
 * out of starting new stages. The server is authoritative (see
 * UserProgressService.assertNotOnCooldown); this dialog only explains *why* a
 * stage refused to launch instead of failing silently.
 *
 * The countdown ticks locally from the server-provided cooldown end time, so it
 * stays accurate without polling, and flips to "RESUME" once it elapses.
 * When it elapses, refreshProfile() is called automatically so the HUD hearts
 * refill immediately without the user having to dismiss and re-navigate.
 */
const pad = (n) => String(Math.max(0, n)).padStart(2, '0');

const splitRemaining = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    hours: Math.floor(total / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
};

export default function CooldownNotice({ notice, onDismiss }) {
  const { refreshProfile } = useAuth();
  // Seeded lazily on mount; the parent remounts this component (via `key`) for
  // each new cooldown, so the first frame already shows the correct remaining
  // time without reading the impure clock during render.
  const [now, setNow] = useState(() => Date.now());
  const [isClosing, setIsClosing] = useState(false);
  const [hasAutoRefreshed, setHasAutoRefreshed] = useState(false);

  useEffect(() => {
    if (!notice) return undefined;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [notice]);

  if (!notice) return null;

  const remaining = splitRemaining(notice.cooldownEndTime - now);
  const isOver = remaining.hours === 0 && remaining.minutes === 0 && remaining.seconds === 0;

  // Auto-refresh hearts the moment the countdown reaches zero.
  // Guarded by `hasAutoRefreshed` so it fires exactly once per cooldown
  // instance even though `now` ticks every second.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (isOver && !hasAutoRefreshed && refreshProfile) {
      setHasAutoRefreshed(true);
      refreshProfile().catch(() => { /* offline — hearts will sync on next poll */ });
    }
  }, [isOver, hasAutoRefreshed, refreshProfile]);

  const handleDismiss = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onDismiss?.();
    }, 200);
  };

  return (
    <div
      className={`cdn-overlay ${isClosing ? 'is-closing' : ''}`}
      onClick={handleDismiss}
      role="dialog"
      aria-modal="true"
      aria-label="Session hearts cooldown"
    >
      <div className={`cdn-card ${isClosing ? 'is-closing' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="cdn-header">
          <span className="material-symbols-outlined cdn-icon">heart_broken</span>
          <h2 className="cdn-title">SESSION HEARTS DEPLETED</h2>
        </div>

        <div className="cdn-timer-hero">
          <div className="cdn-timer-label">
            {isOver ? 'HEARTS REFILLED' : 'NEW MISSIONS RESUME IN'}
          </div>
          <div className="cdn-timer-value" role="timer">
            {isOver
              ? '00:00:00'
              : `${pad(remaining.hours)}:${pad(remaining.minutes)}:${pad(remaining.seconds)}`}
          </div>
          <div className="cdn-timer-note">
            {isOver
              ? 'All hearts have been restored. You may resume your quest.'
              : 'All hearts are refilled automatically when the cooldown ends.'}
          </div>
        </div>

        <p className="cdn-message">
          A heart is lost whenever a stage is compromised. Stages stay locked until your hearts
          refill — your cleared stages, score, and streak are all preserved.
        </p>

        <button className="cdn-btn" onClick={handleDismiss}>
          {isOver ? 'Resume Quest' : 'Understood'}
        </button>
      </div>
    </div>
  );
}