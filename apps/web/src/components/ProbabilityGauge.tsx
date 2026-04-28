'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface Props {
  yes_pct: number;
  no_pct: number;
  size?: number;
}

export default function ProbabilityGauge({ yes_pct, no_pct, size = 260 }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Circle math
  const strokeWidth = Math.max(16, size * 0.09); // scale stroke width based on size
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Yes percentage offset
  const yesOffset = circumference - (yes_pct / 100) * circumference;
  const noOffset = circumference - (no_pct / 100) * circumference;

  if (!mounted) {
    return <div style={{ width: size, height: size, margin: '0 auto' }} />;
  }

  const isYesLeading = yes_pct >= no_pct;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        {/* SVG Gauge */}
        <svg
          width={size}
          height={size}
          style={{ transform: 'rotate(-90deg)', filter: 'drop-shadow(0 0 16px rgba(0,0,0,0.5))' }}
        >
          {/* Background NO Ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="var(--surface2)" // or "rgba(255,107,107,0.2)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Active NO Ring (fills the remaining space if needed, or we just draw the NO segment) */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="var(--no)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: noOffset }}
            transition={{ type: 'spring', bounce: 0, duration: 1.5 }}
            strokeLinecap="round"
            style={{ transformOrigin: 'center', transform: `rotate(${(yes_pct / 100) * 360}deg)` }}
          />
          {/* Active YES Ring */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="var(--yes)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: yesOffset }}
            transition={{ type: 'spring', bounce: 0, duration: 1.5 }}
            strokeLinecap="round"
          />
        </svg>

        {/* Center Text */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <motion.div
            key={isYesLeading ? 'yes' : 'no'}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            style={{
              fontFamily: 'var(--font-main)',
              letterSpacing: '-0.03em',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: `${size * 0.22}px`, fontWeight: 800, color: isYesLeading ? 'var(--yes)' : 'var(--no)', lineHeight: 1 }}>
              {isYesLeading ? yes_pct : no_pct}%
            </span>
            <span style={{ fontSize: `${size * 0.06}px`, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px' }}>
              {isYesLeading ? 'Probable YES' : 'Probable NO'}
            </span>
          </motion.div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '24px', marginTop: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--yes)' }} />
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>YES ({yes_pct}%)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--no)' }} />
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>NO ({no_pct}%)</span>
        </div>
      </div>
    </div>
  );
}
