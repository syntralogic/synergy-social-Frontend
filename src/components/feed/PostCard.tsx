'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, BadgeCheck } from 'lucide-react';
import { Post, USERS, fmtNum } from '@/lib/data';
import Avatar from '@/components/ui/Avatar';
import { useStore } from '@/store/useStore';

interface Props { post: Post; }

export default function PostCard({ post }: Props) {
  const { toggleLike, toggleSave } = useStore(s => ({ toggleLike:s.toggleLike, toggleSave:s.toggleSave }));
  const user = USERS.find(u => u.id === post.userId)!;
  const [likeAnim, setLikeAnim] = useState(false);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState('');

  function handleLike() {
    toggleLike(post.id);
    setLikeAnim(true);
    setTimeout(() => setLikeAnim(false), 400);
  }

  return (
    <motion.div
      initial={{ opacity:0, y:12 }}
      animate={{ opacity:1, y:0 }}
      whileHover={{ y:-1 }}
      transition={{ duration:0.2 }}
      style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, marginBottom:12, overflow:'hidden' }}
    >
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 16px' }}>
        <Avatar user={user} size="sm" />
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ fontSize:14, fontWeight:600, color:'var(--text)' }}>{user.name}</span>
            {user.verified && <BadgeCheck size={14} color="var(--accent2)" fill="var(--accent2)" style={{flexShrink:0}}/>}
          </div>
          <div style={{ fontSize:12, color:'var(--text3)' }}>{user.handle} · {post.time}</div>
        </div>
        <button style={{ background:'none', border:'none', color:'var(--text3)', padding:4, borderRadius:6, cursor:'pointer' }}>
          <MoreHorizontal size={16}/>
        </button>
      </div>

      {/* Image */}
      {post.img && (
        <div style={{ position:'relative', overflow:'hidden' }}>
          <img src={post.img} alt="post" style={{ width:'100%', height:240, objectFit:'cover', display:'block' }} />
          {post.type === 'video' && (
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,.35)' }}>
              <div style={{ width:48, height:48, borderRadius:'50%', background:'rgba(255,255,255,.9)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <div style={{ borderLeft:'16px solid #333', borderTop:'9px solid transparent', borderBottom:'9px solid transparent', marginLeft:4 }}/>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Body */}
      <div style={{ padding:'12px 16px 8px', fontSize:14, color:'var(--text2)', lineHeight:1.65 }}>
        {post.text}{' '}
        {post.tags.map(t => (
          <span key={t} style={{ color:'var(--accent2)', cursor:'pointer', fontWeight:500 }}>#{t} </span>
        ))}
      </div>

      {/* Action bar */}
      <div style={{ display:'flex', alignItems:'center', padding:'8px 14px 14px', gap:4 }}>
        <ActionBtn
          icon={<Heart size={17} fill={post.liked ? 'var(--red)' : 'none'} color={post.liked ? 'var(--red)' : 'var(--text3)'} className={likeAnim ? 'animate-heart-pop' : ''}/>}
          label={fmtNum(post.likes)}
          active={post.liked}
          activeColor="var(--red)"
          onClick={handleLike}
        />
        <ActionBtn
          icon={<MessageCircle size={17} color="var(--text3)"/>}
          label={fmtNum(post.comments)}
          onClick={() => setShowComment(v=>!v)}
        />
        <ActionBtn icon={<Share2 size={17} color="var(--text3)"/>} label={fmtNum(post.shares)} />
        <div style={{ flex:1 }}/>
        <ActionBtn
          icon={<Bookmark size={17} fill={post.saved ? 'var(--accent)' : 'none'} color={post.saved ? 'var(--accent)' : 'var(--text3)'}/>}
          onClick={() => toggleSave(post.id)}
        />
      </div>

      {/* Comment input */}
      <AnimatePresence>
        {showComment && (
          <motion.div
            initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }}
            style={{ overflow:'hidden', borderTop:'1px solid var(--border)', padding:'10px 14px', display:'flex', gap:8 }}
          >
            <input
              value={comment} onChange={e=>setComment(e.target.value)}
              placeholder="Write a comment…"
              style={{ flex:1, background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:20, padding:'8px 14px', color:'var(--text)', fontSize:13, outline:'none' }}
              onFocus={e=>(e.target.style.borderColor='var(--accent)')}
              onBlur={e=>(e.target.style.borderColor='var(--border)')}
            />
            <button onClick={()=>{ setComment(''); setShowComment(false); }}
              style={{ padding:'8px 14px', background:'linear-gradient(135deg, var(--accent), var(--accent3))', border:'none', borderRadius:20, color:'white', fontSize:13, cursor:'pointer' }}>
              Post
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
      style={{ background:'none', border:'none', display:'flex', alignItems:'center', gap:5, padding:'6px 8px', borderRadius:8, cursor:'pointer',
        color: active ? activeColor : 'var(--text3)', fontSize:13, fontFamily:'DM Sans, sans-serif',
      }}>
      {icon}
      {label && <span>{label}</span>}
    </motion.button>
  );
}

import React from 'react';
