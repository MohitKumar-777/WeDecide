'use client';

import { useQuery } from '@tanstack/react-query';
import { getUser } from '@/lib/api';
import { useParams } from 'next/navigation';
import ScoreBadge from '@/components/ScoreBadge';
import PredictionCard from '@/components/PredictionCard';
import { TIER_COLORS, CATEGORY_EMOJIS, Category } from '@/types';

function StatBox({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-main)', fontSize: '28px', fontWeight: 900, color, lineHeight: 1 }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginTop: '4px' }}>
        {label}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const params  = useParams();
  const username = (params.username as string).replace('@', '');

  const { data, isLoading, error } = useQuery({
    queryKey: ['user', username],
    queryFn:  () => getUser(username),
  });

  if (isLoading) {
    return (
      <div style={{ padding: '48px 64px', maxWidth: '900px' }}>
        <div className="skeleton" style={{ width: '80px', height: '80px', borderRadius: '50%', marginBottom: '16px' }} />
        <div className="skeleton" style={{ width: '200px', height: '28px', marginBottom: '8px' }} />
        <div className="skeleton" style={{ width: '120px', height: '16px' }} />
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div style={{ padding: '48px 64px', textAlign: 'center', color: 'var(--text-dim)' }}>
        <div style={{ fontSize: '48px' }}>👤</div>
        <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '12px' }}>User not found</div>
      </div>
    );
  }

  const user = data.data as any;
  const tierColor = TIER_COLORS[user.tier as keyof typeof TIER_COLORS];
  const recentVotes = user.recentVotes ?? [];

  // Category accuracy breakdown
  const categoryStats: Record<string, { correct: number; total: number }> = {};
  for (const vote of recentVotes) {
    const cat = vote.predictions?.category;
    if (cat) {
      if (!categoryStats[cat]) categoryStats[cat] = { correct: 0, total: 0 };
      categoryStats[cat].total++;
      if (vote.is_correct) categoryStats[cat].correct++;
    }
  }

  return (
    <div style={{ padding: '40px 64px', maxWidth: '1000px', margin: '0 auto' }}>

      {/* Profile header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '32px', marginBottom: '40px' }}>
        {/* Avatar */}
        <div
          style={{
            width: '88px', height: '88px',
            borderRadius: '50%',
            background: `${tierColor}20`,
            border: `3px solid ${tierColor}50`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '36px', flexShrink: 0,
          }}
        >
          {user.avatar_url
            ? <img src={user.avatar_url} alt={user.username} style={{ width: '100%', borderRadius: '50%' }} />
            : '👤'}
        </div>

        {/* Info */}
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: 'var(--font-main)', fontSize: '28px', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.5px', marginBottom: '4px' }}>
            {user.display_name ?? user.username}
          </h1>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '13px', color: 'var(--text-dim)', marginBottom: '16px' }}>
            @{user.username}
          </div>
          <ScoreBadge tier={user.tier} score={user.predict_score} size="md" animated={user.tier === 'Visionary' || user.tier === 'Legend'} />
        </div>

        {/* Streak */}
        {user.current_streak > 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '16px 24px',
              background: 'rgba(245,217,78,0.07)',
              border: '1px solid rgba(245,217,78,0.2)',
              borderRadius: '12px',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '2px' }}>🔥</div>
            <div style={{ fontFamily: 'var(--font-main)', fontSize: '24px', fontWeight: 900, color: '#f5d94e' }}>
              {user.current_streak}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
              Day Streak
            </div>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '40px' }}>
        <StatBox label="Total Predictions" value={user.total_preds}    color="#f5d94e" />
        <StatBox label="Correct"           value={user.correct_preds}  color="#aaff47" />
        <StatBox label="Accuracy"          value={`${user.accuracy_pct.toFixed(1)}%`} color="#5bc8f5" />
        <StatBox label="Best Streak"       value={user.longest_streak} color="#b66dff" />
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '32px', alignItems: 'start' }}>

        {/* Left: Recent prediction history */}
        <div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📋 Recent Predictions
          </div>

          {recentVotes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px' }}>
              No predictions yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recentVotes.slice(0, 10).map((vote: any) => {
                const p = vote.predictions;
                if (!p) return null;
                const total = (p.yes_count ?? 0) + (p.no_count ?? 0);
                const yesPct = total > 0 ? Math.round((p.yes_count / total) * 100) : 50;
                return (
                  <a
                    key={vote.id}
                    href={`/p/${vote.prediction_id}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '16px',
                      padding: '14px 16px',
                      background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px',
                      textDecoration: 'none', transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.14)')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)')}
                  >
                    {/* Outcome icon */}
                    <span style={{ fontSize: '20px', flexShrink: 0 }}>
                      {vote.is_correct === null ? '⏳' : vote.is_correct ? '✅' : '❌'}
                    </span>

                    {/* Question */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.question}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                        {CATEGORY_EMOJIS[p.category as Category] ?? '🔮'} {p.category}
                        {' · '}
                        <span style={{ color: vote.choice ? '#aaff47' : '#ff6b6b' }}>
                          {vote.choice ? 'YES' : 'NO'}
                        </span>
                      </div>
                    </div>

                    {/* Score delta */}
                    {vote.score_delta !== null && (
                      <span style={{
                        fontFamily: 'DM Mono, monospace', fontSize: '13px', fontWeight: 700,
                        color: vote.score_delta > 0 ? '#aaff47' : '#ff6b6b',
                      }}>
                        {vote.score_delta > 0 ? '+' : ''}{vote.score_delta}
                      </span>
                    )}
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Category breakdown */}
        <div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text)', marginBottom: '16px' }}>
            📊 Accuracy by Category
          </div>

          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {Object.keys(CATEGORY_EMOJIS).map((cat) => {
              const stats = categoryStats[cat];
              if (!stats) return null;
              const pct = Math.round((stats.correct / stats.total) * 100);
              return (
                <div key={cat}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontSize: '12px', color: '#9996b0', fontWeight: 700 }}>
                      {CATEGORY_EMOJIS[cat as Category]} {cat}
                    </span>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color: 'var(--text)' }}>
                      {pct}% ({stats.correct}/{stats.total})
                    </span>
                  </div>
                  <div style={{ height: '5px', background: 'var(--surface)', borderRadius: '100px', overflow: 'hidden' }}>
                    <div
                      className="vote-bar-fill"
                      style={{
                        width: `${pct}%`, height: '100%',
                        background: pct >= 60 ? '#aaff47' : pct >= 40 ? '#f5d94e' : '#ff6b6b',
                        borderRadius: '100px',
                      }}
                    />
                  </div>
                </div>
              );
            })}
            {Object.keys(categoryStats).length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px' }}>
                No resolved predictions yet
              </div>
            )}
          </div>

          {/* Share profile card */}
          <div style={{ marginTop: '16px', padding: '16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
              Share Profile
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => navigator.clipboard.writeText(window.location.href)}
                className="badge"
                style={{ background: 'rgba(245,217,78,0.08)', border: '1px solid rgba(245,217,78,0.2)', color: '#f5d94e', cursor: 'pointer', padding: '6px 12px' }}
              >
                🔗 Copy Link
              </button>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I'm a ${user.tier} on @WeDecide with ${user.predict_score} PredictScore! Can you beat me?`)}&url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="badge"
                style={{ background: 'rgba(91,200,245,0.08)', border: '1px solid rgba(91,200,245,0.2)', color: '#5bc8f5', padding: '6px 12px', textDecoration: 'none' }}
              >
                🐦 Tweet
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
