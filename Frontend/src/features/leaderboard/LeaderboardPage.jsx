import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { DashboardChromeContext } from '../layout/DashboardLayout';
import { leaderboardApi } from '../../api/cipherQuestApi';
import './LeaderboardPage.css';

const SCOPE_OPTIONS = [
  { id: 'overall', label: 'Overall' },
  { id: 'caesar', label: 'Caesar' },
  { id: 'vigenere', label: 'Vigenère' },
  { id: 'playfair', label: 'Playfair' },
];

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { openSettings } = useContext(DashboardChromeContext);

  const [scope, setScope] = useState('overall');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState({ topUsers: [], currentUserEntry: null });
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    let ignore = false;
    leaderboardApi
      .getGlobalLeaderboard(scope)
      .then((data) => {
        if (!ignore) {
          setLeaderboardData({
            topUsers: data?.topUsers || [],
            currentUserEntry: data?.currentUserEntry || null,
          });
          setError(null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.error('Error loading leaderboard:', err);
          setError(err.message || 'Unable to retrieve leaderboard data.');
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [scope]);

  const handleScopeChange = (newScope) => {
    setScope(newScope);
    setLoading(true);
  };

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    leaderboardApi
      .getGlobalLeaderboard(scope)
      .then((data) => {
        setLeaderboardData({
          topUsers: data?.topUsers || [],
          currentUserEntry: data?.currentUserEntry || null,
        });
        setError(null);
      })
      .catch((err) => {
        console.error('Error loading leaderboard:', err);
        setError(err.message || 'Unable to retrieve leaderboard data.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleQuit = () => {
    if (window.confirm('Are you sure you want to quit and sign out?')) {
      logout();
      navigate('/');
    }
  };

  const topUsers = leaderboardData.topUsers;
  const currentUserEntry = leaderboardData.currentUserEntry;

  // Podium slots: Rank 2 (Left), Rank 1 (Center), Rank 3 (Right)
  const rank1 = topUsers.find((u) => u.rank === 1);
  const rank2 = topUsers.find((u) => u.rank === 2);
  const rank3 = topUsers.find((u) => u.rank === 3);

  // Table rows for rank 4 through 10
  const tableUsers = topUsers.filter((u) => u.rank >= 4);

  // Pinned user row at the bottom: show if current user is outside the top 10
  const showPinnedRow = currentUserEntry && currentUserEntry.rank > 10;

  // Avatar color generator for visual polish
  const getAvatarBg = (username = '') => {
    const colors = [
      'linear-gradient(135deg, #00e5ff 0%, #0077b6 100%)',
      'linear-gradient(135deg, #ffd700 0%, #d97706 100%)',
      'linear-gradient(135deg, #10b981 0%, #047857 100%)',
      'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
      'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
      'linear-gradient(135deg, #f97316 0%, #c2410c 100%)',
    ];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="dh-lobby lb-lobby">
      {/* Background Looping Fog Video: Atmospheric blurred background fill for wide screens */}
      <video
        className="lb-bg-video lb-bg-video-blur"
        src="/assets/fish/lobbybg/lobby-bg.mp4"
        poster="/assets/fish/lobbybg/lobbybg.png"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
      />

      {/* Foreground sharp video showing full uncropped frame */}
      <video
        className="lb-bg-video lb-bg-video-contain"
        src="/assets/fish/lobbybg/lobby-bg.mp4"
        poster="/assets/fish/lobbybg/lobbybg.png"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
      />

      {/* Legibility Scrim Overlay */}
      <div className="dh-lobby-scrim" />

      {/* Header Bar matching Dashboard */}
      <header className="dh-header-bar">
        <div className="dh-wordmark-container">
          <div className="dh-wordmark-title">
            CipherQuest{' '}
            <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="#00e5ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="dh-lock-svg">
              <rect x="5" y="11" width="14" height="10" rx="3" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
          </div>
          <div className="dh-wordmark-subtitle">
            OPERATIVE: {user?.username ?? 'OPERATIVE'} &nbsp;•&nbsp; LEVEL {user?.level ?? 1} OPERATIVE
          </div>
        </div>

        {/* Top-Right HUD Badge */}
        <div className="dh-hud-badge">
          <div className="dh-hud-item">
            <span className="dh-hud-icon">🔥</span>
            <span>{user?.streak ?? 0}</span>
          </div>
          <div className="dh-hud-divider" />
          <div className="dh-hud-item">
            <span className="dh-hud-icon">🏅</span>
            <span>Lv.{user?.level ?? 1}</span>
          </div>
          <div className="dh-hud-divider" />
          <div className="dh-hud-item">
            <span className="dh-hud-icon">⭐</span>
            <span>{user?.xp ?? 0} XP</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="dh-lobby-content lb-content-layout">
        {/* Vertical Left Menu */}
        <nav className="dh-side-menu">
          <button className="dh-menu-item" onClick={() => navigate('/dashboard/ciphergame')}>
            Start Quest
          </button>
          <button className="dh-menu-item primary" onClick={() => {}}>
            Leaderboards
          </button>
          <button className="dh-menu-item" onClick={() => navigate('/dashboard/badges')}>
            Badges
          </button>
          <button className="dh-menu-item" onClick={() => setShowTutorial(true)}>
            Tutorial
          </button>
          <button className="dh-menu-item" onClick={openSettings}>
            Settings
          </button>
          <button className="dh-menu-item danger" onClick={handleQuit}>
            Quit
          </button>
        </nav>

        {/* Center Section: Leaderboard Console */}
        <div className="lb-center-section">
          <div className="lb-console-card">
            {/* Console Top Header: Title, TOP 3 Badge, Scope Dropdown */}
            <div className="lb-card-top-bar">
              <div className="lb-header-spacer" />
              <div className="lb-title-center">
                <h2 className="lb-main-title">Global Leaderboard</h2>
                <div className="lb-top3-badge">TOP 3</div>
              </div>
              <div className="lb-filter-wrapper">
                <label htmlFor="lb-scope-select" className="sr-only">Leaderboard Scope</label>
                <div className="lb-select-container">
                  <select
                    id="lb-scope-select"
                    className="lb-scope-dropdown"
                    value={scope}
                    onChange={(e) => handleScopeChange(e.target.value)}
                  >
                    {SCOPE_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined lb-select-arrow" aria-hidden="true">
                    expand_more
                  </span>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="lb-state-box">
                <div className="lb-spinner" />
                <p>Decrypting Operative Telemetry...</p>
              </div>
            )}

            {/* Error State */}
            {!loading && error && (
              <div className="lb-state-box lb-error-box">
                <span className="material-symbols-outlined lb-error-icon">warning</span>
                <p>{error}</p>
                <button className="lb-retry-btn" onClick={handleRetry}>
                  Retry Synchronization
                </button>
              </div>
            )}

            {/* Main Content: Podium & Table */}
            {!loading && !error && (
              <>
                {/* ── TOP 3 PODIUM ── */}
                <div className="lb-podium-row">
                  {/* Rank 2 (Silver) - Left */}
                  <div className={`lb-podium-card rank-2 ${rank2?.isCurrentUser ? 'is-current' : ''}`}>
                    {rank2 ? (
                      <>
                        <div className="lb-podium-avatar-box">
                          <div className="lb-avatar-circle" style={{ background: getAvatarBg(rank2.username) }}>
                            {(rank2.username || 'O')[0].toUpperCase()}
                          </div>
                        </div>
                        <div className="lb-podium-info">
                          <div className="lb-podium-username" title={rank2.username}>
                            {rank2.isCurrentUser ? `[You] ${rank2.username}` : rank2.username}
                          </div>
                          <div className="lb-podium-points">{rank2.points.toLocaleString()} pts</div>
                          <div className="lb-podium-mastery">Mastery: <strong>{rank2.mastery}%</strong></div>
                          <div className="lb-podium-streak">🔥 {rank2.streak} {rank2.streak === 1 ? 'day' : 'days'}</div>
                        </div>
                        {/* Silver Ribbon Badge */}
                        <div className="lb-medal-badge silver">
                          <div className="lb-medal-disc">2</div>
                          <div className="lb-medal-ribbon" />
                        </div>
                      </>
                    ) : (
                      <div className="lb-podium-empty">
                        <div className="lb-empty-dash">—</div>
                        <div className="lb-empty-label">Slot Open</div>
                        <div className="lb-medal-badge silver">
                          <div className="lb-medal-disc">2</div>
                          <div className="lb-medal-ribbon" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Rank 1 (Gold) - Center (Elevated) */}
                  <div className={`lb-podium-card rank-1 ${rank1?.isCurrentUser ? 'is-current' : ''}`}>
                    {rank1 ? (
                      <>
                        <div className="lb-podium-avatar-box">
                          <div className="lb-avatar-circle" style={{ background: getAvatarBg(rank1.username) }}>
                            {(rank1.username || 'O')[0].toUpperCase()}
                          </div>
                        </div>
                        <div className="lb-podium-info">
                          <div className="lb-podium-username" title={rank1.username}>
                            {rank1.isCurrentUser ? `[You] ${rank1.username}` : rank1.username}
                          </div>
                          <div className="lb-podium-points gold-text">{rank1.points.toLocaleString()} pts</div>
                          <div className="lb-podium-mastery">Mastery: <strong>{rank1.mastery}%</strong></div>
                          <div className="lb-podium-streak">🔥 {rank1.streak} {rank1.streak === 1 ? 'day' : 'days'}</div>
                        </div>
                        {/* Gold Ribbon Badge */}
                        <div className="lb-medal-badge gold">
                          <div className="lb-medal-disc">1</div>
                          <div className="lb-medal-ribbon" />
                        </div>
                      </>
                    ) : (
                      <div className="lb-podium-empty">
                        <div className="lb-empty-dash">—</div>
                        <div className="lb-empty-label">Slot Open</div>
                        <div className="lb-medal-badge gold">
                          <div className="lb-medal-disc">1</div>
                          <div className="lb-medal-ribbon" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Rank 3 (Bronze) - Right */}
                  <div className={`lb-podium-card rank-3 ${rank3?.isCurrentUser ? 'is-current' : ''}`}>
                    {rank3 ? (
                      <>
                        <div className="lb-podium-avatar-box">
                          <div className="lb-avatar-circle" style={{ background: getAvatarBg(rank3.username) }}>
                            {(rank3.username || 'O')[0].toUpperCase()}
                          </div>
                        </div>
                        <div className="lb-podium-info">
                          <div className="lb-podium-username" title={rank3.username}>
                            {rank3.isCurrentUser ? `[You] ${rank3.username}` : rank3.username}
                          </div>
                          <div className="lb-podium-points">{rank3.points.toLocaleString()} pts</div>
                          <div className="lb-podium-mastery">Mastery: <strong>{rank3.mastery}%</strong></div>
                          <div className="lb-podium-streak">🔥 {rank3.streak} {rank3.streak === 1 ? 'day' : 'days'}</div>
                        </div>
                        {/* Bronze Ribbon Badge */}
                        <div className="lb-medal-badge bronze">
                          <div className="lb-medal-disc">3</div>
                          <div className="lb-medal-ribbon" />
                        </div>
                      </>
                    ) : (
                      <div className="lb-podium-empty">
                        <div className="lb-empty-dash">—</div>
                        <div className="lb-empty-label">Slot Open</div>
                        <div className="lb-medal-badge bronze">
                          <div className="lb-medal-disc">3</div>
                          <div className="lb-medal-ribbon" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── RANKED TABLE (Ranks 4 to 10) ── */}
                <div className="lb-table-wrap">
                  <div className="lb-table-header">
                    <div className="col-rank">Rank</div>
                    <div className="col-player">Player</div>
                    <div className="col-points">Points</div>
                    <div className="col-mastery">Mastery</div>
                    <div className="col-streak">Streak</div>
                  </div>

                  <div className="lb-table-body">
                    {tableUsers.length > 0 ? (
                      tableUsers.map((item) => (
                        <div
                          key={item.username}
                          className={`lb-table-row ${item.isCurrentUser ? 'is-current' : ''}`}
                        >
                          <div className="col-rank">
                            <span className="lb-rank-num">{item.rank}</span>
                          </div>
                          <div className="col-player">
                            <div className="lb-row-avatar" style={{ background: getAvatarBg(item.username) }}>
                              {(item.username || 'O')[0].toUpperCase()}
                            </div>
                            <span className="lb-row-name" title={item.username}>
                              {item.isCurrentUser ? `[You] ${item.username}` : item.username}
                            </span>
                          </div>
                          <div className="col-points">{item.points.toLocaleString()}</div>
                          <div className="col-mastery">{item.mastery}%</div>
                          <div className="col-streak">
                            <span className="lb-streak-val">🔥 {item.streak}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="lb-no-table-data">
                        {topUsers.length === 0 ? 'No operative telemetry recorded yet.' : 'All ranked operatives are displayed on the podium.'}
                      </div>
                    )}
                  </div>

                  {/* ── PINNED CURRENT USER ROW (when outside top 10) ── */}
                  {showPinnedRow && (
                    <div className="lb-pinned-row-wrapper">
                      <div className="lb-table-row lb-pinned-row is-current">
                        <div className="col-rank">
                          <span className="lb-rank-num pinned-badge">{currentUserEntry.rank}</span>
                        </div>
                        <div className="col-player">
                          <div className="lb-row-avatar" style={{ background: getAvatarBg(currentUserEntry.username) }}>
                            {(currentUserEntry.username || 'O')[0].toUpperCase()}
                          </div>
                          <span className="lb-row-name">
                            [You] {currentUserEntry.username}
                          </span>
                        </div>
                        <div className="col-points">{currentUserEntry.points.toLocaleString()}</div>
                        <div className="col-mastery">{currentUserEntry.mastery}%</div>
                        <div className="col-streak">
                          <span className="lb-streak-val">🔥 {currentUserEntry.streak}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tutorial Modal Field Manual */}
      {showTutorial && (
        <div className="settings-modal-overlay" onClick={() => setShowTutorial(false)}>
          <div className="settings-modal-content cq-tutorial-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="material-symbols-outlined text-primary" style={{ color: 'var(--neon-cyan, #00e5ff)' }}>menu_book</span>
                <h2>CipherQuest Field Manual</h2>
              </div>
              <button className="settings-close-btn" onClick={() => setShowTutorial(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="settings-modal-body cq-tutorial-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              <div className="cq-tutorial-section">
                <h3>🔤 1. Caesar Shift</h3>
                <p>
                  Shift letters of the alphabet by a fixed numeric key. Learn monoalphabetic substitution through modular math.
                </p>
              </div>

              <div className="cq-tutorial-section">
                <h3>🔑 2. Vigenère Matrix</h3>
                <p>
                  Polyalphabetic substitution using a repeating keyword. Decrypt repeating keyword shifts dynamically.
                </p>
              </div>

              <div className="cq-tutorial-section">
                <h3>🗂️ 3. Playfair Matrix</h3>
                <p>
                  Encrypt pairs of letters (digraphs) inside a 5×5 key matrix using row, column, and rectangular swaps.
                </p>
              </div>

              <div className="cq-tutorial-section">
                <h3>🏆 5. Global Leaderboard</h3>
                <p>
                  Rankings update in real-time. Gain XP by solving cryptographic challenges to elevate your global operative standing.
                </p>
              </div>
            </div>

            <div style={{ padding: '16px 28px', borderTop: '1px solid rgba(0, 229, 255, 0.1)', textAlign: 'right' }}>
              <button
                className="fg-btn fg-btn-primary"
                onClick={() => setShowTutorial(false)}
                style={{ background: 'var(--neon-cyan, #00e5ff)', color: '#030914', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Understood, Operative!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
