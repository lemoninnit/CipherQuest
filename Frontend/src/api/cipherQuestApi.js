// Allow overriding the backend base URL via Vite env `VITE_API_BASE`.
// In production, fallback to the live Render backend URL if not explicitly configured.
const PROD_API_URL = 'https://cipherquest-oddy.onrender.com/api';
const BASE_URL = (import.meta.env && import.meta.env.VITE_API_BASE)
  || (typeof window !== 'undefined' && window.__API_BASE__)
  || (import.meta.env && import.meta.env.DEV ? '/api' : PROD_API_URL);

const getToken = () => localStorage.getItem('cq_token');

const headers = () => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
});

async function request(method, path, body) {
  // Small fetch wrapper with network error handling and clearer messages.
  const url = `${BASE_URL}${path}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout for backend cold starts

    const res = await fetch(url, {
      method,
      headers: headers(),
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
    clearTimeout(timeout);

    // attempt to parse JSON safely
    const text = await res.text().catch(() => '');
    const data = text ? JSON.parse(text) : {};

    if (!res.ok) {
      // Bean-validation failures come back as a { field: message } map rather
      // than the usual { message } envelope, so fall back to the first field
      // error instead of showing a bare "HTTP 400".
      const msg = data && data.message
        ? data.message
        : (data && typeof data === 'object' && !Array.isArray(data)
            ? Object.values(data).find((v) => typeof v === 'string')
            : null)
          || `HTTP ${res.status}`;
      // Attach the status so callers can react to specific outcomes that the
      // message alone cannot convey (e.g. 409 = session-heart lockout).
      const error = new Error(msg);
      error.status = res.status;
      throw error;
    }
    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Network timeout: backend did not respond', { cause: err });
    }
    // map typical network failure into a friendlier message, keeping the HTTP
    // status (if any) so callers can still branch on 409 / 404 / etc.
    const error = new Error(err.message || 'Network error: could not reach backend', { cause: err });
    if (err.status != null) error.status = err.status;
    throw error;
  }
}

// Minimum length enforced by the backend (@Size(min = 6) on every cipher
// DTO). Kept here so the meter and the server cannot disagree about what
// counts as long enough.
export const MIN_CIPHER_LENGTH = 6;

/**
 * Rates an Access Cipher from 0–4 and lists which rules it still fails.
 *
 * Guidance only — the server enforces length, never composition, so this must
 * not block submission. "Add a number" is a nudge, not a gate, and telling a
 * player their cipher failed a rule the server never checks would be a lie.
 */
export function assessCipher(value) {
  const cipher = value ?? '';
  const rules = [
    { id: 'length',   label: `At least ${MIN_CIPHER_LENGTH} characters`, met: cipher.length >= MIN_CIPHER_LENGTH },
    { id: 'letter',   label: 'Contains a letter',                      met: /[a-z]/i.test(cipher) },
    { id: 'number',   label: 'Contains a number',                       met: /\d/.test(cipher) },
    { id: 'symbol',   label: 'Contains a symbol',                       met: /[^A-Za-z0-9]/.test(cipher) },
  ];

  const met = rules.filter((rule) => rule.met).length;

  // Only score once the cipher is long enough to be worth scoring, so the bar
  // does not sit at "Weak" for an empty field and look like a red warning.
  if (cipher.length === 0) return { score: 0, label: '', rules, met };

  const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
  return { score: met, label: labels[met], rules, met };
}

export const authApi = {
  // confirmPassword is required by the server: without it a mistyped Access
  // Cipher would create an account the operative can never log back into.
  register: (username, email, password, confirmPassword) =>
    request('POST', '/auth/register', { username, email, password, confirmPassword }),
  login: (username, password) =>
    request('POST', '/auth/login', { username, password }),
  resetPassword: (username, email, newPassword, confirmPassword) =>
    request('POST', '/auth/reset-password', { username, email, newPassword, confirmPassword }),
  // Signed-in variant. The server re-verifies `currentPassword` even though the
  // JWT is valid, so a borrowed session cannot rotate the credential.
  changePassword: (currentPassword, newPassword, confirmPassword) =>
    request('PUT', '/users/me/password', { currentPassword, newPassword, confirmPassword }),
};

export const userApi = {
  getMyProfile:   ()                      => request('GET',    '/users/me'),
  deleteAccount:  ()                      => request('DELETE', '/users/me'),
  // DAY 2 additions
  getProgress:    ()                      => request('GET',    '/users/progress'),
  saveProgress:   (cipherType, difficultyTier, levelIndex) =>
    request('POST', '/users/progress', { cipherType, difficultyTier, levelIndex }),
  deductAttempt:  ()                      => request('POST', '/users/attempts/deduct'),
  getBadges:      ()                      => request('GET',    '/users/badges'),
  // Tutorial preferences ("Don't show this again" per cipher category).
  // Both endpoints return { "caesar": bool, "vigenere": bool, "playfair": bool }.
  getTutorialPreferences:  ()             => request('GET',  '/users/preferences/tutorial'),
  saveTutorialPreference: (cipherType, dismissed) =>
    request('POST', '/users/preferences/tutorial', { cipherType, dismissed }),
};

export const fishingApi = {
  startSession:   ()               => request('POST', '/fishing/start'),
  cast:           (sessionId)      => request('POST', `/fishing/${sessionId}/cast`),
  submitAnswer:   (sessionId, ans) => request('POST', `/fishing/${sessionId}/submit`, { answer: ans }),
  endSession:     (sessionId)      => request('POST', `/fishing/${sessionId}/end`),
  getSummary:     (sessionId)      => request('GET',  `/fishing/${sessionId}/summary`),
  getLeaderboard: ()               => request('GET',  '/fishing/leaderboard'),
};

export const leaderboardApi = {
  getGlobalLeaderboard: (scope = 'overall') =>
    request('GET', `/leaderboard?scope=${encodeURIComponent(scope)}`),
};

// ── SCORING SYSTEM (server-authoritative) ────────────────────────────
// The client never submits score, streak, multiplier, or completion time.
// The backend computes and validates everything from its own session data.
export const scoringApi = {
  // Begin a stage attempt; returns { sessionId, startedAt, ... }
  startStage: (cipherType, difficultyTier, levelIndex) =>
    request('POST', '/scoring/start', { cipherType, difficultyTier, levelIndex }),
  // Complete successfully; returns score, streak, multiplier, time, total, bests
  completeStage: (sessionId) =>
    request('POST', `/scoring/complete/${sessionId}`),
  // Register a failure; resets the streak, keeps the total score
  failStage: (sessionId) =>
    request('POST', `/scoring/fail/${sessionId}`),
  // Per-stage leaderboard: category = 'score' | 'time'
  getStageLeaderboard: (cipherType, difficultyTier, levelIndex, category = 'score') =>
    request('GET', `/scoring/leaderboard?cipherType=${encodeURIComponent(cipherType)}`
      + `&difficultyTier=${encodeURIComponent(difficultyTier)}&levelIndex=${levelIndex}`
      + `&category=${encodeURIComponent(category)}`),
};

export const saveToken  = (token) => localStorage.setItem('cq_token', token);
export const clearToken = ()      => localStorage.removeItem('cq_token');
export const isLoggedIn = ()      => !!getToken();