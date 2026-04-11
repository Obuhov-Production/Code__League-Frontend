/**
 * Auth API utility — talks to backend via Vite proxy /api → http://localhost:3001
 */

const API_PROXY_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const DIRECT_BACKEND_BASE = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');
const BASE = API_PROXY_BASE;
export const API_BASE = BASE.startsWith('http') ? BASE : DIRECT_BACKEND_BASE;

/**
 * VITE_CHECK_BACKEND=false → dev-режим без бекенду.
 * login/register/dashboard працюють з мок-даними.
 */
export const CHECK_BACKEND = import.meta.env.VITE_CHECK_BACKEND !== 'false';

/** Мок-юзер для dev-режиму (VITE_CHECK_BACKEND=false) */
export const DEV_MOCK_USER = {
  id: 0,
  username: 'dev_user',
  email: 'dev@localhost',
  role: 'admin',
  user_avatar_url: null,
  user_banner_url: null,
  bio: 'Dev mock user — backend is disabled',
};

export const OAUTH_URLS = {
  google: `${API_BASE}/auth/google`,
  discord: `${API_BASE}/auth/discord`,
};

/** Build auth headers */
function authHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

/* ── Auth ───────────────────────────────────────── */

export async function loginUser({ email, password }) {
  return request(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

export async function registerUser({ email, password }) {
  const username = email.split('@')[0];
  return request(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
}

export async function getMe() {
  return request(`${BASE}/auth/me`, { headers: authHeaders() });
}

export function saveSession(token) { localStorage.setItem('cl_token', token); }
export function clearSession()     { localStorage.removeItem('cl_token'); }
export function getToken()         { return localStorage.getItem('cl_token'); }
export function isLoggedIn()       { return !!getToken(); }

/* ── Tournaments ─────────────────────────────────── */

export async function getTournaments(status = null) {
  if (!CHECK_BACKEND) return [];
  const url = status ? `${BASE}/tournaments?status=${status}` : `${BASE}/tournaments`;
  return request(url);
}

export async function getTournament(id) {
  return request(`${BASE}/tournaments/${id}`);
}

export async function createTournament(data) {
  return request(`${BASE}/tournaments`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
}

export async function updateTournament(id, data) {
  return request(`${BASE}/tournaments/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
}

export async function updateTournamentStatus(id, status) {
  return request(`${BASE}/tournaments/${id}/status`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });
}

export async function deleteTournament(id) {
  return request(`${BASE}/tournaments/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
}

export async function getLeaderboard(tournamentId) {
  return request(`${BASE}/tournaments/${tournamentId}/leaderboard`);
}

export async function createAnnouncement(tournamentId, title, message) {
  return request(`${BASE}/tournaments/${tournamentId}/announcements`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ title, message }),
  });
}

/* ── Teams ───────────────────────────────────────── */

export async function getMyTeams() {
  if (!CHECK_BACKEND) return [];
  return request(`${BASE}/teams/my`, { headers: authHeaders() });
}

export async function getTournamentTeams(tournamentId) {
  return request(`${BASE}/teams/tournament/${tournamentId}`);
}

export async function registerTeam(data) {
  return request(`${BASE}/teams`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
}

export async function deleteTeam(teamId) {
  return request(`${BASE}/teams/${teamId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
}

/* ── Profile ──────────────────────────────────────── */

export async function updateMe(data) {
  const token = getToken();
  return request(`${BASE}/users/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

export async function uploadAvatar(file) {
  const token = getToken();
  const fd = new FormData();
  fd.append('avatar', file);
  const res = await fetch(`${BASE}/users/me/avatar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data;
}

export async function uploadBanner(file) {
  const token = getToken();
  const fd = new FormData();
  fd.append('banner', file);
  const res = await fetch(`${BASE}/users/me/banner`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data;
}

export async function getChatHistory(room) {
  if (!CHECK_BACKEND) return [];
  return request(`${BASE}/chat/${room}`, { headers: authHeaders() });
}

export async function searchUsers(query) {
  const res = await fetch(`${BASE}/users/search?q=${encodeURIComponent(query)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Search failed');
  return data;
}

export async function getUserProfile(id) {
  const res = await fetch(`${BASE}/users/${id}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Not found');
  return data;
}

export async function deleteBanner() {
  const res = await fetch(`${BASE}/users/me/banner`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Delete failed');
  return data;
}

export function consumeOAuthTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const oauth = params.get('oauth');
  const token = params.get('token');
  const message = params.get('message');

  if (!oauth) {
    return { status: 'none' };
  }

  if (oauth === 'success' && token) {
    saveSession(token);
    window.history.replaceState({}, document.title, window.location.pathname);
    return { status: 'success' };
  }

  window.history.replaceState({}, document.title, window.location.pathname);
  return { status: 'error', message: message || 'OAuth login failed' };
}

/* ── Chat ─────────────────────────────────────────── */

export async function uploadChatFile(file) {
  const token = getToken();
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${BASE}/chat/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Помилка завантаження');
  return data.url;
}

export async function getChatReactions(room) {
  if (!CHECK_BACKEND) return {};
  const res = await fetch(`${BASE}/chat/${encodeURIComponent(room)}/reactions`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Помилка');
  return data; // { "msgId_emoji": { emoji, count, users } }
}

export async function clearChatRoom(room) {
  const res = await fetch(`${BASE}/chat/${encodeURIComponent(room)}/clear`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Помилка');
  return data;
}

/* ── Public Reviews ────────────────────────── */

export async function getPublicReviews(query = '') {
  const params = new URLSearchParams();
  if (query?.trim()) params.set('q', query.trim());

  const url = `${BASE}/reviews${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || data.error || 'Не вдалося завантажити відгуки');
  }

  return data;
}

export async function createPublicReview(payload) {
  const res = await fetch(`${BASE}/reviews`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Не вдалося надіслати відгук');
  }

  return data;
}

/* ── Admin ────────────────────────────────────────── */

export async function getAdminUsers() {
  if (!CHECK_BACKEND) return [];
  return request(`${BASE}/admin/users`, { headers: authHeaders() });
}

export async function setUserRole(id, role) {
  return request(`${BASE}/admin/users/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ role }),
  });
}

export async function getAdminStats() {
  if (!CHECK_BACKEND) return {};
  return request(`${BASE}/admin/stats`, { headers: authHeaders() });
}

/**
 * Публічна статистика платформи — використовується для Info-бару на головній сторінці.
 * Очікується відповідь { users, tasks, tournaments, teams }
 */
export async function getPlatformStats() {
  return request(`${BASE}/stats`);
}

export async function getCustomChatRooms() {
  if (!CHECK_BACKEND) return [];
  return request(`${BASE}/chat/custom-rooms`, { headers: authHeaders() });
}

export async function createChatRoom(name, label) {
  return request(`${BASE}/admin/chat/rooms`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ name, label }),
  });
}

export async function deleteChatRoom(id) {
  return request(`${BASE}/admin/chat/rooms/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
}

export async function getChatRoomSettings(room) {
  return request(`${BASE}/admin/chat/settings/${encodeURIComponent(room)}`, { headers: authHeaders() });
}

export async function setChatRoomSettings(room, settings) {
  return request(`${BASE}/admin/chat/settings/${encodeURIComponent(room)}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(settings),
  });
}

export async function postChatAnnouncement(room, text) {
  return request(`${BASE}/admin/chat/announce/${encodeURIComponent(room)}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ text }),
  });
}

export async function pinChatMessage(msgId) {
  return request(`${BASE}/admin/chat/pin/${msgId}`, {
    method: 'POST',
    headers: authHeaders(),
  });
}

export async function unpinChatMessage(msgId) {
  return request(`${BASE}/admin/chat/pin/${msgId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
}

export async function getPinnedMessages(room) {
  if (!CHECK_BACKEND) return [];
  return request(`${BASE}/chat/${encodeURIComponent(room)}/pinned`, { headers: authHeaders() });
}

/* ── Admin: chat mute ─────────────────────────────── */

export async function getMutedChatUsers() {
  if (!CHECK_BACKEND) return [];
  return request(`${BASE}/admin/chat/muted`, { headers: authHeaders() });
}

export async function toggleChatMute(userId) {
  return request(`${BASE}/admin/chat/mute/${userId}`, {
    method: 'POST',
    headers: authHeaders(),
  });
}

/* ── Teams extended ──────────────────────────────── */

export async function getTeamById(id) {
  return request(`${BASE}/teams/${id}`);
}

export async function updateTeam(id, data) {
  return request(`${BASE}/teams/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
}

/* ── Admin: users extended ───────────────────────── */

export async function deleteAdminUser(id) {
  return request(`${BASE}/admin/users/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
}

export async function setUserPassword(id, password) {
  return request(`${BASE}/admin/users/${id}/password`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ password }),
  });
}

/* ── Admin: teams ────────────────────────────────── */

export async function getAdminTeams() {
  return request(`${BASE}/admin/teams`, { headers: authHeaders() });
}

export async function adminDeleteTeam(id) {
  return request(`${BASE}/admin/teams/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
}

/* ── Jury ─────────────────────────────────────── */

export async function getJuryTournaments() {
  if (!CHECK_BACKEND) return [];
  return request(`${BASE}/jury/tournaments`, { headers: authHeaders() });
}

export async function getJurySubmissions(roundId) {
  if (!CHECK_BACKEND) return [];
  return request(`${BASE}/jury/rounds/${roundId}/submissions`, { headers: authHeaders() });
}

export async function evaluateSubmission(submissionId, data) {
  return request(`${BASE}/jury/submissions/${submissionId}/evaluate`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
}
