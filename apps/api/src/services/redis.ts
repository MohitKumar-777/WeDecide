import { Redis } from 'ioredis';

// Upstash Redis client (serverless-compatible)
export const redis = new Redis(process.env.UPSTASH_REDIS_URL ?? 'redis://localhost:6379', {
  password: process.env.UPSTASH_REDIS_TOKEN,
  tls: process.env.UPSTASH_REDIS_URL?.startsWith('rediss') ? {} : undefined,
  lazyConnect: true,
  maxRetriesPerRequest: 3,
});

redis.on('error', (err) => {
  console.warn('[Redis] connection error:', err.message);
});

// ─── KEY HELPERS ──────────────────────────────────────────
export const keys = {
  predictionYes:   (id: string) => `prediction:${id}:yes`,
  predictionNo:    (id: string) => `prediction:${id}:no`,
  leaderboard:     'leaderboard:global',
  leaderboardCat:  (cat: string) => `leaderboard:${cat}`,
  userRank:        (id: string) => `user:${id}:rank`,
  rateLimitVote:   (userId: string) => `ratelimit:vote:${userId}`,
};

// ─── VOTE OPERATIONS ──────────────────────────────────────

/** Atomically increment YES or NO counter. Returns new counts. */
export async function atomicVote(
  predictionId: string,
  choice: boolean
): Promise<{ yes: number; no: number }> {
  const pipeline = redis.pipeline();

  if (choice) {
    pipeline.incr(keys.predictionYes(predictionId));
    pipeline.get(keys.predictionNo(predictionId));
  } else {
    pipeline.get(keys.predictionYes(predictionId));
    pipeline.incr(keys.predictionNo(predictionId));
  }

  const results = await pipeline.exec();

  if (!results) throw new Error('Redis pipeline failed');

  const yes = choice ? Number(results[0][1]) : Number(results[0][1] ?? 0);
  const no  = choice ? Number(results[1][1] ?? 0) : Number(results[1][1]);

  return { yes, no };
}

/** Get live vote counts (fast path — never hits DB) */
export async function getVoteCounts(
  predictionId: string
): Promise<{ yes: number; no: number } | null> {
  const [yes, no] = await redis.mget(
    keys.predictionYes(predictionId),
    keys.predictionNo(predictionId)
  );

  if (yes === null && no === null) return null; // cache miss
  return { yes: Number(yes ?? 0), no: Number(no ?? 0) };
}

/** Seed Redis with DB counts (called when cache is cold) */
export async function seedVoteCounts(
  predictionId: string,
  yes: number,
  no: number
): Promise<void> {
  await redis
    .pipeline()
    .set(keys.predictionYes(predictionId), yes)
    .set(keys.predictionNo(predictionId), no)
    .exec();
}

// ─── LEADERBOARD OPERATIONS ───────────────────────────────

export async function updateLeaderboard(userId: string, score: number): Promise<void> {
  await redis.zadd(keys.leaderboard, score, userId);
}

export async function getLeaderboard(
  start = 0,
  end = 49
): Promise<Array<{ userId: string; score: number }>> {
  const results = await redis.zrevrangebyscore(
    keys.leaderboard,
    '+inf',
    '-inf',
    'WITHSCORES',
    'LIMIT',
    start,
    end - start + 1
  );

  const entries: Array<{ userId: string; score: number }> = [];
  for (let i = 0; i < results.length; i += 2) {
    entries.push({ userId: results[i], score: Number(results[i + 1]) });
  }
  return entries;
}

export async function getUserRank(userId: string): Promise<number | null> {
  const rank = await redis.zrevrank(keys.leaderboard, userId);
  return rank !== null ? rank + 1 : null;
}
