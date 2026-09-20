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

const zeroPad = (n) => {
  const num = Number(n) || 0;
  return num < 10 ? `0${num}` : `${num}`;
};

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
    if (newScope === scope) return;
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

  // Render footer gap line dynamically
  const renderFooterGap = () => {
    if (!currentUserEntry) return null;

    const userRank = currentUserEntry.rank;
    if (userRank === 1) {
      return (
        <div className="lb-footer-gap-line">
          <div className="lb-gap-text">
            <span>You are holding <strong>Rank 01</strong>! Defend your position on the global stage.</span>
          </div>
          <button className="lb-resume-btn" onClick={() => navigate('/dashboard/ciphergame')}>
            Resume quest →
          </button>
        </div>
      );
    }

    // Find the player directly ahead
    let targetPlayer = topUsers.find((u) => u.rank === userRank - 1);
    if (!targetPlayer && topUsers.length > 0) {
      targetPlayer = topUsers[Math.min(topUsers.length - 1, 9)];
    }

    if (!targetPlayer) return null;

    const gap = Math.max(0, targetPlayer.points - currentUserEntry.points);
    const targetRankPad = zeroPad(targetPlayer.rank);
    const scopeLabel = SCOPE_OPTIONS.find((o) => o.id === scope)?.label || 'Caesar';
    const stagesNeeded = Math.max(1, Math.ceil(gap / 100));
    const stagesWord = stagesNeeded === 1 ? `one ${scopeLabel} stage` : stagesNeeded === 2 ? `two ${scopeLabel} stages` : `${stagesNeeded} ${scopeLabel} stages`;

    return (
      <div className="lb-footer-gap-line">
        <div className="lb-gap-text">
          You are <strong>{gap.toLocaleString()} points</strong> behind rank {targetRankPad}. Clear {stagesWord} to overtake.
        </div>
        <button className="lb-resume-btn" onClick={() => navigate('/dashboard/ciphergame')}>
          Resume quest →
        </button>
      </div>
    );
  };

  return (
    <div className="dh-lobby lb-lobby">
      {/* 21:9 Ratio Background Image */}
      <img
        className="dh-lobby-bg-img"
        src="/assets/fish/lobbybg/lobbybg.png"
        alt="Lobby Background"
        aria-hidden="true"
      />

      {/* Legibility Scrim Overlay */}
      <div className="dh-lobby-scrim" />

      {/* Header Bar matching Dashboard */}
      <header className="dh-header-bar">
        <div className="dh-wordmark-container">
          <div className="dh-wordmark-title">
            CipherQuest{' '}
            <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="#00e5ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="dh-lock-svg" aria-hidden="true">
              <rect x="5" y="11" width="14" height="10" rx="3" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
          </div>
          <div className="dh-wordmark-subtitle">
            OPERATIVE: {user?.username ?? 'OPERATIVE'} &nbsp;•&nbsp; LEVEL {user?.level ?? 1} OPERATIVE
          </div>
        </div>

        {/* Top-Right HUD Badge (Strictly Stroke SVGs, zero emojis) */}
        <div className="dh-hud-badge">
          {user?.onCooldown ? (
            <div className="dh-hud-item cooldown" title="4-Hour Attempt Cooldown Active">
              <span className="dh-hud-icon">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
                </svg>
              </span>
              <span>COOLDOWN</span>
            </div>
          ) : (
            <div className="dh-hud-item" title="Remaining Session Hearts">
              <span className="dh-hud-icon">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="#f43f5e" stroke="#f43f5e" strokeWidth="1.5" aria-hidden="true">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
              </span>
              <span>{user?.attempts ?? 3} / 3</span>
            </div>
          )}
          <div className="dh-hud-divider" />
          <div className="dh-hud-item" title="Active Session Streak">
            <span className="dh-hud-icon">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="#ff9f1c" stroke="#ff9f1c" strokeWidth="1" aria-hidden="true">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
              </svg>
            </span>
            <span>{user?.streak ?? 0}</span>
          </div>
          <div className="dh-hud-divider" />
          <div className="dh-hud-item" title="Operative Level">
            <span className="dh-hud-icon">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#38e0ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="8" r="6" />
                <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
              </svg>
            </span>
            <span>Lv.{user?.level ?? 1}</span>
          </div>
          <div className="dh-hud-divider" />
          <div className="dh-hud-item" title="Accumulated XP">
            <span className="dh-hud-icon">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="#ffd700" stroke="#ffd700" strokeWidth="1" aria-hidden="true">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </span>
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
            {/* 1. Header Row (Left Title & Subtitle, Right Scope Pills) */}
            <div className="lb-card-header-row">
              <div className="lb-header-title-block">
                <h2 className="lb-main-title">Global Leaderboard</h2>
                <div className="lb-season-subline">
                  SEASON 1 &bull; {topUsers.length} {topUsers.length === 1 ? 'OPERATIVE' : 'OPERATIVES'} RANKED
                </div>
              </div>

              {/* Scope Pills */}
              <div className="lb-scope-pills" role="tablist" aria-label="Leaderboard Scope Filter">
                {SCOPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    role="tab"
                    aria-selected={scope === opt.id}
                    className={`lb-scope-pill ${scope === opt.id ? 'active' : ''}`}
                    onClick={() => handleScopeChange(opt.id)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Loading State Skeleton */}
            {loading && (
              <div className="lb-skeleton-wrapper">
                <div className="lb-podium-section">
                  <div className="lb-podium-step step-2 lb-skeleton-step" />
                  <div className="lb-podium-step step-1 lb-skeleton-step" />
                  <div className="lb-podium-step step-3 lb-skeleton-step" />
                </div>
                <div className="lb-table-wrap">
                  <div className="lb-skeleton-row" />
                  <div className="lb-skeleton-row" />
                  <div className="lb-skeleton-row" />
                </div>
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

            {/* Main Content: Stepped Podium & Table */}
            {!loading && !error && (
              <>
                {/* 2. Stepped Podium Section (Rank 2 Left, Rank 1 Center, Rank 3 Right) */}
                <div className="lb-podium-section">
                  {/* Rank 2 (Silver) - Left */}
                  <div className={`lb-podium-step step-2 ${rank2?.isCurrentUser ? 'is-current' : ''}`}>
                    {rank2 ? (
                      <>
                        <div className="lb-podium-avatar-wrap">
                          <div className="lb-podium-avatar silver-ring" style={{ background: getAvatarBg(rank2.username) }}>
                            {(rank2.username || 'O')[0].toUpperCase()}
                          </div>
                        </div>
                        <div className="lb-podium-rank-num silver-num">02</div>
                        <div className="lb-podium-name" title={rank2.username}>{rank2.username}</div>
                        <div className="lb-podium-points silver-points">{rank2.points.toLocaleString()}</div>
                        <div className="lb-podium-subline">
                          MASTERY {rank2.mastery || 0}% &bull; {rank2.streak || 0} {rank2.streak === 1 ? 'DAY' : 'DAYS'}
                        </div>
                      </>
                    ) : (
                      <div className="lb-podium-empty-step">
                        <div className="lb-podium-rank-num silver-num">02</div>
                        <div className="lb-empty-dash">—</div>
                        <div className="lb-empty-label">OPEN SLOT</div>
                      </div>
                    )}
                  </div>

                  {/* Rank 1 (Gold) - Center, Tallest */}
                  <div className={`lb-podium-step step-1 ${rank1?.isCurrentUser ? 'is-current' : ''}`}>
                    {rank1 ? (
                      <>
                        <div className="lb-crown-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24" width="22" height="22" fill="#ffc146" stroke="#ffc146" strokeWidth="1.5">
                            <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14v2H5v-2z" />
                          </svg>
                        </div>
                        <div className="lb-podium-avatar-wrap">
                          <div className="lb-podium-avatar gold-ring" style={{ background: getAvatarBg(rank1.username) }}>
                            {(rank1.username || 'O')[0].toUpperCase()}
                          </div>
                        </div>
                        <div className="lb-podium-rank-num gold-num">01</div>
                        <div className="lb-podium-name" title={rank1.username}>{rank1.username}</div>
                        <div className="lb-podium-points gold-points">{rank1.points.toLocaleString()}</div>
                        <div className="lb-podium-subline">
                          MASTERY {rank1.mastery || 0}% &bull; {rank1.streak || 0} {rank1.streak === 1 ? 'DAY' : 'DAYS'}
                        </div>
                      </>
                    ) : (
                      <div className="lb-podium-empty-step">
                        <div className="lb-crown-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24" width="22" height="22" fill="#ffc146" stroke="#ffc146" strokeWidth="1.5">
                            <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14v2H5v-2z" />
                          </svg>
                        </div>
                        <div className="lb-podium-rank-num gold-num">01</div>
                        <div className="lb-empty-dash">—</div>
                        <div className="lb-empty-label">OPEN SLOT</div>
                      </div>
                    )}
                  </div>

                  {/* Rank 3 (Bronze) - Right, Shortest */}
                  <div className={`lb-podium-step step-3 ${rank3?.isCurrentUser ? 'is-current' : ''}`}>
                    {rank3 ? (
                      <>
                        <div className="lb-podium-avatar-wrap">
                          <div className="lb-podium-avatar bronze-ring" style={{ background: getAvatarBg(rank3.username) }}>
                            {(rank3.username || 'O')[0].toUpperCase()}
                          </div>
                        </div>
                        <div className="lb-podium-rank-num bronze-num">03</div>
                        <div className="lb-podium-name" title={rank3.username}>{rank3.username}</div>
                        <div className="lb-podium-points bronze-points">{rank3.points.toLocaleString()}</div>
                        <div className="lb-podium-subline">
                          MASTERY {rank3.mastery || 0}% &bull; {rank3.streak || 0} {rank3.streak === 1 ? 'DAY' : 'DAYS'}
                        </div>
                      </>
                    ) : (
                      <div className="lb-podium-empty-step">
                        <div className="lb-podium-rank-num bronze-num">03</div>
                        <div className="lb-empty-dash">—</div>
                        <div className="lb-empty-label">OPEN SLOT</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Ranked Table (Rank 4 to 10) */}
                <div className="lb-table-wrap">
                  <div className="lb-table-header">
                    <div className="col-rank">RANK</div>
                    <div className="col-player">OPERATIVE</div>
                    <div className="col-points">POINTS</div>
                    <div className="col-mastery">MASTERY</div>
                    <div className="col-streak">STREAK</div>
                  </div>

                  <div className="lb-table-body">
                    {tableUsers.length > 0 ? (
                      tableUsers.map((item) => (
                        <div
                          key={item.username}
                          className={`lb-table-row ${item.isCurrentUser ? 'is-current' : ''}`}
                        >
                          <div className="col-rank">
                            <span className="lb-rank-num">{zeroPad(item.rank)}</span>
                          </div>
                          <div className="col-player">
                            <div className="lb-row-avatar" style={{ background: getAvatarBg(item.username) }}>
                              {(item.username || 'O')[0].toUpperCase()}
                            </div>
                            <span className="lb-row-name" title={item.username}>
                              {item.username}
                            </span>
                            {item.isCurrentUser && <span className="lb-you-chip">YOU</span>}
                          </div>
                          <div className="col-points">{item.points.toLocaleString()}</div>
                          <div className="col-mastery">
                            <div className="lb-mastery-bar-track">
                              <div
                                className="lb-mastery-bar-fill"
                                style={{ width: `${Math.min(100, Math.max(0, item.mastery || 0))}%` }}
                              />
                            </div>
                            <span className="lb-mastery-percent">{item.mastery || 0}%</span>
                          </div>
                          <div className="col-streak">
                            <span className={`lb-streak-val ${item.streak > 0 ? 'active' : 'muted'}`}>
                              <svg className="lb-flame-icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
                                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                              </svg>
                              <span>{item.streak || 0}</span>
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="lb-no-table-data">
                        {topUsers.length === 0
                          ? 'No operative telemetry recorded yet for this scope.'
                          : 'All ranked operatives are displayed on the podium.'}
                      </div>
                    )}
                  </div>

                  {/* 4. Pinned Current User Row (When outside top 10) */}
                  {showPinnedRow && (
                    <div className="lb-pinned-row-wrapper">
                      <div className="lb-table-row lb-pinned-row is-current">
                        <div className="col-rank">
                          <span className="lb-rank-num pinned-badge">{zeroPad(currentUserEntry.rank)}</span>
                        </div>
                        <div className="col-player">
                          <div className="lb-row-avatar" style={{ background: getAvatarBg(currentUserEntry.username) }}>
                            {(currentUserEntry.username || 'O')[0].toUpperCase()}
                          </div>
                          <span className="lb-row-name" title={currentUserEntry.username}>
                            {currentUserEntry.username}
                          </span>
                          <span className="lb-you-chip">YOU</span>
                        </div>
                        <div className="col-points">{currentUserEntry.points.toLocaleString()}</div>
                        <div className="col-mastery">
                          <div className="lb-mastery-bar-track">
                            <div
                              className="lb-mastery-bar-fill"
                              style={{ width: `${Math.min(100, Math.max(0, currentUserEntry.mastery || 0))}%` }}
                            />
                          </div>
                          <span className="lb-mastery-percent">{currentUserEntry.mastery || 0}%</span>
                        </div>
                        <div className="col-streak">
                          <span className={`lb-streak-val ${currentUserEntry.streak > 0 ? 'active' : 'muted'}`}>
                            <svg className="lb-flame-icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
                              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                            </svg>
                            <span>{currentUserEntry.streak || 0}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 5. Footer Points Gap Strip */}
                  {renderFooterGap()}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tutorial Modal Field Manual (Zero Emojis) */}
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
                <div className="cq-tut-head">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#38e0ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3 15 4-8 4 8M4 13h6M15 7h6M15 11h4M15 15h6"/></svg>
                  <h3>1. Caesar Shift</h3>
                </div>
                <p>
                  Shift letters of the alphabet by a fixed numeric key. Learn monoalphabetic substitution through modular math.
                </p>
              </div>

              <div className="cq-tutorial-section">
                <div className="cq-tut-head">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#38e0ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m21 2-2 2m-1.5 1.5L10 13l-4 4-2-2 4-4 7.5-7.5M15 5l4 4"/></svg>
                  <h3>2. Vigenère Matrix</h3>
                </div>
                <p>
                  Polyalphabetic substitution using a repeating keyword. Decrypt repeating keyword shifts dynamically.
                </p>
              </div>

              <div className="cq-tutorial-section">
                <div className="cq-tut-head">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#38e0ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>
                  <h3>3. Playfair Matrix</h3>
                </div>
                <p>
                  Encrypt pairs of letters (digraphs) inside a 5×5 key matrix using row, column, and rectangular swaps.
                </p>
              </div>

              <div className="cq-tutorial-section">
                <div className="cq-tut-head">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#38e0ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.45 1-1 1H7M14 14.66V17c0 .55.45 1 1 1h2M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
                  <h3>4. Global Leaderboard</h3>
                </div>
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

