import React from 'react';

export default function FullscreenButton({ isFullscreen, onToggle, className = '' }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`fg-fullscreen-btn ${className}`}
      aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Enter fullscreen (F)'}
    >
      {isFullscreen ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3v4a1 1 0 0 1-1 1H3" />
          <path d="M21 8h-4a1 1 0 0 1-1-1V3" />
          <path d="M3 16h4a1 1 0 0 1 1 1v4" />
          <path d="M16 21v-4a1 1 0 0 1 1-1h4" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7V3h4" />
          <path d="M21 7V3h-4" />
          <path d="M3 17v4h4" />
          <path d="M21 17v4h-4" />
        </svg>
      )}
      <span className="fg-fullscreen-label">
        {isFullscreen ? 'Exit FS' : 'Fullscreen'}
      </span>
    </button>
  );
}
