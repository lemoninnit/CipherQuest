import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { DashboardChromeContext } from '../../layout/DashboardLayout';
import CaesarTutorialModal from '../../ciphergame/features/caesar/CaesarTutorialModal';
import VigenereTutorialModal from '../../ciphergame/features/vigenere/VigenereTutorialModal';
import './DashboardHome.css';

const DashboardHome = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { openSettings } = useContext(DashboardChromeContext);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialCategory, setTutorialCategory] = useState('caesar');
  const [activeCardId, setActiveCardId] = useState(null);
  const [cooldownRemaining, setCooldownRemaining] = useState('');

  // Handle Quit
  const handleStartQuestNav = () => {
    if (window.location.pathname !== '/dashboard') {
      navigate('/dashboard');
    } else if (activeCardId) {
      navigate('/dashboard/ciphergame', { state: { category: activeCardId } });
    }
  };

  const handleQuit = () => {
    if (window.confirm("Are you sure you want to quit and sign out?")) {
      logout();
      navigate('/');
    }
  };

  // Real-time Cooldown Timer Countdown
  useEffect(() => {
    if (!user?.onCooldown || !user?.cooldownEndTime) {
      setCooldownRemaining('');
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const end = new Date(user.cooldownEndTime).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setCooldownRemaining('00:00:00');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const pad = (n) => String(n).padStart(2, '0');
      setCooldownRemaining(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [user?.onCooldown, user?.cooldownEndTime]);

  // Calculate Progress per Cipher
  const getCipherProgress = (cipherId) => {
    const cKey = cipherId.toUpperCase();
    let progressMap = user?.progress;
    if (!progressMap) {
      try {
        const stored = localStorage.getItem('cq_user_progress');
        if (stored) progressMap = JSON.parse(stored);
      } catch (e) {
        // ignore fallback errors
      }
    }

    const cipherData = progressMap?.[cKey] || {};
    const easyCount = (cipherData.EASY || []).length;
    const mediumCount = (cipherData.MEDIUM || []).length;
    const hardCount = (cipherData.HARD || []).length;
    const totalCompleted = Math.min(15, easyCount + mediumCount + hardCount);
    const percentage = Math.round((totalCompleted / 15) * 100);

    let tierLabel = 'EASY';
    let currentLevel = easyCount + 1;
    if (easyCount >= 5 && mediumCount < 5) {
      tierLabel = 'MEDIUM';
      currentLevel = mediumCount + 1;
    } else if (mediumCount >= 5 && hardCount < 5) {
      tierLabel = 'HARD';
      currentLevel = hardCount + 1;
    } else if (hardCount >= 5) {
      tierLabel = 'MASTERED';
      currentLevel = 5;
    }

    return {
      totalCompleted,
      percentage,
      tierLabel,
      currentLevel,
      easyCount,
      mediumCount,
      hardCount
    };
  };

  const caesarProg = getCipherProgress('caesar');
  const vigenereProg = getCipherProgress('vigenere');
  const playfairProg = getCipherProgress('playfair');

  const totalLevelsCompleted = caesarProg.totalCompleted + vigenereProg.totalCompleted + playfairProg.totalCompleted;
  const overallMasteryPct = Math.round((totalLevelsCompleted / 45) * 100);

  // XP & Level Calculation
  const currentXp = user?.xp ?? 0;
  const currentLevel = user?.level ?? 1;
  const xpInCurrentLevel = currentXp % 1000;
  const xpPct = Math.min(100, Math.round((xpInCurrentLevel / 1000) * 100));

  // Hearts calculation
  const attemptsLeft = user?.attempts ?? 3;
  const earnedBadgesCount = user?.earnedBadges?.length ?? 0;

  const cardsData = [
    {
      id: 'caesar',
      title: 'Caesar Shift',
      desc: 'Monoalphabetic substitution using a uniform letter shift (1–25).',
      xpInfo: '+100 XP (Easy) • +250 (Med) • +500 (Hard)',
      prog: caesarProg,
      svg: (
        <svg viewBox="0 0 100 100" className="dh-card-svg" aria-hidden="true">
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(0, 229, 255, 0.25)" strokeWidth="1.5" strokeDasharray="3 3" />
          <path d="M 32,38 A 22,22 0 1,1 68,38" fill="none" stroke="#00e5ff" strokeWidth="4" strokeLinecap="round" />
          <polyline points="62,30 68,38 76,34" fill="none" stroke="#00e5ff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 68,62 A 22,22 0 1,1 32,62" fill="none" stroke="#00e5ff" strokeWidth="4" strokeLinecap="round" />
          <polyline points="38,70 32,62 24,66" fill="none" stroke="#00e5ff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <text x="24" y="45" fill="#00e5ff" fontSize="13" fontWeight="900" fontFamily="'Space Grotesk', sans-serif">A</text>
          <text x="70" y="45" fill="#39ff14" fontSize="13" fontWeight="900" fontFamily="'Space Grotesk', sans-serif">X</text>
        </svg>
      )
    },
    {
      id: 'vigenere',
      title: 'Vigenère Matrix',
      desc: 'Polyalphabetic substitution using repeating position keywords.',
      xpInfo: '+100 XP (Easy) • +250 (Med) • +500 (Hard)',
      prog: vigenereProg,
      svg: (
        <svg viewBox="0 0 100 100" className="dh-card-svg">
          <rect x="2" y="2" width="96" height="96" rx="6" fill="rgba(3, 12, 26, 0.8)" stroke="rgba(0, 229, 255, 0.3)" strokeWidth="1" />
          <rect x="6" y="6" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
          <text x="14" y="18" textAnchor="middle" fill="#7a9bb8" fontSize="9" fontWeight="bold">A</text>
          <rect x="24" y="6" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
          <text x="32" y="18" textAnchor="middle" fill="#7a9bb8" fontSize="9" fontWeight="bold">B</text>
          <rect x="42" y="6" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
          <text x="50" y="18" textAnchor="middle" fill="#7a9bb8" fontSize="9" fontWeight="bold">C</text>
          <rect x="60" y="6" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
          <text x="68" y="18" textAnchor="middle" fill="#7a9bb8" fontSize="9" fontWeight="bold">D</text>
          <rect x="78" y="6" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
          <text x="86" y="18" textAnchor="middle" fill="#7a9bb8" fontSize="9" fontWeight="bold">E</text>

          <rect x="6" y="24" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
          <text x="14" y="36" textAnchor="middle" fill="#00e5ff" fontSize="9" fontWeight="bold">A</text>
          <rect x="24" y="24" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
          <text x="32" y="36" textAnchor="middle" fill="#00e5ff" fontSize="9" fontWeight="bold">P</text>
          <rect x="42" y="24" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
          <text x="50" y="36" textAnchor="middle" fill="#00e5ff" fontSize="9" fontWeight="bold">P</text>
          <rect x="60" y="24" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
          <text x="68" y="36" textAnchor="middle" fill="#00e5ff" fontSize="9" fontWeight="bold">L</text>
          <rect x="78" y="24" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
          <text x="86" y="36" textAnchor="middle" fill="#00e5ff" fontSize="9" fontWeight="bold">E</text>

          <rect x="6" y="42" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
          <text x="14" y="54" textAnchor="middle" fill="#7a9bb8" fontSize="9" fontWeight="bold">C</text>
          <rect x="24" y="42" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
          <text x="32" y="54" textAnchor="middle" fill="#7a9bb8" fontSize="9" fontWeight="bold">D</text>
          <rect x="42" y="42" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
          <text x="50" y="54" textAnchor="middle" fill="#7a9bb8" fontSize="9" fontWeight="bold">E</text>
          <rect x="60" y="42" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
          <text x="68" y="54" textAnchor="middle" fill="#7a9bb8" fontSize="9" fontWeight="bold">F</text>
          <rect x="78" y="42" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
          <text x="86" y="54" textAnchor="middle" fill="#7a9bb8" fontSize="9" fontWeight="bold">G</text>

          <rect x="6" y="60" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
          <text x="14" y="72" textAnchor="middle" fill="#39ff14" fontSize="9" fontWeight="bold">C</text>
          <rect x="24" y="60" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
          <text x="32" y="72" textAnchor="middle" fill="#39ff14" fontSize="9" fontWeight="bold">A</text>
          <rect x="42" y="60" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
          <text x="50" y="72" textAnchor="middle" fill="#39ff14" fontSize="9" fontWeight="bold">T</text>
          <rect x="60" y="60" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
          <text x="68" y="72" textAnchor="middle" fill="#39ff14" fontSize="9" fontWeight="bold">C</text>
          <rect x="78" y="60" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
          <text x="86" y="72" textAnchor="middle" fill="#39ff14" fontSize="9" fontWeight="bold">A</text>

          <rect x="6" y="78" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
          <text x="14" y="90" textAnchor="middle" fill="#7a9bb8" fontSize="9" fontWeight="bold">E</text>
          <rect x="24" y="78" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
          <text x="32" y="90" textAnchor="middle" fill="#7a9bb8" fontSize="9" fontWeight="bold">F</text>
          <rect x="42" y="78" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
          <text x="50" y="90" textAnchor="middle" fill="#7a9bb8" fontSize="9" fontWeight="bold">G</text>
          <rect x="60" y="78" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
          <text x="68" y="90" textAnchor="middle" fill="#7a9bb8" fontSize="9" fontWeight="bold">H</text>
          <rect x="78" y="78" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.2)" />
          <text x="86" y="90" textAnchor="middle" fill="#7a9bb8" fontSize="9" fontWeight="bold">I</text>
        </svg>
      )
    },
    {
      id: 'playfair',
      title: 'Playfair Matrix',
      desc: 'Digraph pair substitution using a 5×5 grid swap rules.',
      xpInfo: '+100 XP (Easy) • +250 (Med) • +500 (Hard)',
      prog: playfairProg,
      svg: (
        <svg viewBox="0 0 100 100" className="dh-card-svg">
          <rect x="2" y="2" width="96" height="96" rx="6" fill="rgba(3, 12, 26, 0.8)" stroke="rgba(0, 229, 255, 0.3)" strokeWidth="1" />
          <rect x="6" y="6" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
          <text x="14" y="18" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">T</text>
          <rect x="24" y="6" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
          <text x="32" y="18" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">Y</text>
          <rect x="42" y="6" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
          <text x="50" y="18" textAnchor="middle" fill="#00e5ff" fontSize="9" fontWeight="bold">P</text>
          <rect x="60" y="6" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
          <text x="68" y="18" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">J</text>
          <rect x="78" y="6" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
          <text x="86" y="18" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">K</text>

          <rect x="6" y="24" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
          <text x="14" y="36" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">C</text>
          <rect x="24" y="24" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
          <text x="32" y="36" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">D</text>
          <rect x="42" y="24" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
          <text x="50" y="36" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">E</text>
          <rect x="60" y="24" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
          <text x="68" y="36" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">F</text>
          <rect x="78" y="24" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
          <text x="86" y="36" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">G</text>

          <rect x="6" y="42" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
          <text x="14" y="54" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">Z</text>
          <rect x="24" y="42" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
          <text x="32" y="54" textAnchor="middle" fill="#39ff14" fontSize="9" fontWeight="bold">X</text>
          <rect x="42" y="42" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
          <text x="50" y="54" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">C</text>
          <rect x="60" y="42" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
          <text x="68" y="54" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">V</text>
          <rect x="78" y="42" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
          <text x="86" y="54" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">B</text>

          <rect x="6" y="60" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
          <text x="14" y="72" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">E</text>
          <rect x="24" y="60" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
          <text x="32" y="72" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">F</text>
          <rect x="42" y="60" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
          <text x="50" y="72" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">G</text>
          <rect x="60" y="60" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
          <text x="68" y="72" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">H</text>
          <rect x="78" y="60" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
          <text x="86" y="72" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">I</text>

          <rect x="6" y="78" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
          <text x="14" y="90" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">O</text>
          <rect x="24" y="78" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
          <text x="32" y="90" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">P</text>
          <rect x="42" y="78" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
          <text x="50" y="90" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">Q</text>
          <rect x="60" y="78" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
          <text x="68" y="90" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">R</text>
          <rect x="78" y="78" width="16" height="16" rx="3" fill="rgba(12, 32, 54, 0.9)" stroke="rgba(0,229,255,0.15)" />
          <text x="86" y="90" textAnchor="middle" fill="#3a5a78" fontSize="9" fontWeight="bold">S</text>

          <rect x="22" y="4" width="36" height="56" rx="4" fill="rgba(255, 230, 0, 0.08)" stroke="#d4ff00" strokeWidth="2" />
          <circle cx="22" cy="60" r="3" fill="#d4ff00" />
          <circle cx="58" cy="4" r="3" fill="#d4ff00" />
        </svg>
      )
    }
  ];

  return (
    <div className="dh-lobby">
      {/* 21:9 Ratio Background Image */}
      <img
        className="dh-lobby-bg-img"
        src="/assets/fish/lobbybg/lobbybg.png"
        alt="Lobby Background"
        aria-hidden="true"
      />

      {/* Legibility Scrim Overlay */}
      <div className="dh-lobby-scrim" />

      {/* Top Header Bar */}
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
            OPERATIVE: {user?.username ?? 'OPERATIVE'} &nbsp;•&nbsp; LEVEL {currentLevel} OPERATIVE
          </div>
        </div>

        {/* Top-Right HUD Badge */}
        <div className="dh-hud-badge">
          {user?.onCooldown ? (
            <div className="dh-hud-item cooldown" title="4-Hour Attempt Cooldown Active">
              <span className="dh-hud-icon">⏳</span>
              <span>{cooldownRemaining || 'COOLDOWN'}</span>
            </div>
          ) : (
            <div className="dh-hud-item" title="Remaining Session Hearts">
              <span className="dh-hud-icon">❤️</span>
              <span>{attemptsLeft} / 3</span>
            </div>
          )}
          <div className="dh-hud-divider" />
          <div className="dh-hud-item" title="Active Session Streak">
            <span className="dh-hud-icon">🔥</span>
            <span>{user?.streak ?? 0}</span>
          </div>
          <div className="dh-hud-divider" />
          <div className="dh-hud-item" title="Operative Level">
            <span className="dh-hud-icon">🏅</span>
            <span>Lv.{currentLevel}</span>
          </div>
          <div className="dh-hud-divider" />
          <div className="dh-hud-item" title="Accumulated XP">
            <span className="dh-hud-icon">⭐</span>
            <span>{currentXp} XP</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="dh-lobby-content">
        {/* Vertical Left Menu (Original clean text format, untouched) */}
        <nav className="dh-side-menu">
          <button className="dh-menu-item primary" onClick={handleStartQuestNav}>
            Start Quest
          </button>
          <button className="dh-menu-item" onClick={() => navigate('/dashboard/leaderboard')}>
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

        {/* Center Section: Cards */}
        <div className="dh-center-section">
          {/* Cards Row */}
          <div
            className="dh-cards-row"
            onMouseLeave={() => setActiveCardId(null)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) {
                setActiveCardId(null);
              }
            }}
          >
            {cardsData.map((card) => {
              const isExpanded = card.id === activeCardId;
              const { totalCompleted, percentage } = card.prog;

              return (
                <div
                  key={card.id}
                  role="button"
                  tabIndex={0}
                  className={`dh-quest-card ${isExpanded ? 'active' : ''}`}
                  onMouseEnter={() => setActiveCardId(card.id)}
                  onFocus={() => setActiveCardId(card.id)}
                  onClick={() => {
                    setActiveCardId(card.id);
                    navigate('/dashboard/ciphergame', { state: { category: card.id, showTutorial: true } });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActiveCardId(card.id);
                      navigate('/dashboard/ciphergame', { state: { category: card.id, showTutorial: true } });
                    }
                  }}
                >
                  <div className="dh-card-art-panel">
                    {card.svg}
                  </div>
                  <div className="dh-card-body">
                    <div className="dh-card-title-row">
                      <h3 className="dh-card-title">{card.title}</h3>
                      <span className="dh-card-progress-pill">{totalCompleted}/15</span>
                    </div>

                    {/* Sleek Mini Progress Bar */}
                    <div className="dh-card-mini-progress">
                      <div className="dh-card-mini-progress-outer">
                        <div
                          className="dh-card-mini-progress-inner"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="dh-card-mini-progress-text">{percentage}% Complete</span>
                    </div>

                    <p className="dh-card-desc">{card.desc}</p>

                    <button
                      className="dh-card-show-tutorial-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTutorialCategory(card.id);
                        setShowTutorial(true);
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>help_outline</span>
                      <span>Show Tutorial</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tutorial Modals for Dashboard in-place view */}
      {tutorialCategory === 'vigenere' ? (
        <VigenereTutorialModal
          isOpen={showTutorial}
          onClose={() => setShowTutorial(false)}
          skipButtonText="Close Tutorial"
        />
      ) : (
        <CaesarTutorialModal
          isOpen={showTutorial}
          onClose={() => setShowTutorial(false)}
          skipButtonText="Close Tutorial"
        />
      )}
    </div>
  );
};

export default DashboardHome;