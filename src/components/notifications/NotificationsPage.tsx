'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BellOff, CheckCheck, Loader2, RefreshCw } from 'lucide-react';
import { notificationsAPI } from '@/lib/api';

interface BackendNotif {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  user?: { id: string; username: string; fullName: string; avatar?: string };
}

const TYPE_ICON: Record<string, { icon: string; color: string }> = {
  LIKE:    { icon: '❤️', color: '#f56565' },
  COMMENT: { icon: '💬', color: '#7c6af5' },
  FOLLOW:  { icon: '👤', color: '#38d9c0' },
  SHARE:   { icon: '🔁', color: '#f5a623' },
  MENTION: { icon: '@',  color: '#f567a8' },
  DEFAULT: { icon: '🔔', color: '#7c6af5' },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationsPage() {
  const [notifs, setNotifs]     = useState<BackendNotif[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await notificationsAPI.getAll();
      setNotifs(res.data || []);
    } catch (e: any) { setError(e.message || 'Failed to load notifications'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleMarkRead = async (id: string) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    try { await notificationsAPI.markRead(id); } catch {}
  };

  const handleMarkAll = async () => {
    setMarkingAll(true);
    setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
    try { await notificationsAPI.markAllRead(); } catch {}
    setMarkingAll(false);
  };

  const unread = notifs.filter(n => !n.isRead);
  const read   = notifs.filter(n =>  n.isRead);

  return (
    <div style={{ height:'100%', overflowY:'auto' }}>
      <div style={{ maxWidth:620, margin:'0 auto', padding:'20px 16px' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
          <div>
            <h1 style={{ fontFamily:'Syne, sans-serif', fontSize:22, fontWeight:800, color:'var(--text)' }}>Notifications</h1>
            {unread.length > 0 && <p style={{ fontSize:13, color:'var(--text3)', marginTop:2 }}>{unread.length} unread</p>}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:0.96 }} onClick={load}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 12px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, color:'var(--text2)', fontSize:13, cursor:'pointer' }}>
              <RefreshCw size={13}/>
            </motion.button>
            {unread.length > 0 && (
              <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:0.96 }} onClick={handleMarkAll} disabled={markingAll}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, color:'var(--text2)', fontSize:13, cursor:'pointer', fontFamily:'DM Sans', opacity: markingAll ? 0.6 : 1 }}>
                <CheckCheck size={14}/> Mark all read
              </motion.button>
            )}
          </div>
        </div>

        {loading && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'60px 0', gap:10, color:'var(--text3)' }}>
            <Loader2 size={20} style={{ animation:'spin 1s linear infinite' }}/>
            <span style={{ fontSize:14 }}>Loading notifications…</span>
          </div>
        )}

        {!loading && error && (
          <div style={{ textAlign:'center', padding:'40px 0' }}>
            <p style={{ fontSize:14, color:'var(--red)', marginBottom:12 }}>{error}</p>
            <button onClick={load} style={{ padding:'8px 20px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, color:'var(--text2)', fontSize:13, cursor:'pointer' }}>Try Again</button>
          </div>
        )}

        {!loading && !error && (
          <>
            {unread.length > 0 && (
              <div style={{ marginBottom:24 }}>
                <SectionLabel label="New" />
                <AnimatePresence>
                  {unread.map((n,i) => <NotifItem key={n.id} notif={n} index={i} onRead={() => handleMarkRead(n.id)} />)}
                </AnimatePresence>
              </div>
            )}
            {read.length > 0 && (
              <div>
                <SectionLabel label="Earlier" />
                <AnimatePresence>
                  {read.map((n,i) => <NotifItem key={n.id} notif={n} index={i} />)}
                </AnimatePresence>
              </div>
            )}
            {notifs.length === 0 && (
              <div style={{ textAlign:'center', padding:'60px 0', color:'var(--text3)' }}>
                <BellOff size={40} strokeWidth={1.5} style={{ margin:'0 auto 12px', display:'block', opacity:0.4 }}/>
                <p style={{ fontSize:15 }}>No notifications yet</p>
              </div>
            )}
          </>
        )}
      </div>
      <style>{`@keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }`}</style>
    </div>
  );
}

function SectionLabel({ label }: { label:string }) {
  return <div style={{ fontSize:12, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>{label}</div>;
}

function NotifItem({ notif, index, onRead }: { notif:BackendNotif; index:number; onRead?:()=>void }) {
  const meta = TYPE_ICON[notif.type] || TYPE_ICON.DEFAULT;
  return (
    <motion.div
      initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:8 }}
      transition={{ delay: index * 0.04 }}
      onClick={onRead}
      style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'14px 16px', borderRadius:12, marginBottom:6,
        cursor: onRead ? 'pointer' : 'default',
        background: notif.isRead ? 'transparent' : 'var(--bg2)',
        border: notif.isRead ? '1px solid transparent' : '1px solid var(--border)',
        transition:'all 0.2s',
      }}
    >
      <div style={{ position:'relative', flexShrink:0 }}>
        {notif.user?.avatar
          ? <img src={notif.user.avatar} alt="" style={{ width:36, height:36, borderRadius:'50%', objectFit:'cover' }}/>
          : <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--bg3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:700, color:'var(--text2)' }}>
              {notif.user?.fullName?.charAt(0) || '?'}
            </div>
        }
        <div style={{ position:'absolute', bottom:-3, right:-3, width:20, height:20, borderRadius:'50%', background:meta.color, border:'2px solid var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9 }}>
          {meta.icon}
        </div>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:14, color:'var(--text)', lineHeight:1.5 }}>
          {notif.user && <span style={{ fontWeight:600 }}>{notif.user.fullName} </span>}
          <span style={{ color:'var(--text2)' }}>{notif.message}</span>
        </div>
        <div style={{ fontSize:12, color:'var(--text3)', marginTop:4 }}>{timeAgo(notif.createdAt)}</div>
      </div>
      {!notif.isRead && <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--accent)', flexShrink:0, marginTop:4 }}/>}
    </motion.div>
  );
}
