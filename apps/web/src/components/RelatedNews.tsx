'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getNews } from '@/lib/api';

interface Props {
  category: string;
  question: string;
}

export default function RelatedNews({ category, question }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(0);
  const rafRef = useRef<number>(0);
  const [isPaused, setIsPaused] = useState(false);

  const queryTerm = question.length > 20 ? question : `${category} India`;

  const { data, isLoading, error } = useQuery({
    queryKey: ['news', queryTerm],
    queryFn: () => getNews(queryTerm),
    staleTime: 5 * 60 * 1000,
  });

  const items: any[] = data?.data ?? [];

  // Vertical auto-scroll
  useEffect(() => {
    const track = trackRef.current;
    if (!track || items.length === 0) return;

    const totalHeight = track.scrollHeight / 2;

    const animate = () => {
      if (!isPaused) {
        posRef.current += 0.35;
        if (posRef.current >= totalHeight) posRef.current = 0;
        track.style.transform = `translateY(-${posRef.current}px)`;
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPaused, items]);

  const doubled = items.length > 0 ? [...items, ...items] : [];

  return (
    <div style={{
      marginTop: '16px',
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px 14px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <span style={{
          width: '7px', height: '7px', borderRadius: '50%',
          background: '#ff6b6b',
          boxShadow: '0 0 6px rgba(255,107,107,0.8)',
          animation: 'pulse 1.5s infinite',
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: '12px', fontWeight: 800, color: 'var(--text-dim)',
          textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>
          Live Market Intel
        </span>
      </div>

      {/* Scrolling container */}
      <div
        style={{ height: '300px', overflow: 'hidden', position: 'relative' }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Fade edges */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '28px', zIndex: 5,
          background: 'linear-gradient(to bottom, var(--bg2), transparent)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '28px', zIndex: 5,
          background: 'linear-gradient(to top, var(--bg2), transparent)',
          pointerEvents: 'none',
        }} />

        {isLoading ? (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton" style={{ height: '48px', borderRadius: '8px' }} />
            ))}
          </div>
        ) : error || items.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px' }}>
            No recent intelligence found.
          </div>
        ) : (
          <div ref={trackRef} style={{ willChange: 'transform', paddingTop: '8px' }}>
            {doubled.map((item: any, i: number) => (
              <a
                key={`${item.id ?? i}-${i}`}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block',
                  padding: '12px 20px',
                  textDecoration: 'none',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <span style={{ fontSize: '10px', color: '#5bc8f5', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {item.source}
                  </span>
                  <span style={{ fontSize: '10px', color: '#5bc8f5', fontFamily: 'DM Mono, monospace' }}>
                    {item.time}
                  </span>
                </div>
                <h4 style={{
                  margin: 0,
                  fontSize: '12px',
                  color: '#9996b0',
                  fontWeight: 600,
                  lineHeight: 1.5,
                  transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text)')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#9996b0')}
                >
                  {item.title}
                </h4>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
