'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPredictions, resolvePrediction, triggerAMM } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [token, setToken] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem('px_token');
    if (!t) {
      router.push('/auth');
      return;
    }
    try {
      const payload = JSON.parse(atob(t.split('.')[1]));
      if (payload.role !== 'admin') {
        router.push('/');
        return;
      }
      setToken(t);
      setIsAdmin(true);
    } catch {
      router.push('/');
    }
  }, [router]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin_predictions'],
    queryFn: () => getPredictions({ status: 'open', limit: 50 }),
    enabled: !!token,
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, outcome }: { id: string; outcome: boolean }) => resolvePrediction(id, outcome, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_predictions'] });
      alert('Prediction resolved successfully! Score recalculation queued.');
    },
    onError: (err: any) => {
      alert(`Error resolving prediction: ${err.message}`);
    }
  });

  const ammMutation = useMutation({
    mutationFn: () => triggerAMM(token),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin_predictions'] });
      alert(`AMM Cycle Complete! Created ${res.data.createdCount} new predictions.`);
    },
    onError: (err: any) => {
      alert(`Error running AMM: ${err.message}`);
    }
  });

  if (!isAdmin) return null;

  const predictions = data?.data ?? [];

  return (
    <div style={{ padding: '40px 64px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '32px' }}>🛠️</div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-main)', fontSize: '32px', fontWeight: 900, color: 'var(--text)', letterSpacing: '-1px', margin: 0 }}>
              Admin Dashboard
            </h1>
            <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '4px' }}>
              Resolve open predictions and trigger payouts
            </div>
          </div>
        </div>
        <button
          onClick={() => ammMutation.mutate()}
          disabled={ammMutation.isPending}
          className="badge"
          style={{
            background: 'rgba(182,109,255,0.1)',
            border: '1px solid rgba(182,109,255,0.3)',
            color: '#b66dff',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: ammMutation.isPending ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {ammMutation.isPending ? <span style={{ animation: 'pulse 1s infinite' }}>🤖 Running AMM...</span> : '🤖 Trigger AMM (Reddit Scrape)'}
        </button>
      </div>

      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '16px', fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>ID / Question</th>
              <th style={{ padding: '16px', fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Category</th>
              <th style={{ padding: '16px', fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Volume</th>
              <th style={{ padding: '16px', fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>Loading open predictions...</td>
              </tr>
            ) : predictions.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>No open predictions found.</td>
              </tr>
            ) : (
              predictions.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>{p.question}</div>
                    <div style={{ fontSize: '10px', color: '#5bc8f5', fontFamily: 'DM Mono, monospace' }}>{p.id}</div>
                  </td>
                  <td style={{ padding: '16px', fontSize: '13px', color: '#9996b0' }}>
                    {p.category}
                  </td>
                  <td style={{ padding: '16px', fontSize: '13px', color: '#9996b0' }}>
                    <span style={{ color: '#aaff47', fontWeight: 700 }}>Y: {p.yes_count}</span>{' · '}
                    <span style={{ color: '#ff6b6b', fontWeight: 700 }}>N: {p.no_count}</span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => {
                          if (confirm(`Resolve "${p.question}" as YES?`)) {
                            resolveMutation.mutate({ id: p.id, outcome: true });
                          }
                        }}
                        disabled={resolveMutation.isPending}
                        style={{
                          background: 'rgba(170,255,71,0.1)',
                          border: '1px solid rgba(170,255,71,0.3)',
                          color: '#aaff47',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: resolveMutation.isPending ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Resolve YES
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Resolve "${p.question}" as NO?`)) {
                            resolveMutation.mutate({ id: p.id, outcome: false });
                          }
                        }}
                        disabled={resolveMutation.isPending}
                        style={{
                          background: 'rgba(255,107,107,0.1)',
                          border: '1px solid rgba(255,107,107,0.3)',
                          color: '#ff6b6b',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: resolveMutation.isPending ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Resolve NO
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
