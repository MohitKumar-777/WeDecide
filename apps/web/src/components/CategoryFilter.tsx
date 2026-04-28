'use client';

import { useQuery } from '@tanstack/react-query';
import { getCategories } from '@/lib/api';
import { CATEGORY_EMOJIS, Category } from '@/types';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { Layers, Zap, Film, Cpu, Landmark, Hash, CheckSquare } from 'lucide-react';

/** These categories are ALWAYS pinned at the top (in this order). */
const FIXED_CATEGORIES: Array<Category> = [
  'Cricket',
  'Politics',
  'Bollywood',
  'Technology',
];

/** Fallback emoji for categories not in CATEGORY_EMOJIS */
function getCatIcon(name: string) {
  switch (name) {
    case 'All': return <Layers size={14} />;
    case 'Cricket': return <Zap size={14} />;
    case 'Politics': return <Landmark size={14} />;
    case 'Bollywood': return <Film size={14} />;
    case 'Technology': return <Cpu size={14} />;
    default: return <Hash size={14} />;
  }
}

export default function CategoryFilter() {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get('category') ?? 'All';

  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: 2 * 60 * 1000, // refresh every 2 min
  });

  const dynamicCats: { name: string; count: number }[] = data?.data ?? [];

  // Build count lookup
  const countMap = Object.fromEntries(dynamicCats.map((c) => [c.name, c.count]));

  // Dynamic categories that aren't already in the fixed list
  const extraCats = dynamicCats.filter(
    (c) => !FIXED_CATEGORIES.includes(c.name as Category)
  );

  const select = useCallback(
    (cat: string) => {
      const sp = new URLSearchParams(params.toString());
      if (cat === 'All') sp.delete('category');
      else sp.set('category', cat);
      router.push(`/?${sp.toString()}`);
    },
    [router, params]
  );

  const renderItem = (name: string, count?: number) => {
    const active = current === name;
    return (
      <button
        key={name}
        onClick={() => select(name)}
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          gap: '8px',
          padding: '6px 12px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '13px',
          fontWeight: active ? 700 : 500,
          cursor: 'pointer',
          border: 'none',
          background: active ? 'var(--bg-hover)' : 'transparent',
          color: active ? 'var(--text)' : 'var(--text-muted)',
          textAlign: 'left',
          transition: 'all 0.1s',
          marginBottom: '2px',
        }}
        onMouseEnter={(e) => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
            (e.currentTarget as HTMLElement).style.color = 'var(--text)';
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
            (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
          }
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', flexShrink: 0, opacity: active ? 1 : 0.6 }}>
          {getCatIcon(name)}
        </span>
        <span className="sidebar-label" style={{ flex: 1 }}>{name}</span>
        {count !== undefined && count > 0 && (
          <span
            style={{
              fontSize: '10px',
              fontWeight: 600,
              padding: '1px 6px',
              borderRadius: '100px',
              background: 'var(--border)',
              color: 'var(--text-dim)',
              flexShrink: 0,
            }}
          >
            {count}
          </span>
        )}
      </button>
    );
  };

  const totalCount = dynamicCats.reduce((s, c) => s + c.count, 0);

  return (
    <div style={{ marginTop: '16px' }}>
      {/* Section label */}
      <div
        className="sidebar-label"
        style={{
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--text-dim)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          padding: '0 12px',
          marginBottom: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>Categories</span>
        {isLoading && (
          <span
            style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: 'var(--accent)',
              flexShrink: 0,
            }}
          />
        )}
      </div>

      {/* ── "All" is always first ── */}
      {renderItem('All', isLoading ? undefined : totalCount || undefined)}

      {/* ── Fixed pinned categories ── */}
      {FIXED_CATEGORIES.map((cat) =>
        renderItem(cat, isLoading ? undefined : countMap[cat])
      )}

      {/* ── Dynamic extra categories (those not in fixed list) ── */}
      {extraCats.length > 0 && (
        <>
          <div
            style={{
              height: '1px',
              background: 'rgba(255,255,255,0.05)',
              margin: '8px 10px',
            }}
          />
          {extraCats.map((cat) => renderItem(cat.name, cat.count))}
        </>
      )}

      {/* Skeleton rows while loading (only shown on initial load) */}
      {isLoading && dynamicCats.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 4px' }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="skeleton"
              style={{ height: '32px', borderRadius: '8px', opacity: 0.4 }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
