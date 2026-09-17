import React, { useEffect, useRef } from 'react';
import './PauseMenu.css';

export default function PauseMenu({ open, onResume, onTutorial, onExit }) {
  const resumeBtnRef = useRef(null);
  const tutorialBtnRef = useRef(null);
  const exitBtnRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement;
      // Move focus into modal upon opening
      const focusTimer = setTimeout(() => {
        resumeBtnRef.current?.focus();
      }, 30);
      return () => clearTimeout(focusTimer);
    } else if (previousFocusRef.current) {
      // Return focus to Menu button or previous element upon closing
      const menuBtn = document.querySelector('.fg-header-left .fg-btn-back-nav');
      if (menuBtn && typeof menuBtn.focus === 'function') {
        menuBtn.focus();
      } else if (typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
      previousFocusRef.current = null;
    }
  }, [open]);

  if (!open) return null;

  const handleKeyDown = (e) => {
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
      onResume?.();
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onResume?.();
    }
  };

  return (
    <div
      className="cq-pause-overlay caesar-pause-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cq-pause-title"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
      <div className="cq-pause-card caesar-pause-card">
        <h2 id="cq-pause-title" className="cq-pause-title caesar-pause-title">
          PAUSED
        </h2>
        <button
          ref={resumeBtnRef}
          type="button"
          className="cq-pause-btn cq-pause-btn-resume caesar-pause-btn caesar-pause-btn-resume"
          onClick={onResume}
        >
          <span className="material-symbols-outlined">play_arrow</span>
          <span>Resume</span>
        </button>
        <button
          ref={tutorialBtnRef}
          type="button"
          className="cq-pause-btn cq-pause-btn-tutorial caesar-pause-btn caesar-pause-btn-tutorial"
          onClick={onTutorial}
        >
          <span className="material-symbols-outlined">menu_book</span>
          <span>Tutorial</span>
        </button>
        <button
          ref={exitBtnRef}
          type="button"
          className="cq-pause-btn cq-pause-btn-exit caesar-pause-btn caesar-pause-btn-exit"
          onClick={onExit}
        >
          <span className="material-symbols-outlined">logout</span>
          <span>Exit Stage</span>
        </button>
      </div>
    </div>
  );
}
