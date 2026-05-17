'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Users, Heart, Eye, BarChart2, ArrowUpRight, Loader2 } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts';
import { analyticsAPI } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { ANALYTICS, TOP_POSTS, USERS, fmtNum } from '@/lib/data';

const PERIOD_OPTIONS: Array<{ label: string; range: string }> = [
  { label:'7D',  range:'week'  },
  { label:'30D', range:'month' },
  { label:'90D', range:'month' },
  { label:'1Y',  range:'month' },
];

const COLORS_PIE = ['#7c6af5','#f567a8','#38d9c0','#f5a623'];
const PIE_DATA = [
  { name:'Organic', value:45 },
  { name:'Hashtags', value:28 },
  { name:'Shares',   value:18 },
  { name:'Direct',   value:9  },
];

export default function AnalyticsPage() {
  const [periodIdx, setPeriodIdx] = useState(0);
  const [apiData, setApiData]     = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const currentUser = useStore(s => s.currentUser);

  const load = useCallback(async () => {
    if (!currentUser?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await analyticsAPI.getUser(currentUser.id, PERIOD_OPTIONS[periodIdx].range);
      setApiData(res.data);
    } catch {
      setApiData(null);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, periodIdx]);

  useEffect(() => { load(); }, [load]);

  // Use real data if available, else fall back to demo data
  const summary = apiData?.summary;
  const timeline: any[] = apiData?.timeline || [];

  // Build chart data from timeline or demo fallback
  const followerData   = timeline.length
    ? timeline.map((d: any) => ({ name: new Date(d.date).toLocaleDateString('en', { month:'short', day:'numeric' }), value: d.followersGained || 0 }))
    : ANALYTICS.weeks.map((w, i) => ({ name: w, value: ANALYTICS.followers[i] }));

  const engagementData = timeline.length
    ? timeline.map((d: any) => ({ name: new Date(d.date).toLocaleDateString('en', { month:'short', day:'numeric' }), value: d.engagementRate || 0 }))
    : ANALYTICS.weeks.map((w, i) => ({ name: w, value: ANALYTICS.engagement[i] }));

  const reachData = timeline.length
    ? timeline.map((d: any) => ({ name: new Date(d.date).toLocaleDateString('en', { month:'short', day:'numeric' }), value: d.reach || 0 }))
    : ANALYTICS.weeks.map((w, i) => ({ name: w, value: ANALYTICS.reach[i] }));

  const postData = timeline.length
    ? timeline.map((d: any) => ({ name: new Date(d.date).toLocaleDateString('en', { month:'short', day:'numeric' }), value: d.postsPublished || 0 }))
    : ANALYTICS.weeks.map((w, i) => ({ name: w, value: ANALYTICS.posts[i] }));

  const followersVal = summary?.followersCount ?? (currentUser as any)?.followersCount ?? 0;
  const postsVal     = summary?.postsCount     ?? (currentUser as any)?.postsCount     ?? 0;
  const likesVal     = summary?.totalLikesReceived ?? 0;

  const kpis = [
    { label:'Total Followers',  value: fmtNum(followersVal),  delta:'+18.2%', up:true,  icon:Users,     color:'var(--accent)' },
    { label:'Engagement Rate',  value: summary ? ((likesVal/(followersVal||1))*100).toFixed(1)+'%' : '—', delta:'+1.2%', up:true, icon:Heart, color:'var(--pink)' },
    { label:'Total Likes',      value: fmtNum(likesVal),      delta:'+34%',   up:true,  icon:Eye,       color:'var(--cyan)'   },
    { label:'Total Posts',      value: fmtNum(postsVal),      delta:'+32%',   up:true,  icon:BarChart2, color:'var(--amber)'  },
  ];

  const tooltipStyle = {
    contentStyle:{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:8, fontSize:12, color:'var(--text)' },
    cursor:{ fill:'rgba(124,106,245,.08)' },
  };

  return (
    <div style={{ height:'100%', overflowY:'auto', background:'var(--bg)' }}>
      <div style={{ maxWidth:1200, margin:'0 auto', padding:'20px 20px' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
          <div>
            <h1 style={{ fontFamily:'Syne, sans-serif', fontSize:26, fontWeight:800, color:'var(--text)', margin:0 }}>Analytics</h1>
            <p style={{ fontSize:13, color:'var(--text3)', marginTop:4 }}>
              Your analytics overview
            </p>
          </div>
          <div style={{ display:'flex', gap:4, background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:4 }}>
            {PERIOD_OPTIONS.map((p, i) => (
              <button key={p.label} onClick={() => setPeriodIdx(i)}
                style={{ padding:'6px 14px', borderRadius:7, border:'none', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'DM Sans',
                  background: periodIdx === i ? 'var(--accent)' : 'transparent',
                  color:      periodIdx === i ? 'white'        : 'var(--text3)',
                  transition:'all 0.2s',
                }}>{p.label}</button>
            ))}
          </div>
        </div>

        {/* Loading overlay on KPIs */}
        {loading && (
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16, color:'var(--text3)', fontSize:13 }}>
            <Loader2 size={14} style={{ animation:'spin 1s linear infinite' }}/> Loading live data…
          </div>
        )}

        {/* KPI cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
          {kpis.map((k,i) => (
            <motion.div key={k.label} initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.06 }}
              style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, padding:'20px 18px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                <span style={{ fontSize:13, color:'var(--text2)', fontWeight:500 }}>{k.label}</span>
                <div style={{ width:34, height:34, borderRadius:9, background:`${k.color}22`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <k.icon size={16} color={k.color}/>
                </div>
              </div>
              <div style={{ fontFamily:'Syne, sans-serif', fontSize:26, fontWeight:800, color:'var(--text)', marginBottom:6 }}>{k.value}</div>
              <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:12 }}>
                {k.up ? <TrendingUp size={12} color="var(--green)"/> : <TrendingDown size={12} color="var(--red)"/>}
                <span style={{ color: k.up ? 'var(--green)' : 'var(--red)', fontWeight:600 }}>{k.delta}</span>
                <span style={{ color:'var(--text3)' }}>vs last period</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts row 1 */}
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16, marginBottom:16 }}>
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.2 }}
            style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <div>
                <h3 style={{ fontFamily:'Syne, sans-serif', fontSize:15, fontWeight:700, color:'var(--text)' }}>Follower Growth</h3>
                <p style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>Total followers over time</p>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, color:'var(--green)', fontWeight:600 }}>
                <TrendingUp size={13}/> +18.2%
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={followerData}>
                <defs>
                  <linearGradient id="followerGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25}/>
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3"/>
                <XAxis dataKey="name" tick={{ fill:'var(--text3)', fontSize:11 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:'var(--text3)', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v => fmtNum(v)}/>
                <Tooltip {...tooltipStyle} formatter={(v: number) => [fmtNum(v),'Followers']}/>
                <Area type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2.5} fill="url(#followerGrad)"/>
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.25 }}
            style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>
            <h3 style={{ fontFamily:'Syne, sans-serif', fontSize:15, fontWeight:700, color:'var(--text)', marginBottom:4 }}>Traffic Sources</h3>
            <p style={{ fontSize:12, color:'var(--text3)', marginBottom:14 }}>Where your followers come from</p>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={PIE_DATA} cx="50%" cy="50%" innerRadius={38} outerRadius={62} paddingAngle={3} dataKey="value">
                  {PIE_DATA.map((_,i) => <Cell key={i} fill={COLORS_PIE[i]} strokeWidth={0}/>)}
                </Pie>
                <Tooltip contentStyle={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }}/>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
              {PIE_DATA.map((d,i) => (
                <div key={d.name} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11 }}>
                  <div style={{ width:8, height:8, borderRadius:2, background:COLORS_PIE[i], flexShrink:0 }}/>
                  <span style={{ color:'var(--text3)' }}>{d.name}</span>
                  <span style={{ color:'var(--text)', fontWeight:600, marginLeft:'auto' }}>{d.value}%</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Charts row 2 */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.3 }}
            style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>
            <h3 style={{ fontFamily:'Syne, sans-serif', fontSize:15, fontWeight:700, color:'var(--text)', marginBottom:4 }}>Engagement Rate</h3>
            <p style={{ fontSize:12, color:'var(--text3)', marginBottom:16 }}>Weekly engagement %</p>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={engagementData}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3"/>
                <XAxis dataKey="name" tick={{ fill:'var(--text3)', fontSize:10 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:'var(--text3)', fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`}/>
                <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v}%`,'Engagement']}/>
                <Line type="monotone" dataKey="value" stroke="var(--pink)" strokeWidth={2.5} dot={{ fill:'var(--pink)', r:3 }} activeDot={{ r:5 }}/>
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.35 }}
            style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>
            <h3 style={{ fontFamily:'Syne, sans-serif', fontSize:15, fontWeight:700, color:'var(--text)', marginBottom:4 }}>Posts Per Week</h3>
            <p style={{ fontSize:12, color:'var(--text3)', marginBottom:16 }}>Publishing frequency</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={postData} barSize={20}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3"/>
                <XAxis dataKey="name" tick={{ fill:'var(--text3)', fontSize:10 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:'var(--text3)', fontSize:10 }} axisLine={false} tickLine={false}/>
                <Tooltip {...tooltipStyle} formatter={(v: number) => [v,'Posts']}/>
                <Bar dataKey="value" fill="var(--cyan)" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Top posts */}
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.4 }}
          style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, padding:20, marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
            <div>
              <h3 style={{ fontFamily:'Syne, sans-serif', fontSize:15, fontWeight:700, color:'var(--text)' }}>Top Performing Posts</h3>
              <p style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>Your best content this period</p>
            </div>
            <button style={{ background:'none', border:'1px solid var(--border)', borderRadius:8, padding:'6px 12px', color:'var(--text2)', fontSize:12, cursor:'pointer', fontFamily:'DM Sans', display:'flex', alignItems:'center', gap:5 }}>
              View All <ArrowUpRight size={12}/>
            </button>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr>
                  {['Post','Likes','Comments','Shares','Reach'].map(h => (
                    <th key={h} style={{ textAlign:'left', padding:'8px 12px', color:'var(--text3)', fontWeight:600, borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TOP_POSTS.map((p,i) => (
                  <tr key={i} style={{ borderBottom: i < TOP_POSTS.length-1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding:'12px 12px', color:'var(--text)', maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.text}</td>
                    <td style={{ padding:'12px 12px', color:'var(--red)', fontWeight:600 }}>❤ {fmtNum(p.likes)}</td>
                    <td style={{ padding:'12px 12px', color:'var(--text2)' }}>💬 {fmtNum(p.comments)}</td>
                    <td style={{ padding:'12px 12px', color:'var(--cyan)', fontWeight:600 }}>🔁 {fmtNum(p.shares)}</td>
                    <td style={{ padding:'12px 12px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ flex:1, height:4, background:'var(--bg3)', borderRadius:2, minWidth:60 }}>
                          <div style={{ height:'100%', background:'var(--accent)', borderRadius:2, width:`${(p.reach/50000)*100}%` }}/>
                        </div>
                        <span style={{ color:'var(--text2)', whiteSpace:'nowrap', fontSize:12 }}>{fmtNum(p.reach)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Top creators */}
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.45 }}
          style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, padding:20, marginBottom:32 }}>
          <h3 style={{ fontFamily:'Syne, sans-serif', fontSize:15, fontWeight:700, color:'var(--text)', marginBottom:16 }}>Top Creators to Watch</h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:12 }}>
            {USERS.slice(0,4).map(u => (
              <div key={u.id} style={{ background:'var(--bg3)', borderRadius:12, padding:'16px 14px', textAlign:'center' }}>
                <div style={{ width:44, height:44, borderRadius:'50%', background:u.color, color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontFamily:'Syne', fontWeight:700, margin:'0 auto 10px' }}>{u.initials}</div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:2 }}>{u.name}</div>
                <div style={{ fontSize:11, color:'var(--text3)', marginBottom:10 }}>{u.handle}</div>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--accent2)' }}>{fmtNum(u.followers||0)}</div>
                <div style={{ fontSize:11, color:'var(--text3)' }}>followers</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <style>{`
        @keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
        @media (max-width:900px) {
          div[style*="grid-template-columns: repeat(4,1fr)"] { grid-template-columns: repeat(2,1fr) !important; }
          div[style*="grid-template-columns: 2fr 1fr"] { grid-template-columns: 1fr !important; }
          div[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
        }
        @media (max-width:480px) {
          div[style*="grid-template-columns: repeat(4,1fr)"] { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </div>
  );
}