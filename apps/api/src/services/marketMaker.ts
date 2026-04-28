import { db } from './db';
import 'dotenv/config';

// Expanded Sources for Multi-Platform Intelligence
const SOURCES = [
  // Politics & Geopolitics
  { type: 'reddit', url: 'https://www.reddit.com/r/GeopoliticsIndia/hot.json?limit=3', category: 'Geopolitics' },
  { type: 'news',   url: 'https://news.google.com/rss/search?q=Asia+Politics+Elections&hl=en-IN&gl=IN&ceid=IN:en', category: 'World' },
  // Economy & Markets
  { type: 'reddit', url: 'https://www.reddit.com/r/IndianStreetBets/hot.json?limit=4', category: 'Economy' },
  { type: 'news',   url: 'https://news.google.com/rss/search?q=Asia+Stock+Markets+Economy&hl=en-IN&gl=IN&ceid=IN:en', category: 'Markets' },
  // Tech & Science
  { type: 'reddit', url: 'https://www.reddit.com/r/developersIndia/hot.json?limit=3', category: 'Technology' },
  { type: 'news',   url: 'https://news.google.com/rss/search?q=India+Asia+Space+Science+ISRO&hl=en-IN&gl=IN&ceid=IN:en', category: 'Science' },
  // Culture & Social
  { type: 'reddit', url: 'https://www.reddit.com/r/InstaCelebsGossip/hot.json?limit=3', category: 'Culture' },
  { type: 'news',   url: 'https://news.google.com/rss/search?q=India+Gen+Z+Trends+Social+Media&hl=en-IN&gl=IN&ceid=IN:en', category: 'Social Media' },
  // Sports
  { type: 'reddit', url: 'https://www.reddit.com/r/Cricket/hot.json?limit=3', category: 'Sports' },
  // Crypto
  { type: 'crypto',  url: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,dogecoin&vs_currencies=usd', category: 'Crypto' },
];

import Parser from 'rss-parser';
const parser = new Parser();

async function generateWithAI(title: string, category: string): Promise<{ question: string, difficulty: string } | null> {
  const openaiKey = process.env.OPENAI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  
  if (!openaiKey && !groqKey) return null;

  const endpoint = groqKey ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions';
  const apiKey = groqKey || openaiKey;
  const model = groqKey ? 'llama-3.1-8b-instant' : 'gpt-3.5-turbo';

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{
          role: 'system',
          content: 'You are a highly analytical prediction market maker for an Asia-focused platform, operating similarly to Polymarket. Convert the incoming live data or news headline into an objective, concise YES/NO prediction question. You cover a wide variety of categories (Geopolitics, Economics, Technology, Science, Culture, Sports) but the context must always remain heavily anchored to India and the broader Asian region. The question must be resolvable within a week. Return JSON format: { "question": string, "difficulty": "easy" | "medium" | "hard" }'
        }, {
          role: 'user',
          content: title
        }],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      })
    });

    const data = await res.json() as any;
    if (data.error) {
      console.error('[AMM] AI API Error:', data.error);
      return null;
    }
    const content = data.choices[0].message.content;
    return JSON.parse(content);
  } catch (err) {
    console.error('[AMM] AI Generation failed:', err);
    return null;
  }
}

function generateWithHeuristics(title: string, category: string): { question: string, difficulty: string } {
  // Clean up title
  let clean = title.replace(/\[.*?\]/g, '').trim();
  if (clean.length > 80) clean = clean.substring(0, 80) + '...';

  const diffs = ['easy', 'medium', 'hard'];
  const diff = diffs[Math.floor(Math.random() * diffs.length)];

  // Simple heuristic templates
  const templates = [
    `Will "${clean}" cause a major market reaction this week?`,
    `Will the community sentiment on "${clean}" remain positive over the next 7 days?`,
    `Is "${clean}" going to be the biggest news in ${category} this month?`
  ];

  return {
    question: templates[Math.floor(Math.random() * templates.length)],
    difficulty: diff
  };
}

export async function runMarketMaker() {
  console.log('[AMM] Initiating Automated Market Maker cycle...');
  let createdCount = 0;

  for (const source of SOURCES) {
    try {
      let items: any[] = [];
      
      if (source.type === 'reddit') {
        const res = await fetch(source.url);
        const json = await res.json() as any;
        items = (json.data?.children ?? []).map((p: any) => ({
          title: p.data.title,
          url: `https://reddit.com${p.data.permalink}`,
          skip: p.data.stickied || p.data.title.toLowerCase().includes('megathread')
        }));
      } else if (source.type === 'news') {
        const feed = await parser.parseURL(source.url);
        items = feed.items.slice(0, 3).map(i => ({
          title: i.title,
          url: i.link,
          skip: false
        }));
      } else if (source.type === 'weather') {
        const res = await fetch(source.url);
        const json = await res.json() as any;
        const temp = json.current_weather?.temperature;
        if (temp) {
          items = [{
            title: `The current temperature in ${(source as any).location || 'this location'} is ${temp}°C`,
            url: 'https://open-meteo.com',
            skip: false
          }];
        }
      } else if (source.type === 'crypto') {
        const res = await fetch(source.url);
        const json = await res.json() as any;
        items = Object.entries(json).map(([id, data]: [string, any]) => ({
          title: `The current price of ${id.toUpperCase()} is $${data.usd}`,
          url: `https://www.coingecko.com/en/coins/${id}`,
          skip: false
        }));
      }

      for (const item of items) {
        if (item.skip) continue;

        // Try AI, fallback to heuristics
        let marketData = await generateWithAI(item.title, source.category);
        if (marketData) {
          console.log(`[AMM] ${source.type.toUpperCase()} -> Groq generated:`, marketData.question);
        }
        if (!marketData) {
          marketData = generateWithHeuristics(item.title, source.category);
        }

        // Resolves in 7 days
        const resolvesAt = new Date();
        resolvesAt.setDate(resolvesAt.getDate() + 7);

        // Insert into database
        const { data, error } = await db.from('predictions').insert({
          question: marketData.question,
          category: source.category,
          difficulty: marketData.difficulty,
          status: 'open',
          resolves_at: resolvesAt.toISOString(),
          source_url: item.url,
        }).select('id');

        if (!error && data) {
          createdCount++;
        }
      }
    } catch (err) {
      console.error(`[AMM] Failed to process source ${source.category} (${source.type}):`, err);
    }
  }

  console.log(`[AMM] Cycle complete. Created ${createdCount} new prediction markets.`);
  return { success: true, createdCount };
}
