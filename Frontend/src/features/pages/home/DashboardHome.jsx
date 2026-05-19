import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import './DashboardHome.css';

const DashboardHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const badges = [
    { label: 'First Crack',  icon: 'workspace_premium', color: 'badge-cyan',    bg: 'badge-bg-cyan',    locked: false },
    { label: 'Speedster',    icon: 'bolt',              color: 'badge-cyan',   bg: 'badge-bg-cyan',   locked: false },
    { label: 'Defender',     icon: 'shield',            color: 'badge-cyan',   bg: 'badge-bg-cyan',   locked: false },
    { label: 'Secret',       icon: 'lock',              color: 'badge-locked',    bg: 'badge-bg-locked',    locked: true  },
    { label: 'Secret',       icon: 'lock',              color: 'badge-locked',    bg: 'badge-bg-locked',    locked: true  },
  ];

  const xpToNextLevel = 1000;
  const xpProgress    = user ? ((user.xp % xpToNextLevel) / xpToNextLevel) * 100 : 0;

  return (
    <div className="dh-root">
      
      

      {/* HERO SECTION */}
      <section className="hero-section">
        <div className="hero-grid">
          <div className="hero-content">
            <span className="hero-tag">CURRENT MISSION</span>
            <h2 className="hero-title">{user?.username ?? 'Operation CipherQuest'}</h2>
            <p className="hero-desc">
              Crack the triple-layer Caesar-Vigenère hybrid to unlock the Master Operative badge.
            </p>
            
            <div className="hero-actions">
              <button className="btn-continue ripple-effect" onClick={() => navigate('/dashboard/ciphergame')}>
                Continue Challenge
              </button>
              
              <div className="hero-progress-widget">
                <div className="progress-header">
                  <span className="progress-label">CURRENT CIPHER PROGRESS</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${xpProgress}%` }} />
                </div>
              </div>
            </div>
          </div>
          
          <div className="hero-visual">
            <div className="hero-image-wrapper">
              <img
                className="hero-image"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuANEtES_iLzeX8sjVBf6YfhTgcWG428qa0EMdbIt8LFUmWNw7EMR3NKOHeIkTAWdpz7SeB9Kk50mo9P34QR7GRW-rMNtDEtU4DWLAoO1IEOPtKo7pawl1oHLDBChAHOrskICaoScGD9S8SFrrZbM_2YtQexc-yJA-zNJRwXH3AJJI5zl7yae8OM2AeKXHOwg_nuLb53XoHvAYK0VEsWtCvn-u2eoDdJY0nd9cFMLVDHscS0RtdydTtqqtj1lE4tTdUEAJfwd967L0k"
                alt="Hero Background"
              />
            </div>
            <div className="streak-badge">
              <div className="streak-number">{user?.streak ?? 0}</div>
              <div className="streak-text">Daily Streak</div>
            </div>
          </div>
        </div>
      </section>

      {/* QUICK STATS - COMPACT 4-COLUMN */}
      <section className="quick-stats-section">
        <div className="quick-stats-grid">
          <div className="qs-card">
            <div className="qs-icon-wrapper">
              <span className="material-symbols-outlined qs-icon text-cyan">sports_esports</span>
            </div>
            <div className="qs-info">
              <div className="qs-num">{user?.fishingGamesPlayed ?? 0}</div>
              <div className="qs-label">Cipher Games</div>
            </div>
          </div>
          <div className="qs-card">
            <div className="qs-icon-wrapper">
              <span className="material-symbols-outlined qs-icon text-cyan">emoji_events</span>
            </div>
            <div className="qs-info">
              <div className="qs-num">{user?.fishingBestScore ?? 0}</div>
              <div className="qs-label">Best Score</div>
            </div>
          </div>
          <div className="qs-card">
            <div className="qs-icon-wrapper">
              <span className="material-symbols-outlined qs-icon text-cyan">verified</span>
            </div>
            <div className="qs-info">
              <div className="qs-num">{user?.totalCiphersSolved ?? 0}</div>
              <div className="qs-label">Ciphers Solved</div>
            </div>
          </div>
          <div className="qs-card">
            <div className="qs-icon-wrapper">
              <span className="material-symbols-outlined qs-icon text-cyan">military_tech</span>
            </div>
            <div className="qs-info">
              <div className="qs-num">Lv. {user?.level ?? 1}</div>
              <div className="qs-label">Current Level</div>
            </div>
          </div>
        </div>
      </section>

      {/* OPERATIONS / LAUNCHER SECTION */}
      <section className="cipher-section">
        <div className="section-header">
          <h3 className="section-title">Available Operations</h3>
          <p className="section-subtitle">Select a cryptographic module to begin interception drills</p>
        </div>
        
        <div className="cipher-grid">
          {/* Caesar Card */}
          <div className="cipher-card launcher-card dh-glass-card active-module border-primary-hover" onClick={() => navigate('/dashboard/ciphergame')}>
            <div className="launcher-header">
              <div className="cipher-icon-wrapper bg-primary-light glow-primary-hover">
                <span className="material-symbols-outlined text-cyan icon-24">sort_by_alpha</span>
              </div>
              <div className="card-status-badge available">AVAILABLE</div>
            </div>
            <div className="launcher-body">
              <h4 className="cipher-title">Caesar Shift</h4>
              <p className="cipher-desc">Decrypt alphabet letters using mathematical modular arithmetic key offsets.</p>
            </div>
            <div className="launcher-footer">
              <span className="xp-text">+100 XP / Level</span>
              <button className="play-btn bg-primary text-on-primary">
                <span className="material-symbols-outlined fill-1">play_arrow</span>
              </button>
            </div>
          </div>

          {/* Locked Vigenère */}
          <div className="cipher-card launcher-card dh-glass-card locked-module border-primary-hover">
            <div className="launcher-header">
              <div className="cipher-icon-wrapper bg-locked-light">
                <span className="material-symbols-outlined text-muted icon-24">vpn_key</span>
              </div>
              <div className="card-status-badge locked">LOCKED</div>
            </div>
            <div className="launcher-body">
              <h4 className="cipher-title">Vigenère Matrix</h4>
              <p className="cipher-desc">Polyalphabetic substitution using a keyword cycle matrix. Unlocks after Easy tier Caesar.</p>
            </div>
            <div className="launcher-footer">
              <span className="xp-text muted">+1,200 XP</span>
              <button className="play-btn bg-locked text-muted" disabled>
                <span className="material-symbols-outlined fill-1">lock</span>
              </button>
            </div>
          </div>

          {/* Locked Playfair */}
          <div className="cipher-card launcher-card dh-glass-card locked-module border-primary-hover">
             <div className="launcher-header">
              <div className="cipher-icon-wrapper bg-locked-light">
                <span className="material-symbols-outlined text-muted icon-24">grid_view</span>
              </div>
              <div className="card-status-badge locked">LOCKED</div>
            </div>
            <div className="launcher-body">
              <h4 className="cipher-title">Playfair Matrix</h4>
              <p className="cipher-desc">Digraph substitution technique using a coordinate 5×5 grid. Unlocks after Vigenère.</p>
            </div>
            <div className="launcher-footer">
              <span className="xp-text muted">+2,500 XP</span>
              <button className="play-btn bg-locked text-muted" disabled>
                <span className="material-symbols-outlined fill-1">lock</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* BOTTOM WIDGETS: BADGES & PERFORMANCE */}
      <div className="stats-grid">
        <section className="badges-section dh-glass-card">
          <div className="section-header-compact">
            <div>
              <h3 className="section-title-md">Recent Badges</h3>
              <span className="badges-count">Earned through gameplay</span>
            </div>
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

        <section className="performance-section dh-glass-card">
          <h3 className="section-title-md">XP Progress</h3>
          <div className="performance-content">
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
                <span className="objective-label">Current XP</span>
                <span className="objective-status">{user?.xp ?? 0} / {xpToNextLevel}</span>
              </div>
              <div className="objective-track">
                <div className="objective-fill" style={{ width: `${xpProgress}%` }} />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DashboardHome;