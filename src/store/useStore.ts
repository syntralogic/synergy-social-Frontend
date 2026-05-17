import { create } from 'zustand';
import { clearTokens } from '@/lib/api';

export type Page = 'feed' | 'profile' | 'messages' | 'notifications' | 'analytics' | 'explore';

export interface BackendUser {
  id: string;
  email: string;
  username: string;
  fullName: string;
  avatar?: string;
  coverImage?: string;
  bio?: string;
  role?: string;
  isVerified?: boolean;
  createdAt?: string;
}

interface AppState {
  // Auth
  isAuthenticated: boolean;
  currentUser: BackendUser | null;
  authChecked: boolean;
  login:   () => void;
  logout:  () => void;
  setUser: (user: BackendUser) => void;
  setAuthChecked: (v: boolean) => void;

  // Theme
  theme: 'dark' | 'light';
  toggleTheme: () => void;

  // Navigation
  page: Page;
  setPage: (p: Page) => void;

  // Notification badge
  unreadNotifs: number;
  setUnreadNotifs: (n: number) => void;
  incrementUnread: () => void;

  // Modal
  modal: string | null;
  setModal: (m: string | null) => void;

  // Following map (userId -> bool) for Explore page
  following: Record<string, boolean>;
  toggleFollow: (userId: string | number) => void;
}

export const useStore = create<AppState>((set) => ({
  // ── Auth ──────────────────────────────────────────────────────────────────
  isAuthenticated: false,
  currentUser: null,
  authChecked: false,

  login:  () => set({ isAuthenticated: true }),
  logout: () => {
    clearTokens();
    set({ isAuthenticated: false, currentUser: null });
  },
  setUser: (user: BackendUser) => set({ currentUser: user }),
  setAuthChecked: (v) => set({ authChecked: v }),

  // ── Theme ─────────────────────────────────────────────────────────────────
  theme: 'dark',
  toggleTheme: () => set(s => {
    const next = s.theme === 'dark' ? 'light' : 'dark';
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('light', next === 'light');
    }
    return { theme: next };
  }),

  // ── Navigation ────────────────────────────────────────────────────────────
  page: 'feed',
  setPage: (page) => set({ page }),

  // ── Notifications ─────────────────────────────────────────────────────────
  unreadNotifs: 0,
  setUnreadNotifs: (n) => set({ unreadNotifs: n }),
  incrementUnread: () => set(s => ({ unreadNotifs: s.unreadNotifs + 1 })),

  // ── Modal ─────────────────────────────────────────────────────────────────
  modal: null,
  setModal: (modal) => set({ modal }),

  // ── Following ─────────────────────────────────────────────────────────────
  following: {},
  toggleFollow: (userId) => set(s => ({
    following: {
      ...s.following,
      [String(userId)]: !s.following[String(userId)],
    },
  })),
}));