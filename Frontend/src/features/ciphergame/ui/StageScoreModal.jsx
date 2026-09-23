import { formatCompletionTime, formatMultiplier } from '../core/engine/scoring';
import './StageScoreModal.css';

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
        
        {/* Top Glowing Ambient Accent */}
        <div className="ssm-top-accent" />

        {/* Tactical Corner Accents */}
        <div className="ssm-corner top-left" />
        <div className="ssm-corner top-right" />
        <div className="ssm-corner bottom-left" />
        <div className="ssm-corner bottom-right" />

        {/* Header */}
        <div className="ssm-header">
          <div className="ssm-title-icon-halo">
            <span className="material-symbols-outlined ssm-title-icon">verified_user</span>
          </div>
          <div className="ssm-header-text">
            <h2 className="ssm-title">STAGE SECURED</h2>
            <span className="ssm-subtitle-tag">SYSTEM CLEARANCE GRANTED</span>
          </div>
        </div>

        {/* Hero Score Block */}
        <div className="ssm-score-block">
          <div className="ssm-hero-radial-glow" />
          <div className="ssm-score-label">STAGE SCORE</div>
          <div className="ssm-score-amount">+{score.toLocaleString()}</div>
          
          <div className="ssm-score-formula-pill">
            <span>{baseScore} Base</span>
            <span className="ssm-formula-dot">•</span>
            <span>{formatMultiplier(multiplier)} Multiplier</span>
          </div>

          {(newBestScore || newBestTime) && (
            <div className="ssm-best-badge">
              <span className="material-symbols-outlined ssm-star-icon">workspace_premium</span>
              <span>NEW PERSONAL BEST!</span>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="ssm-grid">
          <div className="ssm-tile">
            <div className="ssm-tile-header">
              <span className="material-symbols-outlined ssm-tile-icon">timer</span>
              <span className="ssm-tile-label">Completion Time</span>
            </div>
            <span className="ssm-tile-val">
              {formatCompletionTime(completionTimeMs)}
              {newBestTime && <span className="ssm-tag">BEST</span>}
            </span>
          </div>

          <div className="ssm-tile">
            <div className="ssm-tile-header">
              <span className="material-symbols-outlined ssm-tile-icon ssm-flame">local_fire_department</span>
              <span className="ssm-tile-label">Current Streak</span>
            </div>
            <span className="ssm-tile-val ssm-orange">
              {streak}
            </span>
          </div>

          <div className="ssm-tile">
            <div className="ssm-tile-header">
              <span className="material-symbols-outlined ssm-tile-icon ssm-cyan">bolt</span>
              <span className="ssm-tile-label">Multiplier</span>
            </div>
            <span className="ssm-tile-val ssm-cyan">
              {formatMultiplier(multiplier)}
            </span>
          </div>

          <div className="ssm-tile">
            <div className="ssm-tile-header">
              <span className="material-symbols-outlined ssm-tile-icon ssm-gold">stars</span>
              <span className="ssm-tile-label">Total Score</span>
            </div>
            <span className="ssm-tile-val ssm-gold">
              {(totalScore || 0).toLocaleString()}
            </span>
          </div>

          <div className="ssm-tile">
            <div className="ssm-tile-header">
              <span className="material-symbols-outlined ssm-tile-icon">trophy</span>
              <span className="ssm-tile-label">Best Score</span>
            </div>
            <span className="ssm-tile-val">
              {bestScore != null ? bestScore.toLocaleString() : '—'}
              {newBestScore && <span className="ssm-tag">BEST</span>}
            </span>
          </div>

          <div className="ssm-tile">
            <div className="ssm-tile-header">
              <span className="material-symbols-outlined ssm-tile-icon">history</span>
              <span className="ssm-tile-label">Best Time</span>
            </div>
            <span className="ssm-tile-val">
              {bestTimeMs != null ? formatCompletionTime(bestTimeMs) : '—'}
            </span>
          </div>
        </div>

        {/* Action Buttons (Vertically Stacked) */}
        <div className="ssm-actions">
          <button className="ssm-btn ssm-btn-pri" onClick={onContinue}>
            <span>Continue</span>
            <span className="material-symbols-outlined ssm-arrow-icon">arrow_forward</span>
          </button>

          {onReplay && (
            <button className="ssm-btn ssm-btn-sec" onClick={onReplay}>
              <span className="material-symbols-outlined">replay</span>
              <span>Play Again</span>
            </button>
          )}

          {onViewLeaderboard && (
            <button className="ssm-btn ssm-btn-sec" onClick={onViewLeaderboard}>
              <span className="material-symbols-outlined">leaderboard</span>
              <span>Leaderboard</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}