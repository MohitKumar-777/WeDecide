'use client';

import { useEffect, useState, useRef } from 'react';
import { PredictionWithVote } from '@/types';
import { getPredictionHistory, getNews } from '@/lib/api';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useVote } from '@/hooks/useVote';
import AnimatedCounter from './AnimatedCounter';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import { Info } from 'lucide-react';

interface Props {
  prediction: PredictionWithVote;
}

// ─── Market type detector ─────────────────────────────────────
type MarketType = 'binary' | 'versus' | 'race';

function detectMarketType(question: string = ''): { type: MarketType; entities: string[] } {
  const q = question.toLowerCase();
  const vsMatch = question.match(/(.{3,30})\s+(?:vs\.?|versus|or|beat)\s+(.{3,30})/i);
  if (vsMatch) {
    return {
      type: 'versus',
      entities: [vsMatch[1].trim(), vsMatch[2].trim().replace(/\?.*$/, '').trim()],
    };
  }
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
      <circle cx={cx} cy={cy} r={2} fill="var(--bg-surface)" />
    </g>
  );
}

// ─── Chart Tip Dot ──────────────────────────────────────────
const TipDot = (props: any) => {
  const { cx, cy, index, stroke, chartDataLength, lineColor } = props;
  if (index === chartDataLength - 1) {
    return <PulseDot cx={cx} cy={cy} color={stroke || lineColor} />;
  }
  return null;
};

export default function FeaturedMarketCard({ prediction }: Props) {
  const router = useRouter();
  const { vote, isPending, userChoice } = useVote(prediction.id, prediction.userVote?.choice ?? null);
  const [rawData, setRawData] = useState<{ time: string; value: number }[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isNewsPaused, setIsNewsPaused] = useState(false);
  
  const prevPct = useRef(prediction.yes_pct);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch history
  useEffect(() => {
    let ok = true;
    getPredictionHistory(prediction.id)
      .then(res => { if (ok) { setRawData(res.data ?? []); setInitialized(true); } })
      .catch(() => { if (ok) setInitialized(true); });
    return () => { ok = false; };
  }, [prediction.id]);

  const { type, entities } = detectMarketType(prediction.question);
  const yesPct = prediction.yes_pct ?? 50;
  const noPct = 100 - yesPct;

  // Append live point
  useEffect(() => {
    if (!initialized || prevPct.current === yesPct) return;
    setRawData(prev => {
      const updated = [
        ...prev,
        { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), value: yesPct },
      ];
      return updated.slice(-40);
    });
    prevPct.current = yesPct;
  }, [yesPct, initialized]);

  // Continuous Live Ticker
  useEffect(() => {
    if (!initialized) return;
    const ticker = setInterval(() => {
      setRawData((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        const noise = (Math.random() - 0.5) * 1.2;
        let newValue = last.value + noise;
        if (newValue > 99) newValue = 99;
        if (newValue < 1) newValue = 1;
        return [
          ...prev.slice(-40),
          { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), value: newValue }
        ];
      });
    }, 1500);
    return () => clearInterval(ticker);
  }, [initialized]);

  // News Query
  const { data: newsData } = useQuery({
    queryKey: ['news', prediction.id],
    queryFn: () => getNews(prediction.question.slice(0, 40)),
    staleTime: 5 * 60 * 1000,
  });

  const newsItems = newsData?.data?.slice(0, 10) ?? [];
  const doubledNews = newsItems.length > 0 ? [...newsItems, ...newsItems] : [];

  useEffect(() => {
    if (isNewsPaused || !scrollRef.current || newsItems.length === 0) return;
    let animationFrameId: number;
    let lastTime = performance.now();
    const scroll = (time: number) => {
      if (time - lastTime > 20) {
        if (scrollRef.current) {
          scrollRef.current.scrollTop += 0.5;
          if (scrollRef.current.scrollTop >= scrollRef.current.scrollHeight / 2) {
            scrollRef.current.scrollTop = 0;
          }
        }
        lastTime = time;
      }
      animationFrameId = requestAnimationFrame(scroll);
    };
    animationFrameId = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isNewsPaused, newsItems.length]);

  if (!mounted || !initialized) {
    return <div className="skeleton" style={{ height: '400px', borderRadius: '16px', marginBottom: '24px' }} />;
  }

  const chartData = rawData.length >= 2
    ? rawData.map(d => ({ time: d.time, yes: d.value, no: 100 - d.value }))
    : [{ time: 'Open', yes: 50, no: 50 }, { time: 'Now', yes: yesPct, no: noPct }];

  const firstYes = chartData[0]?.yes ?? 50;
  const lastYes = chartData[chartData.length - 1]?.yes ?? yesPct;
  const GREEN = 'var(--yes)';
  const RED = 'var(--no)';
  const BLUE = 'var(--accent)';
  const lineColor = lastYes >= firstYes ? GREEN : RED;

  function handleVote(e: React.MouseEvent, choice: boolean) {
    e.preventDefault();
    e.stopPropagation();
    const token = typeof window !== 'undefined' ? localStorage.getItem('px_token') : null;
    if (!token) { router.push('/auth'); return; }
    if (!isPending && userChoice === null) {
      vote(choice);
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;
      confetti({ particleCount: 100, spread: 70, origin: { x, y }, colors: choice ? ['#aaff47', '#ffffff'] : ['#ff6b6b', '#ffffff'], zIndex: 9999 });
      toast.success('Prediction logged!', { description: `You voted ${choice ? 'YES' : 'NO'}.`, style: { border: `1px solid ${choice ? 'var(--yes)' : 'var(--no)'}` } });
    }
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      overflow: 'hidden',
      marginBottom: '24px',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>{prediction.category}</span>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
                 onMouseEnter={(e) => { const t = e.currentTarget.querySelector('.tooltip') as HTMLElement; if (t) t.style.opacity = '1'; }}
                 onMouseLeave={(e) => { const t = e.currentTarget.querySelector('.tooltip') as HTMLElement; if (t) t.style.opacity = '0'; }}
            >
              <Info size={14} style={{ color: 'var(--text-dim)', cursor: 'help' }} />
              <div className="tooltip" style={{
                position: 'absolute', top: '100%', left: '0', background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: '8px', padding: '12px', width: '220px', fontSize: '12px', color: 'var(--text)', zIndex: 100,
                boxShadow: 'var(--shadow-lg)', opacity: 0, transition: 'opacity 0.2s', marginTop: '10px', lineHeight: 1.5
              }}>
                <div style={{ fontWeight: 800, marginBottom: '6px', color: 'var(--accent)' }}>HOW TO PREDICT</div>
                Pick a side based on your data. Correct predictions increase your rank!
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', color: 'var(--text-muted)' }}>
            <span>🔗</span><span>🔖</span>
          </div>
        </div>

        <Link href={`/p/${prediction.id}`} style={{ textDecoration: 'none' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
            <span style={{ 
              transition: 'text-decoration-color 0.2s', 
              textDecoration: 'underline', 
              textDecorationColor: 'transparent',
              textUnderlineOffset: '4px'
            }}
            onMouseEnter={e => e.currentTarget.style.textDecorationColor = 'var(--text)'}
            onMouseLeave={e => e.currentTarget.style.textDecorationColor = 'transparent'}
            >
              {prediction.question}
            </span>
          </h2>
        </Link>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <motion.div onClick={(e) => handleVote(e, true)} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-hover)', borderRadius: '8px', cursor: 'pointer', border: userChoice === true ? `1px solid ${GREEN}` : '1px solid transparent' }}>
            <span style={{ fontWeight: 600 }}>{type === 'versus' ? entities[0] : 'YES'}</span>
            <span style={{ fontWeight: 800 }}><AnimatedCounter value={lastYes} format={v => `${Math.round(v)}%`} /></span>
          </motion.div>
          <motion.div onClick={(e) => handleVote(e, false)} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-hover)', borderRadius: '8px', cursor: 'pointer', border: userChoice === false ? `1px solid ${RED}` : '1px solid transparent' }}>
            <span style={{ fontWeight: 600 }}>{type === 'versus' ? entities[1] : 'NO'}</span>
            <span style={{ fontWeight: 800 }}><AnimatedCounter value={100 - lastYes} format={v => `${Math.round(v)}%`} /></span>
          </motion.div>
        </div>

        <div style={{ flexGrow: 1 }} />

        {newsItems.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', height: '110px', overflow: 'hidden', position: 'relative' }}
               onMouseEnter={() => setIsNewsPaused(true)} onMouseLeave={() => setIsNewsPaused(false)}>
            <div ref={scrollRef} style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', overflowY: isNewsPaused ? 'auto' : 'hidden' }}>
              {doubledNews.map((news: any, idx: number) => (
                <a key={idx} href={news.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{news.source} · Recent</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-dim)', fontWeight: 500 }}>{news.title}</div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '24px', borderLeft: '1px solid var(--border)', background: 'var(--bg2)', position: 'relative' }}>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', fontSize: '12px', fontWeight: 600 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: GREEN }} />YES {Math.round(lastYes)}%</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: RED }} />NO {Math.round(100 - lastYes)}%</div>
        </div>
        <div style={{ height: '280px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id={`grad-${prediction.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={lineColor} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" vertical={false} opacity={0.3} />
              <XAxis dataKey="time" hide />
              <YAxis hide domain={[0, 100]} />
              <Tooltip content={<ChartTooltip entities={entities} />} />
              <Area type="stepAfter" dataKey="yes" stroke={lineColor} fill={`url(#grad-${prediction.id})`} strokeWidth={2} dot={<TipDot chartDataLength={chartData.length} lineColor={lineColor} />} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ position: 'absolute', top: '24px', right: '24px', opacity: 0.1, fontSize: '10px', fontWeight: 900 }}>WeDecide Intelligence</div>
        </div>
      </div>
    </div>
  );
}
