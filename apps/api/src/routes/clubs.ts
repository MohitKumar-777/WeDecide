import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../services/db';

const CreateClubSchema = z.object({ name: z.string().min(3).max(40), description: z.string().max(200).optional() });

const clubsRoute: FastifyPluginAsync = async (app) => {

  // POST /api/v1/clubs — create club
  app.post('/', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    let userId: string;
    try {
      const payload = await request.jwtVerify() as { sub: string };
      userId = payload.sub;
    } catch {
      return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Auth required', statusCode: 401 } });
    }

    const body = CreateClubSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: { code: 'INVALID_BODY', message: body.error.message, statusCode: 400 } });
    }

    const { data: club, error } = await db
      .from('clubs')
      .insert({ name: body.data.name, description: body.data.description, owner_id: userId })
      .select()
      .single();

    if (error) {
      return reply.status(500).send({ error: { code: 'CREATE_FAILED', message: error.message, statusCode: 500 } });
    }

    // Auto-add owner as member
    await db.from('club_members').insert({ club_id: club.id, user_id: userId });

    return reply.status(201).send({ data: club, requestId: request.id });
  });

  // GET /api/v1/clubs — list public clubs
  app.get('/', async (request, reply) => {
    const { data: clubs } = await db
      .from('clubs')
      .select('*')
      .eq('is_public', true)
      .order('member_count', { ascending: false })
      .limit(50);

    return reply.send({ data: clubs ?? [], requestId: request.id });
  });

  // GET /api/v1/clubs/:id — get single club
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { data: club, error } = await db.from('clubs').select('*').eq('id', id).single();
    if (error || !club) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Club not found', statusCode: 404 } });
    }
    return reply.send({ data: club, requestId: request.id });
  });

  // POST /api/v1/clubs/:code/join — join via invite code
  app.post('/:code/join', async (request, reply) => {
    let userId: string;
    try {
      const payload = await request.jwtVerify() as { sub: string };
      userId = payload.sub;
    } catch {
      return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Auth required', statusCode: 401 } });
    }

    const { code } = request.params as { code: string };

    const { data: club } = await db.from('clubs').select('*').eq('invite_code', code).single();

    if (!club) {
      return reply.status(404).send({ error: { code: 'INVALID_CODE', message: 'Invalid invite code', statusCode: 404 } });
    }

    const { error } = await db.from('club_members').insert({ club_id: club.id, user_id: userId });

    if (error) {
      return reply.status(409).send({ error: { code: 'ALREADY_MEMBER', message: 'Already a member of this club', statusCode: 409 } });
    }

    // Increment member count
    await db.from('clubs').update({ member_count: club.member_count + 1 }).eq('id', club.id);

    return reply.send({ data: club, requestId: request.id });
  });

  // GET /api/v1/clubs/:id/leaderboard — club rankings
  app.get('/:id/leaderboard', async (request, reply) => {
    let userId: string;
    try {
      const payload = await request.jwtVerify() as { sub: string };
      userId = payload.sub;
    } catch {
      return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Auth required', statusCode: 401 } });
    }

    const { id } = request.params as { id: string };

    const { data: members } = await db
      .from('club_members')
      .select('user_id, users(id, username, display_name, avatar_url, predict_score, tier, accuracy_pct)')
      .eq('club_id', id)
      .order('users(predict_score)', { ascending: false });

    const entries = (members ?? []).map((m: any, i: number) => ({
      rank: i + 1,
      user: m.users,
      movement: 'stable',
      movementAmount: 0,
    }));

    return reply.send({ data: entries, requestId: request.id });
  });
};

export default clubsRoute;
