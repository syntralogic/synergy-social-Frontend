'use client';

interface AvatarUser {
  fullName?: string;
  name?: string;
  avatar?: string;
  color?: string;
  initials?: string;
}

interface AvatarProps {
  user: AvatarUser;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  online?: boolean;
  className?: string;
  ring?: boolean;
}

const sizeMap = {
  xs:{ wh:26, font:10 },
  sm:{ wh:36, font:13 },
  md:{ wh:44, font:16 },
  lg:{ wh:60, font:22 },
  xl:{ wh:80, font:28 },
};

export default function Avatar({ user, size='md', online=false, className='', ring=false }: AvatarProps) {
  const { wh, font } = sizeMap[size];
  const displayName = user.fullName || user.name || '';
  const initials    = user.initials ||
    displayName.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || '?';
  const color = user.color || 'linear-gradient(135deg, var(--accent), var(--pink))';

  return (
    <div className={`relative flex-shrink-0 ${className}`} style={{ width:wh, height:wh, flexShrink:0, position:'relative' }}>
      {ring && (
        <div style={{ position:'absolute', inset:-2, borderRadius:'50%', background:'linear-gradient(135deg, var(--accent), var(--pink))', zIndex:0 }}/>
      )}
      {user.avatar ? (
        <img src={user.avatar} alt={displayName}
          style={{ width:wh, height:wh, borderRadius:'50%', objectFit:'cover', position:'relative', zIndex:1,
            border: ring ? '2px solid var(--bg)' : 'none' }}/>
      ) : (
        <div style={{ width:wh, height:wh, borderRadius:'50%', background:color, color:'white',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:font, fontFamily:'Syne, sans-serif', fontWeight:700, position:'relative', zIndex:1,
          border: ring ? '2px solid var(--bg)' : 'none' }}>
          {initials}
        </div>
      )}
      {online && (
        <div style={{ position:'absolute', bottom:1, right:1, width:9, height:9, borderRadius:'50%',
          background:'var(--green)', border:'2px solid var(--bg2)', zIndex:2 }}/>
      )}
    </div>
  );
}
