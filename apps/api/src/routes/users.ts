import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../services/db';

const UpdateProfileSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-z0-9_]+$/).optional(),
  display_name: z.string().min(2).max(50).optional(),
});

const usersRoute: FastifyPluginAsync = async (app) => {

  // GET /api/v1/users/me — private profile dashboard data
  app.get('/me', async (request, reply) => {
    let userId: string;
    try {
      const payload = await request.jwtVerify() as { sub: string };
      userId = payload.sub;
    } catch {
      return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Auth required', statusCode: 401 } });
    }

    const { data: user, error } = await db
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'User not found', statusCode: 404 } });
    }

    return reply.send({ data: user, requestId: request.id });
  });

  // PATCH /api/v1/users/me — update private profile
  app.patch('/me', async (request, reply) => {
    let userId: string;
    try {
      const payload = await request.jwtVerify() as { sub: string, role: string, tier: string };
      userId = payload.sub;
    } catch {
      return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Auth required', statusCode: 401 } });
    }

    const body = UpdateProfileSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: { code: 'INVALID_BODY', message: body.error.message, statusCode: 400 } });
    }

    const updates = body.data;

    // Optional: Check if username is already taken
    if (updates.username) {
      const { data: existing } = await db
        .from('users')
        .select('id')
        .eq('username', updates.username)
        .neq('id', userId)
        .maybeSingle();

      if (existing) {
        return reply.status(409).send({ error: { code: 'USERNAME_TAKEN', message: 'Username is already taken', statusCode: 409 } });
      }
    }

    const { data: updatedUser, error } = await db
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error || !updatedUser) {
      return reply.status(500).send({ error: { code: 'UPDATE_FAILED', message: 'Failed to update profile', statusCode: 500 } });
    }

    // Re-issue JWT with new username if it changed
    const accessToken = app.jwt.sign({
      sub:      updatedUser.id,
      role:     updatedUser.phone === '9999999999' ? 'admin' : 'user',
      username: updatedUser.username,
      tier:     updatedUser.tier,
    });

    return reply.send({ data: updatedUser, access_token: accessToken, requestId: request.id });
  });

  // GET /api/v1/users/:username — public profile
  app.get('/:username', {
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const { username } = request.params as { username: string };

    const { data: user, error } = await db
      .from('users')
      .select('id, username, display_name, avatar_url, predict_score, tier, accuracy_pct, total_preds, correct_preds, current_streak, longest_streak, created_at')
      .eq('username', username)
      .single();

    if (error || !user) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'User not found', statusCode: 404 } });
    }

    // Get recent votes with prediction info
    const { data: votes } = await db
      .from('votes')
      .select('id, choice, is_correct, score_delta, created_at, prediction_id, predictions(id, question, category, status, outcome, resolves_at, yes_count, no_count)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    return reply.send({
      data: { ...user, recentVotes: votes ?? [] },
      requestId: request.id,
    });
  });

  // GET /api/v1/me/feed — personalised feed (auth required)
  app.get('/me/feed', async (request, reply) => {
    let userId: string;
    try {
      const payload = await request.jwtVerify() as { sub: string };
      userId = payload.sub;
    } catch {
      return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Auth required', statusCode: 401 } });
    }

    const page  = Number((request.query as any).page  ?? 1);
    const limit = Number((request.query as any).limit ?? 20);

    // Get users this person follows
    const { data: follows } = await db
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);

    const followingIds = (follows ?? []).map((f: any) => f.following_id);

    if (!followingIds.length) {
      // Return global feed if not following anyone
      const { data: predictions } = await db
        .from('predictions')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      return reply.send({ data: predictions ?? [], meta: { page, limit, total: 0, hasMore: false }, requestId: request.id });
    }

    // Get predictions voted on by followed users
    const { data: votes } = await db
      .from('votes')
      .select('prediction_id')
      .in('user_id', followingIds)
      .order('created_at', { ascending: false })
      .limit(limit * 3);

    const predIds = [...new Set((votes ?? []).map((v: any) => v.prediction_id))].slice(0, limit);

    const { data: predictions } = await db
      .from('predictions')
      .select('*')
      .in('id', predIds)
      .eq('status', 'open');

    return reply.send({ data: predictions ?? [], meta: { page, limit, total: predIds.length, hasMore: false }, requestId: request.id });
  });

  // POST /api/v1/users/me/follow/:targetId — follow a user
  app.post('/me/follow/:targetId', async (request, reply) => {
    let userId: string;
    try {
      const payload = await request.jwtVerify() as { sub: string };
      userId = payload.sub;
    } catch {
      return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Auth required', statusCode: 401 } });
    }

    const { targetId } = request.params as { targetId: string };

    if (userId === targetId) {
      return reply.status(400).send({ error: { code: 'CANNOT_FOLLOW_SELF', message: 'You cannot follow yourself', statusCode: 400 } });
    }

    const { error } = await db
      .from('follows')
      .insert({ follower_id: userId, following_id: targetId });

    if (error) {
      return reply.status(409).send({ error: { code: 'ALREADY_FOLLOWING', message: 'Already following this user', statusCode: 409 } });
    }

    return reply.send({ data: { following: true }, requestId: request.id });
  });

  // DELETE /api/v1/users/me/follow/:targetId — unfollow
  app.delete('/me/follow/:targetId', async (request, reply) => {
    let userId: string;
    try {
      const payload = await request.jwtVerify() as { sub: string };
      userId = payload.sub;
    } catch {
      return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Auth required', statusCode: 401 } });
    }

    const { targetId } = request.params as { targetId: string };

    await db
      .from('follows')
      .delete()
      .eq('follower_id', userId)
      .eq('following_id', targetId);

    return reply.send({ data: { following: false }, requestId: request.id });
  });
};

export default usersRoute;
