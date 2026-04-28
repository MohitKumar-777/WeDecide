'use client';

import { useQuery } from '@tanstack/react-query';
import { getPrediction } from '@/lib/api';
import { useParams } from 'next/navigation';
import { useRealtimePrediction } from '@/hooks/useRealtime';
import PredictionCard from '@/components/PredictionCard';
import MarketCharts from '@/components/MarketCharts';
import RelatedNews from '@/components/RelatedNews';
import CountdownTimer from '@/components/CountdownTimer';
import PredictionComments from '@/components/PredictionComments';
import { CATEGORY_EMOJIS } from '@/types';
import { motion } from 'framer-motion';

const DIFFICULTY_COLORS: Record<string, string> = {
  easy:   '#aaff47',
  medium: '#f5d94e',
  hard:   '#ff6b6b',
};

export default function PredictionPage() {
  const params = useParams();
  const id = params.id as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ['prediction', id],
    queryFn: () => getPrediction(id),
  });

  useRealtimePrediction(id);

  if (isLoading) {
    return (
      <div style={{ padding: '48px 64px', maxWidth: '1100px', margin: '0 auto' }}>
        {/* Breadcrumb skeleton */}
        <div className="skeleton" style={{ height: '14px', width: '160px', marginBottom: '32px' }} />
        {/* Hero skeleton */}
        <div className="skeleton" style={{ height: '36px', width: '80%', marginBottom: '12px' }} />
        <div className="skeleton" style={{ height: '36px', width: '60%', marginBottom: '28px' }} />
        {/* Chart skeleton */}
        <div className="skeleton" style={{ height: '460px', borderRadius: '16px', marginBottom: '24px' }} />
        {/* Stats skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1px' }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '80px' }} />)}
        </div>
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div style={{ padding: '80px 64px', textAlign: 'center', color: 'var(--text-dim)' }}>
        <div style={{ fontSize: '56px', marginBottom: '16px', filter: 'grayscale(0.5)' }}>🔮</div>
        <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
          Prediction not found
        </div>
        <div style={{ fontSize: '14px', marginBottom: '32px' }}>This market may have been removed or never existed.</div>
        <a href="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)',
          borderRadius: '10px', padding: '10px 20px', color: 'var(--text)',
          fontSize: '13px', fontWeight: 700,
        }}>← Back to Feed</a>
      </div>
    );
  }

  const p = data.data;
  const emoji = CATEGORY_EMOJIS[p.category as keyof typeof CATEGORY_EMOJIS] ?? '🔮';
  const total = p.yes_count + p.no_count;
  const diffColor = DIFFICULTY_COLORS[p.difficulty] ?? 'var(--text-dim)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ padding: '36px 52px', maxWidth: '1100px', margin: '0 auto' }}
    >
      {/* Breadcrumb */}
      <div style={{
        fontSize: '12px', color: 'var(--text-muted)',
        marginBottom: '28px',
        display: 'flex', alignItems: 'center', gap: '6px',
        fontWeight: 600,
      }}>
        <a href="/" style={{ color: 'var(--text-dim)', textDecoration: 'none', transition: 'color 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}
        >
          ← Feed
        </a>
        <span style={{ color: '#3a3850' }}>›</span>
        <span>{emoji} {p.category}</span>
        <span style={{ color: '#3a3850' }}>›</span>
        <span style={{ color: diffColor, fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {p.difficulty}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '36px', alignItems: 'start' }}>

        {/* ── LEFT: Main content ── */}
        <div>
          {/* Status badges */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="badge" style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.09)',
              color: '#9896ae',
            }}>
              {emoji} {p.category}
            </span>
            <span className="badge" style={{
              background: `${diffColor}18`,
              border: `1px solid ${diffColor}35`,
              color: diffColor,
            }}>
              {p.difficulty.charAt(0).toUpperCase() + p.difficulty.slice(1)}
            </span>
            <span className="badge" style={{
              background: p.status === 'open' ? 'rgba(170,255,71,0.1)' : p.status === 'resolved' ? 'rgba(91,200,245,0.1)' : 'rgba(255,107,107,0.1)',
              border: `1px solid ${p.status === 'open' ? 'rgba(170,255,71,0.2)' : p.status === 'resolved' ? 'rgba(91,200,245,0.2)' : 'rgba(255,107,107,0.2)'}`,
              color: p.status === 'open' ? '#aaff47' : p.status === 'resolved' ? '#5bc8f5' : '#ff6b6b',
            }}>
              {p.status === 'open' ? '🟢 Open' : p.status === 'resolved' ? '✅ Resolved' : '🔒 Closed'}
            </span>
            {p.source_url && (
              <a
                href={p.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="badge"
                style={{
                  background: 'rgba(91,200,245,0.06)',
                  border: '1px solid rgba(91,200,245,0.15)',
                  color: '#5bc8f5',
                  textDecoration: 'none',
                }}
              >
                📰 Source
              </a>
            )}
          </div>

          {/* Question */}
          <h1 style={{
            fontFamily: 'var(--font-main)',
            fontSize: 'clamp(22px, 3.5vw, 36px)',
            fontWeight: 900,
            lineHeight: 1.12,
            letterSpacing: '-0.5px',
            color: '#ffffff',
            marginBottom: '14px',
          }}>
            {p.question}
          </h1>

          {/* Description */}
          {p.description && (
            <p style={{
              fontSize: '15px',
              color: '#8886a0',
              lineHeight: 1.75,
              marginBottom: '20px',
              borderLeft: '3px solid rgba(182,109,255,0.25)',
              paddingLeft: '14px',
            }}>
              {p.description}
            </p>
          )}

          {/* Countdown */}
          <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Resolves
            </span>
            <CountdownTimer resolves_at={p.resolves_at} />
          </div>

          {/* Charts */}
          <MarketCharts
            id={p.id}
            yes_pct={p.yes_pct}
            no_pct={p.no_pct}
            yes_count={p.yes_count}
            no_count={p.no_count}
            question={p.question}
          />

          {/* Stats row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1px',
            background: 'var(--border)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            overflow: 'hidden',
            marginBottom: '32px',
          }}>
            {[
              { label: 'Total Volume', value: total.toLocaleString(),        color: 'var(--text)' },
              { label: 'YES Predictions',   value: p.yes_count.toLocaleString(), color: 'var(--yes)' },
              { label: 'NO Predictions',    value: p.no_count.toLocaleString(),  color: 'var(--no)' },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: 'var(--bg2)',
                  padding: '20px 16px',
                  textAlign: 'center',
                  transition: 'background 0.2s',
                  cursor: 'default',
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'var(--bg2)')}
              >
                <div style={{
                  fontFamily: 'var(--font-main)',
                  fontSize: '28px',
                  fontWeight: 800,
                  color: stat.color,
                  lineHeight: 1,
                  marginBottom: '6px',
                  letterSpacing: '-0.02em',
                }}>
                  {stat.value}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: 'var(--text-dim)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: 700,
                }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Tags */}
          {p.tags?.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '28px' }}>
              {p.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="badge"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    color: 'var(--text-muted)',
                    fontSize: '10px',
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Comments */}
          <PredictionComments predictionId={p.id} />
        </div>

        {/* ── RIGHT: Sidebar ── */}
        <div style={{ position: 'sticky', top: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Vote card */}
          <PredictionCard prediction={p} showLink={false} />

          {/* Share */}
          <div style={{
            padding: '18px',
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
          }}>
            <div style={{
              fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.1em',
              marginBottom: '12px',
            }}>
              Share Market
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                {
                  label: '💬 WhatsApp',
                  href: `https://wa.me/?text=${encodeURIComponent(`${p.question} — ${typeof window !== 'undefined' ? window.location.href : ''}`)}`,
                  color: '#aaff47',
                },
                {
                  label: '🐦 X / Twitter',
                  href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(p.question)}&url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`,
                  color: '#5bc8f5',
                },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="badge"
                  style={{
                    background: `${s.color}12`,
                    border: `1px solid ${s.color}28`,
                    color: s.color,
                    textDecoration: 'none',
                    padding: '7px 14px',
                    fontSize: '12px',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${s.color}22`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${s.color}12`; }}
                >
                  {s.label}
                </a>
              ))}
              <button
                onClick={() => navigator.clipboard?.writeText(window.location.href)}
                className="badge"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  color: '#9896ae',
                  cursor: 'pointer',
                  padding: '7px 14px',
                  fontSize: '12px',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
              >
                🔗 Copy link
              </button>
            </div>
          </div>

          {/* Live Intel */}
          <RelatedNews category={p.category} question={p.question} />
        </div>

      </div>
    </motion.div>
  );
}
