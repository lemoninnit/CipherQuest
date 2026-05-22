import React from 'react';

export default function PlayfairPlaceholder({ levelData, tier, onVerifySubmit, onBackToStages }) {
  return (
    <div className="vg-wrapper">
      <button className="vg-btn-back" onClick={onBackToStages}>← Back</button>

      <div className="vg-ready-card" style={{ textAlign: 'center' }}>
        <div className="vg-stage-badge">{tier?.toUpperCase()} · Stage {levelData?.level}</div>
        <div style={{ fontSize: '3rem', margin: '1rem 0' }}>🔐</div>
        <h2 className="vg-ready-title">Playfair Cipher</h2>
        <p className="vg-ready-desc" style={{ maxWidth: '400px', margin: '0 auto 1.5rem' }}>
          The Playfair cipher encrypts pairs of letters (digraphs) using a 5×5 key matrix.
          This game mode is currently under construction — check back soon!
        </p>

        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '1rem',
          marginBottom: '1.5rem',
          display: 'inline-block',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,2rem)', gap: '4px' }}>
            {['P','L','A','Y','F','I','R','B','C','D','E','G','H','K','M','N','O','Q','S','T','U','V','W','X','Z'].map((c, i) => (
              <div key={i} style={{
                width: '2rem', height: '2rem', background: 'rgba(99,102,241,0.2)',
                border: '1px solid rgba(99,102,241,0.4)', borderRadius: '4px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#a5b4fc', fontWeight: 700, fontSize: '0.85rem',
              }}>{c}</div>
            ))}
          </div>
          <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '8px' }}>Sample: PLAYFAIR key matrix</div>
        </div>

        <div style={{ color: '#f59e0b', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          🚧 Game content coming soon
        </div>

        <button className="vg-btn-start" onClick={onVerifySubmit}>
          Continue →
        </button>
      </div>
    </div>
  );
}