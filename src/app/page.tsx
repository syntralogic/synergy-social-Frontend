'use client';
import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { authAPI, usersAPI, getToken } from '@/lib/api';
import AuthPage from '@/components/auth/AuthPage';
import AppShell from '@/components/layout/AppShell';

export default function Home() {
  const { isAuthenticated, authChecked, login, setUser, setAuthChecked, logout, setFollowing } =
    useStore(s => ({
      isAuthenticated: s.isAuthenticated,
      authChecked:     s.authChecked,
      login:           s.login,
      setUser:         s.setUser,
      setAuthChecked:  s.setAuthChecked,
      logout:          s.logout,
      setFollowing:    s.setFollowing,
    }));

  // Restore session on page load if a token exists in localStorage
  useEffect(() => {
    if (authChecked) return;
    const token = getToken();
    if (!token) {
      setAuthChecked(true);
      return;
    }
    authAPI.getMe()
      .then(async (res: any) => {
        const user = res.data.user;
        setUser(user);
        login();
        // Hydrate which users we already follow, so Follow/Following buttons
        // reflect real state instead of resetting on every reload.
        try {
          const followingRes: any = await usersAPI.getFollowing(user.id);
          const ids = (followingRes.data || []).map((u: any) => u.id);
          setFollowing(ids);
        } catch {
          // Non-critical — buttons will just self-correct as the user interacts
        }
      })
      .catch(() => {
        // Token invalid / expired and refresh failed — clear and show login
        logout();
      })
      .finally(() => setAuthChecked(true));
  }, [authChecked, login, logout, setAuthChecked, setUser, setFollowing]);

  // Show nothing while checking auth to avoid flash of wrong screen
  if (!authChecked) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '3px solid var(--border)',
          borderTopColor: 'var(--accent)',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    );
  }

  return isAuthenticated ? <AppShell /> : <AuthPage />;
}
