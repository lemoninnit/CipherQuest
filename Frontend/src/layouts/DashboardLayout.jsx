import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import './DashboardLayout.css';

const DashboardLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const NavItem = ({ to, icon, label, active }) => (
    <Link to={to} className={`nav-item ${active ? 'active' : ''}`}>
      <span className="material-symbols-outlined" style={active ? {fontVariationSettings: "'FILL' 1"} : {}}>{icon}</span>
      <span className="nav-label">{label}</span>
    </Link>
  );

  return (
    <div className="dashboard-container">
      <aside className="sidebar z-50">
        <div className="sidebar-header">
          <span className="sidebar-title">CipherQuest</span>
          <p className="sidebar-subtitle">Level 42 Operative</p>
        </div>
        <nav className="sidebar-nav">
          <NavItem to="/dashboard" icon="home" label="Home" active={location.pathname === '/dashboard'} />
          <NavItem to="/dashboard" icon="enhanced_encryption" label="Ciphers" active={false} />
          <NavItem to="/dashboard" icon="trending_up" label="Progress" active={false} />
          <NavItem to="/dashboard" icon="workspace_premium" label="Badges" active={false} />
          <div className="nav-bottom">
            <NavItem to="/dashboard" icon="settings" label="Settings" active={false} />
            <NavItem to="/" icon="logout" label="Logout" active={false} />
          </div>
        </nav>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header z-40">
          <h1 className="header-title">Welcome Back Jisun Titum</h1>
          <div className="header-actions">
            <div className="stats-badge">
              <div className="stat-item">
                <span className="material-symbols-outlined text-primary icon-18">local_fire_department</span>
                <span className="stat-text">14 Day Streak</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <span className="material-symbols-outlined text-tertiary icon-18">military_tech</span>
                <span className="stat-text">Rank: Gold IV</span>
              </div>
            </div>
            <div className="user-actions">
              <button className="notification-btn">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <div className="avatar-wrapper">
                <img alt="User Avatar" className="avatar-img" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCZi-x6LQ0PzozjgD6-2SMRcEB6I6n1vE6x96pBcFXtXM1EDAD2YkjiF5tSqGEPcPlqhIUKsrQb87pmsIGWryOoQlNQ1xsaHcwex6XJtethkcg4ftH4buf8lR7vu9ARNDLpcF5gRGdHxZxavhtMPT-OJCi_D8-Tgnm3LLhgImedHAHZedXDPx69JQacCxWYVJ-00brQZKSrnJrva2iOyL4Y4ANUeV_y6AuxKocC-S2zvZ79FRyQsOWcSmSUsI3eZSQCKk2VtWt9ruE" />
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
