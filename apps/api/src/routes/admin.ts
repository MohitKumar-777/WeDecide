import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../services/db';
import { Queue } from 'bullmq';
import { runMarketMaker } from '../services/marketMaker';

const CreateClubSchema = z.object({ name: z.string().min(3).max(40) });

import { redis } from '../services/redis';

const resolutionQueue = new Queue('resolution', {
  connection: redis,
});

const adminRoute: FastifyPluginAsync = async (app) => {

  // Middleware: admin only
  app.addHook('preHandler', async (request, reply) => {
    try {
      const payload = await request.jwtVerify() as { role: string };
      if (payload.role !== 'admin') {
        return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Admin access required', statusCode: 403 } });
      }
    } catch {
      return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Auth required', statusCode: 401 } });
    }
  });

  // PATCH /api/admin/predictions/:id/resolve — resolve a prediction
  app.patch('/predictions/:id/resolve', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { outcome } = request.body as { outcome: boolean };

    if (typeof outcome !== 'boolean') {
      return reply.status(400).send({ error: { code: 'INVALID_OUTCOME', message: 'outcome must be true or false', statusCode: 400 } });
    }

    // Trigger resolution via database function
    const { error } = await db.rpc('resolve_prediction', {
      p_prediction_id: id,
      p_outcome: outcome,
    });

    if (error) {
      app.log.error(error);
      return reply.status(500).send({ error: { code: 'RESOLUTION_FAILED', message: 'Failed to resolve prediction', statusCode: 500 } });
    }

    // Queue score recalculation for all voters
    const { data: votes } = await db
      .from('votes')
      .select('user_id')
      .eq('prediction_id', id);

    const uniqueUserIds = [...new Set((votes ?? []).map((v: any) => v.user_id))];

    for (const userId of uniqueUserIds) {
      await resolutionQueue.add('recalc-score', { userId, predictionId: id }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      });
    }

    return reply.send({
      data: {
        prediction_id: id,
        outcome,
        voters_to_update: uniqueUserIds.length,
        message: `Prediction resolved. Queued ${uniqueUserIds.length} score recalculations.`,
      },
      requestId: request.id,
    });
  });

  // POST /api/admin/predictions — create a new prediction
  app.post('/predictions', async (request, reply) => {
    const body = request.body as any;
    const { data: prediction, error } = await db
      .from('predictions')
      .insert(body)
      .select()
      .single();

    if (error) {
      return reply.status(500).send({ error: { code: 'CREATE_FAILED', message: error.message, statusCode: 500 } });
    }

    return reply.status(201).send({ data: prediction, requestId: request.id });
  });

  // GET /api/admin/stats — platform stats
  app.get('/stats', async (request, reply) => {
    const [
      { count: totalUsers },
      { count: totalPredictions },
      { count: totalVotes },
      { count: openPredictions },
    ] = await Promise.all([
      db.from('users').select('*', { count: 'exact', head: true }),
      db.from('predictions').select('*', { count: 'exact', head: true }),
      db.from('votes').select('*', { count: 'exact', head: true }),
      db.from('predictions').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    ]);

    return reply.send({
      data: {
        totalUsers,
        totalPredictions,
        totalVotes,
        openPredictions,
      },
      requestId: request.id,
    });
  });

  // POST /api/admin/trigger-amm — manually run Automated Market Maker
  app.post('/trigger-amm', async (request, reply) => {
    // Middleware preHandler already checks for admin role
    const result = await runMarketMaker();
    return reply.send({ data: result, requestId: request.id });
  });
};

export default adminRoute;
