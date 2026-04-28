import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import 'dotenv/config';

import predictionsRoute from './routes/predictions';
import votesRoute from './routes/votes';
import authRoute from './routes/auth';
import usersRoute from './routes/users';
import leaderboardRoute from './routes/leaderboard';
import clubsRoute from './routes/clubs';
import adminRoute from './routes/admin';
import newsRoute from './routes/news';
import commentsRoute from './routes/comments';
import { runMarketMaker } from './services/marketMaker';

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
    transport:
      process.env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
  genReqId: () => `req_${Math.random().toString(36).slice(2, 10)}`,
});

// ─── PLUGINS & ROUTES (Wrapped in async for CJS) ────────────────
const start = async () => {
  await app.register(helmet);

  await app.register(cors, {
    origin: [
      process.env.FRONTEND_URL ?? 'http://localhost:3000',
      'https://wedecide.in',
      'https://www.wedecide.in',
    ],
    credentials: true,
  });

  await app.register(rateLimit, {
    global: false, // per-route limits
    max: 200,
    timeWindow: '1 minute',
    redis: undefined, // add Upstash Redis here at scale
  });

  await app.register(jwt, {
    secret: process.env.JWT_SECRET ?? 'change-me-in-production-64-char-secret',
    sign: { expiresIn: '15m' },
  });

  // ─── ROUTES ───────────────────────────────────────────────
  await app.register(authRoute,        { prefix: '/api/v1/auth' });
  await app.register(predictionsRoute, { prefix: '/api/v1/predictions' });
  await app.register(votesRoute,       { prefix: '/api/v1/votes' });
  await app.register(usersRoute,       { prefix: '/api/v1/users' });
  await app.register(leaderboardRoute, { prefix: '/api/v1/leaderboard' });
  await app.register(clubsRoute,       { prefix: '/api/v1/clubs' });
  await app.register(adminRoute,       { prefix: '/api/admin' });
  await app.register(newsRoute,        { prefix: '/api/v1/news' });
  await app.register(commentsRoute,    { prefix: '/api/v1/predictions/:id/comments' });

  // ─── HEALTH CHECK ─────────────────────────────────────────
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  }));

  // ─── ERROR HANDLER ────────────────────────────────────────
  app.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode ?? 500;

    app.log.error({
      err: error,
      requestId: request.id,
      url: request.url,
    });

    reply.status(statusCode).send({
      error: {
        code:       error.code ?? 'INTERNAL_ERROR',
        message:    statusCode === 500 ? 'Internal server error' : error.message,
        statusCode,
      },
    });
  });

  // ─── START ────────────────────────────────────────────────
  const port = Number(process.env.PORT ?? 3001);
  const host = process.env.HOST ?? '0.0.0.0';

  try {
    await app.listen({ port, host });
    console.log(`🚀 WeDecide API running at http://${host}:${port}`);
    
    // Start Automated Market Maker loop (runs every 1.5 hours)
    setInterval(() => {
      runMarketMaker().catch(err => console.error('[AMM] Interval error:', err));
    }, 1.5 * 60 * 60 * 1000);
    
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
