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
import { getDb } from '@evodron/db';

const PORT = parseInt(process.env['EVODRON_API_PORT'] ?? '3000', 10);
const HOST = process.env['EVODRON_API_HOST'] ?? '0.0.0.0';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env['LOG_LEVEL'] ?? 'info',
    },
    trustProxy: true,
  });

  // ── Plugins ──────────────────────────────────────────────────────────────

  await app.register(cors, {
    origin: true,
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

  app.get('/health', async () => ({ status: 'ok', service: 'evodron-api' }));

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
