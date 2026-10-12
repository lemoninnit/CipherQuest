import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { userApi, saveToken, clearToken, isLoggedIn } from '../api/cipherQuestApi';

const AuthContext = createContext(null);

/**
 * How often the background poll re-fetches the user profile.
 *
 * 60 s is short enough that a cooldown expiry is noticed quickly (the 3-minute
 * window refills within one polling period after it elapses) and long enough
 * that it doesn't flood the Render free-tier container with traffic.
 *
 * Exported so any component that needs to know the rhythm can import this
 * constant instead of hard-coding its own magic number.
 */
export const PROFILE_POLL_MS = 60_000;

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true); // true while checking token on mount
  const pollRef               = useRef(null);

  // ── helpers ──────────────────────────────────────────────────────────────

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  /**
   * Start (or restart) the background polling loop.
   * Safe to call multiple times — always clears the old interval first so
   * there is never more than one concurrent poll running.
   */
  const startPoll = useCallback(() => {
    stopPoll();
    pollRef.current = setInterval(async () => {
      if (!isLoggedIn()) {
        stopPoll();
        return;
      }
      try {
        const data = await userApi.getMyProfile();
        setUser(data);
      } catch {
        // Silently swallow — backend may be waking up (Render cold start).
        // The existing stale profile stays in state; the user is not logged out.
      }
    }, PROFILE_POLL_MS);
  }, [stopPoll]);

  // ── initial load ─────────────────────────────────────────────────────────

  // On app load, if a token exists, fetch the profile
  useEffect(() => {
    if (isLoggedIn()) {
      userApi.getMyProfile()
        .then((data) => { setUser(data); startPoll(); })
        .catch(() => { clearToken(); setUser(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
    return stopPoll; // clean up on unmount
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── public API ───────────────────────────────────────────────────────────

  const login = (token, userData) => {
    try {
      localStorage.removeItem('cipher_progress_v2');
      localStorage.removeItem('cq_completed_levels');
      localStorage.removeItem('cq_user_progress');
      localStorage.removeItem('cq_offline_profile');
      sessionStorage.clear();
    } catch (_e) {}
    saveToken(token);
    setUser(userData);
    startPoll(); // begin keeping the profile fresh after login
  };

  const logout = () => {
    stopPoll(); // stop polling before clearing state
    clearToken();
    setUser(null);
    try {
      localStorage.removeItem('cipher_progress_v2');
      localStorage.removeItem('cq_completed_levels');
      localStorage.removeItem('cq_user_progress');
      localStorage.removeItem('cq_offline_profile');
      sessionStorage.clear();
    } catch (_e) {}
  };

  const refreshProfile = useCallback(async () => {
    try {
      const data = await userApi.getMyProfile();
      setUser(data);
      return data;
    } catch (err) {
      console.error("Failed to refresh user profile:", err);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);