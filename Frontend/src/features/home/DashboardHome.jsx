import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/context/AuthContext';
import './DashboardHome.css';

const DashboardHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const badges = [
    { label: 'First Crack',  icon: 'workspace_premium', color: 'badge-yellow',    bg: 'badge-bg-yellow',    locked: false },
    { label: 'Speedster',    icon: 'bolt',              color: 'badge-primary',   bg: 'badge-bg-primary',   locked: false },
    { label: 'Defender',     icon: 'shield',            color: 'badge-secondary', bg: 'badge-bg-secondary', locked: false },
    { label: 'Secret',       icon: 'lock',              color: 'badge-locked',    bg: 'badge-bg-locked',    locked: true  },
    { label: 'Secret',       icon: 'lock',              color: 'badge-locked',    bg: 'badge-bg-locked',    locked: true  },
  ];

  const xpToNextLevel = 1000;
  const xpProgress    = user ? ((user.xp % xpToNextLevel) / xpToNextLevel) * 100 : 0;

  return (
    <>
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-grid">
          <div className="hero-content">
            <span className="hero-tag">Active Operative</span>
            <h2 className="hero-title">{user?.username ?? 'Agent'}</h2>
            <p className="hero-desc">
              Level {user?.level ?? 1} — {user?.xp ?? 0} XP total.
              Keep solving ciphers to rank up and unlock new challenges.
            </p>
            <div className="hero-actions">
              <button className="btn-continue" onClick={() => navigate('/dashboard/ciphergame')}>
                🎮 Play CipherGame
              </button>
              <div className="hero-progress">
                <span className="progress-label-small">XP to next level</span>
                <div className="progress-track-small">
                  <div
                    className="progress-fill-small"
                    style={{ width: `${xpProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-image-wrapper glass-card">
              <img
                className="hero-image"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuANEtES_iLzeX8sjVBf6YfhTgcWG428qa0EMdbIt8LFUmWNw7EMR3NKOHeIkTAWdpz7SeB9Kk50mo9P34QR7GRW-rMNtDEtU4DWLAoO1IEOPtKo7pawl1oHLDBChAHOrskICaoScGD9S8SFrrZbM_2YtQexc-yJA-zNJRwXH3AJJI5zl7yae8OM2AeKXHOwg_nuLb53XoHvAYK0VEsWtCvn-u2eoDdJY0nd9cFMLVDHscS0RtdydTtqqtj1lE4tTdUEAJfwd967L0k"
                alt="Hero Background"
              />
            </div>
            <div className="streak-badge glass-card neon-glow-primary">
              <div className="streak-number">{user?.streak ?? 0}</div>
              <div className="streak-text">Day Streak</div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="quick-stats-section">
        <div className="quick-stats-grid">
          <div className="qs-card">
            <span className="material-symbols-outlined qs-icon text-primary">sports_esports</span>
            <div>
              <div className="qs-num">{user?.fishingGamesPlayed ?? 0}</div>
              <div className="qs-label">Cipher Games</div>
            </div>
          </div>
          <div className="qs-card">
            <span className="material-symbols-outlined qs-icon" style={{ color: '#ffd700' }}>emoji_events</span>
            <div>
              <div className="qs-num">{user?.fishingBestScore ?? 0}</div>
              <div className="qs-label">Best Game Score</div>
            </div>
          </div>
          <div className="qs-card">
            <span className="material-symbols-outlined qs-icon" style={{ color: '#39ff14' }}>verified</span>
            <div>
              <div className="qs-num">{user?.totalCiphersSolved ?? 0}</div>
              <div className="qs-label">Ciphers Solved</div>
            </div>
          </div>
          <div className="qs-card">
            <span className="material-symbols-outlined qs-icon" style={{ color: '#a855f7' }}>military_tech</span>
            <div>
              <div className="qs-num">Lv. {user?.level ?? 1}</div>
              <div className="qs-label">Current Level</div>
            </div>
          </div>
        </div>
      </section>

      {/* Cipher Selection */}
      <section className="cipher-section">
        <div className="section-header">
          <div>
            <h3 className="section-title">Available Games</h3>
            <p className="section-subtitle">Select a module to begin</p>
          </div>
        </div>
        <div className="cipher-grid">
          {/* Fishing Game Card */}
          <div className="cipher-card border-primary-hover" onClick={() => navigate('/dashboard/ciphergame')} style={{ cursor: 'pointer' }}>
            <div className="cipher-icon-wrapper bg-primary-light glow-primary-hover">
              <span className="material-symbols-outlined text-primary icon-32">sports_esports</span>
            </div>
            <h4 className="cipher-title">Cipher Quest Modules</h4>
            <p className="cipher-desc">Choose a cipher type (Caesar, Vigenère, Playfair) and complete levels sequentially.</p>
            <div className="cipher-footer">
              <span className="xp-text">+100 XP/level</span>
              <button className="play-btn bg-primary text-on-primary" onClick={() => navigate('/dashboard/ciphergame')}>
                <span className="material-symbols-outlined fill-1">play_arrow</span>
              </button>
            </div>
          </div>

          {/* Coming soon */}
          <div className="cipher-card border-secondary-hover" style={{ opacity: 0.5 }}>
            <div className="cipher-icon-wrapper bg-secondary-light glow-secondary-hover">
              <span className="material-symbols-outlined text-secondary icon-32">vpn_key</span>
            </div>
            <h4 className="cipher-title">Vigenère</h4>
            <p className="cipher-desc">Polyalphabetic substitution using a secret keyword. Coming soon.</p>
            <div className="cipher-footer">
              <span className="xp-text">+1200 XP</span>
              <button className="play-btn bg-secondary text-on-secondary" disabled>
                <span className="material-symbols-outlined fill-1">lock</span>
              </button>
            </div>
          </div>

          <div className="cipher-card border-tertiary-hover" style={{ opacity: 0.5 }}>
            <div className="cipher-icon-wrapper bg-tertiary-light glow-tertiary-hover">
              <span className="material-symbols-outlined text-tertiary icon-32">grid_view</span>
            </div>
            <h4 className="cipher-title">Playfair Matrix</h4>
            <p className="cipher-desc">Digraph substitution technique using a 5×5 grid. Coming soon.</p>
            <div className="cipher-footer">
              <span className="xp-text">+2500 XP</span>
              <button className="play-btn bg-tertiary text-on-tertiary" disabled>
                <span className="material-symbols-outlined fill-1">lock</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="stats-grid">
        <section className="badges-section">
          <div className="section-header-compact">
            <h3 className="section-title-md">Recent Badges</h3>
            <span className="badges-count">Earned through gameplay</span>
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
          <h3 className="section-title-md">XP Progress</h3>
          <div className="chart-container">
            <div className="donut-chart">
              <svg className="donut-svg" viewBox="0 0 128 128">
                <circle className="donut-bg" cx="64" cy="64" r="58" />
                <circle
                  className="donut-fill"
                  cx="64" cy="64" r="58"
                  strokeDasharray={`${(xpProgress / 100) * 364.4} 364.4`}
                  strokeDashoffset="91.1"
                />
              </svg>
              <div className="donut-text">
                <span className="donut-value">{Math.round(xpProgress)}%</span>
                <span className="donut-label">to Lv.{(user?.level ?? 1) + 1}</span>
              </div>
            </div>
          </div>
          <div className="objective-container">
            <div className="objective-header">
              <span className="objective-label">Total XP</span>
              <span className="objective-status">{user?.xp ?? 0} XP</span>
            </div>
            <div className="objective-track">
              <div className="objective-fill" style={{ width: `${xpProgress}%` }} />
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default DashboardHome;
