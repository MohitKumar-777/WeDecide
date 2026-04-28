import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../services/db';
import { atomicVote } from '../services/redis';
import { Queue } from 'bullmq';

const VoteSchema = z.object({
  prediction_id: z.string().uuid(),
  choice: z.boolean(),
});

import { redis } from '../services/redis';

// BullMQ queue — write vote to Postgres asynchronously
const voteQueue = new Queue('votes', {
  connection: redis,
});

const votesRoute: FastifyPluginAsync = async (app) => {

  // POST /api/v1/votes — cast a vote (auth required)
  app.post('/', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    // Verify JWT
    let userId: string;
    try {
      const payload = await request.jwtVerify() as { sub: string };
      userId = payload.sub;
    } catch {
      return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } });
    }

    // Validate body
    const body = VoteSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: { code: 'INVALID_BODY', message: body.error.message, statusCode: 400 } });
    }

    const { prediction_id, choice } = body.data;

    // Check prediction exists and is open
    const { data: prediction } = await db
      .from('predictions')
      .select('id, status')
      .eq('id', prediction_id)
      .single();

    if (!prediction) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Prediction not found', statusCode: 404 } });
    }

    if (prediction.status !== 'open') {
      return reply.status(409).send({ error: { code: 'PREDICTION_CLOSED', message: 'Prediction is no longer accepting votes', statusCode: 409 } });
    }

    // Check if already voted (idempotency)
    const { data: existing } = await db
      .from('votes')
      .select('id, choice')
      .eq('user_id', userId)
      .eq('prediction_id', prediction_id)
      .maybeSingle();

    if (existing) {
      return reply.status(409).send({ error: { code: 'ALREADY_VOTED', message: 'User has already voted on this prediction', statusCode: 409 } });
    }

    // Step 1: Atomic Redis INCR (< 1ms) — PRD section 02
    const counts = await atomicVote(prediction_id, choice);

    // Step 2: Return immediately with new counts (< 20ms total)
    const total = counts.yes + counts.no;
    const yes_pct = total > 0 ? Math.round((counts.yes / total) * 100) : 50;

    // Step 3: Fire-and-forget DB write via BullMQ (async, ~200ms)
    await voteQueue.add('write-vote', {
      user_id: userId,
      prediction_id,
      choice,
      yes_count: counts.yes,
      no_count: counts.no,
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });

    return reply.status(200).send({
      data: {
        yes_count: counts.yes,
        no_count:  counts.no,
        yes_pct,
        no_pct:    100 - yes_pct,
        total_votes: total,
        userVote: { prediction_id, choice, is_correct: null, score_delta: null },
      },
      requestId: request.id,
    });
  });
};

export default votesRoute;
