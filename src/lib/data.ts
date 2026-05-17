export const COLORS = ['#7c6af5','#f567a8','#38d9c0','#f5a623','#4dda91','#f55a5a','#a78bfa'];

export interface User {
  id: number; name: string; handle: string; color: string; initials: string;
  bio?: string; followers?: number; following?: number; posts?: number;
  verified?: boolean; location?: string; website?: string; joinedDate?: string;
}

export const USERS: User[] = [
  { id:1, name:'Team Alpha',  handle:'@Team_Alpha',  color:'#7c6af5', initials:'TA', bio:'Building the future, one sprint at a time. 🚀',         followers:12400, following:340, posts:89,  verified:true,  location:'San Francisco, CA', website:'teamalpha.io',    joinedDate:'March 2022' },
  { id:2, name:'Fatima Ali',  handle:'@Fatima_Ali',  color:'#f567a8', initials:'FA', bio:'Designer & storyteller 🎨 Making pixels meaningful.',   followers:8200,  following:512, posts:124, verified:false, location:'Lahore, PK',        website:'fatima.design',   joinedDate:'July 2021'  },
  { id:3, name:'Zain Chat',   handle:'@Zain_Chat',   color:'#38d9c0', initials:'ZC', bio:'Full-stack dev. Coffee > sleep. OSS contributor.',       followers:5600,  following:211, posts:67,  verified:false, location:'Karachi, PK',       website:'github.com/zain', joinedDate:'Jan 2023'   },
  { id:4, name:'Faina Chat',  handle:'@Faina_Chat',  color:'#f5a623', initials:'FC', bio:'Content creator & photographer. Life in frames 📷',      followers:3100,  following:890, posts:203, verified:false, location:'Dubai, UAE',        website:'fainachat.com',   joinedDate:'Oct 2020'   },
  { id:5, name:'Dev Studio',  handle:'@Dev_Studio',  color:'#4dda91', initials:'DS', bio:'Open source. Always. Building tools developers love.',   followers:21000, following:150, posts:412, verified:true,  location:'Berlin, DE',        website:'devstudio.dev',   joinedDate:'Feb 2019'   },
  { id:6, name:'Nova Labs',   handle:'@Nova_Labs',   color:'#a78bfa', initials:'NL', bio:'AI-first product studio. Shipping the future daily.',    followers:9800,  following:300, posts:78,  verified:true,  location:'New York, NY',      website:'novalabs.ai',     joinedDate:'Nov 2021'   },
];

export const ME: User = {
  id:0, name:'My Profile', handle:'@my_profile', color:'#7c6af5', initials:'MP',
  bio:'Building the future of social connectivity. Product designer & developer. Coffee enthusiast ☕ • Based in Lahore, PK',
  followers:8400, following:312, posts:284, verified:true,
  location:'Lahore, PK', website:'myprofile.dev', joinedDate:'June 2020',
};

export interface Post {
  id:number; userId:number; text:string; tags:string[];
  likes:number; comments:number; shares:number;
  type:'text'|'image'|'video'; img?:string; time:string; liked:boolean; saved?:boolean;
}

export const INIT_POSTS: Post[] = [
  { id:1,  userId:1, text:'Exploring the new interface! Loving the global feed perspective.', tags:['UI','SocialApp','Collaboration'], likes:1247, comments:345, shares:89,  type:'image', img:'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&h=340&fit=crop', time:'2h ago',  liked:false },
  { id:2,  userId:2, text:'Just shipped our Q3 analytics dashboard. The data tells a compelling story about user engagement trends. Really proud of the team!', tags:['Analytics','Data','Growth'], likes:832, comments:127, shares:44, type:'text', time:'4h ago', liked:false },
  { id:3,  userId:3, text:'Working late but this project is worth it 🔥 Sometimes the grind pays off big time.', tags:['WorkLife','Tech'], likes:2100, comments:89, shares:201, type:'image', img:'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=340&fit=crop', time:'6h ago', liked:false },
  { id:4,  userId:5, text:'Design system v2 is LIVE. 400+ components, dark mode first, fully accessible. Go check it out!', tags:['Design','OpenSource'], likes:3540, comments:612, shares:890, type:'text', time:'8h ago', liked:false },
  { id:5,  userId:6, text:'The future of collaboration is async-first. We just proved it with our latest case study.', tags:['Future','Collaboration'], likes:678, comments:45, shares:33, type:'image', img:'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&h=340&fit=crop', time:'12h ago', liked:false },
  { id:6,  userId:4, text:'Coffee + code = infinite possibilities ☕ Morning vibes before the day gets crazy.', tags:['Developer','Morning'], likes:445, comments:22, shares:11, type:'text', time:'1d ago', liked:false },
  { id:7,  userId:2, text:'New color palette dropped for the Synergy brand! Warm purples meeting electric teals 🎨', tags:['Design','Branding'], likes:921, comments:88, shares:56, type:'image', img:'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=600&h=340&fit=crop', time:'1d ago', liked:false },
  { id:8,  userId:1, text:'Shipped 12 features this sprint. The team is absolutely killing it. Proud moment! 🚀', tags:['Startup','Engineering'], likes:1560, comments:230, shares:104, type:'text', time:'2d ago', liked:false },
];

export interface Story { id:number; userId:number; seen:boolean; }
export const INIT_STORIES: Story[] = [
  { id:1, userId:1, seen:false }, { id:2, userId:2, seen:false },
  { id:3, userId:3, seen:true  }, { id:4, userId:4, seen:false },
  { id:5, userId:5, seen:true  }, { id:6, userId:6, seen:false },
];

export interface Message { id:number; out:boolean; text:string; time:string; }
export interface Conversation { id:number; userId:number; msgs:Message[]; online:boolean; unread:number; lastMsg:string; }

export const INIT_CONVS: Conversation[] = [
  { id:1, userId:3, online:true,  unread:2, lastMsg:'Friday at 2PM. Are you free?', msgs:[
    { id:1, out:false, text:'Hey! Did you see the new design mockups?',               time:'10:32 AM' },
    { id:2, out:true,  text:'Yeah they look amazing! The dark mode especially 🔥',    time:'10:33 AM' },
    { id:3, out:false, text:"Right? The team really outdid themselves this time.",    time:'10:34 AM' },
    { id:4, out:true,  text:'When are we presenting to stakeholders?',                time:'10:35 AM' },
    { id:5, out:false, text:'Friday at 2PM. Are you free?',                           time:'10:36 AM' },
  ]},
  { id:2, userId:2, online:false, unread:0, lastMsg:'No rush, thanks! 🙏', msgs:[
    { id:1, out:false, text:'Hey, can you review my PR when you get a chance?', time:'9:15 AM' },
    { id:2, out:true,  text:'Sure! Give me 30 mins.',                           time:'9:20 AM' },
    { id:3, out:false, text:'No rush, thanks! 🙏',                              time:'9:21 AM' },
  ]},
  { id:3, userId:4, online:false, unread:1, lastMsg:'Hey!!!', msgs:[
    { id:1, out:false, text:'Hey!!!', time:'Yesterday' },
  ]},
  { id:4, userId:5, online:true, unread:0, lastMsg:'Thanks so much!', msgs:[
    { id:1, out:true,  text:'Great presentation today!', time:'Mon' },
    { id:2, out:false, text:'Thanks so much!',           time:'Mon' },
  ]},
];

export interface Notification { id:number; type:string; userId:number; text:string; detail?:string; time:string; read:boolean; icon:string; iconColor:string; }
export const INIT_NOTIFS: Notification[] = [
  { id:1, type:'like',    userId:2, text:'liked your post',              detail:'"Exploring the new interface..."',              time:'2m ago',  read:false, icon:'❤️', iconColor:'rgba(245,85,90,.15)'   },
  { id:2, type:'comment', userId:1, text:'commented on your post',       detail:'"Amazing work, keep it up!"',                  time:'15m ago', read:false, icon:'💬', iconColor:'rgba(124,106,245,.15)' },
  { id:3, type:'follow',  userId:3, text:'started following you',        time:'1h ago',  read:false, icon:'👤', iconColor:'rgba(56,217,192,.15)'  },
  { id:4, type:'like',    userId:4, text:'and 24 others liked your photo',time:'3h ago',  read:true,  icon:'❤️', iconColor:'rgba(245,85,90,.15)'   },
  { id:5, type:'mention', userId:5, text:'mentioned you in a comment',   detail:'"@my_profile this is exactly what I was talking about"', time:'5h ago', read:true, icon:'@', iconColor:'rgba(245,166,35,.15)' },
  { id:6, type:'follow',  userId:6, text:'started following you',        time:'1d ago',  read:true,  icon:'👤', iconColor:'rgba(167,139,250,.15)' },
  { id:7, type:'share',   userId:1, text:'shared your post',             detail:'"Design system v2 is LIVE..."',                time:'2d ago',  read:true,  icon:'🔁', iconColor:'rgba(56,217,192,.15)'  },
];

export const ANALYTICS = {
  weeks:      ['Jan W1','Jan W2','Jan W3','Jan W4','Feb W1','Feb W2','Feb W3','Feb W4'],
  followers:  [4200,4400,4800,5100,5600,6200,7100,8400],
  posts:      [12,15,18,14,20,22,19,25],
  engagement: [3.2,3.8,4.1,3.6,4.8,5.2,5.9,6.4],
  reach:      [18000,21000,24000,22000,28000,32000,38000,45000],
};

export const TOP_POSTS = [
  { text:'Design system v2 is LIVE!',          likes:3540, comments:612, shares:890, reach:45200 },
  { text:'Working late but this project...',   likes:2100, comments:89,  shares:201, reach:28700 },
  { text:'Exploring the new interface!',       likes:1247, comments:345, shares:89,  reach:21300 },
  { text:'Just shipped our Q3 analytics',      likes:832,  comments:127, shares:44,  reach:14600 },
];

export const GRID_EMOJIS = ['🎨','🚀','📸','💡','🌍','📱','🎵','💎','🔥'];
export const TREND_TAGS  = ['#hashtags','#molerworia','#gnopsiology','#tashtags','#socialist','#conesentation','#design','#react','#saas','#growth'];

export function fmtNum(n:number):string {
  if (n >= 1000000) {
    const v = n/1000000;
    return (v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)) + 'M';
  }
  if (n >= 1000) {
    const v = n/1000;
    return (v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)) + 'k';
  }
  return String(n);
}
