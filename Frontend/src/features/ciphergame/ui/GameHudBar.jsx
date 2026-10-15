import '../CipherGame.css';
import { useScoring } from '../core/hooks/ScoringContext';
import FullscreenButton from './FullscreenButton';

export default function GameHudBar({
  title,
  stage,
  tier,
  isReady = true,
  onBackToStages,
  onOpenMenu,
  lives,
  maxLives = 5,
  attempts,
  maxAttempts,
  isFullscreen,
  onToggleFullscreen,
  isMuted,
  onToggleMute,
  customRightContent
}) {
  return (
    <header className={`fg-header relative-header ${isReady ? 'fg-header-ready' : ''}`}>
      <div className="fg-header-left" style={{ zIndex: 6 }}>
        {isReady ? (
          <button className="cq-back-btn fg-btn-back-nav" onClick={onBackToStages}>
            <span className="cq-back-icon-circle">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
            </span>
            <span>Exit to Stages</span>
          </button>
        ) : (
          <button className="cq-back-btn fg-btn-back-nav" onClick={onOpenMenu}>
            <span className="cq-back-icon-circle">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>menu</span>
            </span>
            <span>Menu</span>
          </button>
        )}
      </div>

      {!isReady && (
        <div
          className="fg-header-title"
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            textAlign: 'center',
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 'clamp(0.82rem, 1.1vw, 1.05rem)',
            fontWeight: '700',
            color: '#ffffff',
            maxWidth: 'clamp(200px, 30vw, 420px)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 5,
          }}
          title={`${title}${stage != null ? ` — Stage ${stage}` : ''}${tier ? ` (${tier.toUpperCase()})` : ''}`}
        >
          {title} {stage != null && `— Stage ${stage}`} {tier && `(${tier.toUpperCase()})`}
        </div>
      )}

      {!isReady && (
        <div className="fg-header-right" style={{ display: 'flex', alignItems: 'center', gap: 'clamp(4px, 0.7vw, 10px)', zIndex: 6 }}>
          {/* ── SCORING SYSTEM: live score / streak / multiplier / stage timer ── */}
          <ScoringStrip />
          {lives != null && (
            <div className="hearts-glow" style={{ display: 'flex', alignItems: 'center' }}>
              {Array.from({ length: maxLives }).map((_, i) => (
                <span
                  key={i}
                  className="material-symbols-outlined"
                  style={{
                    color: i < lives ? '#ff007f' : 'rgba(255,255,255,0.15)',
                    fontVariationSettings: "'FILL' 1",
                    fontSize: 'clamp(0.95rem, 1.1vw, 1.15rem)',
                    marginRight: '1px'
                  }}
                >
                  favorite
                </span>
              ))}
            </div>
          )}
          {attempts != null && (
            <div className={`fg-header-attempts ${attempts <= 1 ? 'low-attempts' : ''}`}>
              Attempts: {attempts} {maxAttempts ? `/ ${maxAttempts}` : ''}
            </div>
          )}
          {onToggleMute && (
            <button
              type="button"
              className="fg-btn-icon"
              onClick={onToggleMute}
              title={isMuted ? "Unmute Sound (M)" : "Mute Sound (M)"}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#fff',
                padding: 'clamp(2px, 0.3vh, 4px) clamp(6px, 0.6vw, 8px)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                fontSize: 'clamp(0.85rem, 1vw, 1rem)'
              }}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
          )}
          {onToggleFullscreen && (
            <FullscreenButton isFullscreen={isFullscreen} onToggle={onToggleFullscreen} />
          )}
          {customRightContent}
        </div>
      )}
    </header>
  );
}

/**
 * SCORING SYSTEM in-stage display (UI requirement 24):
 * Current Score (total), Current Streak, Current Multiplier, Stage Timer.
 * Renders nothing when there is no active scoring context (e.g. ready screen).
 */
function ScoringStrip() {
  const scoring = useScoring();
  if (!scoring) return null;

  const formattedTime = scoring.stageStartedAt ? scoring.formattedTime : '00:00.000';

  const chipStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    padding: 'clamp(2px, 0.4vh, 3px) clamp(5px, 0.6vw, 8px)',
    borderRadius: '12px',
    background: 'rgba(0, 229, 255, 0.08)',
    border: '1px solid rgba(0, 229, 255, 0.25)',
    fontSize: 'clamp(0.68rem, 0.78vw, 0.76rem)',
    fontWeight: 'bold',
    fontFamily: 'JetBrains Mono, monospace',
    whiteSpace: 'nowrap',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(3px, 0.4vw, 5px)' }}>
      <div style={chipStyle} title="Total Score">
        <span style={{ color: '#ffd700' }}>★</span>
        <span style={{ color: '#fff' }}>{(scoring.totalScore || 0).toLocaleString()}</span>
      </div>
      <div style={chipStyle} title="Global Streak">
        <span>🔥</span>
        <span style={{ color: '#fff' }}>{scoring.streak || 0}</span>
      </div>
      <div
        style={{ ...chipStyle, borderColor: (scoring.multiplier || 1) > 1 ? 'rgba(34, 197, 94, 0.5)' : 'rgba(0, 229, 255, 0.25)' }}
        title="Streak Multiplier (applied to the next successful completion)"
      >
        <span style={{ color: (scoring.multiplier || 1) > 1 ? '#22c55e' : '#00e5ff' }}>
          {scoring.formattedMultiplier || '1.00x'}
        </span>
      </div>
      <div style={chipStyle} title="Stage Timer">
        <span className="material-symbols-outlined" style={{ fontSize: '0.8rem', color: '#00e5ff' }}>timer</span>
        <span style={{ color: '#fff' }}>{formattedTime}</span>
      </div>
    </div>
  );
}
