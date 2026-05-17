'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, BadgeCheck, Send } from 'lucide-react';
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
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
}

export default function RealPostCard({ post, onLikeToggle }: Props) {
  const [likeAnim, setLikeAnim]   = useState(false);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment]     = useState('');
  const [commenting, setCommenting] = useState(false);
  const initials = post.author.fullName.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();

  async function handleLike() {
    const newLiked = !post.isLiked;
    setLikeAnim(true);
    setTimeout(() => setLikeAnim(false), 400);
    onLikeToggle?.(post.id, newLiked);
    try {
      if (newLiked) await postsAPI.like(post.id);
      else          await postsAPI.unlike(post.id);
    } catch {
      // revert optimistic update
      onLikeToggle?.(post.id, !newLiked);
    }
  }

  async function handleComment() {
    if (!comment.trim()) return;
    setCommenting(true);
    try {
      await postsAPI.comment(post.id, comment.trim());
      setComment('');
      setShowComment(false);
    } catch {
      // silent fail
    } finally {
      setCommenting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity:0, y:12 }}
      animate={{ opacity:1, y:0 }}
      whileHover={{ y:-1 }}
      transition={{ duration:0.2 }}
      style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:16, marginBottom:12, overflow:'hidden' }}
    >
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 16px' }}>
        {post.author.avatar ? (
          <img src={post.author.avatar} alt={post.author.fullName} style={{ width:38, height:38, borderRadius:'50%', objectFit:'cover' }}/>
        ) : (
          <div style={{ width:38, height:38, borderRadius:'50%', background:'linear-gradient(135deg, var(--accent), var(--pink))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'white', flexShrink:0 }}>
            {initials}
          </div>
        )}
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ fontSize:14, fontWeight:600, color:'var(--text)', fontFamily:'DM Sans, sans-serif' }}>{post.author.fullName}</span>
          </div>
          <div style={{ fontSize:12, color:'var(--text3)' }}>@{post.author.username} · {timeAgo(post.createdAt)}</div>
        </div>
        <button style={{ background:'none', border:'none', color:'var(--text3)', padding:4, borderRadius:6, cursor:'pointer' }}>
          <MoreHorizontal size={16}/>
        </button>
      </div>

      {/* Media */}
      {post.media?.length > 0 && (
        <div style={{ position:'relative', overflow:'hidden' }}>
          {post.media[0].mediaType === 'VIDEO' ? (
            <video src={post.media[0].mediaUrl} controls style={{ width:'100%', maxHeight:300, objectFit:'cover', display:'block' }}/>
          ) : (
            <img src={post.media[0].mediaUrl} alt="post" style={{ width:'100%', maxHeight:300, objectFit:'cover', display:'block' }}/>
          )}
        </div>
      )}

      {/* Content */}
      {post.content && (
        <div style={{ padding:'12px 16px 8px', fontSize:14, color:'var(--text)', lineHeight:1.65, fontFamily:'DM Sans, sans-serif' }}>
          {post.content}
        </div>
      )}

      {/* Stats row */}
      <div style={{ padding:'4px 16px 8px', display:'flex', gap:16 }}>
        <span style={{ fontSize:12, color:'var(--text3)' }}>{fmtNum(post._count.likes)} likes</span>
        <span style={{ fontSize:12, color:'var(--text3)' }}>{fmtNum(post._count.comments)} comments</span>
        <span style={{ fontSize:12, color:'var(--text3)' }}>{fmtNum(post._count.shares)} shares</span>
      </div>

      {/* Action bar */}
      <div style={{ display:'flex', alignItems:'center', padding:'8px 12px 12px', gap:2, borderTop:'1px solid var(--border)' }}>
        <ActionBtn
          icon={<Heart size={17} fill={post.isLiked ? 'var(--red)' : 'none'} color={post.isLiked ? 'var(--red)' : 'var(--text3)'} style={{ transition:'all 0.2s', transform: likeAnim ? 'scale(1.4)' : 'scale(1)' }}/>}
          label={fmtNum(post._count.likes)}
          active={post.isLiked}
          activeColor="var(--red)"
          onClick={handleLike}
        />
        <ActionBtn
          icon={<MessageCircle size={17} color="var(--text3)"/>}
          label={fmtNum(post._count.comments)}
          onClick={() => setShowComment(v => !v)}
        />
        <ActionBtn icon={<Share2 size={17} color="var(--text3)"/>} label={fmtNum(post._count.shares)}/>
        <div style={{ flex:1 }}/>
        <ActionBtn icon={<Bookmark size={17} color="var(--text3)"/>}/>
      </div>

      {/* Comment input */}
      <AnimatePresence>
        {showComment && (
          <motion.div
            initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }}
            style={{ overflow:'hidden', borderTop:'1px solid var(--border)', padding:'10px 14px', display:'flex', gap:8 }}
          >
            <input
              value={comment}
              onChange={e => setComment(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleComment(); }}
              placeholder="Write a comment…"
              style={{ flex:1, background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:20, padding:'8px 14px', color:'var(--text)', fontSize:13, outline:'none', fontFamily:'DM Sans, sans-serif' }}
              onFocus={e => (e.target.style.borderColor='var(--accent)')}
              onBlur={e  => (e.target.style.borderColor='var(--border)')}
            />
            <button
              onClick={handleComment}
              disabled={commenting || !comment.trim()}
              style={{ padding:'8px 14px', background:'linear-gradient(135deg, var(--accent), var(--accent3))', border:'none', borderRadius:20, color:'white', fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:5, opacity: commenting || !comment.trim() ? 0.6 : 1 }}
            >
              {commenting ? <div style={{ width:10, height:10, border:'2px solid rgba(255,255,255,.4)', borderTopColor:'white', borderRadius:'50%', animation:'spin .7s linear infinite' }}/> : <Send size={12}/>}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ActionBtn({ icon, label, onClick, active=false, activeColor='var(--accent)' }: {
  icon:React.ReactNode; label?:string; onClick?:()=>void; active?:boolean; activeColor?:string;
}) {
  return (
    <motion.button whileHover={{ scale:1.06 }} whileTap={{ scale:0.9 }} onClick={onClick}
      style={{ background:'none', border:'none', display:'flex', alignItems:'center', gap:5, padding:'6px 10px', borderRadius:8, cursor:'pointer', color: active ? activeColor : 'var(--text3)', fontSize:13, fontFamily:'DM Sans, sans-serif' }}>
      {icon}
      {label && <span>{label}</span>}
    </motion.button>
  );
}
