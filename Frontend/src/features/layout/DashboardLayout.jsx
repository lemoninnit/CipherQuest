import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { userApi } from '../../api/cipherQuestApi';
import ConfirmDialog from '../../components/ConfirmDialog';
import ChangePasswordDialog from '../../components/ChangePasswordDialog';
import useSignOut from '../../components/useSignOut';
import './DashboardLayout.css';

export const DashboardChromeContext = React.createContext({ openSettings: () => {} });

const DashboardLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { signOut, dialog: signOutDialog } = useSignOut();
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [settingsClosing, setSettingsClosing] = React.useState(false);

  const closeSettings = React.useCallback(() => {
    if (settingsClosing) return;
    setSettingsClosing(true);
    setTimeout(() => {
      setSettingsClosing(false);
      setSettingsOpen(false);
    }, 200);
  }, [settingsClosing]);

  // Account deletion is irreversible, so it gets a real dialog (with a pending
  // state and an inline error) instead of window.confirm + window.alert. The
  // native pair gave the player no idea which button they had just pressed and
  // reported failures in a popup the rest of the app cannot style.
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState(null);

  // Changing your Access Cipher while signed in. Kept as its own dialog rather
  // than a route so it opens over Settings without losing the player's place.
  const [changePwOpen, setChangePwOpen] = React.useState(false);
  const [changePwDone, setChangePwDone] = React.useState(false);

  const IMMERSIVE_ROUTES = ['/dashboard', '/dashboard/ciphergame', '/dashboard/leaderboard', '/dashboard/badges'];
  const immersive = IMMERSIVE_ROUTES.includes(location.pathname);

  React.useEffect(() => {
    if (!immersive) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [immersive]);

  const openSettings = React.useCallback(() => setSettingsOpen(true), []);
  const contextValue = React.useMemo(() => ({ openSettings }), [openSettings]);

  // Signing out from the Settings modal must also close the modal, otherwise
  // the sign-out dialog appears on top of a settings panel that then re-renders
  // behind it once the session is gone.
  const handleLogout = () => {
    setSettingsOpen(false);
    signOut();
  };

  const openChangePassword = () => {
    setChangePwDone(false);
    setChangePwOpen(true);
  };

  const closeChangePassword = () => {
    setChangePwOpen(false);
    setChangePwDone(false);
  };

  // On success the dialog closes and Settings confirms it in place, so the
  // player is told the change landed without being thrown back to a login page
  // they never asked to leave.
  const handlePasswordChanged = () => {
    setChangePwOpen(false);
    setChangePwDone(true);
  };

  const openDeleteDialog = () => {
    setDeleteError(null);
    setDeleteOpen(true);
  };

  const closeDeleteDialog = () => {
    if (deleting) return;
    setDeleteOpen(false);
    setDeleteError(null);
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await userApi.deleteAccount();
      setDeleteOpen(false);
      setSettingsOpen(false);
      logout();
      navigate('/', { replace: true });
    } catch (err) {
      // Kept inside the dialog instead of window.alert: the player keeps their
      // place and can retry or back out without a second popup.
      setDeleteError(err?.message || 'Could not reach the server. Please try again.');
    } finally {
      setDeleting(false);
    }
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
    <DashboardChromeContext.Provider value={contextValue}>
      <div className={`dashboard-container ${immersive ? 'immersive-mode' : ''}`}>
        {!immersive && (
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
        )}

        <main className="dashboard-main">
          {!immersive && (
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
          )}

          <div className={`dashboard-content ${location.pathname === '/dashboard/ciphergame' ? 'dashboard-content-fishing' : ''}`}>
            {children}
          </div>
        </main>

      {/* ── Agent Settings Console Modal Overlay ───────────── */}
      {settingsOpen && (
        <div className={`settings-modal-overlay ${settingsClosing ? 'is-closing' : ''}`} onClick={closeSettings}>
          <div className={`settings-modal-content ${settingsClosing ? 'is-closing' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined text-primary" style={{ color: 'var(--primary)' }}>settings</span>
                <h2>Agent Console Settings</h2>
              </div>
              <button className="settings-close-btn" onClick={closeSettings}>
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
                    <div className="setting-label">Change Access Cipher</div>
                    <div className="setting-desc">Update the password you use to sign in</div>
                  </div>
                  <button className="settings-change-pw-btn" onClick={openChangePassword}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>lock_reset</span>
                    Change
                  </button>
                </div>
                {changePwDone && (
                  <div className="settings-inline-success" role="status">
                    <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
                    Access Cipher updated. Use it next time you sign in.
                  </div>
                )}
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

              {/* Danger Zone */}
              <div className="settings-group danger-zone-group">
                <h3>⚠️ Danger Zone</h3>
                <div className="setting-row danger-row">
                  <div>
                    <div className="setting-label">Decommission Profile</div>
                    <div className="setting-desc">Permanently purge your operative account and delete all data in fishing seasons & cast results</div>
                  </div>
                  <button className="settings-delete-btn" onClick={openDeleteDialog}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete_forever</span>
                    Purge
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

      {/* Session / account dialogs. Mounted outside the settings modal so they
          survive it closing, and so either can be raised from it. */}
      {signOutDialog}

      <ChangePasswordDialog
        open={changePwOpen}
        onClose={closeChangePassword}
        onChanged={handlePasswordChanged}
      />

      <ConfirmDialog
        open={deleteOpen}
        onConfirm={handleDeleteAccount}
        onCancel={closeDeleteDialog}
        title="Delete your account?"
        description={
          user?.username
            ? `This permanently deletes ${user.username} and everything attached to it.`
            : 'This permanently deletes your account and everything attached to it.'
        }
        icon="delete_forever"
        tone="danger"
        confirmLabel="Delete my account"
        cancelLabel="Keep my account"
        busy={deleting}
        busyLabel="Deleting…"
      >
        <ul className="cd-permanent-list">
          <li>Every stage you have cleared</li>
          <li>All badges, XP and your total score</li>
          <li>Session hearts and leaderboard entries</li>
        </ul>

        {deleteError && (
          <p className="cd-error" role="alert">
            <span className="material-symbols-outlined" aria-hidden="true">error</span>
            {deleteError}
          </p>
        )}

        <p className="cd-irreversible">
          This cannot be undone. If you just want to sign out for now, cancel and
          use <strong>Sign out</strong> instead — your progress is kept.
        </p>
      </ConfirmDialog>
  </DashboardChromeContext.Provider>
  );
};

export default DashboardLayout;
