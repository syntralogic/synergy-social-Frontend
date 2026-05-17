'use client';
import React, { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { getToken, notificationsAPI } from '@/lib/api';
import Sidebar from './Sidebar';
import FeedPage from '@/components/feed/FeedPage';
import ProfilePage from '@/components/profile/ProfilePage';
import MessagesPage from '@/components/messages/MessagesPage';
import NotificationsPage from '@/components/notifications/NotificationsPage';
import AnalyticsPage from '@/components/analytics/AnalyticsPage';
import ExplorePage from '@/components/feed/ExplorePage';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

export default function AppShell() {
  const { page, theme, incrementUnread, setUnreadNotifs } = useStore(s => ({
    page:            s.page,
    theme:           s.theme,
    incrementUnread: s.incrementUnread,
    setUnreadNotifs: s.setUnreadNotifs,
  }));

  const socketRef = useRef<any>(null);

  // Apply theme class on mount/change
  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  // Bootstrap unread notification count
  useEffect(() => {
    notificationsAPI.getUnread()
      .then((res: any) => setUnreadNotifs(res.data?.unreadCount || 0))
      .catch(() => {});
  }, [setUnreadNotifs]);

  // Socket: listen for new notifications globally
  useEffect(() => {
    const token = getToken();
    if (!token || socketRef.current) return;

    (async () => {
      const { io } = await import('socket.io-client');
      const socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
      });
      socketRef.current = socket;

      socket.on('notification:new', () => {
        incrementUnread();
      });
    })();

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [incrementUnread]);

  const pages: Record<string, React.ReactNode> = {
    feed:          <FeedPage />,
    explore:       <ExplorePage />,
    profile:       <ProfilePage />,
    messages:      <MessagesPage />,
    notifications: <NotificationsPage />,
    analytics:     <AnalyticsPage />,
  };

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'var(--bg)' }}>
      {/* Desktop sidebar */}
      <div className="hidden-mobile">
        <Sidebar />
      </div>

      {/* Main content */}
      <main style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
        {pages[page] || <FeedPage />}
      </main>

      {/* Mobile bottom nav */}
      <div className="show-mobile">
        <Sidebar mobile />
      </div>

      <style>{`
        .hidden-mobile { display:flex; }
        .show-mobile   { display:none; }
        @media (max-width: 768px) {
          .hidden-mobile { display:none !important; }
          .show-mobile   { display:block !important; }
          main { padding-bottom: 60px; }
        }
      `}</style>
    </div>
  );
}
