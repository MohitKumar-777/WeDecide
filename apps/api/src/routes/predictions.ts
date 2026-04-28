import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../services/db';
import { getVoteCounts, seedVoteCounts } from '../services/redis';

const QuerySchema = z.object({
  category:  z.string().optional(),
  status:    z.enum(['open','closed','resolved']).default('open'),
  sort:      z.enum(['hot','new','closing']).default('hot'),
  page:      z.coerce.number().int().min(1).default(1),
  limit:     z.coerce.number().int().min(1).max(200).default(20),
  search:    z.string().optional(),
});

const predictionsRoute: FastifyPluginAsync = async (app) => {

  // GET /api/v1/predictions — paginated feed
  app.get('/', {
    config: { rateLimit: { max: 200, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const query = QuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({ error: { code: 'INVALID_QUERY', message: query.error.message, statusCode: 400 } });
    }

    const { category, status, sort, page, limit, search } = query.data;
    const offset = (page - 1) * limit;

    // Extract optional user ID from JWT (no error if missing)
    let userId: string | null = null;
    try {
      const payload = await request.jwtVerify() as { sub: string };
      userId = payload.sub;
    } catch { /* anonymous request — OK */ }

    let q = db.from('predictions').select('*', { count: 'exact' });
    q = q.eq('status', status);
    if (category) q = q.eq('category', category);
    if (search)   q = q.textSearch('question', search);

    switch (sort) {
      case 'new':     q = q.order('created_at', { ascending: false }); break;
      case 'closing': q = q.order('resolves_at', { ascending: true }); break;
      case 'hot':
      default:        q = q.order('created_at', { ascending: false }); break;
    }

    q = q.range(offset, offset + limit - 1);
    const { data: predictions, error, count } = await q;

    if (error) {
      app.log.error(error);
      return reply.status(500).send({ error: { code: 'DB_ERROR', message: 'Failed to fetch predictions', statusCode: 500 } });
    }

    // Fetch user's votes for this page of predictions (if authenticated)
    let userVoteMap: Record<string, boolean> = {};
    if (userId && predictions && predictions.length > 0) {
      const ids = predictions.map((p: any) => p.id);
      const { data: uVotes } = await db
        .from('votes')
        .select('prediction_id, choice')
        .eq('user_id', userId)
        .in('prediction_id', ids);
      for (const v of uVotes ?? []) {
        userVoteMap[v.prediction_id] = v.choice;
      }
    }

    // Hydrate with live counts from Redis
    const hydrated = await Promise.all(
      (predictions ?? []).map(async (p: any) => {
        let cached = await getVoteCounts(p.id);
        if (!cached) {
          await seedVoteCounts(p.id, p.yes_count, p.no_count);
          cached = { yes: p.yes_count, no: p.no_count };
        }
        const total = cached.yes + cached.no;
        const yes_pct = total > 0 ? Math.round((cached.yes / total) * 100) : 50;
        const hasVote = Object.prototype.hasOwnProperty.call(userVoteMap, p.id);
        return {
          ...p,
          yes_count: cached.yes,
          no_count:  cached.no,
          yes_pct,
          no_pct:    100 - yes_pct,
          total_votes: total,
          userVote: hasVote
            ? { prediction_id: p.id, choice: userVoteMap[p.id], is_correct: null, score_delta: null }
            : null,
        };
      })
    );

    return reply.send({
      data: hydrated,
      meta: { page, limit, total: count ?? 0, hasMore: offset + limit < (count ?? 0) },
      requestId: request.id,
    });
  });

  // GET /api/v1/predictions/categories — distinct categories + counts
  app.get('/categories', {
    config: { rateLimit: { max: 200, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const { data, error } = await db
      .from('predictions')
      .select('category')
      .eq('status', 'open');

    if (error) {
      app.log.error(error);
      return reply.status(500).send({ error: { code: 'DB_ERROR', message: 'Failed to fetch categories', statusCode: 500 } });
    }

    // Count occurrences per category
    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      counts[row.category] = (counts[row.category] ?? 0) + 1;
    }

    const categories = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return reply.send({ data: categories, requestId: request.id });
  });

  // GET /api/v1/predictions/:id — single prediction
  app.get('/:id', {
    config: { rateLimit: { max: 200, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const { data: prediction, error } = await db
      .from('predictions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !prediction) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Prediction not found', statusCode: 404 } });
    }

    let cached = await getVoteCounts(id);
    if (!cached) {
      await seedVoteCounts(id, prediction.yes_count, prediction.no_count);
      cached = { yes: prediction.yes_count, no: prediction.no_count };
    }

    const total = cached.yes + cached.no;
    const yes_pct = total > 0 ? Math.round((cached.yes / total) * 100) : 50;

    return reply.send({
      data: {
        ...prediction,
        yes_count:   cached.yes,
        no_count:    cached.no,
        yes_pct,
        no_pct:      100 - yes_pct,
        total_votes: total,
      },
      requestId: request.id,
    });
  });

  // GET /api/v1/predictions/:id/history — historical probability
  app.get('/:id/history', async (request, reply) => {
    const { id } = request.params as { id: string };

    const { data: votes, error } = await db
      .from('votes')
      .select('choice, created_at')
      .eq('prediction_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      return reply.status(500).send({ error: { code: 'DB_ERROR', message: 'Failed to fetch history', statusCode: 500 } });
    }

    let yesCount = 0;
    let noCount = 0;
    const history = (votes ?? []).map((vote: any) => {
      if (vote.choice) yesCount++;
      else noCount++;
      
      const total = yesCount + noCount;
      const yes_pct = total > 0 ? Math.round((yesCount / total) * 100) : 50;

      return {
        time: new Date(vote.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        value: yes_pct,
      };
    });

    // If there are no votes, return an initial 50% point
    if (history.length === 0) {
      history.push({
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        value: 50,
      });
    }

    return reply.send({ data: history, requestId: request.id });
  });
};

export default predictionsRoute;
