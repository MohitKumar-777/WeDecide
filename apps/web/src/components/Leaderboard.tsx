'use client';

import { User, TIER_COLORS, TIER_ICONS } from '@/types';
import Link from 'next/link';
import ScoreBadge from './ScoreBadge';
import { motion } from 'framer-motion';

const MotionLink = motion.create(Link);

interface Props {
  user: User;
  rank: number;
  movement?: 'up' | 'down' | 'stable';
  movementAmount?: number;
  highlighted?: boolean;
}

function MovementIcon({ movement, amount }: { movement?: string; amount?: number }) {
  if (!movement || movement === 'stable') return <span style={{ color: 'var(--text-dim)' }}>—</span>;
  return (
    <span style={{ color: movement === 'up' ? 'var(--yes)' : '#ff6b6b', fontSize: '12px', fontWeight: 700 }}>
      {movement === 'up' ? '▲' : '▼'} {amount}
    </span>
  );
}

export function LeaderboardRow({ user, rank, movement, movementAmount, highlighted }: Props) {
  const tierColor = TIER_COLORS[user.tier];

  return (
    <MotionLink
      href={`/@${user.username}`}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: 4 }}
      style={{
        display: 'grid',
        gridTemplateColumns: '48px 1fr auto auto',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 20px',
        background: highlighted ? 'rgba(0,191,165,0.06)' : 'transparent',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        transition: 'background 0.15s',
        textDecoration: 'none',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = highlighted
          ? 'rgba(0,191,165,0.06)'
          : 'transparent';
      }}
    >
      {/* Rank */}
      <div style={{ textAlign: 'center' }}>
        <span
          style={{
            fontFamily: 'var(--font-main)',
            fontSize: rank <= 3 ? '16px' : '14px',
            fontWeight: 800,
            color: rank === 1 ? 'var(--accent)' : 'var(--text-dim)',
          }}
        >
          {rank}
        </span>
      </div>

      {/* User info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: `${tierColor}20`,
            border: `2px solid ${tierColor}40`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            flexShrink: 0,
          }}
        >
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={user.username} style={{ width: '100%', borderRadius: '50%' }} />
          ) : (
            TIER_ICONS[user.tier]
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: '14px',
              color: 'var(--text)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {user.display_name ?? user.username}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
            @{user.username} · {user.accuracy_pct.toFixed(1)}% accuracy
          </div>
        </div>
      </div>

      {/* Score */}
      <ScoreBadge tier={user.tier} score={user.predict_score} size="sm" showScore />

      {/* Movement */}
      <div style={{ width: '50px', textAlign: 'right' }}>
        <MovementIcon movement={movement} amount={movementAmount} />
      </div>
    </MotionLink>
  );
}

interface LeaderboardProps {
  entries: Array<{
    rank: number;
    user: User;
    movement?: 'up' | 'down' | 'stable';
    movementAmount?: number;
  }>;
  currentUserId?: string;
}

export default function Leaderboard({ entries, currentUserId }: LeaderboardProps) {
  if (!entries.length) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
        No rankings yet. Be the first to predict!
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '48px 1fr auto auto',
          gap: '12px',
          padding: '10px 20px',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {['RANK', 'PREDICTOR', 'SCORE', '±'].map((h) => (
          <div
            key={h}
            style={{
              fontSize: '10px',
              fontWeight: 800,
              color: 'var(--text-dim)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            {h}
          </div>
        ))}
      </div>

      {entries.map((e) => (
        <LeaderboardRow
          key={e.user.id}
          rank={e.rank}
          user={e.user}
          movement={e.movement}
          movementAmount={e.movementAmount}
          highlighted={e.user.id === currentUserId}
        />
      ))}
    </div>
  );
}
