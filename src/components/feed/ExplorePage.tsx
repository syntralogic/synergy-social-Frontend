'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, TrendingUp, UserCheck, UserPlus, Loader2, MessageCircle, X, Filter } from 'lucide-react';
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
  const setPage = useStore(s => s.setPage);
  const setMessageUserId = useStore(s => s.setMessageUserId);

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ApiUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [explorePosts, setExplorePosts] = useState<ApiPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showRecentSearches, setShowRecentSearches] = useState(false);
  const [searchType, setSearchType] = useState<'all' | 'users' | 'posts'>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('recentSearches');
      if (saved) {
        setRecentSearches(JSON.parse(saved).slice(0, 5));
      }
    } catch (e) {
      console.error('Failed to load recent searches:', e);
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearch = (term: string) => {
    if (!term.trim()) return;
    const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
    setRecentSearches(updated);
    try {
      localStorage.setItem('recentSearches', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save recent search:', e);
    }
  };

  // Debounced search with flexible options
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { 
      setSearchResults([]); 
      return; 
    }
    
    setSearching(true);
    try {
      let results: ApiUser[] = [];
      
      // If searchType is 'posts', we could fetch posts too
      // For now, we search users with flexible matching
      const users: ApiUser[] = await searchUsers(q);
      
      // If searchType is 'users' or 'all', include users
      if (searchType === 'users' || searchType === 'all') {
        results = users;
      }
      
      setSearchResults(results);
      
      // Save to recent searches if we have results
      if (results.length > 0) {
        saveRecentSearch(q);
      }
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchType]);

  useEffect(() => {
    const t = setTimeout(() => {
      doSearch(query);
    }, 300);
    return () => clearTimeout(t);
  }, [query, doSearch]);

  // Handle search from trending tag
  const handleTagClick = (tag: string) => {
    setQuery(tag.replace('#', ''));
    setSearchType('all');
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const handleMessage = (u: ApiUser) => {
    setMessageUserId(u.id);
    setPage('messages');
  };

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

  const clearSearch = () => {
    setQuery('');
    setSearchResults([]);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem('recentSearches');
    } catch (e) {
      console.error('Failed to clear recent searches:', e);
    }
  };

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
      {/* Search bar with flexible options */}
      <div style={{ position:'relative', maxWidth:560, margin:'0 auto 24px' }}>
        <div style={{ 
          display: 'flex', 
          gap: 8,
          background: 'var(--bg2)',
          border: '1.5px solid var(--border)',
          borderRadius: 50,
          padding: '4px',
          transition: 'border-color 0.2s',
          alignItems: 'center'
        }}
        onFocus={() => {
          const parent = document.activeElement?.parentElement;
          if (parent) parent.style.borderColor = 'var(--accent)';
        }}
        onBlur={() => {
          const parent = document.activeElement?.parentElement;
          if (parent) parent.style.borderColor = 'var(--border)';
        }}
        >
          <Search size={16} style={{ color: 'var(--text3)', marginLeft: 10 }} />
          
          <input
            ref={searchInputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setShowRecentSearches(true)}
            onBlur={() => setTimeout(() => setShowRecentSearches(false), 200)}
            placeholder="Search people, posts, or topics..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              padding: '10px 0',
              color: 'var(--text)',
              fontSize: 14,
              outline: 'none',
              fontFamily:'var(--font-dm-sans), sans-serif'
            }}
          />
          
          {query && (
            <button
              onClick={clearSearch}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text3)',
                cursor: 'pointer',
                padding: '4px 8px'
              }}
            >
              <X size={14} />
            </button>
          )}
          
          {searching && (
            <Loader2 size={16} style={{ 
              animation: 'spin 1s linear infinite',
              color: 'var(--accent)',
              marginRight: 8
            }}/>
          )}
        </div>

        {/* Search type filter */}
        <div style={{ 
          display: 'flex', 
          gap: 6, 
          marginTop: 8,
          justifyContent: 'center'
        }}>
          {['all', 'users', 'posts'].map(type => (
            <button
              key={type}
              onClick={() => setSearchType(type as 'all' | 'users' | 'posts')}
              style={{
                padding: '4px 12px',
                borderRadius: 12,
                border: '1px solid',
                borderColor: searchType === type ? 'var(--accent)' : 'var(--border)',
                background: searchType === type ? 'var(--accent)' : 'transparent',
                color: searchType === type ? 'white' : 'var(--text3)',
                fontSize: 11,
                cursor: 'pointer',
                fontFamily:'var(--font-dm-sans)',
                transition: 'all 0.2s'
              }}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Searches */}
      <AnimatePresence>
        {showRecentSearches && recentSearches.length > 0 && !query && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              maxWidth: 560,
              margin: '-12px auto 16px',
              padding: '8px 16px',
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 10
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>Recent Searches</span>
              <button
                onClick={clearRecentSearches}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text3)',
                  fontSize: 11,
                  cursor: 'pointer'
                }}
              >
                Clear
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {recentSearches.map(term => (
                <button
                  key={term}
                  onClick={() => {
                    setQuery(term);
                    doSearch(term);
                  }}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    background: 'var(--bg3)',
                    color: 'var(--text2)',
                    fontSize: 12,
                    cursor: 'pointer',
                    fontFamily:'var(--font-dm-sans)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg4, var(--bg3))')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg3)')}
                >
                  {term}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search results dropdown */}
      {query.trim() && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ 
            maxWidth: 560, 
            margin: '-12px auto 24px', 
            background: 'var(--bg2)', 
            border: '1px solid var(--border)', 
            borderRadius: 14, 
            overflow: 'hidden' 
          }}
        >
          {searching && (
            <div style={{ padding:'16px', textAlign:'center', color:'var(--text3)', fontSize:13 }}>
              <Loader2 size={16} style={{ animation:'spin 1s linear infinite', display:'inline', marginRight:6 }}/>
              Searching…
            </div>
          )}
          {!searching && searchResults.length === 0 && (
            <div style={{ padding:'20px', textAlign:'center', color:'var(--text3)', fontSize:13 }}>
              <p>No users found for "{query}"</p>
              <p style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}>
                Try searching with a different keyword or check the spelling
              </p>
            </div>
          )}
          {!searching && searchResults.map((u, i) => (
            <div key={u.id} style={{ 
              display:'flex', 
              alignItems:'center', 
              gap:12, 
              padding:'12px 16px', 
              borderBottom: i < searchResults.length-1 ? '1px solid var(--border)' : 'none',
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {u.avatar ? (
                <img src={u.avatar} alt={u.fullName} style={{ width:40, height:40, borderRadius:'50%', objectFit:'cover' }}/>
              ) : (
                <div style={{ width:40, height:40, borderRadius:'50%', background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:700, color:'white' }}>
                  {u.fullName?.charAt(0)?.toUpperCase() || u.username?.charAt(0)?.toUpperCase()}
                </div>
              )}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:600, color:'var(--text)' }}>{u.fullName}</div>
                <div style={{ fontSize:12, color:'var(--text3)' }}>@{u.username}</div>
                {u.bio && (
                  <div style={{ fontSize:11, color:'var(--text3)', marginTop:2, opacity:0.7, maxWidth:'100%', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {u.bio}
                  </div>
                )}
              </div>
              {u.id !== currentUser?.id && (
                <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
                  <button onClick={() => handleMessage(u)}
                    style={{ padding:'5px 12px', borderRadius:20, border:'1.5px solid var(--border)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'var(--font-dm-sans)',
                      background: 'transparent',
                      color: 'var(--text2)',
                      display:'flex', alignItems:'center', gap:4
                    }}>
                    <MessageCircle size={12}/> Message
                  </button>
                  <button onClick={() => handleFollow(u)}
                    style={{ padding:'5px 14px', borderRadius:20, border:'1.5px solid', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'var(--font-dm-sans)',
                      borderColor: following[u.id] ? 'var(--border2)' : 'var(--accent)',
                      background:  following[u.id] ? 'transparent' : 'var(--accent)',
                      color:       following[u.id] ? 'var(--text2)' : 'white',
                      display:'flex', alignItems:'center', gap:4,
                      transition: 'all 0.2s'
                    }}>
                    {following[u.id] ? <><UserCheck size={12}/> Following</> : <><UserPlus size={12}/> Follow</>}
                  </button>
                </div>
              )}
            </div>
          ))}
        </motion.div>
      )}

      <div style={{ maxWidth:900, margin:'0 auto', display:'grid', gridTemplateColumns:'1fr 300px', gap:24 }}>
        {/* Posts feed - using RealPostCard */}
        <div>
          <h2 style={{ fontFamily:'var(--font-syne), sans-serif', fontSize:16, fontWeight:700, color:'var(--text)', marginBottom:14, display:'flex', alignItems:'center', gap:6 }}>
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
                  onMessage={(userId) => {
                    setMessageUserId(userId);
                    setPage('messages');
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Trending Tags & Search tips */}
        <div>
          <h2 style={{ fontFamily:'var(--font-syne), sans-serif', fontSize:16, fontWeight:700, color:'var(--text)', marginBottom:12 }}>Trending Tags</h2>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {TREND_TAGS.map(t => (
              <span key={t} onClick={() => handleTagClick(t)}
                style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:20, padding:'5px 12px', fontSize:12, color:'var(--text2)', cursor:'pointer', fontWeight:500, transition:'background 0.2s' }}
                onMouseEnter={e=>(e.currentTarget.style.background='var(--bg4, var(--bg2))')}
                onMouseLeave={e=>(e.currentTarget.style.background='var(--bg3)')}>
                {t}
              </span>
            ))}
          </div>
          <p style={{ fontSize:11, color:'var(--text3)', marginTop:12 }}>
            Click a tag to search for related content
          </p>

          {/* Search tips */}
          <div style={{
            marginTop: 20,
            padding: '16px',
            background: 'var(--bg3)',
            borderRadius: 12,
            border: '1px solid var(--border)'
          }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 8 }}>
              🔍 Search Tips
            </h3>
            <ul style={{ fontSize: 12, color: 'var(--text3)', paddingLeft: 16, margin: 0, lineHeight: 1.8 }}>
              <li>Search by <strong>name</strong> or <strong>username</strong></li>
              <li>Use <strong>#hashtag</strong> to find related topics</li>
              <li>Filter by <strong>Users</strong> or <strong>Posts</strong></li>
              <li>Recent searches are saved for quick access</li>
            </ul>
          </div>
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
