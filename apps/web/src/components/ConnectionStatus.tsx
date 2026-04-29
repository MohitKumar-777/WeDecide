'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useConnectionStatus } from '@/hooks/useRealtime';

export default function ConnectionStatus() {
  const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [latency, setLatency] = useState<number | null>(null);
  const [viewers, setViewers] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setViewers(Math.floor(Math.random() * 120) + 40);
  }, []);

  useConnectionStatus(setStatus);

  // Periodic latency probe
  useEffect(() => {
    const probe = async () => {
      const start = performance.now();
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://wedecide-api.onrender.com'}/health`, { cache: 'no-store' });
        setLatency(Math.round(performance.now() - start));
      } catch {
        setLatency(null);
      }
    };

    probe();
    const id = setInterval(probe, 15_000);
    return () => clearInterval(id);
  }, []);

  const cfg = {
    connected:    { dot: '#aaff47', glow: 'rgba(170,255,71,0.5)', label: 'Live', bg: 'rgba(170,255,71,0.06)', border: 'rgba(170,255,71,0.15)' },
    connecting:   { dot: '#f5d94e', glow: 'rgba(245,217,78,0.5)', label: 'Syncing', bg: 'rgba(245,217,78,0.06)', border: 'rgba(245,217,78,0.15)' },
    disconnected: { dot: '#ff6b6b', glow: 'rgba(255,107,107,0.5)', label: 'Offline', bg: 'rgba(255,107,107,0.06)', border: 'rgba(255,107,107,0.15)' },
  }[status];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 14px',
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      borderRadius: '10px',
      gap: '12px',
    }}>
      {/* Status indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ position: 'relative', width: '10px', height: '10px', flexShrink: 0 }}>
          {/* Pulsing ring */}
          {status === 'connected' && (
            <motion.div
              style={{
                position: 'absolute', inset: '-3px',
                borderRadius: '50%',
                border: `1px solid ${cfg.dot}`,
              }}
              animate={{ opacity: [0.8, 0], scale: [1, 2] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
          <div style={{
            width: '10px', height: '10px', borderRadius: '50%',
            background: cfg.dot,
            boxShadow: `0 0 8px ${cfg.glow}`,
          }} />
        </div>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: cfg.dot, letterSpacing: '0.04em' }}>
            {cfg.label}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>
            {latency !== null ? `${latency}ms latency` : 'measuring…'}
          </div>
        </div>
      </div>

      {/* Viewers */}
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '13px', fontWeight: 900, fontFamily: 'var(--font-main)', color: 'var(--text)', lineHeight: 1 }}>
          {viewers.toLocaleString()}
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
          watching
        </div>
      </div>
    </div>
  );
}
