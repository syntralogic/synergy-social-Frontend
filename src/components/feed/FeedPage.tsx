'use client';
import { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Image as ImgIcon, Video, Smile, Send, RefreshCw, X, Heart, MessageCircle } from 'lucide-react';
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
  const [posts, setPosts]       = useState<ApiPost[]>([]);
  const [loading, setLoading]   = useState(true);
  const [posting, setPosting]   = useState(false);
  const [newText, setNewText]   = useState('');
  const [error, setError]       = useState('');
  const [page, setPage]         = useState(1);
  const [hasMore, setHasMore]   = useState(true);

  // Photo upload state
  const [selectedImg, setSelectedImg]   = useState<string | null>(null);  // base64
  const [imgUploading, setImgUploading] = useState(false);
  const imgInputRef = useRef<HTMLInputElement>(null);

  // Feeling state
  const [showFeelings, setShowFeelings] = useState(false);
  const [feeling, setFeeling]           = useState<string | null>(null);

  const initials = currentUser?.fullName
    ? currentUser.fullName.split(' ').map((w:string) => w[0]).join('').slice(0,2).toUpperCase()
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
    } catch {
      setError('Could not load feed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFeed(1, true); }, [loadFeed]);

  // Convert image file to base64
  const handleImgSelect = async (file: File) => {
    setImgUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImg(reader.result as string);
      setImgUploading(false);
    };
    reader.onerror = () => setImgUploading(false);
    reader.readAsDataURL(file);
  };

  async function handlePost() {
    const finalText = feeling ? `${newText.trim()} — feeling ${feeling}` : newText.trim();
    if (!finalText && !selectedImg) return;
    setPosting(true);
    try {
      const body: any = {
        content: finalText || ' ',
        postType: selectedImg ? 'IMAGE' : 'TEXT',
        visibility: 'PUBLIC',
      };
      if (selectedImg) {
        body.mediaUrl  = selectedImg;
        body.mediaType = 'IMAGE';
      }
      const res = await postsAPI.create(body);
      setPosts(prev => [res.data, ...prev]);
      setNewText('');
      setSelectedImg(null);
      setFeeling(null);
      setShowFeelings(false);
    } catch {
      setError('Failed to post. Please try again.');
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

  const canPost = (newText.trim() || selectedImg || feeling) && !posting;

  return (
    <div style={{ height:'100%', overflowY:'auto' }}>
      <div style={{ maxWidth:640, margin:'0 auto', padding:'20px 16px' }}>

        {/* Create post box */}
        <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}
          style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:16, padding:'16px', marginBottom:20 }}>

          <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
            {/* Avatar */}
            {currentUser?.avatar ? (
              <img src={currentUser.avatar} alt="" style={{ width:40, height:40, borderRadius:'50%', objectFit:'cover', flexShrink:0 }}/>
            ) : (
              <div style={{ width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg,var(--accent),var(--pink))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'white', flexShrink:0 }}>
                {initials}
              </div>
            )}
            <textarea
              value={newText}
              onChange={e => setNewText(e.target.value)}
              placeholder={feeling ? `Feeling ${feeling}… write something` : "What's on your mind?"}
              rows={newText || selectedImg || feeling ? 3 : 1}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handlePost(); }}
              style={{ flex:1, background:'var(--bg3)', border:'1.5px solid var(--border)', borderRadius:12, padding:'10px 14px', color:'var(--text)', fontSize:14, outline:'none', resize:'none', fontFamily:'DM Sans, sans-serif', lineHeight:1.55, transition:'border-color 0.2s' }}
              onFocus={e => (e.target.style.borderColor='var(--accent)')}
              onBlur={e  => (e.target.style.borderColor='var(--border)')}
            />
          </div>

          {/* Feeling badge */}
          {feeling && (
            <div style={{ margin:'10px 0 0 52px', display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:20, padding:'4px 12px', fontSize:13, color:'var(--text2)' }}>{feeling}</span>
              <button onClick={() => setFeeling(null)} style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer' }}><X size={13}/></button>
            </div>
          )}

          {/* Image preview */}
          {selectedImg && (
            <div style={{ position:'relative', margin:'10px 0 0 52px', borderRadius:10, overflow:'hidden', maxHeight:200 }}>
              <img src={selectedImg} alt="preview" style={{ width:'100%', maxHeight:200, objectFit:'cover', borderRadius:10 }}/>
              <button onClick={() => setSelectedImg(null)}
                style={{ position:'absolute', top:6, right:6, width:24, height:24, borderRadius:'50%', background:'rgba(0,0,0,.6)', border:'none', color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <X size={12}/>
              </button>
            </div>
          )}

          {/* Feelings picker */}
          {showFeelings && (
            <div style={{ margin:'10px 0 0 52px', display:'flex', flexWrap:'wrap', gap:6 }}>
              {FEELINGS.map(f => (
                <button key={f} onClick={() => { setFeeling(f); setShowFeelings(false); }}
                  style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:20, padding:'4px 12px', fontSize:12, color:'var(--text2)', cursor:'pointer', fontFamily:'DM Sans' }}>
                  {f}
                </button>
              ))}
            </div>
          )}

          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:12, paddingTop:12, borderTop:'1px solid var(--border)' }}>
            <div style={{ display:'flex', gap:6 }}>
              {/* Photo button */}
              <button onClick={() => imgInputRef.current?.click()} disabled={imgUploading}
                style={{ background:'transparent', border:'1px solid var(--border2)', borderRadius:8, padding:'5px 12px', color:'var(--text2)', fontSize:12, cursor:'pointer', fontFamily:'DM Sans', display:'flex', alignItems:'center', gap:5 }}>
                <ImgIcon size={13}/> {imgUploading ? 'Loading…' : 'Photo'}
              </button>
              <input ref={imgInputRef} type="file" accept="image/*" style={{ display:'none' }}
                onChange={e => { const f = e.target.files?.[0]; if(f) handleImgSelect(f); e.target.value=''; }}/>

              {/* Video button (UI only) */}
              <button style={{ background:'transparent', border:'1px solid var(--border2)', borderRadius:8, padding:'5px 12px', color:'var(--text2)', fontSize:12, cursor:'pointer', fontFamily:'DM Sans', display:'flex', alignItems:'center', gap:5 }}>
                <Video size={13}/> Video
              </button>

              {/* Feeling button */}
              <button onClick={() => setShowFeelings(s => !s)}
                style={{ background: showFeelings ? 'var(--accent)' : 'transparent', border:'1px solid var(--border2)', borderRadius:8, padding:'5px 12px', color: showFeelings ? 'white' : 'var(--text2)', fontSize:12, cursor:'pointer', fontFamily:'DM Sans', display:'flex', alignItems:'center', gap:5 }}>
                <Smile size={13}/> Feeling
              </button>
            </div>

            <motion.button whileTap={{ scale:0.95 }} onClick={handlePost} disabled={!canPost}
              style={{ background:'linear-gradient(135deg, var(--accent), var(--accent3))', border:'none', borderRadius:10, padding:'8px 18px', color:'white', fontSize:13, fontWeight:600, cursor: canPost ? 'pointer' : 'not-allowed', opacity: canPost ? 1 : 0.5, display:'flex', alignItems:'center', gap:6, fontFamily:'Syne, sans-serif' }}>
              {posting ? (
                <div style={{ width:12, height:12, border:'2px solid rgba(255,255,255,.4)', borderTopColor:'white', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
              ) : <Send size={13}/>}
              Post
            </motion.button>
          </div>
        </motion.div>

        {error && (
          <div style={{ background:'rgba(245,85,85,.1)', border:'1px solid rgba(245,85,85,.25)', borderRadius:10, padding:'10px 14px', fontSize:13, color:'var(--red)', marginBottom:12, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            {error}
            <button onClick={() => { setError(''); loadFeed(1, true); }} style={{ background:'none', border:'none', color:'var(--red)', cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontSize:12 }}>
              <RefreshCw size={13}/> Retry
            </button>
          </div>
        )}

        {loading && posts.length === 0 ? (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[...Array(4)].map((_,i) => (
              <div key={i} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:16, padding:20, height:120, animation:'pulse 1.5s ease-in-out infinite' }}/>
            ))}
          </div>
        ) : posts.length === 0 && !loading ? (
          <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--text3)' }}>
            <div style={{ fontFamily:'Syne, sans-serif', fontSize:18, fontWeight:700, color:'var(--text2)', marginBottom:8 }}>No posts yet</div>
            <div style={{ fontSize:14 }}>Follow some people or create your first post!</div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {posts.map((post, i) => (
              <motion.div key={post.id} initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay: i * 0.04 }}>
                <RealPostCard post={post} onLikeToggle={handleLikeToggle}/>
              </motion.div>
            ))}
            {hasMore && (
              <button onClick={() => loadFeed(page + 1)}
                style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, padding:'12px', color:'var(--text2)', fontSize:13, cursor:'pointer', fontFamily:'DM Sans', marginTop:4 }}>
                Load more
              </button>
            )}
          </div>
        )}
      </div>
      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
      `}</style>
    </div>
  );
}