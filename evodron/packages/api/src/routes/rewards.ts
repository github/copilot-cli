import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, desc } from 'drizzle-orm';
import { getDb, schema } from '@evodron/db';
import { authenticate } from '../middleware/auth';

export async function rewardRoutes(app: FastifyInstance) {
  const db = getDb();

  // ── GET /rewards ─────────────────────────────────────────────────────────

  app.get(
    '/',
    { preHandler: [authenticate] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { sub: userId } = req.user as { sub: string };

      const rewardList = await db
        .select()
        .from(schema.rewards)
        .where(eq(schema.rewards.userId, userId))
        .orderBy(desc(schema.rewards.createdAt))
        .all();

      const total = rewardList.reduce((sum, r) => sum + r.amount, 0);

      return reply.send({
        success: true,
        data: {
          total,
          rewards: rewardList,
        },
      });
    },
  );

  // ── GET /rewards/rules ────────────────────────────────────────────────────

  app.get(
    '/rules',
    { preHandler: [authenticate] },
    async (_req: FastifyRequest, reply: FastifyReply) => {
      const rules = await db
        .select({
          id: schema.rewardRules.id,
          name: schema.rewardRules.name,
          trigger: schema.rewardRules.trigger,
          credits: schema.rewardRules.credits,
          active: schema.rewardRules.active,
          description: schema.rewardRules.description,
        })
        .from(schema.rewardRules)
        .where(eq(schema.rewardRules.active, true))
        .all();

      return reply.send({ success: true, data: { rules } });
    },
  );
}
