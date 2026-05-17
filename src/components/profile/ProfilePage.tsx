'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Link2, Calendar, BadgeCheck, Grid3X3, Heart, MessageCircle, Settings, Camera, Loader2, CheckCircle, X, Bookmark } from 'lucide-react';
import { fmtNum } from '@/lib/data';
import { usersAPI, postsAPI, apiFetch } from '@/lib/api';
import { useStore } from '@/store/useStore';

interface ApiPost {
  id: string;
  content: string;
  postType: string;
  media: { mediaUrl: string; mediaType: string }[];
  author: { id: string; username: string; fullName: string; avatar?: string };
  _count: { likes: number; comments: number; shares: number };
  isLiked: boolean;
  createdAt: string;
}

export default function ProfilePage() {
  const [tab, setTab]           = useState<'posts'|'liked'|'saved'>('posts');
  const [editOpen, setEditOpen] = useState(false);
  const [myPosts, setMyPosts]   = useState<ApiPost[]>([]);
  const [likedPosts, setLikedPosts] = useState<ApiPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingLiked, setLoadingLiked] = useState(false);

  const { currentUser, setUser } = useStore(s => ({ currentUser: s.currentUser, setUser: s.setUser }));

  const [name, setName]     = useState(currentUser?.fullName || '');
  const [bio, setBio]       = useState(currentUser?.bio      || '');
  const [username, setUsername] = useState(currentUser?.username || '');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Avatar & cover upload
  const [avatarUploading, setAvatarUploading]   = useState(false);
  const [coverUploading, setCoverUploading]     = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef  = useRef<HTMLInputElement>(null);

  // Sync form when user loads
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.fullName || '');
      setBio(currentUser.bio       || '');
      setUsername(currentUser.username || '');
    }
  }, [currentUser?.id]);

  // Load my posts via user profile endpoint
  useEffect(() => {
    if (!currentUser) return;
    setLoadingPosts(true);
    postsAPI.getFeed(1)
      .then((res: any) => {
        const all = res.data || [];
        const mine = all.filter((p: ApiPost) => p.author?.id === currentUser.id);
        setMyPosts(mine);
      })
      .catch(() => setMyPosts([]))
      .finally(() => setLoadingPosts(false));
  }, [currentUser?.id]);

  // Load liked posts
  useEffect(() => {
    if (!currentUser || tab !== 'liked') return;
    setLoadingLiked(true);
    postsAPI.getFeed(1)
      .then((res: any) => {
        const all = res.data || [];
        const liked = all.filter((p: ApiPost) => p.isLiked === true);
        setLikedPosts(liked);
      })
      .catch(() => setLikedPosts([]))
      .finally(() => setLoadingLiked(false));
  }, [currentUser?.id, tab]);

  const displayName   = currentUser?.fullName  || 'User';
  const displayHandle = currentUser?.username  ? `@${currentUser.username}` : '';
  const displayBio    = currentUser?.bio       || '';
  const initials      = displayName.split(' ').map((w:string) => w[0]).join('').slice(0,2).toUpperCase();

  const stats = [
    { label:'Posts',     value: fmtNum(myPosts.length) },
    { label:'Followers', value: fmtNum((currentUser as any)?.followersCount || (currentUser as any)?._count?.followers || 0) },
    { label:'Following', value: fmtNum((currentUser as any)?.followingCount || (currentUser as any)?._count?.following || 0) },
  ];

  const getMediaUrl = (mediaUrl: string) => {
    if (mediaUrl && mediaUrl.startsWith('/uploads')) {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      return `${apiBase}${mediaUrl}`;
    }
    return mediaUrl;
  };

  const uploadImage = async (file: File, type: 'avatar' | 'cover') => {
    const setter = type === 'avatar' ? setAvatarUploading : setCoverUploading;
    setter(true);
    try {
      const reader = new FileReader();
      const dataUrl: string = await new Promise((res, rej) => {
        reader.onload = () => res(reader.result as string);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });

      const field = type === 'avatar' ? 'avatar' : 'coverImage';
      const res = await apiFetch('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ [field]: dataUrl }),
      });
      if (res?.data?.user) {
        setUser({ ...currentUser!, ...res.data.user });
      } else {
        setUser({ ...currentUser!, [field]: dataUrl });
      }
    } catch {
      const objectUrl = URL.createObjectURL(file);
      const field = type === 'avatar' ? 'avatar' : 'coverImage';
      setUser({ ...currentUser!, [field]: objectUrl });
    } finally {
      setter(false);
    }
  };

  const handleSave = async () => {
    setSaving(true); setSaveMsg(null);
    try {
      const res = await usersAPI.updateProfile({ fullName: name, bio, username });
      if (res?.data?.user) setUser({ ...currentUser!, ...res.data.user });
      else setUser({ ...currentUser!, fullName: name, bio, username });
      setSaveMsg('Saved!');
      setTimeout(() => { setSaveMsg(null); setEditOpen(false); }, 1200);
    } catch (e: any) {
      setSaveMsg(e.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  function handleLikeToggle(postId: string, liked: boolean) {
    if (tab === 'posts') {
      setMyPosts(prev => prev.map(p =>
        p.id === postId
          ? { ...p, isLiked: liked, _count: { ...p._count, likes: p._count.likes + (liked ? 1 : -1) } }
          : p
      ));
    } else if (tab === 'liked') {
      setLikedPosts(prev => prev.map(p =>
        p.id === postId
          ? { ...p, isLiked: liked, _count: { ...p._count, likes: p._count.likes + (liked ? 1 : -1) } }
          : p
      ));
    }
  }

  const coverBg = (currentUser as any)?.coverImage
    ? `url(${getMediaUrl((currentUser as any).coverImage)}) center/cover`
    : 'linear-gradient(135deg, var(--accent), var(--pink), var(--cyan))';

  // Render post grid item
  const PostGridItem = ({ post }: { post: ApiPost }) => {
    const [liked, setLiked] = useState(post.isLiked);
    const [likesCount, setLikesCount] = useState(post._count.likes);

    const handleLikeClick = async (e: React.MouseEvent) => {
      e.stopPropagation();
      const newLiked = !liked;
      setLiked(newLiked);
      setLikesCount(prev => newLiked ? prev + 1 : prev - 1);
      handleLikeToggle(post.id, newLiked);
      try {
        if (newLiked) {
          await postsAPI.like(post.id);
        } else {
          await postsAPI.unlike(post.id);
        }
      } catch {
        setLiked(!newLiked);
        setLikesCount(prev => newLiked ? prev - 1 : prev + 1);
        handleLikeToggle(post.id, !newLiked);
      }
    };

    const mediaUrl = post.media?.[0] ? getMediaUrl(post.media[0].mediaUrl) : null;
    const isVideo = post.media?.[0]?.mediaType === 'VIDEO';

    return (
      <motion.div
        whileHover={{ scale: 1.02, zIndex: 2 }}
        style={{ aspectRatio: '1', borderRadius: 8, overflow: 'hidden', background: 'var(--bg3)', cursor: 'pointer', position: 'relative' }}
      >
        {mediaUrl ? (
          <>
            {isVideo ? (
              <video
                src={mediaUrl}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                muted
              />
            ) : (
              <img
                src={mediaUrl}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0)',
                transition: 'background 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12
              }}
              onMouseEnter={e => {
                const d = e.currentTarget as HTMLDivElement;
                d.style.background = 'rgba(0,0,0,.5)';
                const spans = d.querySelectorAll('span');
                spans.forEach(s => (s as HTMLElement).style.opacity = '1');
              }}
              onMouseLeave={e => {
                const d = e.currentTarget as HTMLDivElement;
                d.style.background = 'rgba(0,0,0,0)';
                const spans = d.querySelectorAll('span');
                spans.forEach(s => (s as HTMLElement).style.opacity = '0');
              }}
            >
              <span style={{ color: 'white', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, opacity: 0, transition: 'opacity 0.2s' }}>
                <Heart size={14} fill="white" /> {fmtNum(likesCount)}
              </span>
              <span style={{ color: 'white', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, opacity: 0, transition: 'opacity 0.2s' }}>
                <MessageCircle size={14} /> {fmtNum(post._count.comments)}
              </span>
            </div>
            <button
              onClick={handleLikeClick}
              style={{
                position: 'absolute',
                bottom: 8,
                right: 8,
                background: 'rgba(0,0,0,.5)',
                border: 'none',
                borderRadius: '50%',
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: liked ? 'var(--red)' : 'white',
                zIndex: 2
              }}
            >
              <Heart size={14} fill={liked ? 'var(--red)' : 'none'} />
            </button>
          </>
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: 12 }}>
            <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, flex: 1, overflow: 'hidden' }}>
              {post.content?.slice(0, 80)}{post.content?.length > 80 ? '…' : ''}
            </p>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
              ❤ {fmtNum(likesCount)} · 💬 {fmtNum(post._count.comments)}
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      {/* Banner / Cover */}
      <div style={{ position: 'relative', height: 180, background: coverBg, overflow: 'hidden' }}>
        {!(currentUser as any)?.coverImage && (
          <div style={{ position: 'absolute', inset: 0, background: 'url(https://images.unsplash.com/photo-1557804506-669a67965ba0?w=900&h=220&fit=crop) center/cover', opacity: 0.35 }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, var(--bg) 100%)' }} />
        <button
          onClick={() => coverInputRef.current?.click()}
          disabled={coverUploading}
          style={{ position: 'absolute', bottom: 12, right: 14, background: 'rgba(0,0,0,.55)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 8, padding: '6px 12px', color: 'white', fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, backdropFilter: 'blur(4px)' }}
        >
          {coverUploading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Camera size={12} />}
          {coverUploading ? 'Uploading…' : 'Change Cover'}
        </button>
        <input ref={coverInputRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f, 'cover'); e.target.value = ''; }} />
      </div>

      <div style={{ padding: '0 24px', position: 'relative', marginTop: -48 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ position: 'relative' }}>
            {currentUser?.avatar ? (
              <img src={getMediaUrl(currentUser.avatar)} alt={displayName}
                style={{ width: 84, height: 84, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--bg)' }} />
            ) : (
              <div style={{ width: 84, height: 84, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--pink))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: 'white', border: '3px solid var(--bg)' }}>
                {initials}
              </div>
            )}
            <button onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              style={{ position: 'absolute', bottom: 0, right: -4, width: 26, height: 26, borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              {avatarUploading ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Camera size={11} />}
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f, 'avatar'); e.target.value = ''; }} />
          </div>

          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setEditOpen(true)}
            style={{ padding: '9px 20px', background: 'linear-gradient(135deg, var(--accent), var(--accent3))', border: 'none', borderRadius: 10, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Settings size={13} /> Edit Profile
          </motion.button>
        </div>

        <div style={{ marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{displayName}</span>
            {currentUser?.isVerified && <BadgeCheck size={18} color="var(--accent2)" fill="var(--accent2)" />}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 10 }}>{displayHandle}</div>
          {displayBio && <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.65, maxWidth: 520, marginBottom: 12 }}>{displayBio}</p>}
          {currentUser?.createdAt && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--text3)' }}>
              <Calendar size={13} /> Joined {new Date(currentUser.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 28, margin: '18px 0 24px', paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
          {stats.map(s => (
            <div key={s.label}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
          {(['posts', 'liked', 'saved'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                padding: '10px 20px', background: 'none', border: 'none', fontSize: 14, fontWeight: tab === t ? 700 : 400,
                color: tab === t ? 'var(--accent2)' : 'var(--text3)', cursor: 'pointer', fontFamily: 'DM Sans',
                borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent', transition: 'all 0.2s'
              }}>
              {t === 'posts' ? 'Posts' : t === 'liked' ? 'Liked' : 'Saved'}
            </button>
          ))}
        </div>

        {/* Posts Grid - 3 or 4 columns based on screen size */}
        {tab === 'posts' && (
          <>
            {loadingPosts ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 6 }}>
                {[...Array(9)].map((_, i) => (
                  <div key={i} style={{ aspectRatio: '1', borderRadius: 8, background: 'var(--bg3)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                ))}
              </div>
            ) : myPosts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
                <Grid3X3 size={40} style={{ opacity: 0.3, marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>No posts yet</p>
                <p style={{ fontSize: 13 }}>Posts you create will appear here</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, paddingBottom: 32 }}>
                {myPosts.map((post) => (
                  <PostGridItem key={post.id} post={post} />
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'liked' && (
          <>
            {loadingLiked ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 6 }}>
                {[...Array(9)].map((_, i) => (
                  <div key={i} style={{ aspectRatio: '1', borderRadius: 8, background: 'var(--bg3)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                ))}
              </div>
            ) : likedPosts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
                <Heart size={40} style={{ opacity: 0.3, marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>No liked posts yet</p>
                <p style={{ fontSize: 13 }}>Posts you like will appear here</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, paddingBottom: 32 }}>
                {likedPosts.map((post) => (
                  <PostGridItem key={post.id} post={post} />
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'saved' && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
            <Bookmark size={40} style={{ opacity: 0.3, marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>Saved posts</p>
            <p style={{ fontSize: 13 }}>Posts you save will appear here</p>
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {editOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16, backdropFilter: 'blur(4px)' }}
            onClick={e => { if (e.target === e.currentTarget && !saving) setEditOpen(false); }}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 20, padding: 32, width: 480, maxWidth: '95vw', boxShadow: '0 24px 64px var(--shadow)' }}>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: 0 }}>Edit Profile</h2>
                <button onClick={() => setEditOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}><X size={18} /></button>
              </div>

              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>Display Name</label>
              <input value={name} onChange={e => setName(e.target.value)}
                style={{ width: '100%', background: 'var(--bg3)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '10px 14px', color: 'var(--text)', fontSize: 14, outline: 'none', marginBottom: 16, boxSizing: 'border-box' }}
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} />

              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>Username</label>
              <input value={username} onChange={e => setUsername(e.target.value.replace(/\s/g, ''))}
                style={{ width: '100%', background: 'var(--bg3)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '10px 14px', color: 'var(--text)', fontSize: 14, outline: 'none', marginBottom: 16, boxSizing: 'border-box' }}
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} />

              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>Bio</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
                style={{ width: '100%', background: 'var(--bg3)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '10px 14px', color: 'var(--text)', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'DM Sans', lineHeight: 1.6, marginBottom: 24, boxSizing: 'border-box' }}
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} />

              {saveMsg && (
                <div style={{ marginBottom: 12, padding: '8px 14px', borderRadius: 8, fontSize: 13,
                  background: saveMsg === 'Saved!' ? '#22c55e22' : '#ef444422',
                  color: saveMsg === 'Saved!' ? 'var(--green)' : 'var(--red)',
                  display: 'flex', alignItems: 'center', gap: 6 }}>
                  {saveMsg === 'Saved!' ? <CheckCircle size={14} /> : null} {saveMsg}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setEditOpen(false)} disabled={saving}
                  style={{ padding: '10px 20px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text2)', fontSize: 14, cursor: 'pointer' }}>Cancel</button>
                <motion.button whileTap={{ scale: 0.96 }} onClick={handleSave} disabled={saving}
                  style={{ padding: '10px 24px', background: 'linear-gradient(135deg, var(--accent), var(--accent3))', border: 'none', borderRadius: 10, color: 'white', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: saving ? 0.8 : 1 }}>
                  {saving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : 'Save Changes'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <style>{`
        @keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>
    </div>
  );
}