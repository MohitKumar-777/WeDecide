'use client';

import { Tier, TIER_COLORS, TIER_ICONS } from '@/types';

interface Props {
  tier: Tier;
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
  animated?: boolean;
}

export default function ScoreBadge({
  tier,
  score,
  size = 'md',
  showScore = true,
  animated = false,
}: Props) {
  const color = TIER_COLORS[tier];
  const icon  = TIER_ICONS[tier];

  const sizes = {
    sm: { icon: '14px', score: '16px', label: '10px', pad: '6px 10px' },
    md: { icon: '18px', score: '22px', label: '11px', pad: '8px 14px' },
    lg: { icon: '24px', score: '32px', label: '13px', pad: '12px 20px' },
  };
  const s = sizes[size];

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        background: `${color}12`,
        border: `1px solid ${color}33`,
        borderRadius: '8px',
        padding: s.pad,
      }}
    >
      <span style={{ fontSize: s.icon }}>{icon}</span>
      <div>
        {showScore && (
          <div
            style={{
              fontFamily: 'var(--font-main)',
              fontSize: s.score,
              fontWeight: 800,
              color,
              lineHeight: 1,
              letterSpacing: '-0.02em',
            }}
          >
            {score.toLocaleString()}
          </div>
        )}
        <div
          style={{
            fontSize: s.label,
            fontWeight: 700,
            color: `${color}bb`,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {tier}
        </div>
      </div>
    </div>
  );
}
