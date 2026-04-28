'use client';

import { useState } from 'react';
import { sendOtp, verifyOtp, updateMe } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function AuthPage() {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'otp' | 'username'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await sendOtp(phone);
      setStep('otp');
      let c = 60;
      setCountdown(c);
      const t = setInterval(() => {
        c--;
        setCountdown(c);
        if (c <= 0) clearInterval(t);
      }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const result = await verifyOtp(phone, otp);
      localStorage.setItem('px_token', result.access_token);
      if (!result.user.username || result.user.username.startsWith('user_')) {
        setStep('username');
      } else {
        router.push('/');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateUsername() {
    setLoading(true); setError('');
    try {
      const token = localStorage.getItem('px_token');
      if (!token) throw new Error('Not authenticated');
      const res = await updateMe({ username }, token);
      localStorage.setItem('px_token', res.access_token);
      router.push('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 18px',
    background: 'var(--surface)',
    border: '1px solid var(--border2)',
    borderRadius: '12px',
    color: 'var(--text)',
    fontSize: '16px',
    fontFamily: 'Cabinet Grotesk, sans-serif',
    outline: 'none',
    transition: 'border-color 0.15s',
  };

  const btnStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px',
    background: loading ? 'rgba(0,191,165,0.2)' : 'rgba(0,191,165,0.1)',
    border: '1px solid rgba(0,191,165,0.3)',
    borderRadius: '12px',
    color: 'var(--yes)',
    fontSize: '16px',
    fontWeight: 800,
    cursor: loading ? 'not-allowed' : 'pointer',
    fontFamily: 'var(--font-main)',
    transition: 'all 0.15s',
    letterSpacing: '0.04em',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        padding: '24px',
      }}
    >
      {/* Background orbs */}
      <div
        style={{
          position: 'fixed',
          width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(0,191,165,0.08) 0%, transparent 70%)',
          top: '-200px', right: '-100px',
          borderRadius: '50%',
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          background: 'var(--bg2)',
          border: '1px solid var(--border2)',
          borderRadius: '20px',
          padding: '40px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top accent */}
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: '2px',
            background: 'linear-gradient(90deg, var(--yes), var(--accent))',
          }}
        />

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              marginBottom: '8px',
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
            }}>
              <img 
                src="/logo.jpg" 
                alt="WeDecide Logo" 
                style={{
                  width: '125%',
                  height: '125%',
                  objectFit: 'cover',
                }} 
              />
            </div>
            <div
              style={{
                fontFamily: 'var(--font-main)',
                fontSize: '28px',
                fontWeight: 900,
                color: 'var(--text)',
                letterSpacing: '-0.02em',
              }}
            >
              We<span style={{ color: 'var(--yes)' }}>Decide</span>
            </div>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '4px' }}>
            {step === 'phone' && 'Sign in to WeDecide'}
            {step === 'otp' && `Enter the OTP sent to +91 ${phone}`}
            {step === 'username' && 'Choose your username'}
          </div>
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '28px' }}>
          {['phone', 'otp', 'username'].map((s) => (
            <div
              key={s}
              style={{
                width: s === step ? '20px' : '6px',
                height: '6px',
                borderRadius: '100px',
                background: s === step ? '#f5d94e' : 'rgba(255,255,255,0.1)',
                transition: 'all 0.3s',
              }}
            />
          ))}
        </div>

        {/* Phone step */}
        {step === 'phone' && (
          <>
            <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '18px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-dim)',
                    fontWeight: 700,
                    fontSize: '16px',
                  }}
                >
                  +91
                </span>
                <input
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  required
                  style={{ ...inputStyle, paddingLeft: '54px' }}
                />
              </div>
              {error && <div style={{ color: '#ff6b6b', fontSize: '13px' }}>{error}</div>}
              <button type="submit" disabled={loading || phone.length !== 10} style={btnStyle}>
                {loading ? 'Sending OTP...' : 'Continue with Phone →'}
              </button>
            </form>


          </>
        )}

        {/* OTP step */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input
              type="text"
              placeholder="6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              maxLength={6}
              style={{ ...inputStyle, textAlign: 'center', letterSpacing: '0.4em', fontSize: '22px' }}
              autoFocus
            />
            {error && <div style={{ color: '#ff6b6b', fontSize: '13px' }}>{error}</div>}
            <button type="submit" disabled={loading || otp.length !== 6} style={btnStyle}>
              {loading ? 'Verifying...' : 'Verify OTP →'}
            </button>
            <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-dim)' }}>
              {countdown > 0 ? (
                <span>Resend OTP in {countdown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  style={{ background: 'none', border: 'none', color: '#f5d94e', cursor: 'pointer', fontSize: '13px' }}
                >
                  Resend OTP
                </button>
              )}
            </div>
          </form>
        )}

        {/* Username step */}
        {step === 'username' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input
              type="text"
              placeholder="your_username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              style={{ ...inputStyle }}
              autoFocus
            />
            <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
              Your profile will be at{' '}
              <span style={{ color: '#f5d94e', fontFamily: 'DM Mono, monospace' }}>
                wedecide.in/@{username || 'username'}
              </span>
            </div>
            <button
              onClick={handleUpdateUsername}
              disabled={loading || !username || username.length < 3}
              style={btnStyle}
            >
              {loading ? 'Saving...' : 'Start Predicting →'}
            </button>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '11px', color: 'var(--text-dim)' }}>
          No money involved · 100% Legal in India 2025
        </div>
      </div>
    </div>
  );
}
