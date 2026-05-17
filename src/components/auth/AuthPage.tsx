'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, ArrowLeft, Sparkles, AtSign } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { authAPI } from '@/lib/api';

type AuthMode = 'signup' | 'login' | 'forgot';

export default function AuthPage() {
  const loginStore = useStore(s => s.login);
  const setUser    = useStore(s => s.setUser);

  const [mode, setMode]         = useState<AuthMode>('signup');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [loading, setLoading]   = useState(false);

  const [form, setForm] = useState({
    fullName: '', username: '', email: '', password: '',
  });

  const upd = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');

    if (!form.email) { setError('Email is required.'); return; }

    if (mode === 'forgot') {
      setLoading(true);
      setTimeout(() => { setLoading(false); setSuccess('Reset link sent to ' + form.email); }, 1200);
      return;
    }

    if (!form.password) { setError('Password is required.'); return; }
    if (mode === 'signup') {
      if (!form.fullName)  { setError('Full name is required.'); return; }
      if (!form.username)  { setError('Username is required.'); return; }
      if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    }

    setLoading(true);
    try {
      let result;
      if (mode === 'signup') {
        result = await authAPI.register({
          email: form.email,
          password: form.password,
          fullName: form.fullName,
          username: form.username,
        });
      } else {
        result = await authAPI.login({ email: form.email, password: form.password });
      }
      if (setUser) setUser(result.user);
      loginStore();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const isSignup = mode === 'signup';

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at 30% 20%, rgba(124,106,245,.18) 0%, transparent 55%), radial-gradient(ellipse at 75% 80%, rgba(245,103,168,.12) 0%, transparent 55%), var(--bg)',
      padding: '16px',
    }}>
      <div style={{ position:'fixed', top:-140, left:-140, width:420, height:420, borderRadius:'50%', background:'rgba(124,106,245,.06)', filter:'blur(70px)', pointerEvents:'none' }}/>
      <div style={{ position:'fixed', bottom:-120, right:-120, width:380, height:380, borderRadius:'50%', background:'rgba(245,103,168,.06)', filter:'blur(70px)', pointerEvents:'none' }}/>

      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity:0, y:24, scale:0.97 }}
          animate={{ opacity:1, y:0, scale:1 }}
          exit={{ opacity:0, y:-12, scale:0.98 }}
          transition={{ duration:0.38, ease:[0.22,1,0.36,1] }}
          style={{
            background:'var(--bg2)', border:'1px solid var(--border)',
            borderRadius:28, padding:'44px 40px', width:420, maxWidth:'96vw',
            boxShadow:'0 32px 80px var(--shadow)',
          }}
        >
          {/* Logo */}
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:36 }}>
            <div style={{
              width:44, height:44, borderRadius:12,
              background:'linear-gradient(135deg, var(--accent), var(--pink))',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 6px 20px rgba(124,106,245,.45)',
            }}>
              <Sparkles size={22} color="white"/>
            </div>
            <div>
              <div style={{ fontFamily:'Syne, sans-serif', fontWeight:800, fontSize:20, color:'var(--text)', letterSpacing:'-0.3px' }}>
                Synergy Social
              </div>
              <div style={{ fontSize:11, color:'var(--text3)', marginTop:1 }}>Connect · Create · Grow</div>
            </div>
          </div>

          {mode === 'forgot' && (
            <button onClick={() => setMode('login')} style={{ background:'none', border:'none', color:'var(--text3)', display:'flex', alignItems:'center', gap:6, fontSize:13, marginBottom:20, padding:0, cursor:'pointer' }}>
              <ArrowLeft size={14}/> Back to login
            </button>
          )}

          <h1 style={{ fontFamily:'Syne, sans-serif', fontSize:30, fontWeight:800, marginBottom:6, color:'var(--text)', letterSpacing:'-0.5px' }}>
            {mode === 'signup' ? 'Create account' : mode === 'login' ? 'Welcome back' : 'Reset password'}
          </h1>
          <p style={{ fontSize:14, color:'var(--text2)', marginBottom:32, lineHeight:1.5 }}>
            {mode === 'signup' ? 'Join the community and start sharing today' :
             mode === 'login'  ? 'Sign in to your Synergy account' :
             "We'll send you a reset link via email"}
          </p>

          <form onSubmit={handleSubmit} noValidate>
            {isSignup && (
              <>
                <Field label="Full Name" icon={<User size={15}/>}>
                  <input placeholder="Your full name" value={form.fullName} onChange={upd('fullName')} autoComplete="name"/>
                </Field>
                <Field label="Username" icon={<AtSign size={15}/>}>
                  <input placeholder="your_username" value={form.username} onChange={upd('username')} autoComplete="username"/>
                </Field>
              </>
            )}

            <Field label="Email" icon={<Mail size={15}/>}>
              <input type="email" placeholder="hello@example.com" value={form.email} onChange={upd('email')} autoComplete="email"/>
            </Field>

            {mode !== 'forgot' && (
              <div style={{ marginBottom:20 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <label style={{ fontSize:13, fontWeight:600, color:'var(--text2)' }}>Password</label>
                  {mode === 'login' && (
                    <span onClick={() => setMode('forgot')} style={{ fontSize:12, color:'var(--accent2)', cursor:'pointer', fontWeight:500 }}>
                      Forgot password?
                    </span>
                  )}
                </div>
                <div style={{ position:'relative' }}>
                  <div style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--text3)', zIndex:1 }}>
                    <Lock size={15}/>
                  </div>
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={upd('password')}
                    autoComplete={isSignup ? 'new-password' : 'current-password'}
                    style={{
                      width:'100%', background:'var(--bg3)', border:'1.5px solid var(--border)',
                      borderRadius:12, padding:'13px 44px', color:'var(--text)', fontSize:14,
                      outline:'none', transition:'border-color 0.2s', fontFamily:'DM Sans, sans-serif',
                    }}
                    onFocus={e => (e.target.style.borderColor='var(--accent)')}
                    onBlur={e  => (e.target.style.borderColor='var(--border)')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text3)', padding:0, cursor:'pointer', zIndex:1 }}
                  >
                    {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>
                {isSignup && (
                  <div style={{ fontSize:11, color:'var(--text3)', marginTop:6 }}>Must be at least 6 characters</div>
                )}
              </div>
            )}

            {error   && <AlertMsg type="error"   msg={error}/>}
            {success && <AlertMsg type="success" msg={success}/>}

            <motion.button
              whileHover={{ opacity: 0.91 }}
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={loading}
              style={{
                width:'100%', padding:'14px', borderRadius:12, border:'none',
                background:'linear-gradient(135deg, var(--accent), var(--accent3))',
                color:'white', fontSize:15, fontWeight:700, cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily:'Syne, sans-serif', marginTop:4,
                boxShadow:'0 6px 22px rgba(124,106,245,.4)',
                opacity: loading ? 0.78 : 1, letterSpacing:'-0.2px',
              }}
            >
              {loading ? (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
                  <div style={{ width:15, height:15, border:'2px solid rgba(255,255,255,.35)', borderTopColor:'white', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
                  {mode === 'signup' ? 'Creating account…' : mode === 'login' ? 'Signing in…' : 'Sending…'}
                </div>
              ) : (
                mode === 'signup' ? 'Create Account' : mode === 'login' ? 'Sign In' : 'Send Reset Link'
              )}
            </motion.button>
          </form>

          {mode !== 'forgot' && (
            <>
              <div style={{ display:'flex', alignItems:'center', gap:12, margin:'22px 0', color:'var(--text3)', fontSize:12 }}>
                <div style={{ flex:1, height:1, background:'var(--border)' }}/>or<div style={{ flex:1, height:1, background:'var(--border)' }}/>
              </div>
              <motion.button
                whileHover={{ borderColor:'var(--border2)' }}
                whileTap={{ scale: 0.98 }}
                style={{
                  width:'100%', background:'var(--bg3)', border:'1.5px solid var(--border)',
                  borderRadius:12, padding:'13px', display:'flex', alignItems:'center',
                  justifyContent:'center', gap:10, fontSize:14, color:'var(--text)',
                  cursor:'pointer', fontFamily:'DM Sans, sans-serif', transition:'border-color 0.2s', fontWeight:500,
                }}
              >
                <svg viewBox="0 0 24 24" width={18} height={18}>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </motion.button>
            </>
          )}

          <div style={{ textAlign:'center', marginTop:26, fontSize:13, color:'var(--text2)' }}>
            {mode === 'signup' ? (
              <>Already have an account?{' '}
                <span style={{ color:'var(--accent2)', cursor:'pointer', fontWeight:600 }} onClick={() => setMode('login')}>Sign in</span>
              </>
            ) : mode === 'login' ? (
              <>Don&apos;t have an account?{' '}
                <span style={{ color:'var(--accent2)', cursor:'pointer', fontWeight:600 }} onClick={() => setMode('signup')}>Sign up free</span>
              </>
            ) : null}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactElement }) {
  return (
    <div style={{ marginBottom:20 }}>
      <label style={{ fontSize:13, fontWeight:600, color:'var(--text2)', display:'block', marginBottom:8 }}>{label}</label>
      <div style={{ position:'relative' }}>
        <div style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--text3)', zIndex:1 }}>{icon}</div>
        {React.cloneElement(children as React.ReactElement<React.InputHTMLAttributes<HTMLInputElement>>, {
          style: {
            width:'100%', background:'var(--bg3)', border:'1.5px solid var(--border)',
            borderRadius:12, padding:'13px 14px 13px 42px', color:'var(--text)',
            fontSize:14, outline:'none', transition:'border-color 0.2s', fontFamily:'DM Sans, sans-serif',
          },
          onFocus: (e: React.FocusEvent<HTMLInputElement>) => (e.target.style.borderColor = 'var(--accent)'),
          onBlur:  (e: React.FocusEvent<HTMLInputElement>) => (e.target.style.borderColor = 'var(--border)'),
        })}
      </div>
    </div>
  );
}

function AlertMsg({ type, msg }: { type: 'error' | 'success'; msg: string }) {
  return (
    <motion.div
      initial={{ opacity:0, y:-4 }}
      animate={{ opacity:1, y:0 }}
      style={{
        fontSize:13, padding:'11px 16px', borderRadius:10, marginBottom:16,
        color:      type === 'error' ? 'var(--red)'  : 'var(--green)',
        background: type === 'error' ? 'rgba(245,85,85,.1)' : 'rgba(77,218,145,.1)',
        border:     `1px solid ${type === 'error' ? 'rgba(245,85,85,.25)' : 'rgba(77,218,145,.25)'}`,
        fontWeight:500,
      }}
    >
      {type === 'success' && '✓ '}{msg}
    </motion.div>
  );
}
