const BASE_URL = 'http://localhost:8080/api';

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
  register: (username, email, password) =>
    request('POST', '/auth/register', { username, email, password }),
  login: (username, password) =>
    request('POST', '/auth/login', { username, password }),
  resetPassword: (username, email, newPassword) =>
    request('POST', '/auth/reset-password', { username, email, newPassword }),
};

export const userApi = {
  getMyProfile: () => request('GET', '/users/me'),
  deleteAccount: () => request('DELETE', '/users/me'),
};

export const fishingApi = {
  startSession:  ()               => request('POST', '/fishing/start'),
  cast:          (sessionId)      => request('POST', `/fishing/${sessionId}/cast`),
  submitAnswer:  (sessionId, ans) => request('POST', `/fishing/${sessionId}/submit`, { answer: ans }),
  endSession:    (sessionId)      => request('POST', `/fishing/${sessionId}/end`),
  getSummary:    (sessionId)      => request('GET',  `/fishing/${sessionId}/summary`),
  getLeaderboard: ()              => request('GET',  '/fishing/leaderboard'),
};

export const saveToken  = (token) => localStorage.setItem('cq_token', token);
export const clearToken = ()      => localStorage.removeItem('cq_token');
export const isLoggedIn = ()      => !!getToken();
