/**
 * Auth API utility — talks to backend via Vite proxy /api → http://localhost:3001
 */

const API_PROXY_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const DIRECT_BACKEND_BASE = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');
const BASE = API_PROXY_BASE;
export const API_BASE = BASE.startsWith('http') ? BASE : DIRECT_BACKEND_BASE;

export const DEBUG_API = import.meta.env.VITE_DEBUG_API === 'true';

if (DEBUG_API) {
  console.groupCollapsed('%c[API DEBUG] Config', 'color:#7c3aed;font-weight:bold');
  console.log('VITE_API_BASE_URL  :', import.meta.env.VITE_API_BASE_URL);
  console.log('VITE_BACKEND_URL   :', import.meta.env.VITE_BACKEND_URL);
  console.log('BASE (proxy)       :', BASE);
  console.log('API_BASE (direct)  :', API_BASE);
  console.log('CHECK_BACKEND      :', import.meta.env.VITE_CHECK_BACKEND);
  console.groupEnd();
}

/**
 * VITE_CHECK_BACKEND=false → dev-режим без бекенду.
 * login/register/dashboard працюють з мок-даними.
 */
export const CHECK_BACKEND = import.meta.env.VITE_CHECK_BACKEND !== 'false';

/** Мок-юзер для dev-режиму (VITE_CHECK_BACKEND=false) */
export const DEV_MOCK_USER = {
  id: 0,
  username: 'dev_tester',
  email: 'dev@local_tester.me',
  role: 'admin',
  user_avatar_url: null,
  user_banner_url: null,
  bio: 'dev mock user — backend is disabled',
};

// OAuth: browser redirects go directly to backend (bypass Vite proxy),
// so must use full backend URL including /api prefix.
export const OAUTH_URLS = {
  google: `${DIRECT_BACKEND_BASE}${BASE}/auth/google`,
  discord: `${DIRECT_BACKEND_BASE}${BASE}/auth/discord`,
  github: `${DIRECT_BACKEND_BASE}${BASE}/auth/github`,
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
  if (DEBUG_API) {
    console.groupCollapsed(`%c[API] ${options.method || 'GET'} ${url}`, 'color:#2563eb;font-weight:bold');
    console.log('URL     :', url);
    console.log('Method  :', options.method || 'GET');
    console.log('Headers :', options.headers);
    if (options.body) {
      try { console.log('Body    :', JSON.parse(options.body)); } catch { console.log('Body    :', options.body); }
    }
    console.groupEnd();
  }

  let res;
  try {
    res = await fetch(url, options);
  } catch (networkErr) {
    if (DEBUG_API) console.error(`%c[API] NETWORK ERROR → ${url}`, 'color:#dc2626;font-weight:bold', networkErr);
    throw networkErr;
  }

  let data;
  try {
    data = await res.json();
  } catch (parseErr) {
    if (DEBUG_API) console.error(`%c[API] JSON PARSE ERROR (${res.status}) → ${url}`, 'color:#dc2626;font-weight:bold', parseErr);
    throw new Error(`Non-JSON response: ${res.status} ${res.statusText}`);
  }

  if (DEBUG_API) {
    const style = res.ok ? 'color:#16a34a;font-weight:bold' : 'color:#dc2626;font-weight:bold';
    console.groupCollapsed(`%c[API] ${res.ok ? '✓' : '✗'} ${res.status} ${url}`, style);
    console.log('Status  :', res.status, res.statusText);
    console.log('Response:', data);
    console.groupEnd();
  }

  if (res.status === 401 && !url.includes('/auth/')) {
    // Token invalid/expired — clear session and redirect to login (debounced to avoid loops)
    if (!window.__cl_session_expired) {
      window.__cl_session_expired = true;
      try { localStorage.removeItem('cl_token'); localStorage.removeItem('cl_user'); } catch {}
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  }
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

/* ── Email verification ─────────────────────────── */

/**
 * Підтвердження 6-значного коду. На успіх повертає реальні JWT-токени.
 */
export async function verifyEmailCode({ pendingToken, code }) {
  return request(`${BASE}/auth/email/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pendingToken, code }),
  });
}

/**
 * Запит нового коду (resend). Повертає новий pendingToken і expiresInSec.
 */
export async function resendEmailCode({ pendingToken }) {
  return request(`${BASE}/auth/email/resend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pendingToken }),
  });
}

/**
 * Зберегти/прочитати pending-стан верифікації пошти.
 * Тримаємо в sessionStorage — не переживає закриття вкладки.
 */
const PENDING_KEY = 'cl_pending_verification';
export function savePendingVerification(data) {
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(data));
}
export function loadPendingVerification() {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export function clearPendingVerification() {
  sessionStorage.removeItem(PENDING_KEY);
}

export async function getMe() {
  return request(`${BASE}/users/me`, { headers: authHeaders() });
}

export function saveSession(token) { localStorage.setItem('cl_token', token); }
export function clearSession()     { localStorage.removeItem('cl_token'); localStorage.removeItem('cl_user'); }
export function getToken()         { return localStorage.getItem('cl_token'); }
export function isLoggedIn()       { return !!getToken(); }

/** Cache user object from OAuth/login response to avoid extra /me request */
export function saveUser(user)  { if (user) localStorage.setItem('cl_user', JSON.stringify(user)); }
export function loadCachedUser() {
  try { const s = localStorage.getItem('cl_user'); return s ? JSON.parse(s) : null; } catch { return null; }
}

/**
 * Reads OAuth result from URL query params after backend redirect.
 * Backend redirects to frontend with:  ?token=JWT&user=JSON  on success
 *                                  or  ?error=MESSAGE         on failure
 * Returns { status: 'success'|'error'|'none', user?, message? }
 * Cleans the URL after reading.
 */
export function consumeOAuthTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const token  = params.get('token');
  const error  = params.get('error');
  const pending = params.get('pending');

  const cleanUrl = () => window.history.replaceState({}, '', window.location.pathname);

  // OAuth → акаунт ще НЕ верифікований, треба ввести код
  if (pending) {
    const email     = params.get('email') || '';
    const expiresIn = parseInt(params.get('expiresIn') || '600', 10);
    cleanUrl();
    return {
      status: 'pending_verification',
      pendingToken: pending,
      email,
      expiresInSec: expiresIn,
    };
  }

  if (token) {
    saveSession(token);

    let user = null;
    const userRaw = params.get('user');
    if (userRaw) {
      try { user = JSON.parse(decodeURIComponent(userRaw)); } catch { /* ignore */ }
    }

    cleanUrl();

    if (DEBUG_API) {
      console.groupCollapsed('%c[OAuth] Token consumed from URL', 'color:#16a34a;font-weight:bold');
      console.log('token (preview):', token.slice(0, 30) + '...');
      console.log('user            :', user);
      console.groupEnd();
    }

    return { status: 'success', user };
  }

  if (error) {
    cleanUrl();
    const message = decodeURIComponent(error);
    if (DEBUG_API) console.error('%c[OAuth] Error from URL:', 'color:#dc2626;font-weight:bold', message);
    return { status: 'error', message };
  }

  return { status: 'none' };
}

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

export async function uploadTournamentFile(tournamentId, type, file) {
  const token = getToken();
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${BASE}/tournaments/${tournamentId}/upload-file?type=${encodeURIComponent(type)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || 'Upload failed');
  return data;
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

export async function getChatHistory(room, opts = {}) {
  if (!CHECK_BACKEND) return [];
  const { limit = 50, before } = opts;
  const params = new URLSearchParams({ room });
  if (limit) params.set('limit', String(limit));
  if (before) params.set('before', String(before));
  return request(`${BASE}/chat-messages?${params.toString()}`, { headers: authHeaders() });
}

export async function searchUsers(query) {
  const res = await fetch(`${BASE}/users/search?q=${encodeURIComponent(query)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Search failed');
  return data;
}

export async function getAllChatUsers() {
  if (!CHECK_BACKEND) return [];
  const res = await fetch(`${BASE}/users`, { headers: authHeaders() });
  const data = await res.json().catch(() => []);
  if (!res.ok) return [];
  const list = Array.isArray(data) ? data : (data?.users || []);
  // Normalize field names to match team-member shape used in the members panel
  return list.map(u => ({
    ...u,
    user_avatar_url: u.user_avatar_url ?? u.avatar ?? null,
    is_captain: false,
  }));
}

export async function getUserProfileByUsername(username) {
  const res = await fetch(`${BASE}/users/by-username/${encodeURIComponent(username)}`, { headers: authHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || 'Користувача не знайдено');
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

export async function getSubmissionDailyStats(days = 7) {
  const res = await fetch(`${BASE}/submissions/stats/daily?days=${days}`, { headers: authHeaders() });
  const data = await res.json().catch(() => []);
  if (!res.ok) throw new Error(data.error || data.message || 'Не вдалося завантажити статистику');
  return Array.isArray(data) ? data : [];
}

export async function getUserDailyStats(days = 7, metric = 'users') {
  const res = await fetch(`${BASE}/admin/users/daily-stats?days=${days}&metric=${encodeURIComponent(metric)}`, { headers: authHeaders() });
  const data = await res.json().catch(() => []);
  if (!res.ok) throw new Error(data.error || data.message || 'Не вдалося завантажити статистику');
  return Array.isArray(data) ? data : [];
}

export async function setMyStatus(status, opts = {}) {
  const init = {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  };
  if (opts.keepalive) init.keepalive = true;
  const res = await fetch(`${BASE}/users/me/status`, init);
  if (!res.ok) throw new Error('status update failed');
  return res.json().catch(() => ({}));
}

export async function requestPasswordChange() {
  const res = await fetch(`${BASE}/users/me/password/request`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || 'Не вдалося надіслати код');
  return data;
}

export async function verifyPasswordChangeCode({ code }) {
  const res = await fetch(`${BASE}/users/me/password/verify-code`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || 'Невірний код');
  return data;
}

export async function forgotPasswordRequest(email) {
  const res = await fetch(`${BASE}/auth/password/forgot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || 'Не вдалося надіслати код');
  return data;
}

export async function forgotPasswordVerifyCode({ email, code }) {
  const res = await fetch(`${BASE}/auth/password/forgot/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || 'Невірний код');
  return data;
}

export async function forgotPasswordReset({ email, code, newPassword }) {
  const res = await fetch(`${BASE}/auth/password/forgot/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, newPassword }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || 'Не вдалося оновити пароль');
  return data;
}

export async function confirmPasswordChange({ code, newPassword, currentPassword }) {
  const res = await fetch(`${BASE}/users/me/password/confirm`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, newPassword, currentPassword }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || 'Не вдалося змінити пароль');
  return data;
}

export async function deleteMyAccount() {
  const res = await fetch(`${BASE}/users/me`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || 'Не вдалося видалити акаунт');
  return data;
}

/* ── Chat ─────────────────────────────────────────── */

export async function uploadChatFile(file) {
  const token = getToken();
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${BASE}/chat/messages/upload`, {
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
  const data = await request(`${BASE}/admin/users`, { headers: authHeaders() });
  return Array.isArray(data) ? data : (data?.users || []);
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

/* ── Team chat membership ────────────────────────── */

export async function getTeamChatMembers(teamId) {
  if (!CHECK_BACKEND) return [];
  return request(`${BASE}/teams/${teamId}/chat/members`, { headers: authHeaders() });
}

export async function addTeamChatMember(teamId, userId) {
  return request(`${BASE}/teams/${teamId}/chat/members`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ user_id: userId }),
  });
}

export async function linkTeamMember(teamId, memberId, userId) {
  return request(`${BASE}/teams/${teamId}/members/${memberId}/link`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ user_id: userId }),
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

/* ── Team invites ─────────────────────────────────── */
export async function getMyTeamInvites() {
  return request(`${BASE}/teams/invites/mine`, { headers: authHeaders() });
}

export async function getTeamInviteDetails(memberId) {
  return request(`${BASE}/teams/invites/${memberId}`, { headers: authHeaders() });
}

export async function acceptTeamInvite(memberId) {
  return request(`${BASE}/teams/invites/${memberId}/accept`, {
    method: 'POST',
    headers: authHeaders(),
  });
}

export async function rejectTeamInvite(memberId) {
  return request(`${BASE}/teams/invites/${memberId}/reject`, {
    method: 'POST',
    headers: authHeaders(),
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

/* ── Organizer Applications ────────────────────────── */

export async function submitOrganizerApplication(data) {
  return request(`${BASE}/applications/organizer`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
}

export async function getMyOrganizerApplication() {
  if (!CHECK_BACKEND) return null;
  return request(`${BASE}/applications/organizer/my`, { headers: authHeaders() });
}

export async function getAdminOrganizerApplications() {
  if (!CHECK_BACKEND) return [];
  return request(`${BASE}/admin/applications/organizer`, { headers: authHeaders() });
}

export async function reviewOrganizerApplication(id, status) {
  return request(`${BASE}/admin/applications/organizer/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });
}

/* ── Notifications ────────────────────────────── */

export async function getNotifications() {
  if (!CHECK_BACKEND) return [];
  return request(`${BASE}/notifications`, { headers: authHeaders() });
}

export async function markNotificationRead(id) {
  return request(`${BASE}/notifications/${id}/read`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
}

export async function deleteNotification(id) {
  return request(`${BASE}/notifications/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
}

export async function markAllNotificationsRead() {
  return request(`${BASE}/notifications/read-all`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
}

export async function deleteAllNotifications() {
  return request(`${BASE}/notifications`, {
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

/* ── Rounds ───────────────────────────────────────── */
export async function getTournamentRounds(tournamentId) {
  return request(`${BASE}/tournaments/${tournamentId}/rounds`, { headers: authHeaders() });
}

export async function createRound(tournamentId, data) {
  return request(`${BASE}/tournaments/${tournamentId}/rounds`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
}

export async function updateRound(roundId, data) {
  return request(`${BASE}/rounds/${roundId}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
}

export async function deleteRound(roundId) {
  return request(`${BASE}/rounds/${roundId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
}

export async function getActiveRound(tournamentId) {
  return request(`${BASE}/tournaments/${tournamentId}/active-round`, { headers: authHeaders() });
}

export async function advanceRound(tournamentId, direction) {
  return request(`${BASE}/tournaments/${tournamentId}/advance-round`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ direction }),
  });
}

export async function uploadRoundFile(roundId, type, file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/rounds/${roundId}/upload-file?type=${type}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || 'Не вдалося завантажити файл');
  return data;
}

/* ── Submissions ──────────────────────────────────── */

export async function getTeamSubmissions(teamId) {
  return request(`${BASE}/submissions/teams/${teamId}`, { headers: authHeaders() });
}

export async function createSubmission(roundId, data) {
  return request(`${BASE}/submissions/rounds/${roundId}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
}

export async function updateSubmission(submissionId, data) {
  return request(`${BASE}/submissions/${submissionId}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
}

/* ── Badges ───────────────────────────────────────── */

export async function getMyBadges() {
  if (!CHECK_BACKEND) return [];
  return request(`${BASE}/badges/my`, { headers: authHeaders() });
}

export async function getAdminUserBadges(userId) {
  if (!CHECK_BACKEND) return [];
  return request(`${BASE}/admin/users/${userId}/badges`, { headers: authHeaders() });
}

export async function adminGrantBadge(userId, badgeId) {
  return request(`${BASE}/admin/users/${userId}/badges`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ badge_id: badgeId }),
  });
}

export async function adminRevokeBadge(userId, badgeId) {
  return request(`${BASE}/admin/users/${userId}/badges/${badgeId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
}
