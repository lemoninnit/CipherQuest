import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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

  return (
    <div className="dashboard-container">
      <aside className="sidebar z-50">
        <div className="sidebar-header">
          <span className="sidebar-title">CipherQuest</span>
          <p className="sidebar-subtitle">Level {user?.level ?? 1} {levelLabel()}</p>
        </div>
        <nav className="sidebar-nav">
          <NavItem to="/dashboard"          icon="home"                 label="Home"       active={location.pathname === '/dashboard'} />
          <NavItem to="/dashboard/fishing"  icon="phishing"             label="Fishing"    active={location.pathname === '/dashboard/fishing'} />
          <NavItem to="/dashboard/missions" icon="assignment"           label="Missions"   active={location.pathname === '/dashboard/missions'} />
          <NavItem to="/dashboard"          icon="enhanced_encryption"  label="Ciphers"    active={false} />
          <NavItem to="/dashboard"          icon="trending_up"          label="Progress"   active={false} />
          <NavItem to="/dashboard"          icon="workspace_premium"    label="Badges"     active={false} />
          <div className="nav-bottom">
            <NavItem to="/dashboard" icon="settings" label="Settings" active={false} />
            <NavItem icon="logout" label="Logout" onClick={handleLogout} />
          </div>
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

        <div className="dashboard-content">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;