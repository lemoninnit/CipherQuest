import { formatMultiplier } from '../core/engine/scoring';
import './StageFailNotice.css';

/**
 * SCORING SYSTEM — failure feedback (spec §7 / §18).
 *
 * Shown when a stage attempt fails:
 *   Score = 0  ->  Streak reset to 0  ->  Multiplier 1.00x  ->  Total score preserved.
 *
 * This is purely informational; retry behaviour is handled by the individual games.
 */
export default function StageFailNotice({ notice, onDismiss }) {
  if (!notice) return null;

  return (
    <div className="sfn-overlay" onClick={onDismiss} role="dialog" aria-modal="true" aria-label="Stage failed">
      <div className="sfn-card" onClick={(e) => e.stopPropagation()}>
        <div className="sfn-header">
          <span className="material-symbols-outlined sfn-icon">shield_with_heart</span>
          <h2 className="sfn-title">STAGE COMPROMISED</h2>
        </div>

        <div className="sfn-score-hero">
          <div className="sfn-score-label">STAGE SCORE</div>
          <div className="sfn-score-value">+0</div>
          <div className="sfn-score-note">No score awarded for a failed attempt</div>
        </div>

        <div className="sfn-stats-grid">
          <div className="sfn-stat">
            <div className="sfn-stat-label">Global Streak</div>
            <div className="sfn-stat-value sfn-reset">{notice.streak}</div>
          </div>
          <div className="sfn-stat">
            <div className="sfn-stat-label">Multiplier</div>
            <div className="sfn-stat-value">{formatMultiplier(notice.multiplier)}</div>
          </div>
          <div className="sfn-stat">
            <div className="sfn-stat-label">Total Score</div>
            <div className="sfn-stat-value sfn-gold">{(notice.totalScore || 0).toLocaleString()}</div>
          </div>
        </div>

        <p className="sfn-message">
          Your accumulated total score is preserved. Start a new attempt to rebuild your streak.
        </p>

        <button className="sfn-btn" onClick={onDismiss}>Understood</button>
      </div>
    </div>
  );
}