'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, TrendingUp, UserCheck, UserPlus, Loader2, MessageCircle, X, Filter, Users, Hash, User } from 'lucide-react';
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
  const [searchFilter, setSearchFilter] = useState<'all' | 'users' | 'posts'>('all');
  const [searchHistory, setSearchHistory] = useState<{term: string, timestamp: number}[]>([]);
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
        const parsed = JSON.parse(saved);
        setRecentSearches(parsed.slice(0, 5));
        setSearchHistory(parsed.map((term: string) => ({ term, timestamp: Date.now() })));
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
    setSearchHistory(updated.map(t => ({ term: t, timestamp: Date.now() })));
    try {
      localStorage.setItem('recentSearches', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save recent search:', e);
    }
  };

  // Enhanced search with better filtering
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { 
      setSearchResults([]); 
      return; 
    }
    
    setSearching(true);
    try {
      let results: ApiUser[] = [];
      
      // Always search for users first
      const users: ApiUser[] = await searchUsers(q);
      
      // Filter based on search type
      if (searchFilter === 'users' || searchFilter === 'all') {
        results = users;
      }
      
      // If searching for posts, we could fetch posts too (future enhancement)
      if (searchFilter === 'posts') {
        // Could implement posts search here
        // For now, just show users
        results = users;
      }
      
      setSearchResults(results);
      
      // Save to recent searches if we have results
      if (results.length > 0) {
        saveRecentSearch(q);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchFilter]);

  // Debounced search with better timing
  useEffect(() => {
    const t = setTimeout(() => {
      if (query.trim()) {
        doSearch(query);
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, doSearch]);

  // Handle search from trending tag
  const handleTagClick = (tag: string) => {
    const searchTerm = tag.replace('#', '');
    setQuery(searchTerm);
    setSearchFilter('all');
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
    doSearch(searchTerm);
  };

  // Handle search from recent search
  const handleRecentSearchClick = (term: string) => {
    setQuery(term);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
    doSearch(term);
    setShowRecentSearches(false);
  };

  const handleMessage = (u: ApiUser) => {
    setMessageUserId(u.id);
    setPage('messages');
  };

  const handleFollow = async (u: ApiUser) => {
    const currentFollowState = following[u.id] || false;
    
    // Optimistic update
    toggleFollow(u.id);
    
    try {
      if (currentFollowState) {
        await usersAPI.unfollow(u.id);
      } else {
        await usersAPI.follow(u.id);
      }
    } catch (error) {
      // Revert on error
      toggleFollow(u.id);
      console.error('Follow action failed:', error);
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

  const handleMessageUser = (userId: string) => {
    setMessageUserId(userId);
    setPage('messages');
  };

  const clearSearch = () => {
    setQuery('');
    setSearchResults([]);
    setShowRecentSearches(false);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    setSearchHistory([]);
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
          padding: '4px 4px 4px 16px',
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
          <Search size={18} style={{ color: 'var(--text3)', flexShrink: 0 }} />
          
          <input
            ref={searchInputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setShowRecentSearches(true)}
            onBlur={() => setTimeout(() => setShowRecentSearches(false), 300)}
            placeholder="Search people, posts, or topics..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              padding: '10px 8px',
              color: 'var(--text)',
              fontSize: 14,
              outline: 'none',
              fontFamily:'var(--font-dm-sans), sans-serif',
              minWidth: 0
            }}
          />
          
          {query && !searching && (
            <button
              onClick={clearSearch}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text3)',
                cursor: 'pointer',
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={16} />
            </button>
          )}
          
          {searching && (
            <Loader2 size={18} style={{ 
              animation: 'spin 1s linear infinite',
              color: 'var(--accent)',
              marginRight: 8,
              flexShrink: 0
            }}/>
          )}
        </div>

        {/* Search type filter */}
        <div style={{ 
          display: 'flex', 
          gap: 6, 
          marginTop: 10,
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          {[
            { value: 'all', label: 'All', icon: <Search size={12} /> },
            { value: 'users', label: 'Users', icon: <User size={12} /> },
            { value: 'posts', label: 'Posts', icon: <Hash size={12} /> }
          ].map(filter => (
            <button
              key={filter.value}
              onClick={() => {
                setSearchFilter(filter.value as 'all' | 'users' | 'posts');
                if (query.trim()) {
                  doSearch(query);
                }
              }}
              style={{
                padding: '5px 14px',
                borderRadius: 16,
                border: '1.5px solid',
                borderColor: searchFilter === filter.value ? 'var(--accent)' : 'var(--border)',
                background: searchFilter === filter.value ? 'var(--accent)' : 'transparent',
                color: searchFilter === filter.value ? 'white' : 'var(--text3)',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily:'var(--font-dm-sans)',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
              onMouseEnter={e => {
                if (searchFilter !== filter.value) {
                  e.currentTarget.style.background = 'var(--bg3)';
                }
              }}
              onMouseLeave={e => {
                if (searchFilter !== filter.value) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {filter.icon}
              {filter.label}
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
              padding: '12px 16px',
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 12
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>Recent Searches</span>
              <button
                onClick={clearRecentSearches}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text3)',
                  fontSize: 11,
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: 4,
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                Clear all
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {recentSearches.map(term => (
                <button
                  key={term}
                  onClick={() => handleRecentSearchClick(term)}
                  style={{
                    padding: '4px 14px',
                    borderRadius: 14,
                    border: '1px solid var(--border)',
                    background: 'var(--bg3)',
                    color: 'var(--text2)',
                    fontSize: 12,
                    cursor: 'pointer',
                    fontFamily:'var(--font-dm-sans)',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--accent)';
                    e.currentTarget.style.color = 'white';
                    e.currentTarget.style.borderColor = 'var(--accent)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'var(--bg3)';
                    e.currentTarget.style.color = 'var(--text2)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }}
                >
                  <Search size={10} />
                  {term}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search results dropdown - WITH ALL BUTTONS RESTORED */}
      <AnimatePresence>
        {query.trim() && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{ 
              maxWidth: 560, 
              margin: '-12px auto 24px', 
              background: 'var(--bg2)', 
              border: '1px solid var(--border)', 
              borderRadius: 14, 
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
          >
            {searching && (
              <div style={{ padding:'20px', textAlign:'center', color:'var(--text3)', fontSize:13 }}>
                <Loader2 size={18} style={{ animation:'spin 1s linear infinite', display:'inline', marginRight:8 }}/>
                Searching for "{query}"...
              </div>
            )}
            
            {!searching && searchResults.length === 0 && (
              <div style={{ padding:'24px 20px', textAlign:'center' }}>
                <div style={{ 
                  fontSize: 40, 
                  marginBottom: 8,
                  opacity: 0.5
                }}>🔍</div>
                <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500, marginBottom: 4 }}>
                  No results found for "{query}"
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                  Try different keywords or check the spelling
                </div>
              </div>
            )}
            
            {!searching && searchResults.length > 0 && (
              <>
                <div style={{ 
                  padding: '8px 16px', 
                  fontSize: 11, 
                  color: 'var(--text3)',
                  borderBottom: '1px solid var(--border)',
                  background: 'var(--bg3)',
                  fontWeight: 500
                }}>
                  {searchResults.length} {searchResults.length === 1 ? 'user' : 'users'} found
                </div>
                
                {searchResults.map((u, i) => (
                  <div 
                    key={u.id} 
                    style={{ 
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
                    {/* Avatar */}
                    {u.avatar ? (
                      <img 
                        src={u.avatar} 
                        alt={u.fullName} 
                        style={{ width:44, height:44, borderRadius:'50%', objectFit:'cover', flexShrink:0 }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div style={{ 
                        width:44, 
                        height:44, 
                        borderRadius:'50%', 
                        background:'var(--accent)', 
                        display:'flex', 
                        alignItems:'center', 
                        justifyContent:'center', 
                        fontSize:16, 
                        fontWeight:700, 
                        color:'white',
                        flexShrink:0
                      }}>
                        {u.fullName?.charAt(0)?.toUpperCase() || u.username?.charAt(0)?.toUpperCase()}
                      </div>
                    )}
                    
                    {/* User info */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:600, color:'var(--text)' }}>{u.fullName}</div>
                      <div style={{ fontSize:12, color:'var(--text3)' }}>@{u.username}</div>
                      {u.bio && (
                        <div style={{ 
                          fontSize:12, 
                          color:'var(--text3)', 
                          marginTop:2, 
                          opacity:0.7,
                          whiteSpace:'nowrap',
                          overflow:'hidden',
                          textOverflow:'ellipsis'
                        }}>
                          {u.bio}
                        </div>
                      )}
                      {u._count && (
                        <div style={{ 
                          display: 'flex', 
                          gap: 12, 
                          marginTop: 3,
                          fontSize: 11, 
                          color: 'var(--text3)' 
                        }}>
                          <span>{fmtNum(u._count.followers || 0)} followers</span>
                          <span>{fmtNum(u._count.posts || 0)} posts</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Action buttons - FULLY RESTORED */}
                    {u.id !== currentUser?.id && (
                      <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
                        {/* Message Button */}
                        <button 
                          onClick={() => handleMessage(u)}
                          style={{
                            padding:'5px 10px',
                            borderRadius:20,
                            border:'1.5px solid var(--border)',
                            fontSize:11,
                            fontWeight:600,
                            cursor:'pointer',
                            fontFamily:'var(--font-dm-sans)',
                            background: 'transparent',
                            color: 'var(--text2)',
                            display:'flex',
                            alignItems:'center',
                            gap:3,
                            transition: 'all 0.2s',
                            whiteSpace: 'nowrap'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = 'var(--bg3)';
                            e.currentTarget.style.borderColor = 'var(--accent)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.borderColor = 'var(--border)';
                          }}
                        >
                          <MessageCircle size={12}/> 
                          <span style={{ display: 'inline' }}>Message</span>
                        </button>
                        
                        {/* Follow Button */}
                        <button 
                          onClick={() => handleFollow(u)}
                          style={{
                            padding:'5px 12px',
                            borderRadius:20,
                            border:'1.5px solid',
                            fontSize:11,
                            fontWeight:600,
                            cursor:'pointer',
                            fontFamily:'var(--font-dm-sans)',
                            borderColor: following[u.id] ? 'var(--border2)' : 'var(--accent)',
                            background: following[u.id] ? 'transparent' : 'var(--accent)',
                            color: following[u.id] ? 'var(--text2)' : 'white',
                            display:'flex',
                            alignItems:'center',
                            gap:3,
                            transition: 'all 0.2s',
                            whiteSpace: 'nowrap'
                          }}
                          onMouseEnter={e => {
                            if (!following[u.id]) {
                              e.currentTarget.style.opacity = '0.9';
                            } else {
                              e.currentTarget.style.background = 'rgba(245,85,85,0.1)';
                              e.currentTarget.style.borderColor = 'var(--red)';
                              e.currentTarget.style.color = 'var(--red)';
                            }
                          }}
                          onMouseLeave={e => {
                            if (!following[u.id]) {
                              e.currentTarget.style.opacity = '1';
                            } else {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.borderColor = 'var(--border2)';
                              e.currentTarget.style.color = 'var(--text2)';
                            }
                          }}
                        >
                          {following[u.id] ? (
                            <><UserCheck size={12}/> Following</>
                          ) : (
                            <><UserPlus size={12}/> Follow</>
                          )}
                        </button>
                      </div>
                    )}
                    
                    {/* Own profile - show stats instead */}
                    {u.id === currentUser?.id && (
                      <div style={{ 
                        fontSize: 11, 
                        color: 'var(--text3)',
                        padding: '4px 8px',
                        background: 'var(--bg3)',
                        borderRadius: 12,
                        whiteSpace: 'nowrap'
                      }}>
                        You
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content: Posts + Trending */}
      <div className="explore-main-grid" style={{ maxWidth:900, margin:'0 auto', display:'grid', gridTemplateColumns:'1fr 300px', gap:24 }}>
        {/* Posts feed */}
        <div>
          <h2 style={{ 
            fontFamily:'var(--font-syne), sans-serif', 
            fontSize:16, 
            fontWeight:700, 
            color:'var(--text)', 
            marginBottom:14, 
            display:'flex', 
            alignItems:'center', 
            gap:6 
          }}>
            <TrendingUp size={15}/> Trending Posts
            {query && searchFilter === 'posts' && (
              <span style={{ 
                fontSize: 12, 
                fontWeight: 400, 
                color: 'var(--text3)',
                background: 'var(--bg3)',
                padding: '2px 10px',
                borderRadius: 12
              }}>
                Filtered: "{query}"
              </span>
            )}
          </h2>
          
          {explorePosts.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--text3)' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📝</div>
              <p style={{ fontWeight: 500 }}>No posts yet</p>
              <p style={{ fontSize: 13, opacity: 0.7 }}>Check back later for trending content</p>
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
                  onMessage={handleMessageUser}
                />
              ))}
            </div>
          )}
        </div>

        {/* Trending Tags & Search tips */}
        <div>
          <h2 style={{ 
            fontFamily:'var(--font-syne), sans-serif', 
            fontSize:16, 
            fontWeight:700, 
            color:'var(--text)', 
            marginBottom:12 
          }}>
            🔥 Trending Tags
          </h2>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {TREND_TAGS.map(t => (
              <span 
                key={t} 
                onClick={() => handleTagClick(t)}
                style={{
                  background:'var(--bg3)', 
                  border:'1px solid var(--border)', 
                  borderRadius:20, 
                  padding:'6px 14px', 
                  fontSize:12, 
                  color:'var(--text2)', 
                  cursor:'pointer', 
                  fontWeight:500, 
                  transition:'all 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--accent)';
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.borderColor = 'var(--accent)';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--bg3)';
                  e.currentTarget.style.color = 'var(--text2)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {t}
              </span>
            ))}
          </div>
          <p style={{ fontSize:11, color:'var(--text3)', marginTop:12 }}>
            Click a tag to instantly search for related content
          </p>

          {/* Search tips */}
          <div style={{
            marginTop: 24,
            padding: '16px',
            background: 'var(--bg3)',
            borderRadius: 12,
            border: '1px solid var(--border)'
          }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>💡</span> Search Tips
            </h3>
            <ul style={{ 
              fontSize: 12, 
              color: 'var(--text3)', 
              paddingLeft: 16, 
              margin: 0, 
              lineHeight: 2,
              listStyleType: 'none'
            }}>
              <li>🔍 Type <strong>name</strong> or <strong>username</strong></li>
              <li>🏷️ Use <strong>#hashtag</strong> to find topics</li>
              <li>👤 Filter by <strong>Users</strong> or <strong>Posts</strong></li>
              <li>🕒 Recent searches saved for quick access</li>
              <li>💬 Click <strong>Message</strong> to start a chat</li>
            </ul>
          </div>

          {/* Quick stats */}
          <div style={{
            marginTop: 16,
            padding: '12px 16px',
            background: 'var(--bg2)',
            borderRadius: 12,
            border: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-around'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>
                {explorePosts.length}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>Trending Posts</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>
                {searchResults.length > 0 ? searchResults.length : '-'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>Search Results</div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { 
          from { transform:rotate(0deg) } 
          to { transform:rotate(360deg) } 
        }
        @media (max-width:768px) {
          .explore-main-grid {
            grid-template-columns: 1fr !important;
          }
          .explore-main-grid > div:last-child {
            display: none !important;
          }
        }
        @media (max-width: 480px) {
          .explore-main-grid { padding: 0 !important; }
        }
        /* Smooth scrollbar */
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: var(--border2);
        }
      `}</style>
    </div>
  );
}
