'use client';

import { useEffect, useRef, useState } from 'react';
import { PredictionWithVote } from '@/types';

interface Props {
  predictions: PredictionWithVote[];
}

export default function TrendingSlideshow({ predictions }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const posRef = useRef(0);
  const rafRef = useRef<number>(0);

  // Duplicate items for seamless infinite scroll
  const items = predictions.length > 0 ? [...predictions, ...predictions] : [];
  const CARD_WIDTH = 320;
  const CARD_GAP = 16;
  const SPEED = 0.6; // px per frame

  useEffect(() => {
    const track = trackRef.current;
    if (!track || items.length === 0) return;

    const totalWidth = predictions.length * (CARD_WIDTH + CARD_GAP);

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
  }, [isPaused, items.length, predictions.length]);

  if (predictions.length === 0) return null;

  return (
    <div
      style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'linear-gradient(180deg, rgba(17,17,24,0.95) 0%, rgba(11,11,15,0.95) 100%)',
        overflow: 'hidden',
        position: 'relative',
        padding: '14px 0',
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => { setIsPaused(false); setActiveIndex(null); }}
    >
      {/* Fade edges */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: '80px', zIndex: 10,
        background: 'linear-gradient(to right, var(--bg), transparent)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: '80px', zIndex: 10,
        background: 'linear-gradient(to left, var(--bg), transparent)',
        pointerEvents: 'none',
      }} />

      {/* Scrolling track */}
      <div
        ref={trackRef}
        style={{
          display: 'flex',
          gap: `${CARD_GAP}px`,
          width: 'max-content',
          willChange: 'transform',
        }}
      >
        {items.map((p, i) => {
          const total = p.yes_count + p.no_count;
          const yesPct = total > 0 ? Math.round((p.yes_count / total) * 100) : 50;
          const isYes = yesPct >= 50;
          const pct = isYes ? yesPct : 100 - yesPct;
          const color = isYes ? 'var(--yes)' : 'var(--no)';
          const isActive = activeIndex === i;

          return (
            <a
              key={`${p.id}-${i}`}
              href={`/p/${p.id}`}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: `${CARD_WIDTH}px`,
                flexShrink: 0,
                background: isActive
                  ? 'rgba(255,255,255,0.05)'
                  : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isActive ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)'}`,
                borderRadius: '12px',
                padding: '10px 14px',
                textDecoration: 'none',
                cursor: 'pointer',
                transition: 'background 0.15s, border-color 0.15s',
                overflow: 'hidden',
              }}
            >
              {/* Mini probability badge */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                flexShrink: 0,
                width: '40px',
              }}>
                <span style={{
                  fontFamily: 'var(--font-main)',
                  fontSize: '20px',
                  fontWeight: 800,
                  lineHeight: 1,
                  color,
                }}>
                  {pct}%
                </span>
                <span style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  color,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  {isYes ? 'YES' : 'NO'}
                </span>
              </div>

              {/* Divider */}
              <div style={{ width: '1px', alignSelf: 'stretch', background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />

              {/* Question text + mini bar */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text)',
                  lineHeight: 1.4,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  textOverflow: 'ellipsis',
                  marginBottom: '6px',
                }}>
                  {p.question}
                </div>
                {/* Mini probability bar */}
                <div style={{
                  height: '3px',
                  background: 'rgba(255,255,255,0.08)',
                  borderRadius: '100px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${yesPct}%`,
                    background: `linear-gradient(90deg, var(--yes), var(--accent))`,
                    borderRadius: '100px',
                    transition: 'width 0.6s ease',
                  }} />
                </div>
              </div>

              {/* Vote count chip */}
              <div style={{
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '1px',
              }}>
                <span style={{
                  fontFamily: 'var(--font-main)',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text-dim)',
                }}>
                  {total.toLocaleString()}
                </span>
                <span style={{ fontSize: '9px', color: 'var(--text-dim)', opacity: 0.7, fontWeight: 700, textTransform: 'uppercase' }}>intel</span>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
