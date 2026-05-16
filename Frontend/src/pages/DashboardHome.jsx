import React from 'react';
import './DashboardHome.css';

const DashboardHome = () => {
  const badges = [
    {label: 'First Crack', icon: 'workspace_premium', color: 'badge-yellow', bg: 'badge-bg-yellow'},
    {label: 'Speedster', icon: 'bolt', color: 'badge-primary', bg: 'badge-bg-primary'},
    {label: 'Defender', icon: 'shield', color: 'badge-secondary', bg: 'badge-bg-secondary'},
    {label: 'Secret', icon: 'lock', color: 'badge-locked', bg: 'badge-bg-locked', locked: true},
    {label: 'Secret', icon: 'lock', color: 'badge-locked', bg: 'badge-bg-locked', locked: true}
  ];

  return (
    <>
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-grid">
          <div className="hero-content">
            <span className="hero-tag">Current Mission</span>
            <h2 className="hero-title">Pacman</h2>
            <p className="hero-desc">Crack the triple-layer Caesar-Vigenère hybrid to unlock the Master Operative badge.</p>
            <div className="hero-actions">
              <button className="btn-continue">
                Continue Challenge
              </button>
              <div className="hero-progress">
                <span className="progress-label-small">Current Cipher Progress</span>
                <div className="progress-track-small">
                  <div className="progress-fill-small"></div>
                </div>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-image-wrapper glass-card">
              <img className="hero-image" src="https://lh3.googleusercontent.com/aida-public/AB6AXuANEtES_iLzeX8sjVBf6YfhTgcWG428qa0EMdbIt8LFUmWNw7EMR3NKOHeIkTAWdpz7SeB9Kk50mo9P34QR7GRW-rMNtDEtU4DWLAoO1IEOPtKo7pawl1oHLDBChAHOrskICaoScGD9S8SFrrZbM_2YtQexc-yJA-zNJRwXH3AJJI5zl7yae8OM2AeKXHOwg_nuLb53XoHvAYK0VEsWtCvn-u2eoDdJY0nd9cFMLVDHscS0RtdydTtqqtj1lE4tTdUEAJfwd967L0k" alt="Hero Background" />
            </div>
            <div className="streak-badge glass-card neon-glow-primary">
              <div className="streak-number">14</div>
              <div className="streak-text">Daily Streak</div>
            </div>
          </div>
        </div>
      </section>

      {/* Cipher Selection */}
      <section className="cipher-section">
        <div className="section-header">
          <div>
            <h3 className="section-title">Available Ciphers</h3>
            <p className="section-subtitle">Select a module to begin decrypting</p>
          </div>
          <button className="btn-link">View All Modules</button>
        </div>
        <div className="cipher-grid">
          {/* Caesar Card */}
          <div className="cipher-card border-primary-hover">
            <div className="cipher-icon-wrapper bg-primary-light glow-primary-hover">
              <span className="material-symbols-outlined text-primary icon-32">published_with_changes</span>
            </div>
            <h4 className="cipher-title">Caesar Shift</h4>
            <p className="cipher-desc">Classic rotational cipher. Master the wheel dynamics.</p>
            <div className="cipher-footer">
              <span className="xp-text">+500 XP</span>
              <button className="play-btn bg-primary text-on-primary">
                <span className="material-symbols-outlined fill-1">play_arrow</span>
              </button>
            </div>
          </div>
          {/* Vigenère Card */}
          <div className="cipher-card border-secondary-hover">
            <div className="cipher-icon-wrapper bg-secondary-light glow-secondary-hover">
              <span className="material-symbols-outlined text-secondary icon-32">vpn_key</span>
            </div>
            <h4 className="cipher-title">Vigenère</h4>
            <p className="cipher-desc">Polyalphabetic substitution using a secret keyword.</p>
            <div className="cipher-footer">
              <span className="xp-text">+1200 XP</span>
              <button className="play-btn bg-secondary text-on-secondary">
                <span className="material-symbols-outlined fill-1">play_arrow</span>
              </button>
            </div>
          </div>
          {/* Playfair Card */}
          <div className="cipher-card border-tertiary-hover">
            <div className="cipher-icon-wrapper bg-tertiary-light glow-tertiary-hover">
              <span className="material-symbols-outlined text-tertiary icon-32">grid_view</span>
            </div>
            <h4 className="cipher-title">Playfair Matrix</h4>
            <p className="cipher-desc">Digraph substitution technique using a 5x5 grid.</p>
            <div className="cipher-footer">
              <span className="xp-text">+2500 XP</span>
              <button className="play-btn bg-tertiary text-on-tertiary">
                <span className="material-symbols-outlined fill-1">play_arrow</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="stats-grid">
        <section className="badges-section">
          <div className="section-header-compact">
            <h3 className="section-title-md">Recent Badges</h3>
            <span className="badges-count">12 / 48 Collected</span>
          </div>
          <div className="badges-list scrollbar-hide">
            {badges.map((badge, idx) => (
              <div key={idx} className={`badge-item ${badge.locked ? 'locked' : ''}`}>
                <div className={`badge-icon-wrapper ${badge.bg}`}>
                  <span className={`material-symbols-outlined ${badge.color} fill-1`}>{badge.icon}</span>
                </div>
                <span className="badge-name">{badge.label}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="performance-section">
          <h3 className="section-title-md">Weekly Performance</h3>
          <div className="chart-container">
            <div className="donut-chart">
              <svg className="donut-svg">
                <circle className="donut-bg" cx="64" cy="64" r="58"></circle>
                <circle className="donut-fill" cx="64" cy="64" r="58"></circle>
              </svg>
              <div className="donut-text">
                <span className="donut-value">75%</span>
                <span className="donut-label">Mastery</span>
              </div>
            </div>
          </div>
          <div className="objective-container">
            <div className="objective-header">
              <span className="objective-label">Daily Objective</span>
              <span className="objective-status">3 / 4 Done</span>
            </div>
            <div className="objective-track">
              <div className="objective-fill"></div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default DashboardHome;
