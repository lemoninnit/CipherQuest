import React from 'react';
import '../CipherGame.css';
import { useScoring } from '../core/hooks/ScoringContext';

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
  customRightContent
}) {
  return (
    <header className="fg-header relative-header">
      <div className="fg-header-left">
        {isReady ? (
          <button className="fg-btn-back-nav" onClick={onBackToStages}>
            <span className="material-symbols-outlined">arrow_back</span>
            Exit to Stages
          </button>
        ) : (
          <button className="fg-btn-back-nav" onClick={onOpenMenu}>
            <span className="material-symbols-outlined">menu</span>
            Menu
          </button>
        )}
      </div>

      <div className="fg-header-title" style={{ textAlign: 'center', flex: 1, fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.1rem', fontWeight: '700', color: '#ffffff' }}>
        {title} {stage != null && `— Stage ${stage}`} {tier && `(${tier.toUpperCase()})`}
      </div>

      <div className="fg-header-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                  fontSize: '1.2rem',
                  marginRight: '2px'
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
        {customRightContent}
      </div>
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
  if (!scoring || !scoring.stageStartedAt) return null;

  const chipStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 10px',
    borderRadius: '14px',
    background: 'rgba(0, 229, 255, 0.08)',
    border: '1px solid rgba(0, 229, 255, 0.25)',
    fontSize: '0.78rem',
    fontWeight: 'bold',
    fontFamily: 'JetBrains Mono, monospace',
    whiteSpace: 'nowrap',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div style={chipStyle} title="Total Score">
        <span style={{ color: '#ffd700' }}>★</span>
        <span style={{ color: '#fff' }}>{(scoring.totalScore || 0).toLocaleString()}</span>
      </div>
      <div style={chipStyle} title="Global Streak">
        <span>🔥</span>
        <span style={{ color: '#fff' }}>{scoring.streak}</span>
      </div>
      <div
        style={{ ...chipStyle, borderColor: scoring.multiplier > 1 ? 'rgba(34, 197, 94, 0.5)' : 'rgba(0, 229, 255, 0.25)' }}
        title="Streak Multiplier (applied to the next successful completion)"
      >
        <span style={{ color: scoring.multiplier > 1 ? '#22c55e' : '#00e5ff' }}>
          {scoring.formattedMultiplier}
        </span>
      </div>
      <div style={chipStyle} title="Stage Timer">
        <span className="material-symbols-outlined" style={{ fontSize: '0.85rem', color: '#00e5ff' }}>timer</span>
        <span style={{ color: '#fff' }}>{scoring.formattedTime}</span>
      </div>
    </div>
  );
}
