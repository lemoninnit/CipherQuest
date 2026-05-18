import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './DashboardLayout.css';

const DashboardLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const NavItem = ({ to, icon, label, active, onClick }) => (
    onClick
      ? (
        <button onClick={onClick} className={`nav-item nav-item-btn ${active ? 'active' : ''}`}>
          <span className="material-symbols-outlined" style={active ? { fontVariationSettings: "'FILL' 1" } : {}}>{icon}</span>
          <span className="nav-label">{label}</span>
        </button>
      ) : (
        <Link to={to} className={`nav-item ${active ? 'active' : ''}`}>
          <span className="material-symbols-outlined" style={active ? { fontVariationSettings: "'FILL' 1" } : {}}>{icon}</span>
          <span className="nav-label">{label}</span>
        </Link>
      )
  );

  const levelLabel = () => {
    if (!user) return 'Operative';
    const lvl = user.level;
    if (lvl >= 10) return 'Master Operative';
    if (lvl >= 5)  return 'Senior Operative';
    return 'Operative';
  };

  const [settingsOpen, setSettingsOpen] = React.useState(false);

  return (
    <div className="dashboard-container">
      <aside className="sidebar z-50">
        <div className="sidebar-header">
          <span className="sidebar-title">CipherQuest</span>
          <p className="sidebar-subtitle">Level {user?.level ?? 1} {levelLabel()}</p>
        </div>
        <nav className="sidebar-nav">
          <NavItem to="/dashboard"          icon="home"                 label="Home"       active={location.pathname === '/dashboard' && !settingsOpen} />
          <NavItem to="/dashboard/ciphergame" icon="sports_esports"       label="CipherGame" active={location.pathname === '/dashboard/ciphergame' && !settingsOpen} />
          <NavItem to="/dashboard/badges"      icon="workspace_premium"    label="Badges"     active={location.pathname === '/dashboard/badges' && !settingsOpen} />
          <NavItem
            icon="settings"
            label="Settings"
            active={settingsOpen}
            onClick={() => setSettingsOpen(true)}
          />
        </nav>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header z-40">
          <h1 className="header-title">Welcome Back, {user?.username ?? 'Operative'}</h1>
          <div className="header-actions">
            <div className="stats-badge">
              <div className="stat-item">
                <span className="material-symbols-outlined text-primary icon-18">local_fire_department</span>
                <span className="stat-text">{user?.streak ?? 0} Day Streak</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <span className="material-symbols-outlined text-tertiary icon-18">military_tech</span>
                <span className="stat-text">Level {user?.level ?? 1}</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <span className="material-symbols-outlined text-tertiary icon-18">star</span>
                <span className="stat-text">{user?.xp ?? 0} XP</span>
              </div>
            </div>
            <div className="user-actions">
              <div className="avatar-wrapper">
                <div className="avatar-placeholder">
                  {(user?.username ?? 'O')[0].toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className={`dashboard-content ${location.pathname === '/dashboard/ciphergame' ? 'dashboard-content-fishing' : ''}`}>
          {children}
        </div>
      </main>

      {/* ── Agent Settings Console Modal Overlay ───────────── */}
      {settingsOpen && (
        <div className="settings-modal-overlay" onClick={() => setSettingsOpen(false)}>
          <div className="settings-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined text-primary" style={{ color: 'var(--primary)' }}>settings</span>
                <h2>Agent Console Settings</h2>
              </div>
              <button className="settings-close-btn" onClick={() => setSettingsOpen(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="settings-modal-body">
              {/* Agent Profile Card */}
              <div className="settings-profile-card">
                <div className="avatar-placeholder large">
                  {(user?.username ?? 'O')[0].toUpperCase()}
                </div>
                <div>
                  <div className="profile-username">{user?.username ?? 'Operative'}</div>
                  <div className="profile-role">Operative Rank: Level {user?.level ?? 1}</div>
                </div>
              </div>

              {/* Preferences Setting Row */}
              <div className="settings-group">
                <h3>🎮 Preferences</h3>
                <div className="setting-row">
                  <div>
                    <div className="setting-label">Sound Effects</div>
                    <div className="setting-desc">Play feedback sound when catching fish</div>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" defaultChecked />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>

              {/* Security & Sign Out Row */}
              <div className="settings-group">
                <h3>🔐 Security & Session</h3>
                <div className="setting-row">
                  <div>
                    <div className="setting-label">Session Control</div>
                    <div className="setting-desc">Sign out from this terminal securely</div>
                  </div>
                  <button className="settings-logout-btn" onClick={handleLogout}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>logout</span>
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;
