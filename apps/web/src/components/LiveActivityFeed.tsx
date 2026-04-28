'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ActivityEvent, useRealtimeActivity } from '@/hooks/useRealtime';
import { PredictionWithVote } from '@/types';
import { toast } from 'sonner';

interface Props {
  predictions: PredictionWithVote[];
}

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function LiveActivityFeed({ predictions }: Props) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [ticks, setTicks] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [mounted, setMounted] = useState(false);
  const bufferRef = useRef<ActivityEvent[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Build question map for lookup
  const questions: Record<string, string> = {};
  predictions.forEach((p) => { questions[p.id] = p.question; });

  useRealtimeActivity(questions, (event) => {
    // Pop a live notification toast
    toast(
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{
          padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800,
          background: event.choice ? 'rgba(170,255,71,0.15)' : 'rgba(255,107,107,0.15)',
          color: event.choice ? '#aaff47' : '#ff6b6b'
        }}>
          {event.choice ? 'YES' : 'NO'}
        </span>
        <span style={{ fontSize: '12px', fontWeight: 600 }}>{event.username} predicted</span>
      </div>,
      { description: event.question.slice(0, 40) + '...', duration: 3000 }
    );

    if (isHovered) {
      bufferRef.current.push(event);
    } else {
      setEvents((prev) => [event, ...bufferRef.current.reverse(), ...prev].slice(0, 20));
      bufferRef.current = [];
    }
  });

  useEffect(() => {
    if (!isHovered && bufferRef.current.length > 0) {
      setEvents((prev) => [...bufferRef.current.reverse(), ...prev].slice(0, 20));
      bufferRef.current = [];
    }
  }, [isHovered]);

  // Re-render every 10s to update "X ago" timestamps
  useEffect(() => {
    const timer = setInterval(() => setTicks((t) => t + 1), 10_000);
    return () => clearInterval(timer);
  }, []);

  if (!mounted) return (
    <div style={{ height: '320px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px' }} />
  );


  // Seed with some "fake seed" events when no real data yet to show what the feed looks like
  const displayEvents = events;

  if (displayEvents.length === 0) {
    return (
      <div
        style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      >
        <div style={{
          padding: '14px 16px 12px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: 'var(--green)',
            flexShrink: 0,
          }} />
          <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Live Activity
          </span>
        </div>
        <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
          Watching for activity…
        </div>
      </div>
    );
  }

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
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: 'var(--green)',
            flexShrink: 0,
          }} />
          <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Live Activity
          </span>
        </div>
        <span style={{
          fontSize: '10px',
          fontWeight: 600,
          color: 'var(--green)',
          background: 'var(--green-bg)',
          borderRadius: '100px',
          padding: '2px 8px',
        }}>
          {displayEvents.length} events
        </span>
      </div>

      {/* Events */}
      <div 
        style={{ maxHeight: '320px', overflowY: 'auto' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <AnimatePresence initial={false}>
          {displayEvents.map((event) => (
            <motion.a
              key={event.id}
              href={`/p/${event.prediction_id}`}
              initial={{ opacity: 0, y: -20, scale: 0.95, backgroundColor: event.choice ? 'rgba(170,255,71,0.2)' : 'rgba(255,107,107,0.2)' }}
              animate={{ opacity: 1, y: 0, scale: 1, backgroundColor: 'transparent' }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              style={{
                display: 'block',
                padding: '10px 14px',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                textDecoration: 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                {/* Vote choice pill */}
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '16px',
                  borderRadius: '100px',
                  background: event.choice ? 'rgba(170,255,71,0.15)' : 'rgba(255,107,107,0.15)',
                  border: `1px solid ${event.choice ? 'rgba(170,255,71,0.3)' : 'rgba(255,107,107,0.3)'}`,
                  fontSize: '9px',
                  fontWeight: 900,
                  color: event.choice ? '#aaff47' : '#ff6b6b',
                  letterSpacing: '0.05em',
                  flexShrink: 0,
                }}>
                  {event.choice ? 'YES' : 'NO'}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {event.username}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-dim)', flexShrink: 0 }}>
                  {timeAgo(event.ts)}
                </span>
              </div>
              <div style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                lineHeight: 1.3,
              }}>
                {event.question}
              </div>
            </motion.a>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
