import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { getDb, schema } from '@evodron/db';
import { authenticate } from '../middleware/auth';

export async function referralRoutes(app: FastifyInstance) {
  const db = getDb();

  // ── GET /referrals/code ──────────────────────────────────────────────────

  app.get(
    '/code',
    { preHandler: [authenticate] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { sub: userId } = req.user as { sub: string };

      const user = await db
        .select({ referralCode: schema.users.referralCode })
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .get();

      if (!user) {
        return reply.code(404).send({ success: false, error: 'User not found', code: 'NOT_FOUND' });
      }

      const base = process.env['EVODRON_REFERRAL_BASE_URL'] ?? 'https://evodron.io';
      const link = `${base}/ref/${user.referralCode}`;

      return reply.send({ success: true, data: { code: user.referralCode, link } });
    },
  );

  // ── GET /referrals/stats ─────────────────────────────────────────────────

  app.get(
    '/stats',
    { preHandler: [authenticate] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { sub: userId } = req.user as { sub: string };

      const user = await db
        .select({ referralCode: schema.users.referralCode })
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .get();

      if (!user) {
        return reply.code(404).send({ success: false, error: 'User not found', code: 'NOT_FOUND' });
      }

      const allReferrals = await db
        .select({
          id: schema.referrals.id,
          refereeId: schema.referrals.refereeId,
          status: schema.referrals.status,
          createdAt: schema.referrals.createdAt,
        })
        .from(schema.referrals)
        .where(eq(schema.referrals.referrerId, userId))
        .all();

      // Fetch referee usernames
      const referralEntries = await Promise.all(
        allReferrals.map(async (r) => {
          const referee = await db
            .select({ username: schema.users.username })
            .from(schema.users)
            .where(eq(schema.users.id, r.refereeId))
            .get();
          return {
            id: r.id,
            refereeUsername: referee?.username ?? '(deleted)',
            status: r.status,
            createdAt: r.createdAt,
          };
        }),
      );

      const totalCreditsEarned = (
        await db
          .select({ amount: schema.rewards.amount })
          .from(schema.rewards)
          .where(
            and(
              eq(schema.rewards.userId, userId),
              eq(schema.rewards.type, 'referral_active'),
            ),
          )
          .all()
      ).reduce((sum, r) => sum + r.amount, 0);

      const base = process.env['EVODRON_REFERRAL_BASE_URL'] ?? 'https://evodron.io';

      return reply.send({
        success: true,
        data: {
          code: user.referralCode,
          link: `${base}/ref/${user.referralCode}`,
          totalReferrals: allReferrals.length,
          activeReferrals: allReferrals.filter((r) => r.status !== 'pending').length,
          pendingReferrals: allReferrals.filter((r) => r.status === 'pending').length,
          totalCreditsEarned,
          referrals: referralEntries,
        },
      });
    },
  );
}
