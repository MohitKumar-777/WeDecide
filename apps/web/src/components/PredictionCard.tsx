'use client';

import { PredictionWithVote } from '@/types';
import { useVote } from '@/hooks/useVote';
import CountdownTimer from './CountdownTimer';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getPredictionHistory } from '@/lib/api';
import { formatTimeAgo } from '@/lib/format';
import AnimatedCounter from './AnimatedCounter';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import { Info } from 'lucide-react';

// ─── Mini Sparkline ──────────────────────────────────────────
interface SparkProps { id: string; yes_pct: number; isBullish: boolean; }

function MiniSparkline({ id, yes_pct, isBullish }: SparkProps) {
  const [pts, setPts] = useState<{ value: number }[]>([]);
  const color = isBullish ? 'var(--yes)' : 'var(--no)';
  const gradId = `sg-${id}`;

  useEffect(() => {
    let ok = true;
    getPredictionHistory(id)
      .then(r => { if (ok) setPts((r.data ?? []).map((d: any) => ({ value: d.value ?? d }))) })
      .catch(() => {});
    return () => { ok = false; };
  }, [id]);

  const W = 240, H = 40;
  const vals = pts.length >= 2 ? pts : [{ value: 50 }, { value: yes_pct }];
  const minV = Math.min(...vals.map(p => p.value), 0);
  const maxV = Math.max(...vals.map(p => p.value), 100);
  const range = maxV - minV || 1;
  const toX = (i: number) => (i / (vals.length - 1)) * W;
  const toY = (v: number) => H - ((v - minV) / range) * H;
  const pathPts = vals.map((p, i) => `${toX(i)},${toY(p.value)}`).join(' L ');
  const linePath = `M ${pathPts}`;
  const areaPath = `${linePath} L ${toX(vals.length - 1)},${H} L 0,${H} Z`;

  return (
    <div style={{ height: '36px', width: '100%', position: 'relative' }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isBullish ? 'var(--yes)' : 'var(--no)'} stopOpacity={0.18} />
            <stop offset="100%" stopColor={isBullish ? 'var(--yes)' : 'var(--no)'} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradId})`} />
        <path d={linePath} fill="none" stroke={isBullish ? 'var(--yes)' : 'var(--no)'} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ─── AI Option Generator ─────────────────────────────────────
// Generates contextual prediction options based on the probability,
// mimicking Polymarket's multi-choice market feel without requiring backend changes.
function getAIOptions(yesPct: number): Array<{ label: string; sublabel: string; choice: boolean; highlight: boolean }> {
  if (yesPct >= 75) {
    return [
      { label: 'YES', sublabel: 'Highly likely', choice: true, highlight: true },
      { label: 'NO',  sublabel: 'Unlikely',      choice: false, highlight: false },
    ];
  }
  if (yesPct >= 55) {
    return [
      { label: 'YES', sublabel: 'Favoured',      choice: true,  highlight: true },
      { label: 'NO',  sublabel: 'Contrarian',     choice: false, highlight: false },
    ];
  }
  if (yesPct <= 25) {
    return [
      { label: 'YES', sublabel: 'Long shot',      choice: true,  highlight: false },
      { label: 'NO',  sublabel: 'Consensus',      choice: false, highlight: true },
    ];
  }
  if (yesPct <= 45) {
    return [
      { label: 'YES', sublabel: 'Underdog',       choice: true,  highlight: false },
      { label: 'NO',  sublabel: 'Favoured',       choice: false, highlight: true },
    ];
  }
  // Near 50/50 — contested
  return [
    { label: 'YES', sublabel: 'Contested',   choice: true,  highlight: false },
    { label: 'NO',  sublabel: 'Contested',   choice: false, highlight: false },
  ];
}

// ─── Main Card ───────────────────────────────────────────────
interface Props { prediction: PredictionWithVote; showLink?: boolean; }

export default function PredictionCard({ prediction, showLink = true }: Props) {
  const router = useRouter();
  const { vote, isPending, userChoice } = useVote(prediction.id, prediction.userVote?.choice ?? null);
  const [mounted, setMounted] = useState(false);
  const total = prediction.yes_count + prediction.no_count;
  const hasVoted = userChoice !== null;
  const yesPct = prediction.yes_pct ?? 50;
  const noPct = 100 - yesPct;
  const options = getAIOptions(yesPct);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="skeleton" style={{ height: '300px', borderRadius: 'var(--radius-lg)' }} />;
  }

  function handleVote(e: React.MouseEvent, choice: boolean) {
    e.preventDefault();
    e.stopPropagation();
    const token = typeof window !== 'undefined' ? localStorage.getItem('px_token') : null;
    if (!token) { router.push('/auth'); return; }
    if (!isPending && !hasVoted) {
      vote(choice);
      
      // Fire confetti from the button's location
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;
      
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { x, y },
        colors: choice ? ['#aaff47', '#ffffff'] : ['#ff6b6b', '#ffffff'],
        disableForReducedMotion: true,
        zIndex: 9999
      });

      toast.success('Prediction logged!', {
        description: `You voted ${choice ? 'YES' : 'NO'}. Good luck!`,
        style: { border: `1px solid ${choice ? 'var(--yes)' : 'var(--no)'}` }
      });
    }
  }

  const inner = (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      height: '100%',
      boxSizing: 'border-box',
      transition: 'border-color var(--transition)',
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-focus)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {prediction.category}
          </span>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
               onMouseEnter={(e) => {
                 const tooltip = e.currentTarget.querySelector('.tooltip') as HTMLElement;
                 if (tooltip) { tooltip.style.opacity = '1'; tooltip.style.pointerEvents = 'auto'; }
               }}
               onMouseLeave={(e) => {
                 const tooltip = e.currentTarget.querySelector('.tooltip') as HTMLElement;
                 if (tooltip) { tooltip.style.opacity = '0'; tooltip.style.pointerEvents = 'none'; }
               }}
          >
            <Info size={12} style={{ color: 'var(--text-dim)', cursor: 'help' }} />
            <div className="tooltip" style={{
              position: 'absolute', top: '100%', left: '0', 
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: '8px', padding: '10px', width: '200px',
              fontSize: '11px', color: 'var(--text)', zIndex: 100,
              boxShadow: 'var(--shadow-lg)',
              opacity: 0, pointerEvents: 'none', transition: 'opacity 0.2s',
              marginTop: '8px',
              lineHeight: 1.4,
              fontWeight: 500
            }}>
              <div style={{ fontWeight: 800, marginBottom: '4px', color: 'var(--accent)' }}>HOW TO PREDICT</div>
              Analyze the data, pick a side, and lock in your opinion. Correct predictions earn you status and rank.
            </div>
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 500 }}>
            • {formatTimeAgo(prediction.created_at)}
          </span>
        </div>
        <CountdownTimer resolves_at={prediction.resolves_at} compact />
      </div>

      {/* ── Question ── */}
      <Link href={`/p/${prediction.id}`} style={{ textDecoration: 'none' }} className="group">
        <h3 style={{ fontSize: '15px', fontWeight: 700, lineHeight: 1.45, color: 'var(--text)', margin: 0 }}>
          <span style={{ 
            transition: 'text-decoration-color 0.2s, color 0.2s', 
            textDecoration: 'underline', 
            textDecorationColor: 'transparent',
            textUnderlineOffset: '4px'
          }}
          onMouseEnter={e => e.currentTarget.style.textDecorationColor = 'var(--text)'}
          onMouseLeave={e => e.currentTarget.style.textDecorationColor = 'transparent'}
          >
            {prediction.question}
          </span>
        </h3>
      </Link>

      {/* ── Probability Header ── */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
        <span style={{ fontSize: '22px', fontWeight: 800, color: yesPct >= 50 ? 'var(--yes)' : 'var(--no)', lineHeight: 1 }}>
          <AnimatedCounter value={yesPct} format={v => `${Math.round(v)}%`} />
        </span>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
          chance YES
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--no)', fontWeight: 700 }}>
          <AnimatedCounter value={noPct} format={v => `${Math.round(v)}%`} /> NO
        </span>
      </div>

      {/* ── Sparkline ── */}
      <MiniSparkline id={prediction.id} yes_pct={yesPct} isBullish={yesPct >= 50} />

      {/* ── Progress bar ── */}
      <div style={{ height: '3px', background: 'var(--border)', borderRadius: '100px', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${yesPct}%`,
          background: yesPct >= 50 ? 'var(--yes)' : 'var(--no)',
          borderRadius: '100px', transition: 'width 0.5s ease',
        }} />
      </div>

      {/* ── Spacer ── */}
      <div style={{ flexGrow: 1 }} />

      {/* ── Footer: vote count ── */}
      <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600 }}>
        <AnimatedCounter value={total} format={v => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v)))} /> predictions
      </div>

      {/* ── Action Buttons ── */}
      {prediction.status === 'resolved' ? (
        <div style={{
          padding: '6px 10px', borderRadius: '6px', textAlign: 'center', fontSize: '11px', fontWeight: 800,
          background: prediction.outcome ? 'var(--yes-bg)' : 'var(--no-bg)',
          border: `1px solid ${prediction.outcome ? 'var(--yes)' : 'var(--no)'}`,
          color: prediction.outcome ? 'var(--yes)' : 'var(--no)',
        }}>
          RESOLVED · {prediction.outcome ? 'YES' : 'NO'}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '8px' }}>
          {options.map((opt) => {
            const isYes = opt.choice;
            const isSelected = userChoice === opt.choice;
            const baseColor = isYes ? 'var(--yes)' : 'var(--no)';
            const baseBg   = isYes ? 'var(--yes-bg)' : 'var(--no-bg)';

            return (
              <motion.button
                key={opt.label}
                type="button"
                onClick={e => handleVote(e, opt.choice)}
                disabled={isPending || hasVoted}
                whileHover={!hasVoted && !isPending ? { scale: 1.02, boxShadow: `0 0 8px ${baseColor}40` } : {}}
                whileTap={!hasVoted && !isPending ? { scale: 0.95 } : {}}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '2px',
                  padding: '8px',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${isSelected ? baseColor : 'var(--border)'}`,
                  background: isSelected ? baseBg : (opt.highlight ? 'var(--bg-hover)' : 'transparent'),
                  cursor: isPending || hasVoted ? 'default' : 'pointer',
                  opacity: isPending ? 0.6 : 1,
                  transition: 'background 0.15s, border-color 0.15s',
                }}
                onMouseEnter={e => {
                  if (!hasVoted && !isPending) {
                    (e.currentTarget as HTMLElement).style.background = baseBg;
                    (e.currentTarget as HTMLElement).style.borderColor = baseColor;
                  }
                }}
                onMouseLeave={e => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLElement).style.background = opt.highlight ? 'var(--bg-hover)' : 'transparent';
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                  }
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: 800, color: isSelected ? baseColor : (isYes ? 'var(--yes)' : 'var(--no)') }}>
                  {opt.label} · <AnimatedCounter value={isYes ? yesPct : noPct} format={v => `${Math.round(v)}%`} />
                </span>
                <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {opt.sublabel}
                </span>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );

  return inner;
}
