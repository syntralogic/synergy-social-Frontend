'use client';
import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImgIcon, Video, Smile, Send, RefreshCw, X, Loader2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { postsAPI } from '@/lib/api';
import { fmtNum } from '@/lib/data';
import RealPostCard from './RealPostCard';

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

const FEELINGS = ['😊 Happy','😂 Funny','😍 Loved','🔥 Excited','😎 Cool','🙏 Grateful','💪 Motivated','😴 Tired','🤔 Thinking','🎉 Celebrating'];

export default function FeedPage() {
  const { currentUser } = useStore(s => ({ currentUser: s.currentUser }));
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [newText, setNewText] = useState('');
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Media upload state
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [mediaUploading, setMediaUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Feeling state
  const [showFeelings, setShowFeelings] = useState(false);
  const [feeling, setFeeling] = useState<string | null>(null);

  const initials = currentUser?.fullName
    ? currentUser.fullName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : 'ME';

  const loadFeed = useCallback(async (p = 1, replace = false) => {
    try {
      setLoading(true);
      const res = await postsAPI.getFeed(p);
      const newPosts: ApiPost[] = res.data || [];
      if (replace) setPosts(newPosts);
      else setPosts(prev => [...prev, ...newPosts]);
      setHasMore(newPosts.length === 15);
      setPage(p);
    } catch (err) {
      console.error('Error loading feed:', err);
      setError('Could not load feed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeed(1, true);
  }, [loadFeed]);

  // Handle media file selection
  const handleMediaSelect = async (file: File) => {
    if (!file) return;
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }
    
    // Validate file type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      setError('Only image and video files are allowed');
      return;
    }
    
    setMediaUploading(true);
    setSelectedMedia(file);
    setMediaType(isImage ? 'image' : 'video');
    
    // Create preview
    const preview = URL.createObjectURL(file);
    setMediaPreview(preview);
    setMediaUploading(false);
  };

  const removeMedia = () => {
    setSelectedMedia(null);
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
      setMediaPreview(null);
    }
    setMediaType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  async function handlePost() {
    const finalText = feeling ? `${newText.trim()} — feeling ${feeling}` : newText.trim();
    if (!finalText && !selectedMedia) return;
    
    setPosting(true);
    setError('');
    
    try {
      const response = await postsAPI.create(finalText || ' ', selectedMedia || undefined);
      console.log('Post created:', response);
      
      // Add new post to the top
      if (response.data) {
        setPosts(prev => [response.data, ...prev]);
      }
      
      // Clear form
      setNewText('');
      removeMedia();
      setFeeling(null);
      setShowFeelings(false);
    } catch (err: any) {
      console.error('Failed to post:', err);
      setError(err?.message || 'Failed to post. Please try again.');
    } finally {
      setPosting(false);
    }
  }

  function handleLikeToggle(postId: string, liked: boolean) {
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, isLiked: liked, _count: { ...p._count, likes: p._count.likes + (liked ? 1 : -1) } }
        : p
    ));
  }

  function handleCommentAdded(postId: string, newCommentCount: number) {
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, _count: { ...p._count, comments: newCommentCount } }
        : p
    ));
  }

  function handlePostDelete(postId: string) {
    setPosts(prev => prev.filter(p => p.id !== postId));
  }

  function handleShare(postId: string) {
    // Update share count locally
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, _count: { ...p._count, shares: p._count.shares + 1 } }
        : p
    ));
    console.log('Post shared:', postId);
  }

  const canPost = (newText.trim() || selectedMedia || feeling) && !posting && !mediaUploading;

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px' }}>

        {/* Create post box */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: '16px',
            marginBottom: 20
          }}
        >
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            {/* Avatar */}
            {currentUser?.avatar ? (
              <img
                src={currentUser.avatar}
                alt=""
                style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
              />
            ) : (
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--accent), var(--pink))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'white',
                  flexShrink: 0
                }}
              >
                {initials}
              </div>
            )}
            
            <div style={{ flex: 1 }}>
              <textarea
                value={newText}
                onChange={e => setNewText(e.target.value)}
                placeholder={feeling ? `Feeling ${feeling}… write something` : "What's on your mind?"}
                rows={newText || mediaPreview || feeling ? 3 : 1}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    handlePost();
                  }
                }}
                style={{
                  width: '100%',
                  background: 'var(--bg3)',
                  border: '1.5px solid var(--border)',
                  borderRadius: 12,
                  padding: '10px 14px',
                  color: 'var(--text)',
                  fontSize: 14,
                  outline: 'none',
                  resize: 'none',
                  fontFamily: 'DM Sans, sans-serif',
                  lineHeight: 1.55,
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />

              {/* Feeling badge */}
              <AnimatePresence>
                {feeling && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <span
                      style={{
                        background: 'var(--bg3)',
                        border: '1px solid var(--border)',
                        borderRadius: 20,
                        padding: '4px 12px',
                        fontSize: 13,
                        color: 'var(--text2)'
                      }}
                    >
                      {feeling}
                    </span>
                    <button
                      onClick={() => setFeeling(null)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text3)',
                        cursor: 'pointer',
                        padding: 4
                      }}
                    >
                      <X size={13} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Media preview */}
              <AnimatePresence>
                {mediaPreview && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    style={{
                      position: 'relative',
                      marginTop: 8,
                      borderRadius: 10,
                      overflow: 'hidden',
                      maxHeight: 200,
                      background: 'var(--bg3)'
                    }}
                  >
                    {mediaType === 'video' ? (
                      <video
                        src={mediaPreview}
                        style={{
                          width: '100%',
                          maxHeight: 200,
                          objectFit: 'cover'
                        }}
                        controls
                      />
                    ) : (
                      <img
                        src={mediaPreview}
                        alt="preview"
                        style={{
                          width: '100%',
                          maxHeight: 200,
                          objectFit: 'cover',
                          borderRadius: 10
                        }}
                      />
                    )}
                    <button
                      onClick={removeMedia}
                      style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,.6)',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <X size={12} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Feelings picker */}
              <AnimatePresence>
                {showFeelings && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}
                  >
                    {FEELINGS.map(f => (
                      <button
                        key={f}
                        onClick={() => {
                          setFeeling(f);
                          setShowFeelings(false);
                        }}
                        style={{
                          background: 'var(--bg3)',
                          border: '1px solid var(--border)',
                          borderRadius: 20,
                          padding: '4px 12px',
                          fontSize: 12,
                          color: 'var(--text2)',
                          cursor: 'pointer',
                          fontFamily: 'DM Sans',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg3)')}
                      >
                        {f}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 12,
              paddingTop: 12,
              borderTop: '1px solid var(--border)'
            }}
          >
            <div style={{ display: 'flex', gap: 6 }}>
              {/* Photo/Video button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={mediaUploading}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border2)',
                  borderRadius: 8,
                  padding: '5px 12px',
                  color: 'var(--text2)',
                  fontSize: 12,
                  cursor: 'pointer',
                  fontFamily: 'DM Sans',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {mediaUploading ? (
                  <Loader2 size={13} style={{ animation: 'spin 0.7s linear infinite' }} />
                ) : (
                  <ImgIcon size={13} />
                )}
                {mediaUploading ? 'Loading...' : 'Photo/Video'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                style={{ display: 'none' }}
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handleMediaSelect(f);
                  e.target.value = '';
                }}
              />

              {/* Feeling button */}
              <button
                onClick={() => setShowFeelings(s => !s)}
                style={{
                  background: showFeelings ? 'var(--accent)' : 'transparent',
                  border: '1px solid var(--border2)',
                  borderRadius: 8,
                  padding: '5px 12px',
                  color: showFeelings ? 'white' : 'var(--text2)',
                  fontSize: 12,
                  cursor: 'pointer',
                  fontFamily: 'DM Sans',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  transition: 'all 0.2s'
                }}
              >
                <Smile size={13} /> Feeling
              </button>
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handlePost}
              disabled={!canPost}
              style={{
                background: 'linear-gradient(135deg, var(--accent), var(--accent3))',
                border: 'none',
                borderRadius: 10,
                padding: '8px 18px',
                color: 'white',
                fontSize: 13,
                fontWeight: 600,
                cursor: canPost ? 'pointer' : 'not-allowed',
                opacity: canPost ? 1 : 0.5,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: 'Syne, sans-serif'
              }}
            >
              {posting ? (
                <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} />
              ) : (
                <Send size={13} />
              )}
              Post
            </motion.button>
          </div>
        </motion.div>

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                background: 'rgba(245,85,85,.1)',
                border: '1px solid rgba(245,85,85,.25)',
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: 13,
                color: 'var(--red)',
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              {error}
              <button
                onClick={() => {
                  setError('');
                  loadFeed(1, true);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--red)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 12
                }}
              >
                <RefreshCw size={13} /> Retry
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading skeleton */}
        {loading && posts.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                style={{
                  background: 'var(--bg2)',
                  border: '1px solid var(--border)',
                  borderRadius: 16,
                  padding: 20,
                  height: 120,
                  animation: 'pulse 1.5s ease-in-out infinite'
                }}
              />
            ))}
          </div>
        ) : posts.length === 0 && !loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}
          >
            <div
              style={{
                fontFamily: 'Syne, sans-serif',
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--text2)',
                marginBottom: 8
              }}
            >
              No posts yet
            </div>
            <div style={{ fontSize: 14 }}>Follow some people or create your first post!</div>
          </motion.div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {posts.map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <RealPostCard
                  post={post}
                  onLikeToggle={handleLikeToggle}
                  onCommentAdded={handleCommentAdded}
                  onPostDelete={handlePostDelete}
                  onShare={handleShare}
                />
              </motion.div>
            ))}

            {hasMore && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => loadFeed(page + 1)}
                style={{
                  background: 'var(--bg2)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '12px',
                  color: 'var(--text2)',
                  fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: 'DM Sans',
                  marginTop: 4,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg2)')}
              >
                Load more
              </motion.button>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}