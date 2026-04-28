'use client';

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { getPredictions, getLeaderboard, getNews, getCategories } from '@/lib/api';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { Search, Target, TrendingUp, Award, Info } from 'lucide-react';
import PredictionCard from '@/components/PredictionCard';
import Leaderboard from '@/components/Leaderboard';
import TrendingSlideshow from '@/components/TrendingSlideshow';
import LiveActivityFeed from '@/components/LiveActivityFeed';
import ConnectionStatus from '@/components/ConnectionStatus';
import FeaturedMarketCard from '@/components/FeaturedMarketCard';
import { useRealtimeFeed } from '@/hooks/useRealtime';
import { PredictionWithVote } from '@/types';


function LiveNewsFeed() {
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['news-sidebar', 'India trending'],
    queryFn: () => getNews('India trending politics cricket sports'),
    staleTime: 5 * 60 * 1000,
  });

  const items: { title: string; source: string; link: string; time?: string }[] =
    data?.data ?? [];

  const doubled = items.length > 0 ? [...items, ...items] : [];

  useEffect(() => {
    if (isPaused || !scrollRef.current || items.length === 0) return;
    
    let animationFrameId: number;
    let lastTime = performance.now();

    const scroll = (time: number) => {
      if (time - lastTime > 20) {
        if (scrollRef.current) {
          scrollRef.current.scrollTop += 0.5;
          // Seamless loop
          if (scrollRef.current.scrollTop >= scrollRef.current.scrollHeight / 2) {
            scrollRef.current.scrollTop = 0;
          }
        }
        lastTime = time;
      }
      animationFrameId = requestAnimationFrame(scroll);
    };

    animationFrameId = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPaused, items.length]);

  return (
    <div
      style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '14px 16px 12px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: 'var(--red)',
            flexShrink: 0,
          }} />
          <span style={{
            fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>Market News</span>
      </div>

      {/* Scrolling news container */}
      <div
        style={{ height: '340px', overflow: 'hidden', position: 'relative' }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Fade top/bottom edges */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '32px', zIndex: 5,
          background: 'linear-gradient(to bottom, var(--bg2), transparent)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '32px', zIndex: 5,
          background: 'linear-gradient(to top, var(--bg2), transparent)',
          pointerEvents: 'none',
        }} />

        {isLoading ? (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} className="skeleton" style={{ height: '40px', borderRadius: '8px' }} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
            No news available
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="no-scrollbar"
            style={{ 
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              overflowY: isPaused ? 'auto' : 'hidden',
              paddingTop: '8px',
            }}
          >
            {doubled.map((item, i) => (
              <a
                key={i}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block',
                  padding: '10px 14px',
                  textDecoration: 'none',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', gap: '6px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>
                    {item.source}
                  </span>
                  {item.time && (
                    <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 500 }}>
                      {item.time}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  {item.title}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PredictionSkeleton() {
  return (
    <div className="card-base p-4" style={{ minHeight: '200px' }}>
      <div className="skeleton" style={{ height: '16px', width: '30%', marginBottom: '12px' }} />
      <div className="skeleton" style={{ height: '20px', width: '90%', marginBottom: '12px' }} />
      <div className="skeleton" style={{ height: '40px', width: '100%', marginBottom: '12px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div className="skeleton" style={{ height: '36px' }} />
        <div className="skeleton" style={{ height: '36px' }} />
      </div>
    </div>
  );
}

function FeedContent({ searchInput }: { searchInput: string }) {
  const searchParams = useSearchParams();
  const category = searchParams.get('category') ?? undefined;
  const sort = searchParams.get('sort') ?? 'hot';
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['predictions', { category, sort, debouncedSearch }],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await getPredictions({ category, sort, limit: 20, search: debouncedSearch, page: pageParam as number });
      if (sort === 'hot' && res.data) {
        res.data = [...res.data].sort(() => Math.random() - 0.5);
      }
      return res;
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.meta?.hasMore ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
  });

  const allPredictions = data?.pages.flatMap((page) => page.data ?? []) ?? [];
  
  // Deduplicate by ID to prevent React rendering crashes during infinite scroll
  const predictions = Array.from(
    new Map(allPredictions.map(p => [p.id, p])).values()
  );

  // Infinite scroll observer
  const observerTarget = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  const predictionIds = predictions.map((p: PredictionWithVote) => p.id);

  useRealtimeFeed(predictionIds);

  const { data: leaderboardData } = useQuery({
    queryKey: ['leaderboard', 'global'],
    queryFn: () => getLeaderboard(),
    staleTime: 5 * 60 * 1000,
  });

  const leaderboard = leaderboardData?.data ?? [];

  const { data: catData } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: 5 * 60 * 1000,
  });
  const categories = catData?.data ?? [];

  return (
    <div>
      {!isLoading && predictions.length > 0 && (
        <TrendingSlideshow predictions={predictions.slice(0, 12)} />
      )}

      <div style={{ 
        padding: '16px 24px 0', 
        maxWidth: '1200px', 
        margin: '0 auto',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(0, 191, 165, 0.08) 0%, rgba(122, 255, 102, 0.03) 100%)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '80px', opacity: 0.02, fontWeight: 900, pointerEvents: 'none' }}>WeDecide</div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={18} color="var(--yes)" /> Welcome to WeDecide
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px', maxWidth: '600px', lineHeight: 1.4 }}>
                The opinion-based data platform for India. Predict on trending topics, build your reputation, and explore community sentiment.
              </p>
            </div>
            <div style={{ 
              background: 'rgba(255, 107, 107, 0.08)', 
              color: '#ff6b6b', 
              padding: '4px 10px', 
              borderRadius: '6px', 
              fontSize: '10px', 
              fontWeight: 700,
              border: '1px solid rgba(255, 107, 107, 0.15)',
              whiteSpace: 'nowrap'
            }}>
              NO REAL MONEY INVOLVED
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '4px' }}>
            {[
              { icon: <Target size={16} color="var(--yes)" />, title: 'Pick a Topic', desc: 'Browse trending markets across Sports, Politics, and more.' },
              { icon: <TrendingUp size={16} color="var(--accent)" />, title: 'Make a Move', desc: 'Predict YES or NO based on your opinion and data.' },
              { icon: <Award size={16} color="#f5d94e" />, title: 'Earn Status', desc: 'Increase your PredictScore and climb the leaderboard.' }
            ].map((step, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <div style={{ marginBottom: '6px' }}>{step.icon}</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>{step.title}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', lineHeight: 1.3 }}>{step.desc}</div>
              </div>
            ))}
          </div>

          <div style={{ 
            marginTop: '4px', 
            fontSize: '11px', 
            color: 'var(--text-muted)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            padding: '8px 14px',
            background: 'rgba(0,0,0,0.15)',
            borderRadius: '100px',
            width: 'fit-content'
          }}>
            <Info size={12} /> This is a purely informational platform for community opinions. No gambling occurs here.
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 260px',
          gap: '24px',
          padding: '16px 24px',
          maxWidth: '1200px',
          margin: '0 auto',
          alignItems: 'start',
        }}
      >
        <main>
          <div
            style={{
              display: 'flex',
              gap: '0',
              borderBottom: '1px solid var(--border)',
              marginBottom: '24px',
            }}
          >
            {[
              { value: 'hot', label: 'Hot' },
              { value: 'new', label: 'New' },
              { value: 'closing', label: 'Closing Soon' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  const sp = new URLSearchParams(searchParams.toString());
                  sp.set('sort', tab.value);
                  window.history.pushState({}, '', `?${sp}`);
                }}
                style={{
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: sort === tab.value ? 'var(--text)' : 'var(--text-muted)',
                  background: 'none',
                  border: 'none',
                  borderBottom: `2px solid ${sort === tab.value ? 'var(--text)' : 'transparent'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Dynamic Scrollable Categories (Bubbles) */}
          <div
            className="no-scrollbar"
            style={{
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              marginBottom: '24px',
              paddingBottom: '4px',
            }}
          >
            <button
              onClick={() => {
                const sp = new URLSearchParams(searchParams.toString());
                sp.delete('category');
                window.history.pushState({}, '', `?${sp}`);
              }}
              style={{
                padding: '6px 14px',
                borderRadius: '100px',
                fontSize: '12px',
                fontWeight: 600,
                background: !category ? 'var(--text)' : 'var(--bg2)',
                color: !category ? 'var(--bg)' : 'var(--text-muted)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
              }}
            >
              All Topics
            </button>
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => {
                  const sp = new URLSearchParams(searchParams.toString());
                  sp.set('category', cat.name);
                  window.history.pushState({}, '', `?${sp}`);
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: '100px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: category === cat.name ? 'var(--text)' : 'var(--bg2)',
                  color: category === cat.name ? 'var(--bg)' : 'var(--text-muted)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                }}
              >
                {cat.name} <span style={{ opacity: 0.6, fontSize: '10px', marginLeft: '4px' }}>{cat.count}</span>
              </button>
            ))}
          </div>

          {!isLoading && predictions.length > 0 && (
            <FeaturedMarketCard prediction={predictions[0]} />
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '16px',
            }}
          >
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => <PredictionSkeleton key={i} />)
              : predictions.length > 1
              ? predictions.slice(1).map((p: PredictionWithVote) => (
                  <PredictionCard key={p.id} prediction={p} />
                ))
              : (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '80px 20px', color: 'var(--text-dim)' }}>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)' }}>No predictions found</div>
                  <div style={{ fontSize: '14px', marginTop: '6px' }}>Try a different search or category.</div>
                </div>
              )}
          </div>
          
          {/* Infinite Scroll Trigger */}
          <div ref={observerTarget} style={{ padding: '20px', textAlign: 'center', marginTop: '16px' }}>
            {isFetchingNextPage && <div className="skeleton" style={{ height: '40px', width: '40px', borderRadius: '50%', margin: '0 auto' }} />}
            {!hasNextPage && predictions.length > 0 && (
              <span style={{ fontSize: '13px', color: 'var(--text-dim)', fontWeight: 600 }}>You've reached the end of the market</span>
            )}
          </div>
        </main>

        <aside style={{ position: 'sticky', top: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <ConnectionStatus />
          <LiveNewsFeed />
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
              Top Predictors
            </div>
            {leaderboard.length > 0 ? (
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                {leaderboard.slice(0, 5).map((entry) => (
                  <a key={entry.user.id} href={`/@${entry.user.username}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.15s' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-dim)', width: '20px', flexShrink: 0 }}>#{entry.rank}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.user.display_name ?? entry.user.username}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{entry.user.tier} · {entry.user.accuracy_pct.toFixed(1)}%</div>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)' }}>{entry.user.predict_score.toLocaleString()}</span>
                  </a>
                ))}
              </div>
            ) : (
              <div className="skeleton" style={{ height: '200px', borderRadius: '12px' }} />
            )}
          </div>
          <LiveActivityFeed predictions={predictions} />
        </aside>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [searchInput, setSearchInput] = useState('');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative' }}>
      <div
        style={{
          borderBottom: '1px solid var(--border)',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(8, 8, 10, 0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          gap: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flex: 1 }}>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', whiteSpace: 'nowrap' }}>
            Market Overview
          </h1>
          
          {/* Premium Search Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border)',
            borderRadius: '100px',
            padding: '8px 16px',
            maxWidth: '400px',
            width: '100%',
            gap: '10px',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-glow)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
            e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2)';
          }}
          >
            <Search size={16} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="Search markets, predictors, or topics..." 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text)',
                fontSize: '13px',
                fontWeight: 500,
                width: '100%',
              }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <a href="/auth" style={{ 
            fontSize: '13px', 
            fontWeight: 700, 
            padding: '8px 20px', 
            background: 'var(--text)', 
            color: 'var(--bg)', 
            borderRadius: '100px',
            textDecoration: 'none',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            Sign In
          </a>
        </div>
      </div>

      <Suspense fallback={<div style={{ padding: '32px', color: 'var(--text-dim)' }}>Loading feed...</div>}>
        <FeedContent searchInput={searchInput} />
      </Suspense>
    </div>
  );
}
