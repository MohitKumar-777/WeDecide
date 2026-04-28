'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const NEWS_MOCK = [
  "BCCI hints at potential venue change for IPL playoffs...",
  "US Election volatility increases as key swing states report new polling data.",
  "NVIDIA earnings expectations drive AI-sector prediction volumes to record highs.",
  "Monsoon predictions for 2026 suggest early arrival in Kerala.",
  "SpaceX Starship launch window confirmed for next Tuesday.",
];

export default function MarketIntelligenceHub() {
  const [activity, setActivity] = useState(1248590);
  const [newsIdx, setNewsIdx] = useState(0);
  const [pulsePts, setPulsePts] = useState<number[]>(new Array(20).fill(50).map(() => 40 + Math.random() * 20));

  // Increment activity randomly
  useEffect(() => {
    const int = setInterval(() => {
      setActivity(v => v + Math.floor(Math.random() * 50));
    }, 2500);
    return () => clearInterval(int);
  }, []);

  // Cycle news
  useEffect(() => {
    const int = setInterval(() => {
      setNewsIdx(i => (i + 1) % NEWS_MOCK.length);
    }, 6000);
    return () => clearInterval(int);
  }, []);

  // Update pulse graph
  useEffect(() => {
    const int = setInterval(() => {
      setPulsePts(prev => [...prev.slice(1), 30 + Math.random() * 40]);
    }, 1500);
    return () => clearInterval(int);
  }, []);

  return (
    <div style={{
      background: 'rgba(17, 17, 22, 0.4)',
      backdropFilter: 'blur(12px)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '12px 20px',
      marginBottom: '24px',
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: '24px 40px',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* 1. Global Activity Pulse */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Global Activity
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
            {activity.toLocaleString()}
          </div>
        </div>
        <div style={{ width: '60px', height: '24px', display: 'flex', alignItems: 'flex-end', gap: '2px' }}>
          {pulsePts.map((p, i) => (
            <motion.div
              key={i}
              animate={{ height: `${p}%` }}
              style={{
                width: '2px',
                background: 'var(--accent)',
                borderRadius: '1px',
                opacity: 0.3 + (i / 20) * 0.7,
              }}
            />
          ))}
        </div>
      </div>

      <div style={{ width: '1px', height: '24px', background: 'var(--border)', flexShrink: 0 }} />

      {/* 2. Live Intel Feed */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          padding: '2px 8px',
          background: 'rgba(0, 200, 5, 0.1)',
          border: '1px solid var(--green)',
          borderRadius: '4px',
          fontSize: '9px',
          fontWeight: 800,
          color: 'var(--green)',
          letterSpacing: '0.05em',
          flexShrink: 0,
        }}>
          LIVE INTEL
        </div>
        <div style={{ flex: 1, position: 'relative', height: '20px', overflow: 'hidden' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={newsIdx}
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -30, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 100 }}
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {NEWS_MOCK[newsIdx]}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* 3. Market Sentiment Gauge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Market Sentiment
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--green)' }}>
            Bullish 64%
          </div>
        </div>
        <div style={{ width: '40px', height: '40px', position: 'relative' }}>
          <svg width="40" height="40" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="16" fill="none" stroke="var(--border)" strokeWidth="3" />
            <circle cx="20" cy="20" r="16" fill="none" stroke="var(--green)" strokeWidth="3" strokeDasharray="100" strokeDashoffset="36" />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, color: 'var(--green)' }}>
            64
          </div>
        </div>
      </div>
    </div>
  );
}
