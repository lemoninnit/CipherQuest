const BASE_URL = (import.meta.env && import.meta.env.VITE_API_BASE) || (window && window.__API_BASE__) || (window && window.location.origin + '/api');

const getToken = () => localStorage.getItem('cq_token');

const headers = () => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
});

async function request(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
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
};

export const fishingApi = {
  startSession:   ()               => request('POST', '/fishing/start'),
  cast:           (sessionId)      => request('POST', `/fishing/${sessionId}/cast`),
  submitAnswer:   (sessionId, ans) => request('POST', `/fishing/${sessionId}/submit`, { answer: ans }),
  endSession:     (sessionId)      => request('POST', `/fishing/${sessionId}/end`),
  getSummary:     (sessionId)      => request('GET',  `/fishing/${sessionId}/summary`),
  getLeaderboard: ()               => request('GET',  '/fishing/leaderboard'),
};

export const saveToken  = (token) => localStorage.setItem('cq_token', token);
export const clearToken = ()      => localStorage.removeItem('cq_token');
export const isLoggedIn = ()      => !!getToken();