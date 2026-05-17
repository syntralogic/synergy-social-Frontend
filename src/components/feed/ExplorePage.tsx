'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, TrendingUp, UserCheck, UserPlus, Loader2 } from 'lucide-react';
import { INIT_POSTS, TREND_TAGS, fmtNum } from '@/lib/data';
import Avatar from '@/components/ui/Avatar';
import { useStore } from '@/store/useStore';
import { usersAPI, postsAPI, searchUsers } from '@/lib/api';
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

interface ApiUser {
  id: string;
  username: string;
  fullName: string;
  avatar?: string;
  bio?: string;
  _count?: { followers: number; following: number; posts: number };
}

export default function ExplorePage() {
  const { following, toggleFollow } = useStore(s => ({ following: s.following, toggleFollow: s.toggleFollow }));
  const currentUser = useStore(s => s.currentUser);

  const [query, setQuery]           = useState('');
  const [searchResults, setSearchResults] = useState<ApiUser[]>([]);
  const [searching, setSearching]   = useState(false);
  const [explorePosts, setExplorePosts] = useState<ApiPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Load explore posts on mount
  useEffect(() => {
    setLoading(true);
    postsAPI.getExplore(1)
      .then((res: any) => {
        setExplorePosts(res.data || []);
      })
      .catch(() => setExplorePosts([]))
      .finally(() => setLoading(false));
  }, []);

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const users: ApiUser[] = await searchUsers(q);
      setSearchResults(users);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 400);
    return () => clearTimeout(t);
  }, [query, doSearch]);

  const handleFollow = async (u: ApiUser) => {
    toggleFollow(u.id);
    try {
      if (following[u.id]) {
        await usersAPI.unfollow(u.id);
      } else {
        await usersAPI.follow(u.id);
      }
    } catch {
      toggleFollow(u.id);
    }
  };

  function handleLikeToggle(postId: string, liked: boolean) {
    setExplorePosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, isLiked: liked, _count: { ...p._count, likes: p._count.likes + (liked ? 1 : -1) } }
        : p
    ));
  }

  function handleCommentAdded(postId: string, newCommentCount: number) {
    setExplorePosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, _count: { ...p._count, comments: newCommentCount } }
        : p
    ));
  }

  function handlePostDelete(postId: string) {
    setExplorePosts(prev => prev.filter(p => p.id !== postId));
  }

  function handleShare(postId: string) {
    setExplorePosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, _count: { ...p._count, shares: p._count.shares + 1 } }
        : p
    ));
  }

  // Show loading state
  if (loading && explorePosts.length === 0) {
    return (
      <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Loader2 size={32} style={{ animation:'spin 1s linear infinite', color:'var(--accent)' }} />
      </div>
    );
  }

  return (
    <div style={{ height:'100%', overflowY:'auto', padding:'20px 20px' }}>
      {/* Search bar */}
      <div style={{ position:'relative', maxWidth:560, margin:'0 auto 24px' }}>
        <div style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--text3)' }}>
          {searching ? <Loader2 size={16} style={{ animation:'spin 1s linear infinite' }}/> : <Search size={16}/>}
        </div>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search people by name or username…"
          style={{ width:'100%', background:'var(--bg2)', border:'1.5px solid var(--border)', borderRadius:50, padding:'12px 14px 12px 42px', color:'var(--text)', fontSize:14, outline:'none', transition:'border-color 0.2s', boxSizing:'border-box' }}
          onFocus={e => (e.target.style.borderColor='var(--accent)')}
          onBlur={e => (e.target.style.borderColor='var(--border)')}
        />
      </div>

      {/* Search results dropdown */}
      {query.trim() && (
        <div style={{ maxWidth:560, margin:'-12px auto 24px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
          {searching && (
            <div style={{ padding:'16px', textAlign:'center', color:'var(--text3)', fontSize:13 }}>
              <Loader2 size={16} style={{ animation:'spin 1s linear infinite', display:'inline', marginRight:6 }}/>
              Searching…
            </div>
          )}
          {!searching && searchResults.length === 0 && (
            <div style={{ padding:'16px', textAlign:'center', color:'var(--text3)', fontSize:13 }}>
              No users found for "{query}"
            </div>
          )}
          {!searching && searchResults.map((u, i) => (
            <div key={u.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom: i < searchResults.length-1 ? '1px solid var(--border)' : 'none' }}>
              {u.avatar ? (
                <img src={u.avatar} alt={u.fullName} style={{ width:40, height:40, borderRadius:'50%', objectFit:'cover' }}/>
              ) : (
                <div style={{ width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg, var(--accent), var(--pink))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:700, color:'white' }}>
                  {u.fullName?.charAt(0)?.toUpperCase() || u.username?.charAt(0)?.toUpperCase()}
                </div>
              )}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:600, color:'var(--text)' }}>{u.fullName}</div>
                <div style={{ fontSize:12, color:'var(--text3)' }}>@{u.username}</div>
              </div>
              {u.id !== currentUser?.id && (
                <button onClick={() => handleFollow(u)}
                  style={{ padding:'5px 14px', borderRadius:20, border:'1.5px solid', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans',
                    borderColor: following[u.id] ? 'var(--border2)' : 'var(--accent)',
                    background:  following[u.id] ? 'transparent' : 'var(--accent)',
                    color:       following[u.id] ? 'var(--text2)' : 'white',
                    display:'flex', alignItems:'center', gap:4
                  }}>
                  {following[u.id] ? <><UserCheck size={12}/> Following</> : <><UserPlus size={12}/> Follow</>}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ maxWidth:900, margin:'0 auto', display:'grid', gridTemplateColumns:'1fr 300px', gap:24 }}>
        {/* Posts feed - using RealPostCard */}
        <div>
          <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:16, fontWeight:700, color:'var(--text)', marginBottom:14, display:'flex', alignItems:'center', gap:6 }}>
            <TrendingUp size={15}/> Trending Posts
          </h2>
          {explorePosts.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--text3)' }}>
              <p>No posts yet</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {explorePosts.map((post) => (
                <RealPostCard
                  key={post.id}
                  post={post}
                  onLikeToggle={handleLikeToggle}
                  onCommentAdded={handleCommentAdded}
                  onPostDelete={handlePostDelete}
                  onShare={handleShare}
                />
              ))}
            </div>
          )}
        </div>

        {/* Trending Tags only */}
        <div>
          <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:16, fontWeight:700, color:'var(--text)', marginBottom:12 }}>Trending Tags</h2>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {TREND_TAGS.map(t => (
              <span key={t} onClick={() => setQuery(t.replace('#',''))}
                style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:20, padding:'5px 12px', fontSize:12, color:'var(--text2)', cursor:'pointer', fontWeight:500, transition:'background 0.2s' }}
                onMouseEnter={e=>(e.currentTarget.style.background='var(--bg4, var(--bg2))')}
                onMouseLeave={e=>(e.currentTarget.style.background='var(--bg3)')}>
                {t}
              </span>
            ))}
          </div>
          <p style={{ fontSize:11, color:'var(--text3)', marginTop:12 }}>Click a tag to search for related people</p>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
        @media (max-width:768px) {
          div[style*="grid-template-columns: 1fr 300px"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}