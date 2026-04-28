'use client';

import { User, TIER_COLORS, TIER_ICONS } from '@/types';
import Link from 'next/link';

interface Props {
  user: User;
  size?: 'sm' | 'md';
}

export default function ProfileMini({ user, size = 'md' }: Props) {
  const color = TIER_COLORS[user.tier];
  const icon  = TIER_ICONS[user.tier];
  const avatarSize = size === 'sm' ? 28 : 36;

  return (
    <Link
      href={`/@${user.username}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size === 'sm' ? '8px' : '10px',
        textDecoration: 'none',
        padding: size === 'sm' ? '4px 8px' : '6px 10px',
        borderRadius: '10px',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'transparent';
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: avatarSize,
          height: avatarSize,
          borderRadius: '50%',
          background: `${color}20`,
          border: `2px solid ${color}40`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size === 'sm' ? '12px' : '14px',
          flexShrink: 0,
        }}
      >
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.username}
            style={{ width: '100%', borderRadius: '50%' }}
          />
        ) : (
          icon
        )}
      </div>

      {/* Info */}
      <div>
        <div
          style={{
            fontWeight: 800,
            fontSize: size === 'sm' ? '12px' : '14px',
            color: 'var(--text)',
            lineHeight: 1.2,
          }}
        >
          {user.display_name ?? user.username}
        </div>
        <div
          style={{
            fontSize: size === 'sm' ? '10px' : '11px',
            color,
            fontWeight: 700,
            letterSpacing: '0.04em',
          }}
        >
          {icon} {user.tier} · {user.predict_score.toLocaleString()} pts
        </div>
      </div>
    </Link>
  );
}
