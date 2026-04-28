'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMe, updateMe } from '@/lib/api';
import { User } from '@/types';

export default function ProfileDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('px_token');
    if (!token) {
      router.push('/auth');
      return;
    }

    getMe(token).then((res) => {
      setUser(res.data);
      setUsername(res.data.username);
      setDisplayName(res.data.display_name || '');
      setLoading(false);
    }).catch(() => {
      localStorage.removeItem('px_token');
      router.push('/auth');
    });
  }, [router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      const token = localStorage.getItem('px_token');
      if (!token) throw new Error('Not logged in');
      const res = await updateMe({ username, display_name: displayName }, token);
      localStorage.setItem('px_token', res.access_token);
      setUser(res.data);
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('px_token');
    router.push('/');
  }

  if (loading) {
    return (
      <div style={{ padding: '40px 64px' }}>
        <div className="skeleton" style={{ width: '200px', height: '32px', marginBottom: '32px' }} />
        <div className="skeleton" style={{ width: '100%', height: '400px', borderRadius: '16px' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 64px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <h1 style={{ fontFamily: 'var(--font-main)', fontSize: '24px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', margin: 0 }}>
          Settings & Profile
        </h1>
        <button
          onClick={handleLogout}
          className="badge"
          style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', color: '#ff6b6b', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
        >
          Log Out
        </button>
      </div>

      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px' }}>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', marginBottom: '40px', paddingBottom: '32px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(91,200,245,0.05)', border: '1px solid rgba(91,200,245,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(91,200,245,0.4)' }} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', marginBottom: '4px' }}>
              {user?.display_name || user?.username}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-dim)', fontFamily: 'DM Mono, monospace' }}>
              @{user?.username}
            </div>
            <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
              <span className="badge" style={{ background: 'rgba(245,217,78,0.1)', color: '#f5d94e' }}>Score: {user?.predict_score}</span>
              <span className="badge" style={{ background: 'rgba(182,109,255,0.1)', color: '#b66dff' }}>Tier: {user?.tier}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#9996b0', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              style={{ width: '100%', padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', outline: 'none' }}
              required
              minLength={3}
              maxLength={20}
            />
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '6px' }}>Public URL: wedecide.in/@{username}</div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#9996b0', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How others see you"
              style={{ width: '100%', padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', outline: 'none' }}
              maxLength={50}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#9996b0', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Phone Number
            </label>
            <input
              type="text"
              value={user?.phone ? `+91 ${user.phone}` : ''}
              disabled
              style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-dim)', outline: 'none', cursor: 'not-allowed' }}
            />
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '6px' }}>Phone number cannot be changed.</div>
          </div>

          {error && <div style={{ color: '#ff6b6b', fontSize: '14px', padding: '12px', background: 'rgba(255,107,107,0.1)', borderRadius: '8px' }}>{error}</div>}
          {success && <div style={{ color: '#aaff47', fontSize: '14px', padding: '12px', background: 'rgba(170,255,71,0.1)', borderRadius: '8px' }}>{success}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button
              type="submit"
              disabled={saving}
              className="badge"
              style={{ background: 'rgba(245,217,78,0.1)', border: '1px solid rgba(245,217,78,0.4)', color: '#f5d94e', padding: '12px 32px', borderRadius: '8px', fontSize: '14px', fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer' }}
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
