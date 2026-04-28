'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getNews } from '@/lib/api';

export default function NewsTickerStrip() {
  const trackRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(0);
  const rafRef = useRef<number>(0);
  const [isPaused, setIsPaused] = useState(false);

  const { data } = useQuery({
    queryKey: ['news-ticker', 'India trending'],
    queryFn: () => getNews('India trending today'),
    staleTime: 5 * 60 * 1000,
  });

  const items: { title: string; source: string; link: string }[] =
    data?.data?.slice(0, 20) ?? [];

  const SPEED = 0.4;

  useEffect(() => {
    const track = trackRef.current;
    if (!track || items.length === 0) return;

    const totalWidth = track.scrollWidth / 2; // half because we duplicate

    const animate = () => {
      if (!isPaused) {
        posRef.current += SPEED;
        if (posRef.current >= totalWidth) posRef.current = 0;
        track.style.transform = `translateX(-${posRef.current}px)`;
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPaused, items]);

  if (items.length === 0) return null;

  const doubled = [...items, ...items];

  return (
    <div
      style={{
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg)',
        overflow: 'hidden',
        position: 'relative',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Fade edges */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: '60px', zIndex: 10,
        background: 'linear-gradient(to right, var(--bg), transparent)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: '60px', zIndex: 10,
        background: 'linear-gradient(to left, var(--bg), transparent)',
        pointerEvents: 'none',
      }} />

      {/* Live label */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, zIndex: 20,
        background: 'linear-gradient(90deg, var(--bg) 60%, transparent)',
        paddingLeft: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        pointerEvents: 'none',
      }}>
        <span style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: 'var(--red)',
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: '10px', fontWeight: 600, color: 'var(--red)',
          textTransform: 'uppercase', letterSpacing: '0.05em',
          whiteSpace: 'nowrap',
        }}>
          Live
        </span>
      </div>

      {/* Scrolling news */}
      <div style={{ paddingLeft: '100px', overflow: 'hidden', width: '100%' }}>
        <div
          ref={trackRef}
          style={{
            display: 'flex',
            gap: '0',
            width: 'max-content',
            willChange: 'transform',
          }}
        >
          {doubled.map((item, i) => (
            <a
              key={i}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              title={item.title}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 28px 0 0',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <span style={{
                fontSize: '11px', fontWeight: 500,
                color: 'var(--text-muted)',
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                {item.title.length > 80 ? item.title.slice(0, 80) + '…' : item.title}
              </span>
              <span style={{ color: 'var(--border)', fontSize: '10px' }}>·</span>
              <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 600 }}>
                {item.source}
              </span>
              <span style={{ color: 'var(--border)', fontSize: '10px', marginLeft: '12px' }}>│</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
