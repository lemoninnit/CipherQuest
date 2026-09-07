import { useState, useCallback, useEffect, useRef } from 'react';

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCssFallback, setIsCssFallback] = useState(false);
  const containerRef = useRef(null);

  const isFsSupported =
    typeof document !== 'undefined' &&
    (document.fullscreenEnabled ||
      document.webkitFullscreenEnabled ||
      document.msFullscreenEnabled);

  const enterFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;

    if (isFsSupported) {
      try {
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          el.webkitRequestFullscreen();
        } else if (el.msRequestFullscreen) {
          el.msRequestFullscreen();
        }
        setIsFullscreen(true);
        setIsCssFallback(false);
        return;
      } catch (err) {
        // Fall through to CSS fallback
      }
    }

    // CSS fallback
    setIsCssFallback(true);
    setIsFullscreen(true);
    if (el && el.classList) el.classList.add('is-css-fullscreen');
  }, [isFsSupported]);

  const exitFullscreen = useCallback(async () => {
    if (isCssFallback) {
      const el = containerRef.current;
      if (el && el.classList) el.classList.remove('is-css-fullscreen');
      setIsCssFallback(false);
      setIsFullscreen(false);
      return;
    }

    if (document.exitFullscreen) {
      try { await document.exitFullscreen(); } catch (_) {}
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
    setIsFullscreen(false);
  }, [isCssFallback]);

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) exitFullscreen();
    else enterFullscreen();
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  useEffect(() => {
    const onChange = () => {
      const fsEl =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement;
      const on = !!fsEl || isCssFallback;
      setIsFullscreen(on);
      if (!fsEl && !isCssFallback) {
        const el = containerRef.current;
        if (el && el.classList) el.classList.remove('is-css-fullscreen');
      }
    };

    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    document.addEventListener('msfullscreenchange', onChange);
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
      document.removeEventListener('msfullscreenchange', onChange);
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCssFallback]);

  const onKey = useCallback((e) => {
    if (e.key === 'Escape' && isCssFallback && isFullscreen) {
      exitFullscreen();
    }
  }, [isCssFallback, isFullscreen, exitFullscreen]);

  return {
    containerRef,
    isFullscreen,
    isCssFallback,
    toggleFullscreen,
    enterFullscreen,
    exitFullscreen,
  };
}
