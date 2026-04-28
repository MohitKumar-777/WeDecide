'use client';
import { motion } from 'framer-motion';

interface Props {
  yes_count: number;
  no_count: number;
  yes_pct: number;
  no_pct: number;
  userChoice?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function VoteBar({
  yes_count,
  no_count,
  yes_pct,
  no_pct,
  userChoice,
  className = '',
  size = 'md',
}: Props) {
  const heights = { sm: '5px', md: '8px', lg: '12px' };
  const total = yes_count + no_count;

  return (
    <div className={className}>
      {/* Labels */}
      <div className="flex justify-between mb-2 text-sm font-bold">
        <span
          style={{
            color: userChoice === true ? '#aaff47' : 'var(--text-dim)',
            transition: 'color 0.3s',
          }}
        >
          YES {yes_pct}%
        </span>
        <span
          style={{
            color: userChoice === false ? '#ff6b6b' : 'var(--text-dim)',
            transition: 'color 0.3s',
          }}
        >
          NO {no_pct}%
        </span>
      </div>

      {/* Track */}
      <div
        style={{
          height: heights[size],
          background: 'var(--surface2)',
          borderRadius: '100px',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* YES fill */}
        <motion.div
          className="vote-bar-fill"
          initial={{ width: 0 }}
          animate={{ width: `${yes_pct}%` }}
          transition={{ type: 'spring', bounce: 0, duration: 0.8 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            background: 'linear-gradient(90deg, #aaff47, #2dd4bf)',
            boxShadow: '0 0 12px rgba(170,255,71,0.4)',
          }}
        />
      </div>

      {/* Total count */}
      {total > 0 && (
        <div
          className="text-center mt-1 font-mono"
          style={{ fontSize: '10px', color: 'var(--text-dim)' }}
        >
          {total.toLocaleString()} total votes
        </div>
      )}
    </div>
  );
}
