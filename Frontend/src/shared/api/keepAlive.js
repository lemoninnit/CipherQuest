/**
 * keepAlive.js – prevents the Render free-tier backend from spinning down.
 *
 * Render's free plan shuts an instance down after ~15 minutes of inactivity.
 * This module pings /api/health every PING_INTERVAL_MS so the container stays
 * warm for users who open the app after a period of inactivity.
 *
 * Usage: call startKeepAlive() once when the app mounts (e.g. in main.jsx).
 *        Call stopKeepAlive() to cancel it (e.g. in tests or on unmount).
 */

const PROD_API_URL = 'https://cipherquest-oddy.onrender.com/api';
const PING_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

// Derive the base URL the same way as cipherQuestApi so the ping always
// targets the right environment.
const BASE_URL =
  (import.meta.env && import.meta.env.VITE_API_BASE) ||
  (typeof window !== 'undefined' && window.__API_BASE__) ||
  (import.meta.env && import.meta.env.DEV ? '/api' : PROD_API_URL);

let _intervalId = null;

async function pingBackend() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000); // 5 s timeout
    await fetch(`${BASE_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
      // skip auth – /api/health is public
    });
    clearTimeout(timer);
  } catch {
    // Silently ignore – this is a best-effort keep-alive, not a critical path.
  }
}

/**
 * Start the keep-alive interval.
 * Safe to call multiple times – only one interval will ever run.
 */
export function startKeepAlive() {
  // Only needed in production (free-tier Render). Skip in dev to reduce noise.
  if (import.meta.env && import.meta.env.DEV) return;
  if (_intervalId !== null) return; // already running

  // Ping immediately on start so the backend is warm from the first page load.
  pingBackend();
  _intervalId = setInterval(pingBackend, PING_INTERVAL_MS);
}

/**
 * Stop the keep-alive interval (useful for testing).
 */
export function stopKeepAlive() {
  if (_intervalId !== null) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
}
