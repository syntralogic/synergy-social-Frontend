'use client';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Search, ArrowLeft, Circle } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { messagesAPI, getToken } from '@/lib/api';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

interface Conversation {
  id: string;
  participants: { user: { id: string; username: string; fullName: string; avatar?: string } }[];
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  sender: { id: string; username: string; fullName: string; avatar?: string };
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h/24)}d`;
}

export default function MessagesPage() {
  const { currentUser } = useStore(s => ({ currentUser: s.currentUser }));
  const [convs, setConvs]           = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages]     = useState<Message[]>([]);
  const [text, setText]             = useState('');
  const [sending, setSending]       = useState(false);
  const [loading, setLoading]       = useState(true);
  const [mobileView, setMobileView] = useState(false); // true = show chat on mobile
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typing, setTyping]         = useState(false);
  const [error, setError]           = useState('');
  const messagesEnd = useRef<HTMLDivElement>(null);
  const socketRef   = useRef<import('socket.io-client').Socket | null>(null);
  const typingTimer = useRef<NodeJS.Timeout | null>(null);

  // Load conversations
  useEffect(() => {
    (async () => {
      try {
        const res = await messagesAPI.getConversations();
        setConvs(res.data || []);
      } catch { setError('Could not load conversations'); }
      finally { setLoading(false); }
    })();
  }, []);

  // Init socket
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const init = async () => {
      const { io } = await import('socket.io-client');
      const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket','polling'] });
      socketRef.current = socket;

      socket.on('connect', () => console.log('🔌 Socket connected'));
      socket.on('user:online',  ({ userId }: { userId: string }) => setOnlineUsers(prev => new Set(prev).add(userId)));
      socket.on('user:offline', ({ userId }: { userId: string }) => setOnlineUsers(prev => { const s = new Set(prev); s.delete(userId); return s; }));

      socket.on('message:received', (msg: Message) => {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        // update conversation last message
        setConvs(prev => prev.map(c =>
          c.id === msg['conversationId']
            ? { ...c, lastMessage: msg.content, lastMessageAt: msg.createdAt }
            : c
        ));
      });

      socket.on('typing:start', ({ userId }: { userId: string }) => {
        if (userId !== currentUser?.id) setTyping(true);
      });
      socket.on('typing:stop', () => setTyping(false));
    };

    init();
    return () => { socketRef.current?.disconnect(); };
  }, [currentUser?.id]);

  // Load messages when conversation changes
  useEffect(() => {
    if (!activeConv) return;
    socketRef.current?.emit('conversation:join', activeConv.id);
    (async () => {
      try {
        const res = await messagesAPI.getMessages(activeConv.id);
        setMessages((res.data || []).reverse());
      } catch { setMessages([]); }
    })();
  }, [activeConv?.id]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior:'smooth' });
  }, [messages]);

  function handleTyping() {
    if (!activeConv) return;
    socketRef.current?.emit('typing:start', { conversationId: activeConv.id });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socketRef.current?.emit('typing:stop', { conversationId: activeConv.id });
    }, 2000);
  }

  async function handleSend() {
    if (!text.trim() || !activeConv || sending) return;
    const content = text.trim();
    setText('');
    setSending(true);

    // Optimistic message
    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      content,
      senderId: currentUser?.id || '',
      createdAt: new Date().toISOString(),
      sender: {
        id: currentUser?.id || '',
        username: currentUser?.username || '',
        fullName: currentUser?.fullName || '',
        avatar: currentUser?.avatar,
      },
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      // Send via socket for real-time
      socketRef.current?.emit('message:send', {
        conversationId: activeConv.id,
        content,
        messageType: 'TEXT',
      });
    } catch {
      // fallback to REST
      try { await messagesAPI.send(activeConv.id, content); } catch {}
    } finally {
      setSending(false);
    }
  }

  function getOtherParticipant(conv: Conversation) {
    return conv.participants.find(p => p.user.id !== currentUser?.id)?.user;
  }

  const myInitials = currentUser?.fullName
    ? currentUser.fullName.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()
    : 'ME';

  return (
    <div style={{ display:'flex', height:'100%', overflow:'hidden' }}>
      {/* Conversation list */}
      <div style={{ width:300, flexShrink:0, borderRight:'1px solid var(--border)', display: mobileView ? 'none' : 'flex', flexDirection:'column', height:'100%', background:'var(--bg2)' }}
        className="conv-list">
        <div style={{ padding:'16px 16px 12px', borderBottom:'1px solid var(--border)' }}>
          <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:18, fontWeight:800, color:'var(--text)', marginBottom:12 }}>Messages</h2>
          <div style={{ position:'relative' }}>
            <div style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text3)' }}><Search size={14}/></div>
            <input placeholder="Search conversations…"
              style={{ width:'100%', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:20, padding:'8px 12px 8px 34px', fontSize:13, color:'var(--text)', outline:'none', fontFamily:'DM Sans' }}
              onFocus={e=>(e.target.style.borderColor='var(--accent)')} onBlur={e=>(e.target.style.borderColor='var(--border)')}/>
          </div>
        </div>

        <div style={{ flex:1, overflowY:'auto' }}>
          {loading ? (
            [1,2,3].map(i => (
              <div key={i} style={{ display:'flex', gap:10, padding:'12px 16px', borderBottom:'1px solid var(--border)' }}>
                <div className="shimmer-bg" style={{ width:44, height:44, borderRadius:'50%', flexShrink:0 }}/>
                <div style={{ flex:1 }}>
                  <div className="shimmer-bg" style={{ height:12, width:120, borderRadius:6, marginBottom:6 }}/>
                  <div className="shimmer-bg" style={{ height:10, width:80,  borderRadius:6 }}/>
                </div>
              </div>
            ))
          ) : convs.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--text3)', fontSize:13 }}>
              No conversations yet
            </div>
          ) : (
            convs.map(conv => {
              const other = getOtherParticipant(conv);
              if (!other) return null;
              const isActive = activeConv?.id === conv.id;
              const isOnline = onlineUsers.has(other.id);
              const otherInitials = other.fullName.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
              return (
                <motion.div
                  key={conv.id}
                  whileHover={{ background:'var(--bg3)' }}
                  onClick={() => { setActiveConv(conv); setMobileView(true); }}
                  style={{ display:'flex', gap:12, padding:'12px 16px', cursor:'pointer', borderBottom:'1px solid var(--border)', background: isActive ? 'var(--bg3)' : 'transparent', transition:'background 0.15s' }}
                >
                  <div style={{ position:'relative', flexShrink:0 }}>
                    {other.avatar ? (
                      <img src={other.avatar} alt={other.fullName} style={{ width:44, height:44, borderRadius:'50%', objectFit:'cover' }}/>
                    ) : (
                      <div style={{ width:44, height:44, borderRadius:'50%', background:'linear-gradient(135deg, var(--accent), var(--pink))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'white' }}>
                        {otherInitials}
                      </div>
                    )}
                    {isOnline && (
                      <div style={{ position:'absolute', bottom:1, right:1, width:11, height:11, borderRadius:'50%', background:'var(--green)', border:'2px solid var(--bg2)' }}/>
                    )}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:2 }}>
                      <span style={{ fontSize:14, fontWeight:600, color:'var(--text)', fontFamily:'DM Sans' }}>{other.fullName}</span>
                      {conv.lastMessageAt && <span style={{ fontSize:11, color:'var(--text3)' }}>{timeAgo(conv.lastMessageAt)}</span>}
                    </div>
                    <div style={{ fontSize:12, color:'var(--text3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {conv.lastMessage || 'Start a conversation'}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Chat window */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', height:'100%', background:'var(--bg)' }}>
        {activeConv ? (() => {
          const other = getOtherParticipant(activeConv);
          if (!other) return null;
          const isOnline = onlineUsers.has(other.id);
          const otherInitials = other.fullName.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();

          return (
            <>
              {/* Chat header */}
              <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderBottom:'1px solid var(--border)', background:'var(--bg2)' }}>
                <button
                  onClick={() => setMobileView(false)}
                  className="mobile-back"
                  style={{ background:'none', border:'none', color:'var(--text2)', cursor:'pointer', padding:4, display:'none' }}
                >
                  <ArrowLeft size={18}/>
                </button>
                <div style={{ position:'relative' }}>
                  {other.avatar ? (
                    <img src={other.avatar} alt={other.fullName} style={{ width:40, height:40, borderRadius:'50%', objectFit:'cover' }}/>
                  ) : (
                    <div style={{ width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg, var(--accent), var(--pink))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'white' }}>
                      {otherInitials}
                    </div>
                  )}
                  {isOnline && <div style={{ position:'absolute', bottom:1, right:1, width:10, height:10, borderRadius:'50%', background:'var(--green)', border:'2px solid var(--bg2)' }}/>}
                </div>
                <div>
                  <div style={{ fontFamily:'Syne, sans-serif', fontSize:15, fontWeight:700, color:'var(--text)' }}>{other.fullName}</div>
                  <div style={{ fontSize:12, color: isOnline ? 'var(--green)' : 'var(--text3)' }}>
                    {isOnline ? '● Online' : `@${other.username}`}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:8 }}>
                {messages.length === 0 ? (
                  <div style={{ margin:'auto', textAlign:'center', color:'var(--text3)' }}>
                    <div style={{ fontSize:32, marginBottom:10 }}>💬</div>
                    <div style={{ fontFamily:'Syne, sans-serif', fontSize:15, fontWeight:600, color:'var(--text2)', marginBottom:4 }}>Start the conversation</div>
                    <div style={{ fontSize:13 }}>Say hi to {other.fullName}!</div>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMe = msg.senderId === currentUser?.id;
                    return (
                      <div key={msg.id} style={{ display:'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', gap:8, alignItems:'flex-end' }}>
                        {!isMe && (
                          other.avatar
                            ? <img src={other.avatar} alt="" style={{ width:28, height:28, borderRadius:'50%', objectFit:'cover', flexShrink:0 }}/>
                            : <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg, var(--accent), var(--pink))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'white', flexShrink:0 }}>{otherInitials}</div>
                        )}
                        <div style={{ maxWidth:'65%' }}>
                          <div style={{
                            padding:'10px 14px', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            background: isMe ? 'linear-gradient(135deg, var(--accent), var(--accent3))' : 'var(--bg2)',
                            border: isMe ? 'none' : '1px solid var(--border)',
                            color: isMe ? 'white' : 'var(--text)',
                            fontSize:14, lineHeight:1.55, fontFamily:'DM Sans, sans-serif',
                          }}>
                            {msg.content}
                          </div>
                          <div style={{ fontSize:10, color:'var(--text3)', marginTop:3, textAlign: isMe ? 'right' : 'left' }}>
                            {timeAgo(msg.createdAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Typing indicator */}
                {typing && (
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'18px 18px 18px 4px', padding:'10px 14px', display:'flex', gap:4 }}>
                      {[0,1,2].map(i => (
                        <div key={i} className="typing-dot" style={{ width:6, height:6, borderRadius:'50%', background:'var(--text3)', animationDelay:`${i*0.2}s` }}/>
                      ))}
                    </div>
                  </div>
                )}
                <div ref={messagesEnd}/>
              </div>

              {/* Input */}
              <div style={{ padding:'12px 16px', borderTop:'1px solid var(--border)', background:'var(--bg2)' }}>
                <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                  <input
                    value={text}
                    onChange={e => { setText(e.target.value); handleTyping(); }}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Type a message… (Enter to send)"
                    style={{ flex:1, background:'var(--bg3)', border:'1.5px solid var(--border)', borderRadius:24, padding:'11px 16px', color:'var(--text)', fontSize:14, outline:'none', fontFamily:'DM Sans, sans-serif', transition:'border-color 0.2s' }}
                    onFocus={e => (e.target.style.borderColor='var(--accent)')}
                    onBlur={e  => (e.target.style.borderColor='var(--border)')}
                  />
                  <motion.button
                    whileTap={{ scale:0.9 }}
                    onClick={handleSend}
                    disabled={sending || !text.trim()}
                    style={{ width:44, height:44, borderRadius:'50%', border:'none', background: text.trim() ? 'linear-gradient(135deg, var(--accent), var(--accent3))' : 'var(--bg3)', color: text.trim() ? 'white' : 'var(--text3)', display:'flex', alignItems:'center', justifyContent:'center', cursor: text.trim() ? 'pointer' : 'not-allowed', flexShrink:0 }}
                  >
                    <Send size={16}/>
                  </motion.button>
                </div>
              </div>
            </>
          );
        })() : (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12, color:'var(--text3)' }}>
            <div style={{ fontSize:48 }}>💬</div>
            <div style={{ fontFamily:'Syne, sans-serif', fontSize:18, fontWeight:700, color:'var(--text2)' }}>Your Messages</div>
            <div style={{ fontSize:14 }}>Select a conversation to start chatting</div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .conv-list { display: flex !important; position: absolute; width: 100%; z-index: 10; }
          .mobile-back { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
