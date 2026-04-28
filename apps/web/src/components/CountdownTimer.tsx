'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface Props {
  resolves_at: string;
  compact?: boolean;
}

function formatDuration(ms: number) {
  if (ms <= 0) return 'Closed';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);

  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

export default function CountdownTimer({ resolves_at, compact = false }: Props) {
  const [remaining, setRemaining] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    function update() {
      setRemaining(new Date(resolves_at).getTime() - Date.now());
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [resolves_at]);

  if (!mounted) {
    return <span style={{ opacity: 0 }}>...</span>;
  }

  const urgency =
    remaining <= 0            ? 'closed'
    : remaining < 3_600_000   ? 'urgent'   // < 1 hour
    : remaining < 86_400_000  ? 'warning'  // < 24 hours
    : 'normal';

  const cfg = {
    closed:  { color: 'var(--text-dim)', bg: 'transparent',             border: 'transparent',           glow: 'none' },
    urgent:  { color: 'var(--no)', bg: 'var(--no-bg)',  border: 'var(--no-bg)', glow: '0 0 12px var(--no-bg)' },
    warning: { color: 'var(--yellow)', bg: 'rgba(245,217,78,0.08)',   border: 'rgba(245,217,78,0.2)',  glow: 'none' },
    normal:  { color: 'var(--text-dim)', bg: 'transparent',             border: 'transparent',           glow: 'none' },
  }[urgency];

  if (compact) {
    return (
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: cfg.color,
          fontWeight: 500,
          background: cfg.bg,
          border: `1px solid ${cfg.border}`,
          borderRadius: '6px',
          padding: urgency === 'urgent' ? '2px 7px' : '0',
          animation: urgency === 'urgent' ? 'pulse 1.2s infinite' : 'none',
        }}
        title={new Date(resolves_at).toLocaleString()}
      >
        {remaining <= 0 ? 'Closed' : formatDuration(remaining)}
      </span>
    );
  }

  return (
    <motion.div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '7px 14px',
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: '10px',
        boxShadow: cfg.glow,
      }}
      animate={urgency === 'urgent' ? { opacity: [1, 0.7, 1] } : {}}
      transition={{ duration: 1.2, repeat: Infinity }}
    >
      <span style={{ fontSize: '14px' }}>
        {urgency === 'closed' ? '🔒' : urgency === 'urgent' ? '⚡' : urgency === 'warning' ? '⏳' : 'Opening Soon'}
      </span>
      <div>
        <div style={{
          fontFamily: 'var(--font-inter)',
          fontSize: '14px',
          fontWeight: 700,
          color: cfg.color,
          lineHeight: 1,
        }}>
          {remaining <= 0 ? 'Market Closed' : formatDuration(remaining)}
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 600 }}>
          {remaining <= 0 ? 'Awaiting resolution' : `Resolves ${new Date(resolves_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
        </div>
      </div>
    </motion.div>
  );
}
