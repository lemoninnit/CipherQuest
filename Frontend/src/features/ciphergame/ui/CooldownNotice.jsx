import { useEffect, useState } from 'react';
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
  // Seeded lazily on mount; the parent remounts this component (via `key`) for
  // each new cooldown, so the first frame already shows the correct remaining
  // time without reading the impure clock during render.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!notice) return undefined;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [notice]);

  if (!notice) return null;

  const remaining = splitRemaining(notice.cooldownEndTime - now);
  const isOver = remaining.hours === 0 && remaining.minutes === 0 && remaining.seconds === 0;

  return (
    <div className="cdn-overlay" onClick={onDismiss} role="dialog" aria-modal="true" aria-label="Session hearts cooldown">
      <div className="cdn-card" onClick={(e) => e.stopPropagation()}>
        <div className="cdn-header">
          <span className="material-symbols-outlined cdn-icon">heart_broken</span>
          <h2 className="cdn-title">SESSION HEARTS DEPLETED</h2>
        </div>

        <div className="cdn-timer-hero">
          <div className="cdn-timer-label">NEW MISSIONS RESUME IN</div>
          <div className="cdn-timer-value" role="timer">
            {pad(remaining.hours)}:{pad(remaining.minutes)}:{pad(remaining.seconds)}
          </div>
          <div className="cdn-timer-note">
            All hearts are refilled automatically when the cooldown ends.
          </div>
        </div>

        <p className="cdn-message">
          A heart is lost whenever a stage is compromised. Stages stay locked until your hearts
          refill — your cleared stages, score, and streak are all preserved.
        </p>

        <button className="cdn-btn" onClick={onDismiss}>
          {isOver ? 'Resume Quest' : 'Understood'}
        </button>
      </div>
    </div>
  );
}