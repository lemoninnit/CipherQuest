import React, { useEffect, useRef, useState } from 'react';
import './PauseMenu.css';
import GameTutorialModal from './GameTutorialModal';

export default function PauseMenu({
  open,
  onResume,
  onTutorial,
  onExit,
  cipherType = 'caesar',
  gameType = 'fishing',
}) {
  const [showTutorial, setShowTutorial] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const resumeBtnRef = useRef(null);
  const tutorialBtnRef = useRef(null);
  const exitBtnRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (open) {
      setShowTutorial(false);
      setIsClosing(false);
      previousFocusRef.current = document.activeElement;
      // Move focus into modal upon opening
      const focusTimer = setTimeout(() => {
        resumeBtnRef.current?.focus();
      }, 30);
      return () => clearTimeout(focusTimer);
    } else {
      setShowTutorial(false);
      setIsClosing(false);
      if (previousFocusRef.current) {
        // Return focus to Menu button or previous element upon closing
        const menuBtn = document.querySelector('.fg-header-left .fg-btn-back-nav');
        if (menuBtn && typeof menuBtn.focus === 'function') {
          menuBtn.focus();
        } else if (typeof previousFocusRef.current.focus === 'function') {
          previousFocusRef.current.focus();
        }
        previousFocusRef.current = null;
      }
    }
  }, [open]);

  if (!open) return null;

  const handleCloseAction = (actionCallback) => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      actionCallback?.();
    }, 200);
  };

  const handleKeyDown = (e) => {
    if (showTutorial || isClosing) return;
    if (e.key === 'Tab') {
      const focusable = [resumeBtnRef.current, tutorialBtnRef.current, exitBtnRef.current].filter(Boolean);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      handleCloseAction(onResume);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isClosing) {
      handleCloseAction(onResume);
    }
  };

  const handleTutorialClick = () => {
    if (isClosing) return;
    setShowTutorial(true);
  };

  return (
    <>
      {showTutorial ? (
        <GameTutorialModal
          cipherType={cipherType}
          gameType={gameType}
          onClose={() => setShowTutorial(false)}
        />
      ) : (
        <div
          className={`cq-pause-overlay caesar-pause-overlay ${isClosing ? 'is-closing' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cq-pause-title"
          onClick={handleBackdropClick}
          onKeyDown={handleKeyDown}
        >
          <div className={`cq-pause-card caesar-pause-card ${isClosing ? 'is-closing' : ''}`}>
            <h2 id="cq-pause-title" className="cq-pause-title caesar-pause-title">
              PAUSED
            </h2>
            <button
              ref={resumeBtnRef}
              type="button"
              className="cq-pause-btn cq-pause-btn-resume caesar-pause-btn caesar-pause-btn-resume"
              onClick={() => handleCloseAction(onResume)}
            >
              <span className="material-symbols-outlined">play_arrow</span>
              <span>Resume</span>
            </button>
            <button
              ref={tutorialBtnRef}
              type="button"
              className="cq-pause-btn cq-pause-btn-tutorial caesar-pause-btn caesar-pause-btn-tutorial"
              onClick={handleTutorialClick}
            >
              <span className="material-symbols-outlined">menu_book</span>
              <span>Tutorial</span>
            </button>
            <button
              ref={exitBtnRef}
              type="button"
              className="cq-pause-btn cq-pause-btn-exit caesar-pause-btn caesar-pause-btn-exit"
              onClick={() => handleCloseAction(onExit)}
            >
              <span className="material-symbols-outlined">logout</span>
              <span>Exit Stage</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

