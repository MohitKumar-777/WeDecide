'use client';

import { useQuery } from '@tanstack/react-query';
import { getLeaderboard, getCategories } from '@/lib/api';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Leaderboard from '@/components/Leaderboard';
import { Category, CATEGORY_EMOJIS } from '@/types';

const FIXED_CATEGORIES: Array<Category> = [
  'Cricket', 'Politics', 'Bollywood', 'Technology',
];

function getCatEmoji(name: string): string {
  return (CATEGORY_EMOJIS as Record<string, string>)[name] ?? '🔮';
}

const TIMEFRAMES = [
  { value: 'all',   label: 'All Time' },
  { value: 'month', label: 'This Month' },
  { value: 'week',  label: 'This Week' },
];

function LeaderboardContent() {
  const searchParams = useSearchParams();
  const category  = searchParams.get('category')  ?? undefined;
  const timeframe = searchParams.get('timeframe') ?? 'all';

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', { category, timeframe }],
    queryFn: () => getLeaderboard({ category, timeframe }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: catsData } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: 2 * 60 * 1000,
  });

  const dynamicCats = catsData?.data ?? [];
  const countMap = Object.fromEntries(dynamicCats.map((c) => [c.name, c.count]));
  const extraCats = dynamicCats.filter((c) => !FIXED_CATEGORIES.includes(c.name as Category));
  const totalCount = dynamicCats.reduce((s, c) => s + c.count, 0);

  const allCategories: Array<{ name: string; count?: number }> = [
    { name: 'All', count: totalCount || undefined },
    ...FIXED_CATEGORIES.map((cat) => ({ name: cat, count: countMap[cat] })),
    ...extraCats,
  ];

  const entries = data?.data ?? [];

  const renderCatBtn = (cat: string, count?: number) => {
    const active = (category ?? 'All') === cat;
    const emoji  = getCatEmoji(cat === 'All' ? '' : cat) || '✨';
    return (
      <button
        key={cat}
        onClick={() => {
          const sp = new URLSearchParams(searchParams.toString());
          if (cat === 'All') sp.delete('category');
          else sp.set('category', cat);
          window.history.pushState({}, '', `/leaderboard?${sp}`);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          padding: '5px 12px',
          borderRadius: '100px',
          fontSize: '12px',
          fontWeight: 700,
          cursor: 'pointer',
          border: active ? '1px solid rgba(245,217,78,0.4)' : '1px solid rgba(255,255,255,0.08)',
          background: active ? 'rgba(245,217,78,0.1)' : 'rgba(255,255,255,0.04)',
          color: active ? '#f5d94e' : '#9996b0',
          transition: 'all 0.15s',
          whiteSpace: 'nowrap',
        }}
      >
        {cat === 'All' ? '✨' : emoji} {cat}
        {count !== undefined && count > 0 && (
          <span style={{
            fontSize: '9px',
            fontFamily: 'DM Mono, monospace',
            padding: '1px 4px',
            borderRadius: '100px',
            background: active ? 'rgba(245,217,78,0.15)' : 'rgba(255,255,255,0.06)',
            color: active ? '#f5d94e' : 'var(--text-muted)',
            border: active ? '1px solid rgba(245,217,78,0.25)' : '1px solid rgba(255,255,255,0.08)',
          }}>
            {count}
          </span>
        )}
      </button>
    );
  };

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap' }}>

        {/* Category filter */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {allCategories.map((c) => renderCatBtn(c.name, c.count))}
        </div>

        {/* Timeframe filter */}
        <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
          {TIMEFRAMES.map((tf) => {
            const active = timeframe === tf.value;
            return (
              <button
                key={tf.value}
                onClick={() => {
                  const sp = new URLSearchParams(searchParams.toString());
                  sp.set('timeframe', tf.value);
                  window.history.pushState({}, '', `/leaderboard?${sp}`);
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                  background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                  color: active ? 'var(--text)' : 'var(--text-dim)',
                  transition: 'all 0.15s',
                  fontFamily: 'Cabinet Grotesk, sans-serif',
                }}
              >
                {tf.label}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '64px', borderRadius: '0' }} />
          ))}
        </div>
      ) : (
        <Leaderboard entries={entries} />
      )}
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <div style={{ padding: '40px 64px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#f5d94e',
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            marginBottom: '8px',
          }}
        >
          Global Rankings
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-main)',
            fontSize: 'clamp(36px, 4vw, 56px)',
            fontWeight: 900,
            lineHeight: 1.0,
            letterSpacing: '-2px',
            color: 'var(--text)',
          }}
        >
          The <span style={{ color: '#f5d94e' }}>Leaderboard</span>
        </h1>
        <p style={{ fontSize: '15px', color: '#9996b0', marginTop: '10px', lineHeight: 1.7 }}>
          Top predictors ranked by PredictScore — the only score that actually measures intelligence.
        </p>
      </div>

      <Suspense fallback={<div style={{ color: 'var(--text-dim)' }}>Loading rankings...</div>}>
        <LeaderboardContent />
      </Suspense>
    </div>
  );
}
