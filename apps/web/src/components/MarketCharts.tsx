'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid, Legend,
} from 'recharts';
import { getPredictionHistory } from '@/lib/api';
import AnimatedCounter from './AnimatedCounter';

// ─── Types ───────────────────────────────────────────────────
interface DataPoint { time: string; yes: number; no: number; volume?: number; }
interface Props {
  id: string;
  yes_pct: number;
  no_pct: number;
  yes_count: number;
  no_count: number;
  question?: string;
}

// ─── Market type detector ─────────────────────────────────────
type MarketType = 'binary' | 'versus' | 'race';

function detectMarketType(question: string = ''): { type: MarketType; entities: string[] } {
  const q = question.toLowerCase();

  // "Will X beat Y" / "X vs Y" / "X or Y"
  const vsMatch = question.match(/(.{3,30})\s+(?:vs\.?|versus|or|beat)\s+(.{3,30})/i);
  if (vsMatch) {
    return {
      type: 'versus',
      entities: [vsMatch[1].trim(), vsMatch[2].trim().replace(/\?.*$/, '').trim()],
    };
  }

  // Win the race / finish first / ranked / most votes
  if (/first|race|fastest|highest|most|ranked|win|champion|title/i.test(q)) {
    return { type: 'race', entities: ['YES', 'NO'] };
  }

  return { type: 'binary', entities: ['YES', 'NO'] };
}

// ─── Custom Tooltip ───────────────────────────────────────────
function ChartTooltip({ active, payload, label, entities }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      padding: '10px 14px',
      minWidth: '130px',
      boxShadow: 'var(--shadow-md)',
    }}>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.05em' }}>
        {label}
      </div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', marginBottom: '3px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: p.color }}>
            {entities[i] ?? p.name}
          </span>
          <span style={{ fontSize: '16px', fontWeight: 800, color: p.color, letterSpacing: '-0.02em' }}>
            {p.value}%
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Animated live dot ───────────────────────────────────────
function PulseDot({ cx, cy, color }: any) {
  if (!cx || !cy) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={16} fill={color} opacity={0.3}>
        <animate attributeName="r" values="6;24;6" dur="1.2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.5;0.0;0.5" dur="1.2s" repeatCount="indefinite" />
      </circle>
      <circle cx={cx} cy={cy} r={5} fill={color} />
      <circle cx={cx} cy={cy} r={2} fill="#ffffff" />
    </g>
  );
}

// ─── Mini volume bar ──────────────────────────────────────────
function VolumeBar({ data }: { data: DataPoint[] }) {
  if (!data.length) return null;
  const maxVol = Math.max(...data.map(d => d.volume ?? 1), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '32px', padding: '0 0 4px' }}>
      {data.map((d, i) => {
        const h = ((d.volume ?? 1) / maxVol) * 28;
        const isLast = i === data.length - 1;
        return (
          <div key={i} style={{
            flex: 1,
            height: `${h}px`,
            background: isLast ? 'var(--accent)' : 'var(--border)',
            borderRadius: '2px 2px 0 0',
            transition: 'height 0.4s ease',
            opacity: isLast ? 1 : 0.4,
          }} />
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function MarketCharts({ id, yes_pct, no_pct, yes_count, no_count, question }: Props) {
  const [rawData, setRawData] = useState<{ time: string; value: number }[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [liveFlash, setLiveFlash] = useState(false);
  const [mounted, setMounted] = useState(false);
  const prevPct = useRef(yes_pct);
  const flashRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { type, entities } = detectMarketType(question);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch history
  useEffect(() => {
    let ok = true;
    getPredictionHistory(id)
      .then(res => { if (ok) { setRawData(res.data ?? []); setInitialized(true); } })
      .catch(() => { if (ok) setInitialized(true); });
    return () => { ok = false; };
  }, [id]);



  // Append live point + flash indicator when yes_pct changes
  useEffect(() => {
    if (!initialized || prevPct.current === yes_pct) return;
    setRawData(prev => {
      const updated = [
        ...prev,
        { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), value: yes_pct },
      ];
      return updated.slice(-40); // Keep graph performance snappy by retaining last 40 points
    });
    prevPct.current = yes_pct;

    // Flash effect
    setLiveFlash(true);
    clearTimeout(flashRef.current);
    flashRef.current = setTimeout(() => setLiveFlash(false), 800);
  }, [yes_pct, initialized]);

  // TradingView-style Continuous Live Micro-Movements Ticker
  useEffect(() => {
    if (!initialized) return;
    const ticker = setInterval(() => {
      setRawData((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        // Generate tiny order-book noise (+-0.3%)
        const noise = (Math.random() - 0.5) * 0.6;
        let newValue = last.value + noise;
        if (newValue > 99) newValue = 99;
        if (newValue < 1) newValue = 1;

        return [
          ...prev.slice(-40),
          { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), value: newValue }
        ];
      });
    }, 1500); // Ticks every 1.5s
    return () => clearInterval(ticker);
  }, [initialized]);

  // Build display data with volume proxy
  const chartData: DataPoint[] = rawData.length >= 2
    ? rawData.map((d, i) => ({
        time: d.time,
        yes: d.value,
        no: 100 - d.value,
        volume: 1 + (i % 5) + Math.floor(Math.random() * 3), // proxy volume from index
      }))
    : [
        { time: 'Open', yes: 50, no: 50, volume: 1 },
        { time: 'Now',  yes: yes_pct, no: no_pct, volume: 2 },
      ];

  const firstYes = chartData[0]?.yes ?? 50;
  const lastYes  = chartData[chartData.length - 1]?.yes ?? yes_pct;
  const change   = lastYes - firstYes;
  const total    = yes_count + no_count;

  const GREEN = 'var(--yes)';
  const RED   = 'var(--no)';
  const BLUE  = 'var(--accent)';
  const lineColor = lastYes >= firstYes ? GREEN : RED;

  // Custom persistent blinking tip for the live chart end
  const TipDot = (props: any) => {
    const { cx, cy, index, stroke } = props;
    if (index === chartData.length - 1) {
      return <PulseDot cx={cx} cy={cy} color={stroke || lineColor} />;
    }
    return null;
  };

  if (!mounted || !initialized) {
    return <div className="skeleton" style={{ height: '420px', borderRadius: '12px', marginBottom: '24px' }} />;
  }

  return (
    <div style={{
      background: 'var(--bg2)',
      border: `1px solid ${liveFlash ? 'var(--accent)' : 'var(--border)'}`,
      borderRadius: '12px',
      overflow: 'hidden',
      marginBottom: '24px',
      transition: 'border-color 0.3s ease',
      boxShadow: 'var(--shadow-sm)',
    }}>

      {/* ── Live status bar ── */}
      <div style={{
        padding: '8px 20px',
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        opacity: 0.8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{
            width: '7px', height: '7px', borderRadius: '50%',
            background: GREEN,
            boxShadow: `0 0 6px ${GREEN}`,
            display: 'block',
            animation: 'pulse-dot 2s infinite',
          }} />
          <span style={{ fontSize: '10px', fontWeight: 800, color: GREEN, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            LIVE
          </span>
        </div>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>
          {type === 'versus' ? `${entities[0]} vs ${entities[1]}` : 'YES / NO Market'}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-muted)' }}>
          {chartData.length} data points
        </span>
      </div>

      {/* ── Header: probability ── */}
      <div style={{ padding: '20px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
            {type === 'versus' ? 'Leading Outcome' : 'YES Probability'}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <span style={{ fontSize: '36px', fontWeight: 800, color: lineColor, lineHeight: 1, letterSpacing: '-0.03em' }}>
              <AnimatedCounter value={yes_pct} format={(v) => `${Math.round(v)}%`} />
            </span>
            <div>
              <div style={{
                fontSize: '13px', fontWeight: 700,
                color: change >= 0 ? GREEN : RED,
                display: 'flex', alignItems: 'center', gap: '3px',
              }}>
                <span>{change >= 0 ? '▲' : '▼'}</span>
                <span><AnimatedCounter value={Math.abs(change)} format={(v) => `${v.toFixed(1)}%`} /></span>
              </div>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                since open
              </div>
            </div>
          </div>
        </div>

        {/* Right: YES vs NO stats */}
        <div style={{ display: 'flex', gap: '24px', textAlign: 'right' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: GREEN, lineHeight: 1 }}><AnimatedCounter value={lastYes} format={(v) => `${Math.round(v)}%`} /></div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginTop: '3px' }}>YES</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500, marginTop: '1px' }}><AnimatedCounter value={yes_count} format={(v) => Math.round(v).toLocaleString()} /></div>
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: RED, lineHeight: 1 }}><AnimatedCounter value={100 - lastYes} format={(v) => `${Math.round(v)}%`} /></div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginTop: '3px' }}>NO</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500, marginTop: '1px' }}><AnimatedCounter value={no_count} format={(v) => Math.round(v).toLocaleString()} /></div>
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-muted)', lineHeight: 1 }}><AnimatedCounter value={total} format={(v) => Math.round(v).toLocaleString()} /></div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginTop: '3px' }}>TOTAL</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500, marginTop: '1px' }}>predictions</div>
          </div>
        </div>
      </div>

      {/* ── Chart area ── */}
      <div style={{ width: '100%', height: '260px', marginTop: '20px', position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          {type === 'versus' ? (
            // DUAL LINE CHART for competing entities
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <filter id="glow-green">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <filter id="glow-red">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} opacity={0.4} />
              <XAxis dataKey="time" stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} dy={10} />
              <YAxis stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <ReferenceLine y={50} stroke="var(--border)" strokeDasharray="3 3" strokeWidth={1} />
              <Tooltip content={<ChartTooltip entities={entities} />} cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} />
              <Legend
                wrapperStyle={{ paddingTop: '8px', fontSize: '11px', fontWeight: 700 }}
                formatter={(value: string, _entry: unknown, index: number) => (
                  <span style={{ color: index === 0 ? GREEN : RED, fontWeight: 800, fontSize: '11px' }}>
                    {entities[index] ?? value}
                  </span>
                )}
              />
              <Line
                type="stepAfter" dataKey="yes" name={entities[0]}
                stroke={GREEN} strokeWidth={2}
                dot={<TipDot />} activeDot={<PulseDot color={GREEN} />}
                isAnimationActive={false} // Disable animation for pure TradingView instant snap feel
                filter="url(#glow-green)"
              />
              <Line
                type="stepAfter" dataKey="no" name={entities[1]}
                stroke={RED} strokeWidth={2}
                dot={<TipDot />} activeDot={<PulseDot color={RED} />}
                isAnimationActive={false}
                strokeDasharray="0"
              />
            </LineChart>
          ) : (
            // AREA CHART for binary YES/NO
            <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-yes-${id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={lineColor} stopOpacity={0.18} />
                  <stop offset="85%" stopColor={lineColor} stopOpacity={0.02} />
                  <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
                </linearGradient>
                <filter id={`glow-${id}`}>
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <CartesianGrid stroke="var(--border)" strokeDasharray="0" vertical={false} opacity={0.4} />
              <XAxis dataKey="time" tick={{ fill: 'var(--text-dim)', fontSize: 10, fontWeight: 500 }} tickLine={false} axisLine={false} minTickGap={50} dy={6} />
              <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-dim)', fontSize: 10, fontWeight: 500 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} width={38} dx={-4} />
              <ReferenceLine y={50} stroke="var(--border)" strokeDasharray="4 4" strokeWidth={1}
                label={{ value: '50%', position: 'right', fill: 'var(--text-dim)', fontSize: 10 }} />
              <Tooltip content={<ChartTooltip entities={['YES', 'NO']} />} cursor={{ stroke: 'var(--border)', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Area
                type="stepAfter" dataKey="yes" name="YES"
                stroke={lineColor} strokeWidth={2}
                fill={`url(#grad-yes-${id})`} fillOpacity={1}
                isAnimationActive={false} // Instant snap for TradingView feel
                dot={<TipDot stroke={lineColor} />}
                activeDot={<PulseDot color={lineColor} />}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
        
        {/* Branding Watermark */}
        <div style={{ 
          position: 'absolute', 
          top: '10px', 
          right: '20px', 
          pointerEvents: 'none', 
          opacity: 0.15, 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px',
          zIndex: 10
        }}>
          <img src="/logo.jpg" alt="" style={{ width: '14px', height: '14px', borderRadius: '3px' }} />
          <span style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)' }}>WeDecide Data</span>
        </div>
      </div>

      {/* ── Volume bars ── */}
      <div style={{ padding: '0 20px 4px' }}>
        <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
          Activity
        </div>
        <VolumeBar data={chartData} />
      </div>

      {/* ── YES/NO split bar ── */}
      <div style={{ padding: '12px 20px 20px' }}>
        <div style={{ position: 'relative', height: '3px', background: `${RED}30`, borderRadius: '100px', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, height: '100%',
            width: `${yes_pct}%`,
            background: `linear-gradient(90deg, ${GREEN}, ${BLUE})`,
            borderRadius: '100px',
            transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: GREEN }}>
            {type === 'versus' ? entities[0] : 'YES'} · <AnimatedCounter value={yes_pct} format={(v) => `${Math.round(v)}%`} /> · <AnimatedCounter value={yes_count} format={(v) => Math.round(v).toLocaleString()} />
          </span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: RED }}>
            {type === 'versus' ? entities[1] : 'NO'} · <AnimatedCounter value={no_pct} format={(v) => `${Math.round(v)}%`} /> · <AnimatedCounter value={no_count} format={(v) => Math.round(v).toLocaleString()} />
          </span>
        </div>
      </div>
    </div>
  );
}
