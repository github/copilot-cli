import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@evodron/db';
import { authenticate } from '../middleware/auth';

export async function userRoutes(app: FastifyInstance) {
  const db = getDb();

  // ── GET /users/me ────────────────────────────────────────────────────────

  app.get(
    '/me',
    { preHandler: [authenticate] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { sub: userId } = req.user as { sub: string };

      const user = await db
        .select({
          id: schema.users.id,
          email: schema.users.email,
          username: schema.users.username,
          referralCode: schema.users.referralCode,
          credits: schema.users.credits,
          level: schema.users.level,
          createdAt: schema.users.createdAt,
        })
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .get();

      if (!user) {
        return reply.code(404).send({ success: false, error: 'User not found', code: 'NOT_FOUND' });
      }

      const referralLink = buildReferralLink(user.referralCode);

      return reply.send({
        success: true,
        data: { ...user, referralLink },
      });
    },
  );

  // ── PATCH /users/me/consent ──────────────────────────────────────────────

  app.patch(
    '/me/consent',
    { preHandler: [authenticate] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { sub: userId } = req.user as { sub: string };
      const body = req.body as { consentMetrics?: boolean };

      if (typeof body?.consentMetrics !== 'boolean') {
        return reply.code(400).send({ success: false, error: 'consentMetrics (boolean) required', code: 'VALIDATION_ERROR' });
      }

      await db
        .update(schema.users)
        .set({ consentMetrics: body.consentMetrics, updatedAt: new Date().toISOString() })
        .where(eq(schema.users.id, userId));

      return reply.send({ success: true, data: { consentMetrics: body.consentMetrics } });
    },
  );
}

function buildReferralLink(code: string): string {
  const base = process.env['EVODRON_REFERRAL_BASE_URL'] ?? 'https://evodron.io';
  return `${base}/ref/${code}`;
}
