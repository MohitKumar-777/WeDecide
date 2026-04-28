'use client';

import { useQuery } from '@tanstack/react-query';
import { getClub, getClubLeaderboard } from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import ScoreBadge from '@/components/ScoreBadge';

export default function ClubDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const clubId = params.id as string;
  const [token, setToken] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('px_token') ?? '' : '');

  useEffect(() => {
    if (!token) {
      router.push('/auth');
    }
  }, [token, router]);

  const { data: clubData, isLoading: clubLoading, error: clubError } = useQuery({
    queryKey: ['club', clubId],
    queryFn: () => getClub(clubId),
  });

  const { data: lbData, isLoading: lbLoading } = useQuery({
    queryKey: ['club_lb', clubId],
    queryFn: () => getClubLeaderboard(clubId, token),
    enabled: !!token,
  });

  if (clubLoading) return <div style={{ padding: '64px', textAlign: 'center' }}>Loading club...</div>;
  if (clubError || !clubData?.data) return <div style={{ padding: '64px', textAlign: 'center' }}>Club not found or access denied.</div>;

  const club = clubData.data;
  const leaderboard = lbData?.data ?? [];

  return (
    <div style={{ padding: '40px 64px', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Club Header */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '24px', padding: '48px', marginBottom: '32px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '40%', background: 'radial-gradient(circle at 100% 50%, rgba(91,200,245,0.08) 0%, transparent 100%)', pointerEvents: 'none' }} />
        
        <div style={{ fontSize: '11px', color: '#5bc8f5', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 800, marginBottom: '12px' }}>
          {club.is_public ? 'Public Community' : 'Private Syndicate'}
        </div>
        
        <h1 style={{ fontFamily: 'var(--font-main)', fontSize: '48px', fontWeight: 900, color: 'var(--text)', letterSpacing: '-1px', marginBottom: '24px', maxWidth: '600px' }}>
          {club.name}
        </h1>

        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>👥</span>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text)', fontFamily: 'DM Mono, monospace' }}>{club.member_count}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Members</div>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>🔑</span>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: '#f5d94e', fontFamily: 'DM Mono, monospace', letterSpacing: '2px' }}>
                {club.invite_code}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Invite Code</div>
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '24px' }}>
        Club Leaderboard
      </h3>

      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '20px', fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Rank</th>
              <th style={{ padding: '20px', fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Predictor</th>
              <th style={{ padding: '20px', fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'right' }}>Score</th>
            </tr>
          </thead>
          <tbody>
            {lbLoading ? (
              <tr><td colSpan={3} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>Loading rankings...</td></tr>
            ) : leaderboard.length === 0 ? (
              <tr><td colSpan={3} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>No members found.</td></tr>
            ) : (
              leaderboard.map((entry, i) => (
                <tr key={entry.user.id} style={{ borderBottom: i === leaderboard.length - 1 ? 'none' : '1px solid var(--border)', transition: 'background 0.15s' }}>
                  <td style={{ padding: '20px', width: '80px' }}>
                    <div style={{ 
                      width: '32px', height: '32px', borderRadius: '50%', 
                      background: entry.rank <= 3 ? 'rgba(245,217,78,0.1)' : 'rgba(255,255,255,0.05)',
                      color: entry.rank <= 3 ? '#f5d94e' : 'var(--text-dim)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'DM Mono, monospace', fontSize: '14px', fontWeight: 700
                    }}>
                      {entry.rank}
                    </div>
                  </td>
                  <td style={{ padding: '20px' }}>
                    <a href={`/@${entry.user.username}`} style={{ display: 'flex', alignItems: 'center', gap: '16px', textDecoration: 'none' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                        {entry.user.avatar_url ? <img src={entry.user.avatar_url} style={{ width:'100%', borderRadius:'50%'}} /> : '👤'}
                      </div>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text)', marginBottom: '4px' }}>
                          {entry.user.display_name ?? entry.user.username}
                        </div>
                        <ScoreBadge tier={entry.user.tier} score={entry.user.predict_score} size="sm" />
                      </div>
                    </a>
                  </td>
                  <td style={{ padding: '20px', textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-main)', fontSize: '24px', fontWeight: 900, color: 'var(--text)' }}>
                      {entry.user.predict_score.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                      {entry.user.accuracy_pct.toFixed(1)}% Acc
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
