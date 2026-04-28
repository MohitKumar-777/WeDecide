'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getClubs, createClub, joinClub } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function ClubsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [token] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('px_token') ?? '' : '');
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newClubName, setNewClubName] = useState('');
  
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['clubs'],
    queryFn: () => getClubs(),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => createClub(name, token),
    onSuccess: (res) => {
      setIsCreateOpen(false);
      router.push(`/clubs/${res.data.id}`);
    },
    onError: (err: any) => alert(err.message)
  });

  const joinMutation = useMutation({
    mutationFn: (code: string) => joinClub(code, token),
    onSuccess: (res) => {
      setIsJoinOpen(false);
      router.push(`/clubs/${res.data.id}`);
    },
    onError: (err: any) => alert(err.message)
  });

  const clubs = data?.data ?? [];

  return (
    <div style={{ padding: '40px 64px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <div style={{ fontSize: '36px' }}>🏛️</div>
            <h1 style={{ fontFamily: 'var(--font-main)', fontSize: '36px', fontWeight: 900, color: 'var(--text)', letterSpacing: '-1px', margin: 0 }}>
              Communities
            </h1>
          </div>
          <div style={{ fontSize: '15px', color: '#9996b0' }}>
            Join exclusive predictor clubs to pool insights and compete on private leaderboards.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => {
              if (!token) return router.push('/auth');
              setIsJoinOpen(true);
            }}
            className="badge"
            style={{ padding: '12px 24px', fontSize: '14px', background: 'rgba(91,200,245,0.1)', color: '#5bc8f5', border: '1px solid rgba(91,200,245,0.2)', cursor: 'pointer' }}
          >
            🔑 Join via Code
          </button>
          <button
            onClick={() => {
              if (!token) return router.push('/auth');
              setIsCreateOpen(true);
            }}
            className="badge"
            style={{ padding: '12px 24px', fontSize: '14px', background: 'rgba(245,217,78,0.1)', color: '#f5d94e', border: '1px solid rgba(245,217,78,0.2)', cursor: 'pointer' }}
          >
            + Create Club
          </button>
        </div>
      </div>

      {/* Modals */}
      {isCreateOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '24px', padding: '40px', width: '100%', maxWidth: '400px' }}>
            <h2 style={{ fontFamily: 'var(--font-main)', fontSize: '24px', color: 'var(--text)', marginBottom: '8px' }}>Create Club</h2>
            <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '24px' }}>Form your own syndicate.</div>
            <input
              type="text"
              placeholder="Club Name"
              value={newClubName}
              onChange={(e) => setNewClubName(e.target.value)}
              style={{ width: '100%', padding: '14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', color: '#fff', marginBottom: '24px', outline: 'none' }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setIsCreateOpen(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-dim)', borderRadius: '12px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => createMutation.mutate(newClubName)} disabled={createMutation.isPending || newClubName.length < 3} style={{ flex: 1, padding: '12px', background: 'rgba(245,217,78,0.1)', border: '1px solid rgba(245,217,78,0.4)', color: '#f5d94e', borderRadius: '12px', cursor: 'pointer', fontWeight: 700 }}>
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isJoinOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '24px', padding: '40px', width: '100%', maxWidth: '400px' }}>
            <h2 style={{ fontFamily: 'var(--font-main)', fontSize: '24px', color: 'var(--text)', marginBottom: '8px' }}>Join Club</h2>
            <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '24px' }}>Enter the invite code from the club owner.</div>
            <input
              type="text"
              placeholder="e.g. A1B2C3D4"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              style={{ width: '100%', padding: '14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', color: '#fff', marginBottom: '24px', outline: 'none', letterSpacing: '2px', textAlign: 'center', fontWeight: 700 }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setIsJoinOpen(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-dim)', borderRadius: '12px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => joinMutation.mutate(inviteCode)} disabled={joinMutation.isPending || inviteCode.length < 5} style={{ flex: 1, padding: '12px', background: 'rgba(91,200,245,0.1)', border: '1px solid rgba(91,200,245,0.4)', color: '#5bc8f5', borderRadius: '12px', cursor: 'pointer', fontWeight: 700 }}>
                {joinMutation.isPending ? 'Joining...' : 'Join'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Directory */}
      <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '24px' }}>Public Directory</h3>
      
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '160px', borderRadius: '16px' }} />)}
        </div>
      ) : clubs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-dim)', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px' }}>
          No public clubs yet. Be the first to create one!
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
          {clubs.map(club => (
            <a
              key={club.id}
              href={`/clubs/${club.id}`}
              style={{
                display: 'block',
                textDecoration: 'none',
                background: 'var(--bg2)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '24px',
                transition: 'transform 0.2s, border-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = 'var(--border2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              <div style={{ fontSize: '10px', color: '#5bc8f5', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: '8px' }}>
                Open Community
              </div>
              <h3 style={{ fontFamily: 'var(--font-main)', fontSize: '24px', fontWeight: 900, color: 'var(--text)', marginBottom: '16px' }}>
                {club.name}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9996b0', fontSize: '13px' }}>
                <span style={{ fontSize: '16px' }}>👥</span> {club.member_count} Members
              </div>
            </a>
          ))}
        </div>
      )}

    </div>
  );
}
