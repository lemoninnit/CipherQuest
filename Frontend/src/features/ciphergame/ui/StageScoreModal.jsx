import { formatCompletionTime, formatMultiplier } from '../core/engine/scoring';
import './StageScoreModal.css';

/**
 * SCORING SYSTEM — post-completion summary (UI requirement 24).
 *
 * Displays after a successful stage completion:
 *   Stage Score, Completion Time, Current Streak, Current Multiplier,
 *   Total Score, Best Score, Best Time.
 */
export default function StageScoreModal({ result, onContinue, onReplay, onViewLeaderboard }) {
  if (!result) return null;

  const {
    score,
    baseScore,
    streak,
    multiplier,
    completionTimeMs,
    totalScore,
    bestScore,
    bestTimeMs,
    newBestScore,
    newBestTime,
  } = result;

  return (
    <div className="ssm-overlay" onClick={onContinue}>
      <div className="ssm-card" onClick={(e) => e.stopPropagation()}>
        <div className="ssm-header">
          <span className="material-symbols-outlined ssm-header-icon">military_tech</span>
          <h2 className="ssm-title">STAGE SECURED</h2>
        </div>

        <div className="ssm-score-hero">
          <div className="ssm-score-label">STAGE SCORE</div>
          <div className="ssm-score-value">+{score.toLocaleString()}</div>
          <div className="ssm-score-formula">
            {baseScore} base × {formatMultiplier(multiplier)} streak multiplier
          </div>
          {(newBestScore || newBestTime) && (
            <div className="ssm-new-best">NEW PERSONAL BEST!</div>
          )}
        </div>

        <div className="ssm-stats-grid">
          <div className="ssm-stat">
            <div className="ssm-stat-label">Completion Time</div>
            <div className="ssm-stat-value">
              {formatCompletionTime(completionTimeMs)}
              {newBestTime && <span className="ssm-best-tag">BEST</span>}
            </div>
          </div>
          <div className="ssm-stat">
            <div className="ssm-stat-label">Current Streak</div>
            <div className="ssm-stat-value">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="#ff9f1c" stroke="#ff9f1c" strokeWidth="1" aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: '4px' }}>
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
              </svg>
              {streak}
            </div>
          </div>
          <div className="ssm-stat">
            <div className="ssm-stat-label">Multiplier</div>
            <div className="ssm-stat-value ssm-cyan">{formatMultiplier(multiplier)}</div>
          </div>
          <div className="ssm-stat">
            <div className="ssm-stat-label">Total Score</div>
            <div className="ssm-stat-value ssm-gold">{(totalScore || 0).toLocaleString()}</div>
          </div>
          <div className="ssm-stat">
            <div className="ssm-stat-label">Best Score</div>
            <div className="ssm-stat-value">
              {bestScore != null ? bestScore.toLocaleString() : '—'}
              {newBestScore && <span className="ssm-best-tag">BEST</span>}
            </div>
          </div>
          <div className="ssm-stat">
            <div className="ssm-stat-label">Best Time</div>
            <div className="ssm-stat-value">
              {bestTimeMs != null ? formatCompletionTime(bestTimeMs) : '—'}
            </div>
          </div>
        </div>

        <div className="ssm-actions">
          {onViewLeaderboard && (
            <button className="ssm-btn ssm-btn-secondary" onClick={onViewLeaderboard}>
              <span className="material-symbols-outlined ssm-btn-icon">leaderboard</span>
              Leaderboard
            </button>
          )}
          {onReplay && (
            <button className="ssm-btn ssm-btn-secondary" onClick={onReplay}>
              Play Again
            </button>
          )}
          <button className="ssm-btn ssm-btn-primary" onClick={onContinue}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}