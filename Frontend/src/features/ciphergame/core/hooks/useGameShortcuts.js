import { useEffect } from 'react';

/**
 * Hook to handle global game shortcut keys:
 *  - 'f' / 'F': toggle fullscreen
 *  - 'm' / 'M': toggle sound (mute / unmute)
 *
 * Ignores keystrokes when focus is inside text inputs, textareas, selects, or editable elements,
 * or when modifier keys (Ctrl, Alt, Meta) are held.
 */
export function useGameShortcuts({ onToggleFullscreen, onToggleMute, disabled = false }) {
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e) => {
      const activeEl = document.activeElement;
      const tagName = activeEl?.tagName?.toLowerCase();
      if (
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select' ||
        activeEl?.isContentEditable
      ) {
        return;
      }

      if (e.ctrlKey || e.altKey || e.metaKey) {
        return;
      }

      const key = e.key ? e.key.toLowerCase() : '';
      if (key === 'f') {
        e.preventDefault();
        onToggleFullscreen?.();
      } else if (key === 'm') {
        e.preventDefault();
        onToggleMute?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onToggleFullscreen, onToggleMute, disabled]);
}
