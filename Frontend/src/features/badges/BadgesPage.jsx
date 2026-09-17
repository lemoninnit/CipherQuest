import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { DashboardChromeContext } from '../layout/DashboardLayout';
import { userApi } from '../../api/cipherQuestApi';
import './BadgesPage.css';

const OFFICIAL_BADGES = [
  // Caesar Cipher Category
  {
    id: 'caesar_initiate',
    title: 'Caesar Initiate',
    cipherCategory: 'Caesar Cipher',
    cipherKey: 'caesar',
    tier: 'Bronze Tier',
    image: '/assets/badges/caesar_initiate.png',
    borderColor: 'bronze',
    requirement: 'Complete 5 Caesar Easy Challenges',
    maxProgress: 5,
    unit: 'Completed',
  },
  {
    id: 'caesar_expert',
    title: 'Caesar Expert',
    cipherCategory: 'Caesar Cipher',
    cipherKey: 'caesar',
    tier: 'Silver Tier',
    image: '/assets/badges/caesar_expert.png',
    borderColor: 'silver',
    requirement: 'Complete 5 Caesar Medium Challenges',
    maxProgress: 5,
    unit: 'Completed',
  },
  {
    id: 'caesar_grandmaster',
    title: 'Caesar Grandmaster',
    cipherCategory: 'Caesar Cipher',
    cipherKey: 'caesar',
    tier: 'Gold Tier',
    image: '/assets/badges/caesar_grandmaster.png',
    borderColor: 'gold',
    requirement: 'Master all 15 Caesar Challenges',
    maxProgress: 15,
    unit: 'Mastered',
  },

  // Vigenère Cipher Category
  {
    id: 'vigenere_initiate',
    title: 'Vigenère Initiate',
    cipherCategory: 'Vigenère Cipher',
    cipherKey: 'vigenere',
    tier: 'Bronze Tier',
    image: '/assets/badges/vigenere_initiate.png',
    borderColor: 'bronze',
    requirement: 'Complete 5 Vigenère Easy Challenges',
    maxProgress: 5,
    unit: 'Completed',
  },
  {
    id: 'vigenere_expert',
    title: 'Vigenère Expert',
    cipherCategory: 'Vigenère Cipher',
    cipherKey: 'vigenere',
    tier: 'Silver Tier',
    image: '/assets/badges/vigenere_expert.png',
    borderColor: 'silver',
    requirement: 'Complete 5 Vigenère Medium Challenges',
    maxProgress: 5,
    unit: 'Completed',
  },
  {
    id: 'vigenere_grandmaster',
    title: 'Vigenère Grandmaster',
    cipherCategory: 'Vigenère Cipher',
    cipherKey: 'vigenere',
    tier: 'Gold Tier',
    image: '/assets/badges/vigenere_grandmaster.png',
    borderColor: 'gold',
    requirement: 'Master all 15 Vigenère Challenges',
    maxProgress: 15,
    unit: 'Mastered',
  },

  // Playfair Cipher Category
  {
    id: 'playfair_initiate',
    title: 'Playfair Initiate',
    cipherCategory: 'Playfair Cipher',
    cipherKey: 'playfair',
    tier: 'Bronze Tier',
    image: '/assets/badges/playfair_initiate.png',
    borderColor: 'bronze',
    requirement: 'Complete 5 Playfair Easy Challenges',
    maxProgress: 5,
    unit: 'Completed',
  },
  {
    id: 'playfair_expert',
    title: 'Playfair Expert',
    cipherCategory: 'Playfair Cipher',
    cipherKey: 'playfair',
    tier: 'Silver Tier',
    image: '/assets/badges/playfair_expert.png',
    borderColor: 'silver',
    requirement: 'Complete 5 Playfair Medium Challenges',
    maxProgress: 5,
    unit: 'Completed',
  },
  {
    id: 'playfair_grandmaster',
    title: 'Playfair Grandmaster',
    cipherCategory: 'Playfair Cipher',
    cipherKey: 'playfair',
    tier: 'Gold Tier',
    image: '/assets/badges/playfair_grandmaster.png',
    borderColor: 'gold',
    requirement: 'Master all 15 Playfair Challenges',
    maxProgress: 15,
    unit: 'Mastered',
  },

  // Other Badges (Skill & Streak)
  {
    id: 'streak_7_days',
    title: '7-Day Streak',
    cipherCategory: 'Other Badges',
    cipherKey: null,
    tier: 'Streak Award',
    image: '/assets/badges/streak_7_days.png',
    borderColor: 'flame',
    requirement: 'Maintain a 7-day continuous login streak',
    maxProgress: 7,
    unit: 'Days',
  },
  {
    id: 'streak_30_days',
    title: '30-Day Streak',
    cipherCategory: 'Other Badges',
    cipherKey: null,
    tier: 'Streak Award',
    image: '/assets/badges/streak_30_days.png',
    borderColor: 'flame-purple',
    requirement: 'Maintain a 30-day continuous login streak',
    maxProgress: 30,
    unit: 'Days',
  },
  {
    id: 'no_heart_loss',
    title: 'No Heart Loss',
    cipherCategory: 'Other Badges',
    cipherKey: null,
    tier: 'Precision Skill',
    image: '/assets/badges/no_heart_loss.png',
    borderColor: 'cyan',
    requirement: 'Clear any cipher tier with 0 hearts lost',
    maxProgress: 1,
    unit: 'Tier',
  },
  {
    id: 'hint_master',
    title: 'Hint Master',
    cipherCategory: 'Other Badges',
    cipherKey: null,
    tier: 'Intellect Skill',
    image: '/assets/badges/hint_master.png',
    borderColor: 'purple',
    requirement: 'Solve 10 challenges without using hints',
    maxProgress: 10,
    unit: 'Solved',
  },
];

export default function BadgesPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { openSettings } = useContext(DashboardChromeContext);

  const [unlockedBadgeIds, setUnlockedBadgeIds] = useState(null); // null = initial loading state
  const [loading, setLoading] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    let isMounted = true;
    userApi
      .getBadges()
      .then((res) => {
        if (isMounted) {
          const ids = Array.isArray(res)
            ? res.map((b) => (typeof b === 'string' ? b : b.id || b.badgeId))
            : res?.unlockedBadgeIds || res?.badges || [];
          setUnlockedBadgeIds(ids);
        }
      })
      .catch((err) => {
        console.warn('Backend badge fetch fallback:', err);
        if (isMounted) setUnlockedBadgeIds([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const isUnlocked = (badgeId) => {
    if (!Array.isArray(unlockedBadgeIds)) {
      return false; // Prevent initial unlock flash while loading
    }
    return unlockedBadgeIds.some(
      (id) =>
        String(id).toLowerCase().replace(/[\s_]+/g, '') ===
        String(badgeId).toLowerCase().replace(/[\s_]+/g, '')
    );
  };

  const getBadgeProgress = (badge) => {
    const unlocked = isUnlocked(badge.id);
    if (unlocked) {
      return { current: badge.maxProgress, percent: 100 };
    }

    if (badge.id === 'streak_7_days' || badge.id === 'streak_30_days') {
      const currentStreak = user?.streak ?? 1;
      const current = Math.min(badge.maxProgress, currentStreak);
      return { current, percent: Math.round((current / badge.maxProgress) * 100) };
    }

    return { current: 0, percent: 0 };
  };

  const handleBadgeClick = (badge) => {
    if (badge.cipherKey) {
      navigate('/dashboard/ciphergame', { state: { category: badge.cipherKey } });
    } else {
      navigate('/dashboard/ciphergame');
    }
  };

  const totalUnlocked = OFFICIAL_BADGES.filter((b) => isUnlocked(b.id)).length;
  const totalBadges = OFFICIAL_BADGES.length;
  const progressPercent = Math.min(100, Math.round((totalUnlocked / totalBadges) * 100));

  const handleQuit = () => {
    if (window.confirm('Are you sure you want to quit and sign out?')) {
      logout();
      navigate('/');
    }
  };

  const categories = [
    { key: 'Caesar Cipher', label: 'Caesar Cipher', subtitle: 'Substitution Cipher Mastery' },
    { key: 'Vigenère Cipher', label: 'Vigenère Cipher', subtitle: 'Polyalphabetic Keyed Cipher Mastery' },
    { key: 'Playfair Cipher', label: 'Playfair Cipher', subtitle: 'Digraph Matrix Cipher Mastery' },
    { key: 'Other Badges', label: 'Special Operative Achievements', subtitle: 'Streak & Precision Skill Awards' },
  ];

  return (
    <div className="dh-lobby bd-lobby">
      {/* 21:9 Ratio Gothic Cathedral Background Image */}
      <img
        className="dh-lobby-bg-img"
        src="/assets/fish/lobbybg/lobbybg.png"
        alt="Lobby Background"
        aria-hidden="true"
      />

      {/* Legibility Scrim Overlay */}
      <div className="dh-lobby-scrim" />

      {/* Header Bar matching Start Quest & Leaderboard */}
      <header className="dh-header-bar bd-header-bar">
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

        {/* Center Progress Bar Indicator */}
        <div className="bd-progress-hud">
          <span className="bd-progress-text">
            {totalUnlocked}/{totalBadges} unlocked
          </span>
          <div className="bd-progress-track">
            <div
              className="bd-progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Top-Right HUD Badge */}
        <div className="dh-hud-badge">
          <div className="dh-hud-item">
            <span className="dh-hud-icon">🔥</span>
            <span>{user?.streak ?? 1}</span>
          </div>
          <div className="dh-hud-divider" />
          <div className="dh-hud-item">
            <span className="dh-hud-icon">🏅</span>
            <span>Lv.{user?.level ?? 1}</span>
          </div>
          <div className="dh-hud-divider" />
          <div className="dh-hud-item">
            <span className="dh-hud-icon">⭐</span>
            <span>{user?.xp ?? 700} XP</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="bd-content-layout">
        {/* Vertical Left Menu */}
        <nav className="dh-side-menu bd-side-menu">
          <button className="dh-menu-item" onClick={() => navigate('/dashboard/ciphergame')}>
            Start Quest
          </button>
          <button className="dh-menu-item" onClick={() => navigate('/dashboard/leaderboard')}>
            Leaderboards
          </button>
          <button className="dh-menu-item primary" onClick={() => {}}>
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

        {/* Center Section: AAA Badges Hero Gallery */}
        <div className="bd-center-section scrollbar-hide">
          {categories.map((cat) => {
            const catBadges = OFFICIAL_BADGES.filter((b) => b.cipherCategory === cat.key);
            if (catBadges.length === 0) return null;
            const catUnlocked = catBadges.filter((b) => isUnlocked(b.id)).length;

            return (
              <section key={cat.key} className="bd-section-block">
                {/* AAA Section Header */}
                <div className="bd-section-header">
                  <div className="bd-section-title-wrap">
                    <h3 className="bd-section-title">{cat.label}</h3>
                    <span className="bd-section-count">
                      {catUnlocked}/{catBadges.length} Mastered
                    </span>
                  </div>
                  <div className="bd-section-subtitle">{cat.subtitle}</div>
                  <div className="bd-section-divider" />
                </div>

                {/* Centered Badges Grid */}
                <div className="bd-badges-centered-grid">
                  {catBadges.map((badge) => {
                    const unlocked = isUnlocked(badge.id);
                    const progress = getBadgeProgress(badge);

                    return (
                      <div
                        key={badge.id}
                        className={`bd-badge-card border-${badge.borderColor} ${
                          unlocked ? 'unlocked' : 'locked'
                        }`}
                        onClick={() => handleBadgeClick(badge)}
                        title={`Click to launch ${badge.title} challenges`}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && handleBadgeClick(badge)}
                      >
                        {/* Status Tag Header */}
                        <div className="bd-card-status-header">
                          <span className={`bd-tier-tag tag-${badge.borderColor}`}>
                            {badge.tier}
                          </span>
                          <span className={`bd-status-pill ${unlocked ? 'unlocked' : 'locked'}`}>
                            {unlocked ? 'UNLOCKED' : 'LOCKED'}
                          </span>
                        </div>

                        {/* Emblem Artwork Container */}
                        <div className="bd-badge-inner">
                          <div className="bd-badge-img-wrapper">
                            <div className={`bd-ambient-glow glow-${badge.borderColor}`} />
                            <img
                              src={badge.image}
                              alt={badge.title}
                              className="bd-badge-img"
                            />
                            {!unlocked && (
                              <div className="bd-lock-badge">
                                <span className="material-symbols-outlined">lock</span>
                              </div>
                            )}
                          </div>

                          <div className="bd-badge-info">
                            <h4 className="bd-badge-title">{badge.title}</h4>
                            <p className="bd-badge-desc">{badge.requirement}</p>
                          </div>
                        </div>

                        {/* Minimal Micro Progress Bar & Click Prompt */}
                        <div className="bd-card-footer">
                          <div className="bd-card-progress-info">
                            <span className="bd-progress-label">
                              {unlocked ? 'COMPLETED' : 'PROGRESS'}
                            </span>
                            <span className="bd-progress-val">
                              {progress.current}/{badge.maxProgress} {badge.unit}
                            </span>
                          </div>
                          <div className="bd-card-progress-track">
                            <div
                              className={`bd-card-progress-fill fill-${badge.borderColor}`}
                              style={{ width: `${progress.percent}%` }}
                            />
                          </div>
                          <div className="bd-click-prompt">
                            <span>Launch Game</span>
                            <span className="material-symbols-outlined prompt-icon">arrow_forward</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {/* Tutorial Overlay Modal */}
      {showTutorial && (
        <div className="modal-overlay" onClick={() => setShowTutorial(false)}>
          <div className="modal-card glass-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Operative Badges Guide</h3>
            <p className="modal-desc">
              Earn cipher mastery badges by clearing challenge tiers (Initiate, Expert, Grandmaster) for Caesar, Vigenère, and Playfair ciphers. Maintain daily streaks and clear stages without losing hearts to unlock special skill badges.
            </p>
            <button className="btn-modal-close" onClick={() => setShowTutorial(false)}>
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
