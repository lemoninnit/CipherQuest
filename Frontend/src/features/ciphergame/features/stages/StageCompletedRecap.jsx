import React from 'react';

const StageCompletedRecap = ({ stage, onClose, onPlayAgain }) => {
  return (
    <div className="recap-overlay" onClick={onClose}>
      <div className="recap-content-card glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="recap-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined text-primary" style={{ color: 'var(--primary)', fontVariationSettings: "'FILL' 1" }}>verified</span>
            <h3>Stage {stage.id} Decrypted Archive</h3>
          </div>
          <button className="recap-close-btn" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="recap-body">
          <div className="recap-status-badge">
            <span className="status-label">MODULE SECURED</span>
            <span className="status-time">REAL-TIME DATA MATCHED</span>
          </div>

          <div className="archive-details">
            <div className="archive-row">
              <span className="archive-label">TARGET WORD</span>
              <span className="archive-value word-glow">DYNAMIC POOL</span>
            </div>
            <div className="archive-row">
              <span className="archive-label">DECRYPTION HINT</span>
              <span className="archive-value">Randomized question per replay</span>
            </div>
            <div className="archive-row">
              <span className="archive-label">SECRET KEY RANGE</span>
              <span className="archive-value key-glow">Shift: Randomized (1-15)</span>
            </div>
            <div className="archive-row">
              <span className="archive-label">SCORE GAINED</span>
              <span className="archive-value score-glow">+100 XP SECURED</span>
            </div>
          </div>

          <div className="archive-footer-note">
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--primary)' }}>terminal</span>
            <p>This stage has already been decrypted. To practice or challenge new records, re-randomization of questions and shift keys occurs on every attempt.</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '16px' }}>
          <button className="recap-action-btn" onClick={onClose} style={{ flex: 1, margin: 0, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
            Exit Archive
          </button>
          {onPlayAgain && (
            <button className="recap-action-btn" onClick={() => { onPlayAgain(stage.id); onClose(); }} style={{ flex: 1, margin: 0, backgroundColor: 'var(--primary, #06b6d4)', color: '#fff' }}>
              Challenge Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StageCompletedRecap;
