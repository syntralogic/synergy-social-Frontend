'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Home, Mail, Bell, Compass, BarChart2, Sun, Moon, UserCircle, LogOut, Sparkles, Users } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { Page } from '@/store/useStore';
import ProfileSettingsSheet from '@/components/ui/ProfileSettingsSheet';

const NAV = [
  { id:'feed',          icon:Home,      label:'Home' },
  { id:'explore',       icon:Compass,   label:'Explore' },
  { id:'messages',      icon:Mail,      label:'Messages' },
  { id:'notifications', icon:Bell,      label:'Notifications' },
  { id:'analytics',     icon:BarChart2, label:'Analytics' },
  { id:'profile',       icon:Users,     label:'Profile' },
];

export default function Sidebar({ mobile=false }: { mobile?: boolean }) {
  const [showSettings, setShowSettings] = useState(false);
  const { page, setPage, unreadNotifs, logout, theme, toggleTheme, currentUser } = useStore(s => ({
    page:         s.page,
    setPage:      s.setPage,
    unreadNotifs: s.unreadNotifs,
    logout:       s.logout,
    theme:        s.theme,
    toggleTheme:  s.toggleTheme,
    currentUser:  s.currentUser,
  }));

  const displayName   = currentUser?.fullName  || 'User';
  const displayHandle = currentUser?.username  ? `@${currentUser.username}` : '';
  const initials      = displayName.split(' ').map((w:string) => w[0]).join('').slice(0,2).toUpperCase();

  if (mobile) {
    return (
      <>
        {showSettings && <ProfileSettingsSheet onClose={() => setShowSettings(false)} />}
        <div style={{ display:'flex', justifyContent:'space-around', alignItems:'center', padding:'8px 0', background:'var(--bg2)', borderTop:'1px solid var(--border)', position:'fixed', bottom:0, left:0, right:0, zIndex:100 }}>
          {NAV.slice(0,4).map(item => {
            const Icon   = item.icon;
            const active = page === item.id;
            const badge  = item.id === 'notifications' ? unreadNotifs : 0;
            return (
              <button key={item.id} onClick={() => setPage(item.id as Page)}
                style={{ background:'none', border:'none', display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'6px 10px', cursor:'pointer', position:'relative' }}>
                <div style={{ color: active ? 'var(--accent)' : 'var(--text3)', transition:'color 0.2s' }}>
                  <Icon size={22} strokeWidth={active ? 2.5 : 1.8}/>
                </div>
                {badge > 0 && (
                  <div style={{ position:'absolute', top:2, right:6, minWidth:16, height:16, background:'var(--red)', borderRadius:8, fontSize:10, color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, padding:'0 3px' }}>
                    {badge > 99 ? '99+' : badge}
                  </div>
                )}
              </button>
            );
          })}
          {/* Dark mode toggle */}
          <button onClick={toggleTheme}
            style={{ background:'none', border:'none', display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'6px 10px', cursor:'pointer', color:'var(--text3)' }}>
            {theme === 'dark' ? <Sun size={22} strokeWidth={1.8}/> : <Moon size={22} strokeWidth={1.8}/>}
          </button>
          {/* Profile / Account settings */}
          <button onClick={() => setShowSettings(true)}
            style={{ background:'none', border:'none', display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'6px 10px', cursor:'pointer' }}>
            {currentUser?.avatar
              ? <img src={currentUser.avatar} alt="" style={{ width:24, height:24, borderRadius:'50%', objectFit:'cover', border:'2px solid var(--accent)' }} />
              : <UserCircle size={22} strokeWidth={1.8} color="var(--text3)" />
            }
          </button>
        </div>
      </>
    );
  }

  return (
    <div style={{ width:228, flexShrink:0, background:'var(--bg2)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
      {/* Logo */}
      <div style={{ padding:'22px 20px 18px', borderBottom:'1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:11 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 14px rgba(124,106,245,.4)', flexShrink:0 }}>
            <Sparkles size={17} color="white"/>
          </div>
          <div>
            <div style={{ fontFamily:'var(--font-syne), sans-serif', fontWeight:800, fontSize:16, color:'var(--text)', letterSpacing:'-0.3px', lineHeight:1.2 }}>Synergy Social</div>
            <div style={{ fontSize:10, color:'var(--text3)', marginTop:1 }}>Connect · Create · Grow</div>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ flex:1, padding:'14px 10px', overflowY:'auto' }}>
        {NAV.map(item => {
          const Icon   = item.icon;
          const active = page === item.id;
          const badge  = item.id === 'notifications' ? unreadNotifs : 0;
          return (
            <motion.button
              key={item.id}
              whileHover={{ x:2 }}
              onClick={() => setPage(item.id as Page)}
              style={{
                width:'100%', display:'flex', alignItems:'center', gap:12, padding:'11px 14px',
                borderRadius:12, border:'none', cursor:'pointer', marginBottom:3,
                background: active ? 'rgba(124,106,245,.16)' : 'transparent',
                color: active ? 'var(--accent2)' : 'var(--text2)',
                transition:'all 0.2s',
                fontFamily:'var(--font-dm-sans), sans-serif', fontSize:14, fontWeight: active ? 600 : 400,
                textAlign:'left', position:'relative',
              }}
            >
              {active && <div style={{ position:'absolute', left:0, top:'50%', transform:'translateY(-50%)', width:3, height:22, background:'var(--accent)', borderRadius:'0 3px 3px 0' }}/>}
              <Icon size={18} strokeWidth={active ? 2.2 : 1.8}/>
              {item.label}
              {badge > 0 && (
                <div style={{ marginLeft:'auto', minWidth:20, height:20, background:'var(--red)', borderRadius:10, fontSize:11, color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, padding:'0 5px' }}>
                  {badge > 99 ? '99+' : badge}
                </div>
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div style={{ padding:'12px 10px', borderTop:'1px solid var(--border)' }}>
        {showSettings && <ProfileSettingsSheet onClose={() => setShowSettings(false)} />}
        <button onClick={toggleTheme} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'9px 14px', borderRadius:10, border:'none', cursor:'pointer', marginBottom:4, background:'transparent', color:'var(--text2)', fontFamily:'var(--font-dm-sans), sans-serif', fontSize:13, textAlign:'left' }}>
          {theme==='dark' ? <Sun size={16}/> : <Moon size={16}/>}
          {theme==='dark' ? 'Light Mode' : 'Dark Mode'}
        </button>

        <button onClick={() => setShowSettings(true)} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:12, background:'var(--bg3)', marginTop:4, border:'none', cursor:'pointer', textAlign:'left' }}>
          {currentUser?.avatar ? (
            <img src={currentUser.avatar} alt={displayName} style={{ width:32, height:32, borderRadius:'50%', objectFit:'cover' }}/>
          ) : (
            <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'white', flexShrink:0 }}>
              {initials}
            </div>
          )}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:'var(--font-dm-sans), sans-serif' }}>{displayName}</div>
            <div style={{ fontSize:11, color:'var(--text3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{displayHandle}</div>
          </div>
          <UserCircle size={15} color="var(--text3)" style={{ flexShrink:0 }}/>
        </button>
      </div>
    </div>
  );
}
