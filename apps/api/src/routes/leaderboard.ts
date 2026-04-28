import { FastifyPluginAsync } from 'fastify';
import { db } from '../services/db';
import { getLeaderboard as getRedisLeaderboard, getUserRank } from '../services/redis';

const leaderboardRoute: FastifyPluginAsync = async (app) => {

  // GET /api/v1/leaderboard
  app.get('/', {
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const { category, timeframe, page = '1', limit = '50' } = request.query as Record<string, string>;
    const pageNum  = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const offset   = (pageNum - 1) * limitNum;

    // Try Redis leaderboard first (much faster)
    if (!category && !timeframe) {
      const redisEntries = await getRedisLeaderboard(offset, offset + limitNum - 1);

      if (redisEntries.length > 0) {
        // Hydrate with user data from DB
        const userIds = redisEntries.map((e) => e.userId);
        const { data: users } = await db.from('users').select('*').in('id', userIds);
        const userMap = Object.fromEntries((users ?? []).map((u: any) => [u.id, u]));

        const entries = redisEntries
          .map((e, i) => ({
            rank:           offset + i + 1,
            user:           userMap[e.userId],
            movement:       'stable' as const,
            movementAmount: 0,
          }))
          .filter((e) => e.user);

        return reply.send({ data: entries, meta: { page: pageNum, limit: limitNum, total: entries.length, hasMore: false }, requestId: request.id });
      }
    }

    // Fall back to Postgres (with filters)
    let q = db.from('users').select('*', { count: 'exact' }).order('predict_score', { ascending: false });

    if (timeframe === 'week')  {
      // Filter by users who were active this week
      // For now return all; extend with activity tracking
    }
    if (timeframe === 'month') { /* same */ }

    q = q.range(offset, offset + limitNum - 1);

    const { data: users, count, error } = await q;

    if (error) {
      return reply.status(500).send({ error: { code: 'DB_ERROR', message: 'Failed to fetch leaderboard', statusCode: 500 } });
    }

    const entries = (users ?? []).map((user: any, i: number) => ({
      rank:           offset + i + 1,
      user,
      movement:       'stable' as const,
      movementAmount: 0,
    }));

    return reply.send({
      data: entries,
      meta: { page: pageNum, limit: limitNum, total: count ?? 0, hasMore: offset + limitNum < (count ?? 0) },
      requestId: request.id,
    });
  });
};

export default leaderboardRoute;
