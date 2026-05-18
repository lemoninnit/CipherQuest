import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoadingScreen.css';

const LoadingScreen = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => navigate('/dashboard'), 500);
          return 100;
        }
        return prev + 2;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <div className="loading-screen">
      <div className="fixed-full cipher-grid z-0"></div>
      <div className="fixed-full loading-bg-elements z-0 pointer-events-none select-none">
        <div className="bg-text bg-text-1">01010111 01001111 01010010 01001100 01000100</div>
        <div className="bg-text bg-text-2">Æ Ω λ π</div>
        <div className="bg-text bg-text-3">DECRYPT_KEY_402</div>
        <div className="bg-text bg-text-4">ENCRYPTION_LAYER_ACTIVE</div>
        <div className="bg-text bg-text-5">10110</div>
      </div>
      
      <main className="loading-main z-10">
        <div className="loading-header">
          <h1 className="glow-text tracking-tighter text-primary">CipherQuest</h1>
          <div className="loading-divider"></div>
        </div>

        <div className="loading-progress-container">
          <div className="progress-text-row">
            <span className="progress-label">Initializing Cipher Engine...</span>
            <span className="progress-percent">{progress}%</span>
          </div>
          <div className="progress-bar-track">
            <div 
              className="progress-bar-fill transition-all"
              style={{ width: `${progress}%`, boxShadow: '0 0 15px rgba(0, 209, 255, 0.4)' }}
            >
              <div className="shimmer-effect absolute-full bg-white-20 skew-x"></div>
            </div>
          </div>
        </div>
      </main>

      <footer className="loading-footer z-10">
        <div className="footer-badges">
          <span className="badge">XJ4A-92</span>
          <span className="material-symbols-outlined text-primary scale-75 fill-1">security</span>
          <span className="badge">ROT13 READY</span>
        </div>
        <p className="footer-status text-on-surface-variant-40">
          Secure Connection Established
        </p>
      </footer>
    </div>
  );
};

export default LoadingScreen;