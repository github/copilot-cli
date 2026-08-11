import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { getDb, schema } from '@evodron/db';
import { authenticateAdmin } from '../middleware/auth';
import { uuid, now } from '../middleware/helpers';

export async function adminRoutes(app: FastifyInstance) {
  const db = getDb();

  // ── GET /admin/abuse-flags ────────────────────────────────────────────────

  app.get(
    '/abuse-flags',
    { preHandler: [authenticateAdmin] },
    async (_req: FastifyRequest, reply: FastifyReply) => {
      const flags = await db
        .select()
        .from(schema.abuseFlags)
        .where(isNull(schema.abuseFlags.resolvedAt))
        .orderBy(desc(schema.abuseFlags.flaggedAt))
        .all();

      return reply.send({ success: true, data: { flags } });
    },
  );

  // ── POST /admin/abuse-flags/:id/resolve ───────────────────────────────────

  app.post(
    '/abuse-flags/:id/resolve',
    { preHandler: [authenticateAdmin] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { id } = req.params as { id: string };

      await db
        .update(schema.abuseFlags)
        .set({ resolvedAt: now() })
        .where(eq(schema.abuseFlags.id, id));

      return reply.send({ success: true, data: { message: 'Flag resolved' } });
    },
  );

  // ── POST /admin/users/:id/ban ─────────────────────────────────────────────

  app.post(
    '/users/:id/ban',
    { preHandler: [authenticateAdmin] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { id } = req.params as { id: string };
      const timestamp = now();

      await db
        .update(schema.users)
        .set({ isBanned: true, updatedAt: timestamp })
        .where(eq(schema.users.id, id));

      // Flag any pending referrals from this user as fraud
      await db
        .update(schema.referrals)
        .set({ status: 'fraud' })
        .where(
          and(eq(schema.referrals.referrerId, id), eq(schema.referrals.status, 'pending')),
        );

      return reply.send({ success: true, data: { message: 'User banned' } });
    },
  );

  // ── GET /admin/reward-rules ───────────────────────────────────────────────

  app.get(
    '/reward-rules',
    { preHandler: [authenticateAdmin] },
    async (_req: FastifyRequest, reply: FastifyReply) => {
      const rules = await db.select().from(schema.rewardRules).all();
      return reply.send({ success: true, data: { rules } });
    },
  );

  // ── PATCH /admin/reward-rules/:id ─────────────────────────────────────────

  app.patch(
    '/reward-rules/:id',
    { preHandler: [authenticateAdmin] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { id } = req.params as { id: string };
      const body = req.body as { credits?: number; active?: boolean; description?: string };
      const timestamp = now();

      const update: Partial<typeof schema.rewardRules.$inferInsert> = { updatedAt: timestamp };
      if (typeof body.credits === 'number') update.credits = body.credits;
      if (typeof body.active === 'boolean') update.active = body.active;
      if (typeof body.description === 'string') update.description = body.description;

      await db.update(schema.rewardRules).set(update).where(eq(schema.rewardRules.id, id));

      const updated = await db.select().from(schema.rewardRules).where(eq(schema.rewardRules.id, id)).get();
      return reply.send({ success: true, data: { rule: updated } });
    },
  );
}
