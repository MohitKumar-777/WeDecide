import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('u') ?? 'predictor';
  const score    = searchParams.get('s') ?? '0';
  const tier     = searchParams.get('t') ?? 'Rookie';
  const question = searchParams.get('q') ?? 'Will it happen?';
  const correct  = searchParams.get('c') === '1';
  const yesPct   = searchParams.get('yp') ?? '50';

  return new ImageResponse(
    (
      <div
        style={{
          background: '#0b0b0f',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '60px',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #f5d94e, #aaff47, #5bc8f5)',
          }}
        />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '40px' }}>
          <span style={{ fontSize: '20px', fontWeight: 900, color: '#f5d94e', letterSpacing: '-1px' }}>
            We<span style={{ color: '#aaff47' }}>Decide</span>
          </span>
        </div>

        {/* Outcome badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '24px',
          }}
        >
          <span
            style={{
              fontSize: '52px',
              color: correct ? '#aaff47' : '#ff6b6b',
              fontWeight: 900,
            }}
          >
            {correct ? '🎯 Called it!' : '📉 Missed it!'}
          </span>
        </div>

        {/* Question */}
        <div
          style={{
            fontSize: '28px',
            fontWeight: 700,
            color: 'var(--text)',
            lineHeight: 1.3,
            marginBottom: '32px',
            flex: 1,
          }}
        >
          "{question}"
        </div>

        {/* Vote bar */}
        <div style={{ marginBottom: '32px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px',
              fontSize: '16px',
              fontWeight: 700,
            }}
          >
            <span style={{ color: '#aaff47' }}>YES {yesPct}%</span>
            <span style={{ color: '#ff6b6b' }}>NO {100 - Number(yesPct)}%</span>
          </div>
          <div
            style={{
              height: '12px',
              background: '#252535',
              borderRadius: '100px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${yesPct}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #aaff47, #2dd4bf)',
                borderRadius: '100px',
              }}
            />
          </div>
        </div>

        {/* User score row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '16px',
          }}
        >
          <span
            style={{
              fontSize: '48px',
              fontWeight: 900,
              color: '#f5d94e',
              letterSpacing: '-2px',
            }}
          >
            {score}
          </span>
          <div>
            <div style={{ fontSize: '18px', color: '#9996b0', fontWeight: 600 }}>
              PredictScore · {tier}
            </div>
            <div style={{ fontSize: '14px', color: '#444466' }}>
              wedecide.in/@{username}
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 628 }
  );
}
