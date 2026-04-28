'use client';

import { useEffect, useState, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPredictions } from '@/lib/api';
import PredictionCard from '@/components/PredictionCard';
import { PredictionWithVote } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'px_bookmarks';

function BookmarksFeed() {
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      setBookmarkedIds(saved);
    } catch { /* ignore */ }

    // Listen for storage changes (bookmark toggles from other tabs)
    const handler = () => {
      try {
        const saved: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
        setBookmarkedIds(saved);
      } catch { /* ignore */ }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['predictions', 'all'],
    queryFn: () => getPredictions({ limit: 200 }),
    staleTime: 60_000,
  });

  const allPredictions: PredictionWithVote[] = data?.data ?? [];
  const bookmarked = allPredictions.filter((p) => bookmarkedIds.includes(p.id));

  if (isLoading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '24px' }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton" style={{ height: '260px', borderRadius: '16px' }} />
        ))}
      </div>
    );
  }

  if (bookmarkedIds.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}
      >
        <div style={{ fontSize: '56px', marginBottom: '16px', filter: 'grayscale(0.3)' }}>🔖</div>
        <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
          No bookmarks yet
        </div>
        <div style={{ fontSize: '14px', marginBottom: '32px', color: 'var(--text-dim)' }}>
          Tap the 🏷️ on any prediction card to save it here
        </div>
        <a href="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'rgba(245,217,78,0.1)', border: '1px solid rgba(245,217,78,0.25)',
          borderRadius: '10px', padding: '10px 24px', color: '#f5d94e',
          fontSize: '13px', fontWeight: 700,
          textDecoration: 'none',
        }}>
          Browse Markets →
        </a>
      </motion.div>
    );
  }

  if (bookmarked.length === 0 && !isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-dim)' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
        <div style={{ fontSize: '16px', fontWeight: 600 }}>
          Your bookmarked markets couldn&apos;t be loaded.<br />
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>They may have been resolved or removed.</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '24px' }}>
      <AnimatePresence>
        {bookmarked.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: i * 0.05 }}
          >
            <PredictionCard prediction={p} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default function BookmarksPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div className="blob-right" />
      {/* Header */}
      <div style={{
        padding: '32px 40px 28px',
        borderBottom: '1px solid var(--border)',
        background: 'linear-gradient(180deg, rgba(20,20,30,0.8) 0%, transparent 100%)',
        backdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 40,
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '28px' }}>🔖</span>
            <div>
              <h1 style={{
                fontFamily: 'var(--font-main)',
                fontSize: '28px', fontWeight: 900,
                color: '#ffffff', letterSpacing: '-0.5px', lineHeight: 1,
              }}>
                Bookmarks
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '4px' }}>
                Your saved prediction markets
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 40px' }}>
        <Suspense fallback={
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '24px' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: '260px', borderRadius: '16px' }} />
            ))}
          </div>
        }>
          <BookmarksFeed />
        </Suspense>
      </div>
    </div>
  );
}
