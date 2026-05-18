import React from 'react';

const StageCompletedRecap = ({ stage, onClose }) => {
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
              <span className="archive-value word-glow">HELLO</span>
            </div>
            <div className="archive-row">
              <span className="archive-label">DECRYPTION HINT</span>
              <span className="archive-value">A word used for greetings</span>
            </div>
            <div className="archive-row">
              <span className="archive-label">SECRET KEY DISCOVERED</span>
              <span className="archive-value key-glow">Shift Shift: {stage.secretKey || 3}</span>
            </div>
            <div className="archive-row">
              <span className="archive-label">SCORE GAINED</span>
              <span className="archive-value score-glow">+100 XP SECURED</span>
            </div>
          </div>

          <div className="archive-footer-note">
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--primary)' }}>terminal</span>
            <p>This stage has already been decrypted. To practice or challenge new records, re-randomization occurs in Medium and Hard tiers.</p>
          </div>
        </div>

        <button className="recap-action-btn" onClick={onClose}>
          Exit Archive View
        </button>
      </div>
    </div>
  );
};

export default StageCompletedRecap;
