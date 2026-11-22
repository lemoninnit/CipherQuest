import { useEffect, useState, useMemo } from 'react';
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

export function parseDateToMs(val) {
  if (!val) return null;
  if (typeof val === 'number') return val;
  let str = String(val).trim();
  if (Array.isArray(val)) {
    const [y, m, d, h = 0, min = 0, s = 0] = val;
    return Date.UTC(y, m - 1, d, h, min, s);
  }
  if (str.includes('T') && !str.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(str)) {
    const utcMs = new Date(str + 'Z').getTime();
    if (Number.isFinite(utcMs)) {
      const localMs = new Date(str).getTime();
      if (utcMs > Date.now() - 60000 || !Number.isFinite(localMs)) {
        return utcMs;
      }
    }
  }
  const parsed = new Date(str).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

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
  const [now, setNow] = useState(() => Date.now());
  const [isClosing, setIsClosing] = useState(false);
  const [hasAutoRefreshed, setHasAutoRefreshed] = useState(false);

  // Compute a valid future target timestamp (fallback to 3 minutes if missing/expired)
  const targetEndMs = useMemo(() => {
    if (!notice) return Date.now();
    const parsed = parseDateToMs(notice.cooldownEndTime);
    if (parsed && parsed > Date.now()) {
      return parsed;
    }
    // Default to standard 3-minute cooldown if server timestamp is missing or past
    return Date.now() + 3 * 60 * 1000;
  }, [notice]);

  useEffect(() => {
    if (!notice) return undefined;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [notice]);

  if (!notice) return null;

  const remaining = splitRemaining(targetEndMs - now);
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
              ? 'Hearts have been restored. You may resume your quest.'
              : 'Each spent heart refills independently on its own 3-minute cooldown.'}
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
