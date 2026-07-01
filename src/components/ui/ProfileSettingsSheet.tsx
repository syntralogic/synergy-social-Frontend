'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogOut, Lock, AtSign, Trash2, ChevronRight, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { usersAPI } from '@/lib/api';

type Sheet = 'main' | 'username' | 'password' | 'delete';

interface Props {
  onClose: () => void;
}

export default function ProfileSettingsSheet({ onClose }: Props) {
  const { currentUser, logout, setUser, setPage } = useStore(s => ({
    currentUser: s.currentUser,
    logout: s.logout,
    setUser: s.setUser,
    setPage: s.setPage,
  }));

  const [sheet, setSheet] = useState<Sheet>('main');

  // Username change
  const [newUsername, setNewUsername] = useState(currentUser?.username || '');
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameMsg, setUsernameMsg] = useState('');

  // Password change
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState('');

  // Delete account
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState('');

  const handleUsernameChange = async () => {
    if (!newUsername.trim() || newUsername === currentUser?.username) return;
    setUsernameLoading(true);
    setUsernameMsg('');
    try {
      const res: any = await usersAPI.updateProfile({ username: newUsername.trim() });
      if (res?.data?.user) setUser(res.data.user);
      setUsernameMsg('✅ Username updated!');
    } catch (e: any) {
      setUsernameMsg(`❌ ${e?.message || 'Failed to update username'}`);
    } finally {
      setUsernameLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPw || !newPw) return;
    if (newPw.length < 6) { setPwMsg('❌ New password must be at least 6 characters'); return; }
    setPwLoading(true);
    setPwMsg('');
    try {
      await usersAPI.changePassword(currentPw, newPw);
      setPwMsg('✅ Password changed!');
      setCurrentPw('');
      setNewPw('');
    } catch (e: any) {
      setPwMsg(`❌ ${e?.message || 'Incorrect current password'}`);
    } finally {
      setPwLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') { setDeleteMsg('❌ Type DELETE to confirm'); return; }
    setDeleteLoading(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      logout();
    } catch {
      setDeleteMsg('❌ Failed to delete account. Try again.');
      setDeleteLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: 12,
    background: 'var(--bg3)', border: '1.5px solid var(--border)',
    color: 'var(--text)', fontSize: 14, outline: 'none',
    fontFamily: 'var(--font-dm-sans), sans-serif', boxSizing: 'border-box',
  };
  const btnPrimary: React.CSSProperties = {
    width: '100%', padding: '13px', borderRadius: 12, border: 'none',
    background: 'var(--accent)', color: 'white', fontWeight: 700,
    fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-dm-sans), sans-serif',
  };
  const btnDanger: React.CSSProperties = { ...btnPrimary, background: '#ef4444' };

  const avatar = currentUser?.avatar;
  const initials = (currentUser?.fullName || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }}
      />

      {/* Sheet */}
      <motion.div
        key="sheet"
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
          background: 'var(--bg2)', borderRadius: '20px 20px 0 0',
          padding: '0 0 40px', maxHeight: '85vh', overflowY: 'auto',
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border2)' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 16px' }}>
          <span style={{ fontFamily: 'var(--font-syne), sans-serif', fontWeight: 700, fontSize: 18, color: 'var(--text)' }}>
            {sheet === 'main' ? 'Account' : sheet === 'username' ? 'Change Username' : sheet === 'password' ? 'Change Password' : 'Delete Account'}
          </span>
          <button onClick={sheet === 'main' ? onClose : () => setSheet('main')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* ── MAIN SHEET ── */}
          {sheet === 'main' && (
            <>
              {/* Profile card — tap to view full profile */}
              <button
                onClick={() => { setPage('profile' as any); onClose(); }}
                style={{ background: 'var(--bg3)', borderRadius: 16, padding: '16px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8, width: '100%', border: '1.5px solid var(--border)', cursor: 'pointer', textAlign: 'left' }}>
                {avatar ? (
                  <img src={avatar} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: 'white' }}>
                    {initials}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser?.fullName}</div>
                  <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>@{currentUser?.username}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser?.email}</div>
                </div>
                <ChevronRight size={16} color="var(--accent)" style={{ flexShrink: 0 }} />
              </button>

              {/* Options */}
              {[
                { icon: <AtSign size={18} />, label: 'Change Username', onClick: () => setSheet('username') },
                { icon: <Lock size={18} />, label: 'Change Password', onClick: () => setSheet('password') },
              ].map(item => (
                <button key={item.label} onClick={item.onClick}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'var(--bg3)', border: 'none', borderRadius: 14, cursor: 'pointer', width: '100%', color: 'var(--text)' }}>
                  <span style={{ color: 'var(--accent)' }}>{item.icon}</span>
                  <span style={{ flex: 1, textAlign: 'left', fontSize: 15, fontWeight: 500 }}>{item.label}</span>
                  <ChevronRight size={16} color="var(--text3)" />
                </button>
              ))}

              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

              <button onClick={() => setSheet('delete')}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'rgba(239,68,68,0.08)', border: 'none', borderRadius: 14, cursor: 'pointer', width: '100%' }}>
                <Trash2 size={18} color="#ef4444" />
                <span style={{ flex: 1, textAlign: 'left', fontSize: 15, fontWeight: 500, color: '#ef4444' }}>Delete Account</span>
                <ChevronRight size={16} color="#ef4444" />
              </button>

              <button onClick={logout}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'rgba(239,68,68,0.06)', border: 'none', borderRadius: 14, cursor: 'pointer', width: '100%' }}>
                <LogOut size={18} color="#ef4444" />
                <span style={{ flex: 1, textAlign: 'left', fontSize: 15, fontWeight: 500, color: '#ef4444' }}>Logout</span>
              </button>
            </>
          )}

          {/* ── USERNAME SHEET ── */}
          {sheet === 'username' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: 13, color: 'var(--text3)', margin: 0 }}>Choose a unique username. Others will see this on your profile.</p>
              <input
                style={inputStyle}
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                placeholder="new_username"
                maxLength={30}
              />
              {usernameMsg && <p style={{ fontSize: 13, margin: 0, color: usernameMsg.startsWith('✅') ? 'var(--green)' : '#ef4444' }}>{usernameMsg}</p>}
              <button onClick={handleUsernameChange} disabled={usernameLoading} style={btnPrimary}>
                {usernameLoading ? 'Saving...' : 'Save Username'}
              </button>
            </div>
          )}

          {/* ── PASSWORD SHEET ── */}
          {sheet === 'password' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: 13, color: 'var(--text3)', margin: 0 }}>Minimum 6 characters.</p>
              <div style={{ position: 'relative' }}>
                <input style={inputStyle} type={showCurrentPw ? 'text' : 'password'} value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="Current password" />
                <button onClick={() => setShowCurrentPw(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
                  {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input style={inputStyle} type={showNewPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="New password" />
                <button onClick={() => setShowNewPw(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
                  {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {pwMsg && <p style={{ fontSize: 13, margin: 0, color: pwMsg.startsWith('✅') ? 'var(--green)' : '#ef4444' }}>{pwMsg}</p>}
              <button onClick={handlePasswordChange} disabled={pwLoading} style={btnPrimary}>
                {pwLoading ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          )}

          {/* ── DELETE SHEET ── */}
          {sheet === 'delete' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 13, color: '#ef4444', margin: 0, lineHeight: 1.5 }}>
                  This is permanent. Your account, posts, and all data will be deleted and cannot be recovered.
                </p>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text3)', margin: 0 }}>Type <strong style={{ color: 'var(--text)' }}>DELETE</strong> to confirm:</p>
              <input
                style={{ ...inputStyle, borderColor: deleteConfirm === 'DELETE' ? '#ef4444' : 'var(--border)' }}
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
              />
              {deleteMsg && <p style={{ fontSize: 13, margin: 0, color: '#ef4444' }}>{deleteMsg}</p>}
              <button onClick={handleDeleteAccount} disabled={deleteLoading || deleteConfirm !== 'DELETE'} style={{ ...btnDanger, opacity: deleteConfirm !== 'DELETE' ? 0.5 : 1 }}>
                {deleteLoading ? 'Deleting...' : '🗑️ Delete My Account'}
              </button>
            </div>
          )}

        </div>
      </motion.div>
    </AnimatePresence>
  );
}
