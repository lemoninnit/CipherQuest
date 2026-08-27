import React from 'react';
import '../CipherGame.css';

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
