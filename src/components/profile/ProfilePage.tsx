'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Link2, Calendar, BadgeCheck, Grid3X3, Heart, MessageCircle, Settings, Camera, Loader2, CheckCircle, X, Bookmark, Trash2, Edit3 } from 'lucide-react';
import { fmtNum } from '@/lib/data';
import { usersAPI, postsAPI, apiFetch } from '@/lib/api';
import { useStore } from '@/store/useStore';
import RealPostCard from '@/components/feed/RealPostCard';

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

// Helper function to get full image URL
const getImageUrl = (url: string | undefined) => {
  if (!url) return null;
  if (url.startsWith('/uploads')) {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    return `${apiBase}${url}`;
  }
  return url;
};

export default function ProfilePage() {
  const [tab, setTab] = useState<'posts'|'liked'|'saved'>('posts');
  const [editOpen, setEditOpen] = useState(false);
  const [myPosts, setMyPosts] = useState<ApiPost[]>([]);
  const [likedPosts, setLikedPosts] = useState<ApiPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingLiked, setLoadingLiked] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<ApiPost | null>(null);
  const [editContent, setEditContent] = useState('');
  const [selectedPost, setSelectedPost] = useState<ApiPost | null>(null);
  const [coverError, setCoverError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const { currentUser, setUser } = useStore(s => ({ currentUser: s.currentUser, setUser: s.setUser }));

  const [name, setName] = useState(currentUser?.fullName || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [username, setUsername] = useState(currentUser?.username || '');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Avatar & cover upload
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Sync form when user loads
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.fullName || '');
      setBio(currentUser.bio || '');
      setUsername(currentUser.username || '');
    }
  }, [currentUser?.id]);

  // Load my posts
  const loadMyPosts = async () => {
    if (!currentUser) return;
    setLoadingPosts(true);
    try {
      const res = await postsAPI.getFeed(1);
      const all = res.data || [];
      const mine = all.filter((p: ApiPost) => p.author?.id === currentUser.id);
      setMyPosts(mine);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  // Load liked posts
  const loadLikedPosts = async () => {
    if (!currentUser) return;
    setLoadingLiked(true);
    try {
      const res = await postsAPI.getFeed(1);
      const all = res.data || [];
      const liked = all.filter((p: ApiPost) => p.isLiked === true);
      setLikedPosts(liked);
    } catch (error) {
      console.error('Error loading liked posts:', error);
    } finally {
      setLoadingLiked(false);
    }
  };

  useEffect(() => {
    loadMyPosts();
  }, [currentUser?.id]);

  useEffect(() => {
    if (tab === 'liked') {
      loadLikedPosts();
    }
  }, [tab, currentUser?.id]);

  // Delete post
  const handleDeletePost = async (postId: string) => {
    try {
      await postsAPI.delete(postId);
      setMyPosts(prev => prev.filter(p => p.id !== postId));
      setDeleteConfirm(null);
      setSelectedPost(null);
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  // Edit post
  const handleEditPost = async () => {
    if (!editingPost || !editContent.trim()) return;
    
    try {
      const response = await postsAPI.update(editingPost.id, editContent);
      
      if (response.success && response.data) {
        setMyPosts(prev => prev.map(p => 
          p.id === editingPost.id ? response.data : p
        ));
        if (selectedPost?.id === editingPost.id) {
          setSelectedPost(response.data);
        }
      }
      
      setEditingPost(null);
      setEditContent('');
    } catch (error) {
      console.error('Error editing post:', error);
    }
  };

  const displayName = currentUser?.fullName || 'User';
  const displayHandle = currentUser?.username ? `@${currentUser.username}` : '';
  const displayBio = currentUser?.bio || '';
  const initials = displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  const stats = [
    { label: 'Posts', value: fmtNum(myPosts.length) },
    { label: 'Followers', value: fmtNum((currentUser as any)?.followersCount || 0) },
    { label: 'Following', value: fmtNum((currentUser as any)?.followingCount || 0) },
  ];

  const getMediaUrl = (mediaUrl: string) => {
    if (mediaUrl && mediaUrl.startsWith('/uploads')) {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      return `${apiBase}${mediaUrl}`;
    }
    return mediaUrl;
  };

  // Upload cover image - NO ALERT
  const uploadCoverImage = async (file: File) => {
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) return;
    if (!file.type.startsWith('image/')) return;
    
    setCoverUploading(true);
    try {
      const reader = new FileReader();
      const dataUrl: string = await new Promise((res, rej) => {
        reader.onload = () => res(reader.result as string);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });

      const res = await apiFetch('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ coverImage: dataUrl }),
      });
      
      if (res?.data?.user) {
        setUser({ ...currentUser!, ...res.data.user });
      }
    } catch (error) {
      console.error('Error uploading cover:', error);
    } finally {
      setCoverUploading(false);
    }
  };

  // Upload avatar image - NO ALERT
  const uploadAvatarImage = async (file: File) => {
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) return;
    if (!file.type.startsWith('image/')) return;
    
    setAvatarUploading(true);
    try {
      const reader = new FileReader();
      const dataUrl: string = await new Promise((res, rej) => {
        reader.onload = () => res(reader.result as string);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });

      const res = await apiFetch('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ avatar: dataUrl }),
      });
      
      if (res?.data?.user) {
        setUser({ ...currentUser!, ...res.data.user });
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await usersAPI.updateProfile({ fullName: name, bio, username });
      if (res?.data?.user) {
        setUser({ ...currentUser!, ...res.data.user });
      }
      setSaveMsg('Saved!');
      setTimeout(() => {
        setSaveMsg(null);
        setEditOpen(false);
      }, 1200);
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
    if (selectedPost?.id === postId) {
      setSelectedPost(prev => prev ? {
        ...prev,
        isLiked: liked,
        _count: { ...prev._count, likes: prev._count.likes + (liked ? 1 : -1) }
      } : null);
    }
  }

  function handleCommentAdded(postId: string, newCommentCount: number) {
    if (tab === 'posts') {
      setMyPosts(prev => prev.map(p =>
        p.id === postId
          ? { ...p, _count: { ...p._count, comments: newCommentCount } }
          : p
      ));
    }
    if (selectedPost?.id === postId) {
      setSelectedPost(prev => prev ? {
        ...prev,
        _count: { ...prev._count, comments: newCommentCount }
      } : null);
    }
  }

  function handlePostDelete(postId: string) {
    setMyPosts(prev => prev.filter(p => p.id !== postId));
    setSelectedPost(null);
  }

  function handleShare(postId: string) {
    if (tab === 'posts') {
      setMyPosts(prev => prev.map(p =>
        p.id === postId
          ? { ...p, _count: { ...p._count, shares: p._count.shares + 1 } }
          : p
      ));
    }
    if (selectedPost?.id === postId) {
      setSelectedPost(prev => prev ? {
        ...prev,
        _count: { ...prev._count, shares: prev._count.shares + 1 }
      } : null);
    }
  }

  // Get cover image URL with full path
  const coverImageUrl = getImageUrl((currentUser as any)?.coverImage);
  const avatarUrl = getImageUrl(currentUser?.avatar);
  
  const coverBg = coverImageUrl && !coverError
    ? `url(${coverImageUrl}) center/cover`
    : 'linear-gradient(135deg, var(--accent), var(--pink), var(--cyan))';

  // Render post grid item
  const PostGridItem = ({ post }: { post: ApiPost }) => {
    const [liked, setLiked] = useState(post.isLiked);
    const [likesCount, setLikesCount] = useState(post._count.likes);
    const [showActions, setShowActions] = useState(false);

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

    const handleClick = () => {
      setSelectedPost(post);
    };

    return (
      <motion.div
        whileHover={{ scale: 1.02, zIndex: 2 }}
        style={{ aspectRatio: '1', borderRadius: 8, overflow: 'hidden', background: 'var(--bg3)', cursor: 'pointer', position: 'relative' }}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
        onClick={handleClick}
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
            
            {showActions && tab === 'posts' && (
              <div style={{
                position: 'absolute',
                top: 8,
                right: 8,
                display: 'flex',
                gap: 8,
                zIndex: 3
              }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingPost(post);
                    setEditContent(post.content || '');
                  }}
                  style={{
                    background: 'rgba(0,0,0,.6)',
                    border: 'none',
                    borderRadius: '50%',
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'white'
                  }}
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirm(post.id);
                  }}
                  style={{
                    background: 'rgba(0,0,0,.6)',
                    border: 'none',
                    borderRadius: '50%',
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#ef4444'
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
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
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: 12, position: 'relative' }}>
            {showActions && tab === 'posts' && (
              <div style={{
                position: 'absolute',
                top: 8,
                right: 8,
                display: 'flex',
                gap: 8,
                zIndex: 3
              }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingPost(post);
                    setEditContent(post.content || '');
                  }}
                  style={{
                    background: 'rgba(0,0,0,.6)',
                    border: 'none',
                    borderRadius: '50%',
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'white'
                  }}
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirm(post.id);
                  }}
                  style={{
                    background: 'rgba(0,0,0,.6)',
                    border: 'none',
                    borderRadius: '50%',
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#ef4444'
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
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
      <div style={{ position: 'relative', height: 180, background: coverBg, backgroundSize: 'cover', backgroundPosition: 'center', overflow: 'hidden' }}>
        {(!coverImageUrl || coverError) && (
          <div style={{ position: 'absolute', inset: 0, background: 'url(https://images.unsplash.com/photo-1557804506-669a67965ba0?w=900&h=220&fit=crop) center/cover', opacity: 0.35 }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, var(--bg) 100%)' }} />
        
        {/* Cover Change Button */}
        <button
          type="button"
          onClick={() => coverInputRef.current?.click()}
          disabled={coverUploading}
          style={{ 
            position: 'absolute', 
            bottom: 12, 
            right: 14, 
            background: 'rgba(0,0,0,.55)', 
            border: '1px solid rgba(255,255,255,.2)', 
            borderRadius: 8, 
            padding: '6px 12px', 
            color: 'white', 
            fontSize: 12, 
            fontWeight: 500, 
            cursor: coverUploading ? 'not-allowed' : 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            gap: 5, 
            backdropFilter: 'blur(4px)',
            opacity: coverUploading ? 0.6 : 1,
            transition: 'all 0.2s',
            zIndex: 10
          }}
          onMouseEnter={(e) => {
            if (!coverUploading) e.currentTarget.style.background = 'rgba(0,0,0,.8)';
          }}
          onMouseLeave={(e) => {
            if (!coverUploading) e.currentTarget.style.background = 'rgba(0,0,0,.55)';
          }}
        >
          {coverUploading ? (
            <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <Camera size={12} />
          )}
          {coverUploading ? 'Uploading…' : 'Change Cover'}
        </button>
        
        <input 
          ref={coverInputRef} 
          type="file" 
          accept="image/*" 
          style={{ display: 'none' }}
          onChange={e => { 
            const file = e.target.files?.[0]; 
            if (file) uploadCoverImage(file);
            e.target.value = ''; 
          }} 
        />
      </div>

      <div style={{ padding: '0 24px', position: 'relative', marginTop: -48 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
          {/* Avatar Section */}
          <div style={{ position: 'relative' }}>
            {avatarUrl && !avatarError ? (
              <img
                src={avatarUrl}
                alt={displayName}
                style={{ width: 84, height: 84, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--bg)' }}
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div style={{ width: 84, height: 84, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--pink))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: 'white', border: '3px solid var(--bg)' }}>
                {initials}
              </div>
            )}
            
            {/* Avatar Change Button */}
            <button 
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              style={{ 
                position: 'absolute', 
                bottom: 0, 
                right: -4, 
                width: 26, 
                height: 26, 
                borderRadius: '50%', 
                background: 'var(--accent)', 
                border: '2px solid var(--bg)', 
                cursor: avatarUploading ? 'not-allowed' : 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: 'white',
                opacity: avatarUploading ? 0.6 : 1,
                transition: 'all 0.2s',
                zIndex: 10
              }}
              onMouseEnter={(e) => {
                if (!avatarUploading) e.currentTarget.style.background = 'var(--accent3)';
              }}
              onMouseLeave={(e) => {
                if (!avatarUploading) e.currentTarget.style.background = 'var(--accent)';
              }}
            >
              {avatarUploading ? (
                <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Camera size={11} />
              )}
            </button>
            
            <input 
              ref={avatarInputRef} 
              type="file" 
              accept="image/*" 
              style={{ display: 'none' }}
              onChange={e => { 
                const file = e.target.files?.[0]; 
                if (file) uploadAvatarImage(file);
                e.target.value = ''; 
              }} 
            />
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

        {/* Posts Grid */}
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

      {/* Post Detail Modal */}
      <AnimatePresence>
        {selectedPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20, overflowY: 'auto' }}
            onClick={() => setSelectedPost(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{ maxWidth: 600, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
              onClick={e => e.stopPropagation()}
            >
              <RealPostCard
                post={selectedPost}
                onLikeToggle={handleLikeToggle}
                onCommentAdded={handleCommentAdded}
                onPostDelete={handlePostDelete}
                onShare={handleShare}
                showComments={true}
              />
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                <button
                  onClick={() => setSelectedPost(null)}
                  style={{
                    padding: '10px 24px',
                    background: 'rgba(255,255,255,.1)',
                    border: '1px solid rgba(255,255,255,.2)',
                    borderRadius: 30,
                    color: 'white',
                    fontSize: 14,
                    cursor: 'pointer',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001, padding: 16 }}
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 20, padding: 24, width: 320, textAlign: 'center' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>🗑️</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>Delete Post?</h3>
              <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>This action cannot be undone.</p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  style={{ padding: '8px 20px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text2)', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeletePost(deleteConfirm)}
                  style={{ padding: '8px 20px', background: '#ef4444', border: 'none', borderRadius: 10, color: 'white', cursor: 'pointer' }}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Post Modal */}
      <AnimatePresence>
        {editingPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001, padding: 16 }}
            onClick={() => setEditingPost(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 20, padding: 24, width: 400, maxWidth: '90vw' }}
              onClick={e => e.stopPropagation()}
            >
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}>Edit Post</h3>
              
              {editingPost.media?.[0] && (
                <div style={{ marginBottom: 16, borderRadius: 12, overflow: 'hidden', background: 'var(--bg3)' }}>
                  {editingPost.media[0].mediaType === 'VIDEO' ? (
                    <video
                      src={getMediaUrl(editingPost.media[0].mediaUrl)}
                      style={{ width: '100%', maxHeight: 150, objectFit: 'cover' }}
                      controls
                    />
                  ) : (
                    <img
                      src={getMediaUrl(editingPost.media[0].mediaUrl)}
                      alt="Current media"
                      style={{ width: '100%', maxHeight: 150, objectFit: 'cover' }}
                    />
                  )}
                  <div style={{ padding: 8, fontSize: 12, color: 'var(--text3)', textAlign: 'center', background: 'rgba(0,0,0,.5)' }}>
                    Current media will be preserved
                  </div>
                </div>
              )}
              
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                rows={4}
                placeholder="Edit your post content..."
                style={{
                  width: '100%',
                  background: 'var(--bg3)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '12px',
                  color: 'var(--text)',
                  fontSize: 14,
                  outline: 'none',
                  resize: 'vertical',
                  marginBottom: 20
                }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setEditingPost(null)}
                  style={{ padding: '8px 20px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text2)', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditPost}
                  style={{ padding: '8px 20px', background: 'linear-gradient(135deg, var(--accent), var(--accent3))', border: 'none', borderRadius: 10, color: 'white', cursor: 'pointer' }}
                >
                  Save Changes
                </button>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 12, textAlign: 'center' }}>
                Note: Media (images/videos) will be preserved. Only text content will be updated.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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