import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../services/db';

const PostCommentSchema = z.object({
  body: z.string().min(1).max(500).trim(),
});

const commentsRoute: FastifyPluginAsync = async (app) => {

  // GET /api/v1/predictions/:id/comments
  app.get('/', {
    config: { rateLimit: { max: 120, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { page = 1, limit = 30 } = (request.query as any);

    const { data: comments, error, count } = await db
      .from('comments')
      .select(`
        id, body, created_at, likes,
        users:user_id ( id, username, display_name, avatar_url, tier )
      `, { count: 'exact' })
      .eq('prediction_id', id)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      return reply.status(500).send({ error: { code: 'DB_ERROR', message: 'Failed to fetch comments', statusCode: 500 } });
    }

    return reply.send({
      data: comments ?? [],
      meta: { page: Number(page), limit: Number(limit), total: count ?? 0, hasMore: (page - 1) * limit + limit < (count ?? 0) },
      requestId: request.id,
    });
  });

  // POST /api/v1/predictions/:id/comments  (auth required)
  app.post('/', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    let userId: string;
    try {
      const payload = await request.jwtVerify() as { sub: string };
      userId = payload.sub;
    } catch {
      return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Login to comment', statusCode: 401 } });
    }

    const body = PostCommentSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: { code: 'INVALID_BODY', message: body.error.message, statusCode: 400 } });
    }

    // Verify prediction exists
    const { data: pred } = await db.from('predictions').select('id').eq('id', id).single();
    if (!pred) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Prediction not found', statusCode: 404 } });
    }

    const { data: comment, error } = await db
      .from('comments')
      .insert({ prediction_id: id, user_id: userId, body: body.data.body, likes: 0 })
      .select(`
        id, body, created_at, likes,
        users:user_id ( id, username, display_name, avatar_url, tier )
      `)
      .single();

    if (error || !comment) {
      return reply.status(500).send({ error: { code: 'DB_ERROR', message: 'Failed to post comment', statusCode: 500 } });
    }

    return reply.status(201).send({ data: comment, requestId: request.id });
  });

  // POST /api/v1/predictions/:id/comments/:commentId/like (auth required)
  app.post('/:commentId/like', async (request, reply) => {
    const { commentId } = request.params as { commentId: string };
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Login to like', statusCode: 401 } });
    }

    const { data, error } = await db.rpc('increment_comment_likes', { comment_id: commentId });
    if (error) {
      // Fallback: manual increment
      await db.from('comments').update({ likes: db.rpc('increment_comment_likes', { comment_id: commentId }) as any }).eq('id', commentId);
    }

    return reply.send({ data: { liked: true }, requestId: request.id });
  });
};

export default commentsRoute;
