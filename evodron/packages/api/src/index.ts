import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';

import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { sessionRoutes } from './routes/sessions';
import { referralRoutes } from './routes/referrals';
import { rewardRoutes } from './routes/rewards';
import { statsRoutes } from './routes/stats';
import { adminRoutes } from './routes/admin';
import { getDb, schema } from '@evodron/db';

const PORT = parseInt(process.env['EVODRON_API_PORT'] ?? '3000', 10);
const HOST = process.env['EVODRON_API_HOST'] ?? '0.0.0.0';
const BODY_LIMIT = parseInt(process.env['EVODRON_BODY_LIMIT_BYTES'] ?? '1048576', 10);

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env['LOG_LEVEL'] ?? 'info',
    },
    trustProxy: true,
    bodyLimit: BODY_LIMIT,
  });

  // ── Plugins ──────────────────────────────────────────────────────────────

  const corsOrigin = process.env['EVODRON_CORS_ORIGIN'];
  const allowedOrigins = corsOrigin
    ? corsOrigin.split(',').map((origin) => origin.trim()).filter(Boolean)
    : null;

  await app.register(cors, {
    origin: allowedOrigins ?? true,
    credentials: true,
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      success: false,
      error: 'Too many requests. Please slow down.',
      code: 'RATE_LIMITED',
    }),
  });

  const jwtSecret = process.env['EVODRON_JWT_SECRET'];
  if (!jwtSecret || jwtSecret === 'change-me-to-a-long-random-secret') {
    throw new Error('EVODRON_JWT_SECRET must be set to a secure value');
  }

  await app.register(jwt, {
    secret: jwtSecret,
    sign: { expiresIn: '15m' },
  });

  // ── Database ─────────────────────────────────────────────────────────────

  const db = getDb();
  app.decorate('db', db);

  // ── Routes ───────────────────────────────────────────────────────────────

  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(userRoutes, { prefix: '/users' });
  await app.register(sessionRoutes, { prefix: '/sessions' });
  await app.register(referralRoutes, { prefix: '/referrals' });
  await app.register(rewardRoutes, { prefix: '/rewards' });
  await app.register(statsRoutes, { prefix: '/stats' });
  await app.register(adminRoutes, { prefix: '/admin' });

  // ── Health check ─────────────────────────────────────────────────────────

  app.get('/health', async (_request, reply) => {
    const status = {
      status: 'ok',
      service: 'evodron-api',
      version: process.env['npm_package_version'] ?? '0.1.0',
      db: 'ok',
      timestamp: new Date().toISOString(),
    };

    try {
      await db.select({ id: schema.users.id }).from(schema.users).limit(1).all();
    } catch {
      status.status = 'degraded';
      status.db = 'error';
    }

    return reply.code(status.status === 'ok' ? 200 : 503).send(status);
  });

  app.setNotFoundHandler((_request, reply) => {
    return reply.code(404).send({ success: false, error: 'Route not found', code: 'NOT_FOUND' });
  });

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);

    if (reply.sent) return;

    if ((error as { validation?: unknown }).validation) {
      return reply.code(400).send({ success: false, error: 'Invalid input', code: 'VALIDATION_ERROR' });
    }

    return reply.code(500).send({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' });
  });

  return app;
}

// Start when run directly
if (require.main === module) {
  buildApp()
    .then((app) => app.listen({ port: PORT, host: HOST }))
    .then(() => console.log(`EVODRON API listening on ${HOST}:${PORT}`))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
