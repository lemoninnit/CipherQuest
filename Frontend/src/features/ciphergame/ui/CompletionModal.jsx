import React, { useState, useEffect } from 'react';
import './CompletionModal.css';

export default function CompletionModal({ modalData, onContinueNext, onMainMenu }) {
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    if (modalData?.badgeImage) {
      setImgLoaded(false);
      const img = new Image();
      img.src = modalData.badgeImage;
      img.onload = () => setImgLoaded(true);
      img.onerror = () => setImgLoaded(true);
    }
  }, [modalData?.badgeImage]);

  if (!modalData) return null;

  const {
    type, // 'tier' or 'grandmaster'
    badgeTitle,
    badgeImage,
    tierName,
    cipherName,
    nextDifficulty,
    xpAwarded = 250,
  } = modalData;

  const isGrandmaster = type === 'grandmaster';

  return (
    <div className="cq-completion-overlay">
      <div className={`cq-completion-card ${isGrandmaster ? 'grandmaster-glow' : 'tier-glow'}`}>
        {/* Top Header Banner */}
        <div className="cq-completion-header">
          <div className="cq-header-pill">
            <span className="material-symbols-outlined star-icon">stars</span>
            {isGrandmaster ? 'CIPHER MODE MASTERED!' : 'DIFFICULTY TIER COMPLETED!'}
          </div>
          <h2 className="cq-completion-title">
            {isGrandmaster ? 'CONGRATULATIONS, OPERATIVE!' : 'EXCELLENT PERFORMANCE!'}
          </h2>
        </div>

        {/* Badge Award Display */}
        <div className="cq-badge-award-section">
          <div className="cq-badge-halo">
            <div className="cq-ambient-light" />
            <img
              src={badgeImage}
              alt={badgeTitle}
              className={`cq-badge-award-img ${imgLoaded ? 'cq-badge-loaded' : 'cq-badge-loading'}`}
              onLoad={() => setImgLoaded(true)}
            />
          </div>

          <div className="cq-badge-text-wrap">
            <span className="cq-badge-unlocked-tag">NEW BADGE UNLOCKED</span>
            <h3 className="cq-badge-award-title">{badgeTitle}</h3>
            <p className="cq-badge-award-desc">
              {isGrandmaster
                ? `You have cleared all 15 stages across Easy, Medium, and Hard tiers of the ${cipherName} Cipher with 100% mastery!`
                : `You have completed all 5 stages of the ${cipherName} ${tierName} Tier.`}
            </p>
            <div className="cq-xp-reward">
              <span className="material-symbols-outlined">stars</span>
              <span>+{xpAwarded} XP Awarded</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="cq-completion-actions">
          <button className="cq-btn-secondary" onClick={onMainMenu}>
            <span className="material-symbols-outlined">grid_view</span>
            <span>Main Menu (Sidequest)</span>
          </button>

          {!isGrandmaster && nextDifficulty && (
            <button className="cq-btn-primary" onClick={onContinueNext}>
              <span>Continue to {nextDifficulty.toUpperCase()}</span>
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
