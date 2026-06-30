'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, TrendingUp, UserCheck, UserPlus, Loader2, MessageCircle, X, User, Hash } from 'lucide-react';
import { TREND_TAGS, fmtNum } from '@/lib/data';
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
  const [allUsers, setAllUsers] = useState<ApiUser[]>([]); // Cache for client-side filtering
  const [loadingUsers, setLoadingUsers] = useState(false);
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

  // Load all users for client-side filtering (faster search)
  useEffect(() => {
    const loadAllUsers = async () => {
      setLoadingUsers(true);
      try {
        // Try to get users from cache first
        const cached = localStorage.getItem('cachedUsers');
        if (cached) {
          const parsed = JSON.parse(cached);
          // Check if cache is less than 5 minutes old
          if (parsed.timestamp && Date.now() - parsed.timestamp < 300000) {
            setAllUsers(parsed.users);
            setLoadingUsers(false);
            return;
          }
        }

        // Fetch users from API
        const response = await usersAPI.getAll?.() || await searchUsers('');
        const users = response.data || response || [];
        setAllUsers(users);
        
        // Cache users
        localStorage.setItem('cachedUsers', JSON.stringify({
          users,
          timestamp: Date.now()
        }));
      } catch (error) {
        console.error('Failed to load users:', error);
        // Try to use cached even if expired
        const cached = localStorage.getItem('cachedUsers');
        if (cached) {
          const parsed = JSON.parse(cached);
          setAllUsers(parsed.users);
        }
      } finally {
        setLoadingUsers(false);
      }
    };

    loadAllUsers();
  }, []);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('recentSearches');
      if (saved) {
        const parsed = JSON.parse(saved);
        setRecentSearches(parsed.slice(0, 5));
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

  // Enhanced search with client-side filtering
  const performSearch = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    
    try {
      let results: ApiUser[] = [];

      // First try client-side search (faster)
      const lowerQuery = searchTerm.toLowerCase().trim();
      
      if (allUsers.length > 0) {
        // Client-side filtering - matches partial names and usernames
        results = allUsers.filter(user => {
          const fullNameMatch = user.fullName?.toLowerCase().includes(lowerQuery) || false;
          const usernameMatch = user.username?.toLowerCase().includes(lowerQuery) || false;
          const bioMatch = user.bio?.toLowerCase().includes(lowerQuery) || false;
          
          // For partial matching, we want to match any part of the name/username
          // This allows "joh" to match "John Doe" or "johndoe"
          return fullNameMatch || usernameMatch || bioMatch;
        });

        // Sort results by relevance (exact matches first)
        results.sort((a, b) => {
          const aExact = a.username?.toLowerCase() === lowerQuery || a.fullName?.toLowerCase() === lowerQuery;
          const bExact = b.username?.toLowerCase() === lowerQuery || b.fullName?.toLowerCase() === lowerQuery;
          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;
          
          const aStartsWith = a.username?.toLowerCase().startsWith(lowerQuery) || a.fullName?.toLowerCase().startsWith(lowerQuery);
          const bStartsWith = b.username?.toLowerCase().startsWith(lowerQuery) || b.fullName?.toLowerCase().startsWith(lowerQuery);
          if (aStartsWith && !bStartsWith) return -1;
          if (!aStartsWith && bStartsWith) return 1;
          
          return 0;
        });

        // Limit results to top 20 for performance
        results = results.slice(0, 20);
      }

      // If no results from client-side, try API search
      if (results.length === 0 && searchTerm.length >= 2) {
        try {
          const apiResults = await searchUsers(searchTerm);
          const apiUsers = apiResults.data || apiResults || [];
          results = apiUsers.slice(0, 20);
        } catch (error) {
          console.log('API search failed, using client results:', error);
        }
      }

      setSearchResults(results);

      // Save to recent searches if we have results
      if (results.length > 0) {
        saveRecentSearch(searchTerm);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [allUsers]);

  // Debounced search with immediate feedback
  useEffect(() => {
    const t = setTimeout(() => {
      if (query.trim()) {
        performSearch(query);
      } else {
        setSearchResults([]);
      }
    }, 200); // Reduced debounce for faster response

    return () => clearTimeout(t);
  }, [query, performSearch]);

  // Handle search from trending tag
  const handleTagClick = (tag: string) => {
    const searchTerm = tag.replace('#', '');
    setQuery(searchTerm);
    setSearchFilter('all');
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
    performSearch(searchTerm);
  };

  // Handle search from recent search
  const handleRecentSearchClick = (term: string) => {
    setQuery(term);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
    performSearch(term);
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
    try {
      localStorage.removeItem('recentSearches');
    } catch (e) {
      console.error('Failed to clear recent searches:', e);
    }
  };

  // Highlight matching text
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim() || !text) return text;
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);
    if (index === -1) return text;
    return (
      <>
        {text.substring(0, index)}
        <span style={{ 
          background: 'var(--accent)', 
          color: 'white', 
          padding: '0 2px',
          borderRadius: '2px'
        }}>
          {text.substring(index, index + query.length)}
        </span>
        {text.substring(index + query.length)}
      </>
    );
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
      {/* Search bar */}
      <div style={{ position:'relative', maxWidth:560, margin:'0 auto 24px' }}>
        <div style={{ 
          display: 'flex', 
          gap: 8,
          background: 'var(--bg2)',
          border: '1.5px solid var(--border)',
          borderRadius: 50,
          padding: '4px 4px 4px 16px',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          alignItems: 'center',
          boxShadow: query ? '0 0 0 3px rgba(var(--accent-rgb, 99, 102, 241), 0.1)' : 'none'
        }}
        >
          <Search size={18} style={{ color: 'var(--text3)', flexShrink: 0 }} />
          
          <input
            ref={searchInputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setShowRecentSearches(true)}
            onBlur={() => setTimeout(() => setShowRecentSearches(false), 200)}
            placeholder="Search by name, username, or bio..."
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
            autoComplete="off"
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
                  performSearch(query);
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
            >
              {filter.icon}
              {filter.label}
            </button>
          ))}
        </div>

        {/* Search stats */}
        {query && !searching && (
          <div style={{ 
            textAlign: 'center', 
            marginTop: 6,
            fontSize: 11,
            color: 'var(--text3)'
          }}>
            {searchResults.length > 0 ? (
              <span>Found {searchResults.length} user{searchResults.length !== 1 ? 's' : ''}</span>
            ) : query.length >= 2 ? (
              <span>No users found. Try a different search term.</span>
            ) : (
              <span>Type at least 2 characters to search</span>
            )}
          </div>
        )}
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

      {/* Search results dropdown */}
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
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              maxHeight: 500,
              overflowY: 'auto'
            }}
          >
            {searching && (
              <div style={{ padding:'20px', textAlign:'center', color:'var(--text3)', fontSize:13 }}>
                <Loader2 size={18} style={{ animation:'spin 1s linear infinite', display:'inline', marginRight:8 }}/>
                Searching for "{query}"...
              </div>
            )}
            
            {!searching && searchResults.length === 0 && query.length >= 2 && (
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
                  fontWeight: 500,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>{searchResults.length} {searchResults.length === 1 ? 'user' : 'users'} found</span>
                  {loadingUsers && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
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
                    
                    {/* User info with highlighted matches */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:600, color:'var(--text)' }}>
                        {highlightMatch(u.fullName || '', query)}
                      </div>
                      <div style={{ fontSize:12, color:'var(--text3)' }}>
                        @{highlightMatch(u.username || '', query)}
                      </div>
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
                          {highlightMatch(u.bio, query)}
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
                    
                    {/* Action buttons */}
                    {u.id !== currentUser?.id && (
                      <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
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
                        >
                          {following[u.id] ? (
                            <><UserCheck size={12}/> Following</>
                          ) : (
                            <><UserPlus size={12}/> Follow</>
                          )}
                        </button>
                      </div>
                    )}
                    
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
      <div style={{ maxWidth:900, margin:'0 auto', display:'grid', gridTemplateColumns:'1fr 300px', gap:24 }}>
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
              <li>🔍 Type <strong>any part</strong> of a name or username</li>
              <li>🏷️ Use <strong>#hashtag</strong> to find topics</li>
              <li>👤 Filter by <strong>Users</strong> or <strong>Posts</strong></li>
              <li>🕒 Recent searches saved for quick access</li>
              <li>💬 Click <strong>Message</strong> to start a chat</li>
            </ul>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { 
          from { transform:rotate(0deg) } 
          to { transform:rotate(360deg) } 
        }
        @media (max-width:768px) {
          div[style*="grid-template-columns: 1fr 300px"] {
            grid-template-columns: 1fr !important;
          }
        }
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
