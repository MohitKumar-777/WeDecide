'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { getComments, postComment, Comment } from '@/lib/api';
import { supabase } from '@/lib/supabase';

interface Props {
  predictionId: string;
}

const TIER_COLORS: Record<string, string> = {
  Rookie: '#9996b0',
  Analyst: '#5bc8f5',
  Oracle: '#aaff47',
  Visionary: '#b66dff',
  Legend: '#ff8c42',
};

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function PredictionComments({ predictionId }: Props) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [optimisticComments, setOptimisticComments] = useState<Comment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['comments', predictionId],
    queryFn: () => getComments(predictionId),
    staleTime: 30_000,
  });

  const comments = [...optimisticComments, ...(data?.data ?? [])];

  // Real-time new comment subscription
  useEffect(() => {
    const channel = supabase
      .channel(`comments-${predictionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'comments',
        filter: `prediction_id=eq.${predictionId}`,
      }, () => {
        // Invalidate and refetch to get latest with user data
        queryClient.invalidateQueries({ queryKey: ['comments', predictionId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [predictionId, queryClient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;

    const token = localStorage.getItem('px_token') ?? '';
    if (!token) {
      setError('Please sign in to comment');
      return;
    }

    setIsSubmitting(true);
    setError('');

    // Optimistic add
    const optimistic: Comment = {
      id: `opt-${Date.now()}`,
      body: body.trim(),
      created_at: new Date().toISOString(),
      likes: 0,
      users: null,
    };
    setOptimisticComments((prev) => [optimistic, ...prev]);
    setBody('');

    try {
      await postComment(predictionId, body.trim(), token);
      setOptimisticComments((prev) => prev.filter((c) => c.id !== optimistic.id));
      queryClient.invalidateQueries({ queryKey: ['comments', predictionId] });
    } catch (err: any) {
      setOptimisticComments((prev) => prev.filter((c) => c.id !== optimistic.id));
      setError(err.message ?? 'Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      marginBottom: '24px',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>Comments</span>
          {data?.data && (
            <span style={{
              fontSize: '10px', fontWeight: 700,
              color: 'var(--text-dim)',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: '100px',
              padding: '1px 6px',
            }}>
              {data.meta?.total ?? data.data.length}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            width: '5px', height: '5px', borderRadius: '50%',
            background: 'var(--green)',
          }} />
          <span style={{ fontSize: '9px', color: 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.04em' }}>LIVE</span>
        </div>
      </div>

      {/* Compose box */}
      <form onSubmit={handleSubmit} style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          {/* Avatar placeholder */}
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #b66dff, #5bc8f5)',
            flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px',
          }}>
            🔮
          </div>
          <div style={{ flex: 1 }}>
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e as any);
              }}
              placeholder="Post your analysis..."
              maxLength={500}
              rows={2}
              style={{
                width: '100%',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '8px 12px',
                fontSize: '12px',
                color: 'var(--text)',
                resize: 'none',
                outline: 'none',
                lineHeight: 1.5,
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
              {error ? (
                <span style={{ fontSize: '12px', color: '#ff6b6b' }}>{error}</span>
              ) : (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ctrl+Enter to post</span>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: body.length > 450 ? '#ff6b6b' : 'var(--text-muted)' }}>
                  {body.length}/500
                </span>
                <button
                  type="submit"
                  disabled={isSubmitting || !body.trim()}
                  className="btn"
                  style={{
                    background: body.trim() ? 'var(--accent)' : 'var(--bg-hover)',
                    color: body.trim() ? 'white' : 'var(--text-dim)',
                    padding: '4px 12px',
                    fontSize: '11px',
                  }}
                >
                  {isSubmitting ? '…' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Comments list */}
      <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
        {isLoading ? (
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ display: 'flex', gap: '10px' }}>
                <div className="skeleton" style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ height: '12px', width: '30%', marginBottom: '8px' }} />
                  <div className="skeleton" style={{ height: '32px', borderRadius: '8px' }} />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>💬</div>
            <div style={{ fontSize: '13px' }}>Be the first to share your take</div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {comments.map((comment) => {
              const user = comment.users;
              const tierColor = TIER_COLORS[user?.tier ?? 'Rookie'];
              const isOptimistic = comment.id.startsWith('opt-');

              return (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: isOptimistic ? 0.6 : 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    padding: '14px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: `linear-gradient(135deg, ${tierColor}44, ${tierColor}22)`,
                    border: `1px solid ${tierColor}44`,
                    flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px',
                    overflow: 'hidden',
                  }}>
                    {user?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : '🔮'}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Name row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px', flexWrap: 'wrap' }}>
                      {user ? (
                        <a
                          href={`/@${user.username}`}
                          style={{ fontSize: '12px', fontWeight: 700, color: tierColor, textDecoration: 'none' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {user.display_name ?? user.username}
                        </a>
                      ) : (
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)' }}>You</span>
                      )}
                      {user?.tier && (
                        <span style={{
                          fontSize: '9px', fontWeight: 800,
                          color: tierColor, opacity: 0.7,
                          textTransform: 'uppercase', letterSpacing: '0.06em',
                        }}>
                          {user.tier}
                        </span>
                      )}
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', marginLeft: 'auto' }}>
                        {timeAgo(comment.created_at)}
                      </span>
                    </div>

                    {/* Comment body */}
                    <p style={{
                      margin: 0,
                      fontSize: '13px',
                      color: '#c8c5d8',
                      lineHeight: 1.6,
                      wordBreak: 'break-word',
                    }}>
                      {comment.body}
                    </p>

                    {/* Like row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                      <button
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                          padding: 0,
                          fontFamily: 'Cabinet Grotesk, sans-serif',
                          transition: 'color 0.15s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#ff8c42')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                      >
                        🔥 {comment.likes > 0 ? comment.likes : ''}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
