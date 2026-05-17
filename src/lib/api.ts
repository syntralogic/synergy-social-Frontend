// ─── Base URL ────────────────────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

// ─── Token Management ────────────────────────────────────────────────────────
export const getToken    = (): string | null =>
  typeof window !== 'undefined' ? localStorage.getItem('accessToken')  : null;
export const getRToken   = (): string | null =>
  typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
export const setTokens   = (a: string, r: string) => {
  localStorage.setItem('accessToken',  a);
  localStorage.setItem('refreshToken', r);
};
export const clearTokens = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

// ─── Refresh state (prevent parallel refresh calls) ──────────────────────────
let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

function onRefreshed(token: string | null) {
  refreshQueue.forEach(cb => cb(token));
  refreshQueue = [];
}

async function tryRefresh(): Promise<string | null> {
  const rt = getRToken();
  if (!rt) return null;
  try {
    const res  = await fetch(`${API_BASE}/auth/refresh-token`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ refreshToken: rt }),
    });
    if (!res.ok) { clearTokens(); return null; }
    const data = await res.json();
    const { accessToken, refreshToken } = data.data;
    setTokens(accessToken, refreshToken);
    return accessToken;
  } catch {
    clearTokens();
    return null;
  }
}

// ─── Core Fetch with auto-refresh ────────────────────────────────────────────
export async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token   = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // Auto-refresh on 401
  if (res.status === 401 && getRToken()) {
    if (isRefreshing) {
      // Queue this request until refresh completes
      const newToken = await new Promise<string | null>(resolve => {
        refreshQueue.push(resolve);
      });
      if (!newToken) throw new Error('Session expired. Please log in again.');
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    } else {
      isRefreshing = true;
      const newToken = await tryRefresh();
      isRefreshing = false;
      onRefreshed(newToken);

      if (!newToken) throw new Error('Session expired. Please log in again.');
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Error ${res.status}`);
  return data;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authAPI = {
  register: async (p: { email: string; username: string; password: string; fullName: string }) => {
    const d = await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(p) });
    setTokens(d.data.accessToken, d.data.refreshToken);
    return d.data;
  },
  login: async (p: { email: string; password: string }) => {
    const d = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(p) });
    setTokens(d.data.accessToken, d.data.refreshToken);
    return d.data;
  },
  logout: async () => {
    try { await apiFetch('/auth/logout', { method: 'POST' }); } finally { clearTokens(); }
  },
  getMe: () => apiFetch('/auth/me'),
};

// ─── Posts API ────────────────────────────────────────────────────────────────
export const postsAPI = {
  getFeed:    (page = 1) => apiFetch(`/posts/feed?page=${page}&limit=15`),
  getExplore: (page = 1) => apiFetch(`/posts/explore?page=${page}&limit=15`),
  create:     (body: { content: string; postType?: string; visibility?: string; mediaUrl?: string; mediaType?: string }) =>
    apiFetch('/posts', { method: 'POST', body: JSON.stringify(body) }),
  like:       (postId: string) => apiFetch(`/likes/post/${postId}`,   { method: 'POST'   }),
  unlike:     (postId: string) => apiFetch(`/likes/post/${postId}`,   { method: 'DELETE' }),
  comment:    (postId: string, content: string) =>
    apiFetch('/comments', { method: 'POST', body: JSON.stringify({ postId, content }) }),
  delete:     (postId: string) => apiFetch(`/posts/${postId}`, { method: 'DELETE' }),
};

// ─── Users API ────────────────────────────────────────────────────────────────
export const usersAPI = {
  getProfile:    (username: string) => apiFetch(`/users/${username}`),
  updateProfile: (data: { fullName?: string; bio?: string; username?: string; avatar?: string; coverImage?: string }) =>
    apiFetch('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
  follow:        (userId: string)   => apiFetch(`/users/${userId}/follow`,   { method: 'POST'   }),
  unfollow:      (userId: string)   => apiFetch(`/users/${userId}/unfollow`, { method: 'DELETE' }),
  search:        (q: string)        => apiFetch(`/users/search?q=${encodeURIComponent(q)}`),
};

// ─── Analytics API ────────────────────────────────────────────────────────────
export const analyticsAPI = {
  getUser:     (userId: string, range = 'week') =>
    apiFetch(`/analytics/user/${userId}?range=${range}`),
  getTrending: () => apiFetch('/analytics/trending'),
};

// ─── Messages API ─────────────────────────────────────────────────────────────
// Backend routes:
//   GET  /messages/conversations          → list convos
//   POST /messages/conversation/:userId   → get-or-create with a user
//   GET  /messages/:conversationId        → messages in convo
//   POST /messages/:conversationId        → send (REST fallback)
export const messagesAPI = {
  getConversations:   ()                        => apiFetch('/messages/conversations'),
  getMessages:        (convId: string, page = 1) =>
    apiFetch(`/messages/${convId}?page=${page}`),
  createConversation: (recipientId: string)     =>
    apiFetch(`/messages/conversation/${recipientId}`, { method: 'POST' }),
  send:               (convId: string, content: string) =>
    apiFetch(`/messages/${convId}`, { method: 'POST', body: JSON.stringify({ content }) }),
};

// ─── Notifications API ────────────────────────────────────────────────────────
export const notificationsAPI = {
  getAll:      (page = 1) => apiFetch(`/notifications?page=${page}&limit=30`),
  getUnread:   ()         => apiFetch('/notifications/count/unread'),
  markRead:    (id: string) => apiFetch(`/notifications/${id}/read`,   { method: 'PUT' }),
  markAllRead: ()           => apiFetch('/notifications/read-all',     { method: 'PUT' }),
  delete:      (id: string) => apiFetch(`/notifications/${id}`,        { method: 'DELETE' }),
};

export default apiFetch;

// ─── Search helper (tries /users/search, falls back gracefully) ───────────────
export async function searchUsers(q: string): Promise<any[]> {
  // Try dedicated search endpoint first
  try {
    const res = await apiFetch(`/users/search?q=${encodeURIComponent(q)}`);
    return res.data || res.users || [];
  } catch {
    // Fallback: try getting profile by exact username match
    if (q.length >= 2) {
      try {
        const res = await apiFetch(`/users/${encodeURIComponent(q.replace('@',''))}`);
        const user = res.data;
        return user ? [user] : [];
      } catch {
        return [];
      }
    }
    return [];
  }
}