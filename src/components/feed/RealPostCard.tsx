'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Send, Loader2, Check, Twitter, Facebook, Link2 } from 'lucide-react';
import { postsAPI } from '@/lib/api';
import { fmtNum } from '@/lib/data';

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

interface Props {
  post: ApiPost;
  onLikeToggle?: (postId: string, liked: boolean) => void;
  onCommentAdded?: (postId: string, newCommentCount: number) => void;
  onPostDelete?: (postId: string) => void;
  onShare?: (postId: string) => void;
  showComments?: boolean;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// Helper function to get full avatar URL
const getAvatarUrl = (avatar: string | undefined) => {
  if (!avatar) return null;
  if (avatar.startsWith('/uploads')) {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    return `${apiBase}${avatar}`;
  }
  return avatar;
};

// Helper function to get full media URL
const getMediaUrl = (mediaUrl: string | undefined) => {
  if (!mediaUrl) return null;
  if (mediaUrl.startsWith('/uploads')) {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    return `${apiBase}${mediaUrl}`;
  }
  if (mediaUrl.startsWith('http')) {
    return mediaUrl;
  }
  return mediaUrl;
};

export default function RealPostCard({ 
  post, 
  onLikeToggle, 
  onCommentAdded, 
  onPostDelete, 
  onShare,
  showComments = false
}: Props) {
  const [likeAnim, setLikeAnim] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(showComments);
  const [comment, setComment] = useState('');
  const [commenting, setCommenting] = useState(false);
  const [localCommentsCount, setLocalCommentsCount] = useState(post._count?.comments || 0);
  const [showMenu, setShowMenu] = useState(false);
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [likesCount, setLikesCount] = useState(post._count?.likes || 0);
  const [sharesCount, setSharesCount] = useState(post._count?.shares || 0);
  const [mediaError, setMediaError] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [commentsList, setCommentsList] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [showCommentsList, setShowCommentsList] = useState(false);

  const authorFullName = post.author?.fullName || 'User';
  const authorUsername = post.author?.username || 'user';
  const authorAvatar = getAvatarUrl(post.author?.avatar);
  
  const initials = authorFullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  
  const mediaUrl = post.media?.[0] ? getMediaUrl(post.media[0].mediaUrl) : null;
  const isVideo = post.media?.[0]?.mediaType === 'VIDEO' || post.postType === 'VIDEO';
  const postUrl = typeof window !== 'undefined' ? `${window.location.origin}/post/${post.id}` : '';

  // Load comments when user clicks to show them
  const loadComments = async () => {
    if (commentsList.length > 0) {
      setShowCommentsList(!showCommentsList);
      return;
    }
    
    setLoadingComments(true);
    try {
      const response = await postsAPI.getComments(post.id);
      if (response.success && response.data) {
        setCommentsList(response.data);
        setShowCommentsList(true);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  React.useEffect(() => {
    setMediaLoading(true);
    setMediaError(false);
  }, [mediaUrl]);

  async function handleLike() {
    const newLiked = !isLiked;
    setLikeAnim(true);
    setIsLiked(newLiked);
    setLikesCount(prev => newLiked ? prev + 1 : prev - 1);
    
    setTimeout(() => setLikeAnim(false), 400);
    onLikeToggle?.(post.id, newLiked);
    
    try {
      if (newLiked) {
        await postsAPI.like(post.id);
      } else {
        await postsAPI.unlike(post.id);
      }
    } catch (error) {
      setIsLiked(!newLiked);
      setLikesCount(prev => newLiked ? prev - 1 : prev + 1);
      onLikeToggle?.(post.id, !newLiked);
      console.error('Failed to toggle like:', error);
    }
  }

  async function handleComment() {
    if (!comment.trim()) {
      alert('Please enter a comment');
      return;
    }
    
    setCommenting(true);
    try {
      const response = await postsAPI.comment(post.id, comment.trim());
      
      const newCount = localCommentsCount + 1;
      setLocalCommentsCount(newCount);
      
      if (response.data) {
        setCommentsList(prev => [response.data, ...prev]);
        if (!showCommentsList) {
          setShowCommentsList(true);
        }
      }
      
      if (onCommentAdded) {
        onCommentAdded(post.id, newCount);
      }
      
      setComment('');
    } catch (error: any) {
      console.error('Failed to post comment:', error);
      alert(error?.message || 'Failed to post comment. Please try again.');
    } finally {
      setCommenting(false);
    }
  }

  function handleShareClick() {
    setShowShareMenu(!showShareMenu);
  }

  async function handleShareToPlatform(platform: string) {
    const text = encodeURIComponent(`Check out this post by ${authorFullName}: ${post.content?.substring(0, 100) || ''}...`);
    const url = encodeURIComponent(postUrl);
    
    let shareUrl = '';
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        break;
      case 'copy':
        await navigator.clipboard.writeText(postUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        
        const newCount = sharesCount + 1;
        setSharesCount(newCount);
        if (onShare) onShare(post.id);
        
        setShowShareMenu(false);
        return;
      default:
        return;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
      
      const newCount = sharesCount + 1;
      setSharesCount(newCount);
      if (onShare) onShare(post.id);
    }
    setShowShareMenu(false);
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    try {
      await postsAPI.delete(post.id);
      if (onPostDelete) {
        onPostDelete(post.id);
      }
    } catch (error: any) {
      console.error('Failed to delete post:', error);
      alert(error?.message || 'Failed to delete post. Please try again.');
    }
  }

  const handleVideoLoad = () => setMediaLoading(false);
  const handleVideoError = () => { setMediaError(true); setMediaLoading(false); };
  const handleImageLoad = () => setMediaLoading(false);
  const handleImageError = () => { setMediaError(true); setMediaLoading(false); };

  if (!post || !post.author) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.2 }}
      style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        marginBottom: 12,
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px' }}>
        {authorAvatar ? (
          <img
            src={authorAvatar}
            alt={authorFullName}
            style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent), var(--pink))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 700,
              color: 'white',
              flexShrink: 0
            }}
          >
            {initials}
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text)',
                fontFamily: 'DM Sans, sans-serif'
              }}
            >
              {authorFullName}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>
            @{authorUsername} · {timeAgo(post.createdAt)}
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text3)',
              padding: 4,
              borderRadius: 6,
              cursor: 'pointer'
            }}
          >
            <MoreHorizontal size={16} />
          </button>
          {showMenu && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '100%',
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '4px 0',
                zIndex: 10,
                minWidth: 120
              }}
            >
              <button
                onClick={handleDelete}
                style={{
                  padding: '8px 16px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--red)',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  fontSize: 13
                }}
              >
                Delete Post
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Media - Image or Video */}
      {mediaUrl && !mediaError && (
        <div style={{ position: 'relative', overflow: 'hidden', background: '#000', minHeight: 200 }}>
          {mediaLoading && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg3)',
                zIndex: 1
              }}
            >
              <Loader2 size={24} style={{ animation: 'spin 0.7s linear infinite', color: 'var(--accent)' }} />
            </div>
          )}
          {isVideo ? (
            <video
              src={mediaUrl}
              controls
              playsInline
              preload="metadata"
              style={{
                width: '100%',
                maxHeight: 400,
                objectFit: 'contain',
                display: 'block'
              }}
              onLoadedData={handleVideoLoad}
              onCanPlay={handleVideoLoad}
              onError={handleVideoError}
            >
              <source src={mediaUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          ) : (
            <img
              src={mediaUrl}
              alt="Post content"
              style={{
                width: '100%',
                maxHeight: 400,
                objectFit: 'contain',
                display: 'block'
              }}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          )}
        </div>
      )}

      {/* Content */}
      {post.content && post.content !== ' ' && (
        <div
          style={{
            padding: '12px 16px 8px',
            fontSize: 14,
            color: 'var(--text)',
            lineHeight: 1.65,
            fontFamily: 'DM Sans, sans-serif'
          }}
        >
          {post.content}
        </div>
      )}

      {/* Stats row */}
      <div style={{ padding: '4px 16px 8px', display: 'flex', gap: 16 }}>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>
          {fmtNum(likesCount)} likes
        </span>
        <span 
          style={{ fontSize: 12, color: 'var(--text3)', cursor: 'pointer' }}
          onClick={loadComments}
        >
          {fmtNum(localCommentsCount)} comments
        </span>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>
          {fmtNum(sharesCount)} shares
        </span>
      </div>

      {/* Action bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '4px 8px 8px',
          gap: 2,
          borderTop: '1px solid var(--border)'
        }}
      >
        <ActionBtn
          icon={
            <Heart
              size={20}
              fill={isLiked ? 'var(--red)' : 'none'}
              color={isLiked ? 'var(--red)' : 'var(--text3)'}
              style={{
                transition: 'all 0.2s',
                transform: likeAnim ? 'scale(1.3)' : 'scale(1)'
              }}
            />
          }
          label="Like"
          count={likesCount}
          active={isLiked}
          activeColor="var(--red)"
          onClick={handleLike}
        />
        <ActionBtn
          icon={<MessageCircle size={20} color="var(--text3)" />}
          label="Comment"
          count={localCommentsCount}
          onClick={() => {
            setShowCommentInput(!showCommentInput);
            if (!showCommentInput && commentsList.length === 0) {
              loadComments();
            }
          }}
        />
        <div style={{ position: 'relative' }}>
          <ActionBtn
            icon={<Share2 size={20} color="var(--text3)" />}
            label="Share"
            count={sharesCount}
            onClick={handleShareClick}
          />
          
          {/* Share Menu */}
          <AnimatePresence>
            {showShareMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 0,
                  marginBottom: 8,
                  background: 'var(--bg3)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '8px',
                  zIndex: 20,
                  minWidth: 180,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
              >
                <button
                  onClick={() => handleShareToPlatform('twitter')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 12px',
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    color: 'var(--text)',
                    fontSize: 13,
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <Twitter size={16} color="#1DA1F2" />
                  <span>Share to Twitter</span>
                </button>
                <button
                  onClick={() => handleShareToPlatform('facebook')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 12px',
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    color: 'var(--text)',
                    fontSize: 13,
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <Facebook size={16} color="#4267B2" />
                  <span>Share to Facebook</span>
                </button>
                <button
                  onClick={() => handleShareToPlatform('copy')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 12px',
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    color: 'var(--text)',
                    fontSize: 13,
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  {copied ? <Check size={16} color="#10b981" /> : <Link2 size={16} color="var(--accent)" />}
                  <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div style={{ flex: 1 }} />
        <ActionBtn
          icon={<Bookmark size={20} color="var(--text3)" />}
          label="Save"
        />
      </div>

      {/* Comment Input */}
      {showCommentInput && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '10px 14px', display: 'flex', gap: 8 }}>
          <input
            value={comment}
            onChange={e => setComment(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !commenting && comment.trim()) {
                handleComment();
              }
            }}
            placeholder="Write a comment…"
            disabled={commenting}
            style={{
              flex: 1,
              background: 'var(--bg3)',
              border: '1px solid var(--border)',
              borderRadius: 20,
              padding: '10px 14px',
              color: 'var(--text)',
              fontSize: 14,
              outline: 'none',
              fontFamily: 'DM Sans, sans-serif'
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            autoFocus
          />
          <button
            onClick={handleComment}
            disabled={commenting || !comment.trim()}
            style={{
              padding: '8px 18px',
              background: 'linear-gradient(135deg, var(--accent), var(--accent3))',
              border: 'none',
              borderRadius: 20,
              color: 'white',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              opacity: commenting || !comment.trim() ? 0.6 : 1,
              transition: 'opacity 0.2s'
            }}
          >
            {commenting ? (
              <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} />
            ) : (
              <Send size={14} />
            )}
            <span>Post</span>
          </button>
        </div>
      )}

      {/* Comments List */}
      {showCommentsList && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 14px', background: 'var(--bg3)' }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text)' }}>
            Comments ({localCommentsCount})
          </h4>
          {loadingComments ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
              <Loader2 size={20} style={{ animation: 'spin 0.7s linear infinite', color: 'var(--accent)' }} />
            </div>
          ) : commentsList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text3)', fontSize: 13 }}>
              No comments yet. Be the first to comment!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {commentsList.map((comment: any) => (
                <div key={comment.id} style={{ display: 'flex', gap: 8 }}>
                  {comment.author?.avatar ? (
                    <img
                      src={getAvatarUrl(comment.author.avatar)}
                      alt=""
                      style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--accent), var(--pink))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        fontWeight: 700,
                        color: 'white'
                      }}
                    >
                      {comment.author?.fullName?.charAt(0) || 'U'}
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                        {comment.author?.fullName || 'User'}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text3)' }}>
                        @{comment.author?.username || 'user'}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4, lineHeight: 1.5 }}>
                      {comment.content}
                    </p>
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>
                      {timeAgo(comment.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

function ActionBtn({
  icon,
  label,
  count,
  onClick,
  active = false,
  activeColor = 'var(--accent)'
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  onClick?: () => void;
  active?: boolean;
  activeColor?: string;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 12px',
        borderRadius: 40,
        cursor: 'pointer',
        color: active ? activeColor : 'var(--text3)',
        fontSize: 13,
        fontWeight: 500,
        fontFamily: 'DM Sans, sans-serif',
        transition: 'all 0.2s ease'
      }}
    >
      {icon}
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>{fmtNum(count)}</span>
      )}
    </motion.button>
  );
}

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}