import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@evodron/db';
import { authenticate } from '../middleware/auth';

export async function statsRoutes(app: FastifyInstance) {
  const db = getDb();

  // ── GET /stats ────────────────────────────────────────────────────────────

  app.get(
    '/',
    { preHandler: [authenticate] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { sub: userId } = req.user as { sub: string };

      const user = await db
        .select({
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

      const sessionList = await db
        .select({ commandsCount: schema.sessions.commandsCount })
        .from(schema.sessions)
        .where(eq(schema.sessions.userId, userId))
        .all();

      const totalSessions = sessionList.length;
      const totalCommands = sessionList.reduce((s, r) => s + r.commandsCount, 0);

      return reply.send({
        success: true,
        data: {
          totalSessions,
          totalCommands,
          totalCredits: user.credits,
          level: user.level,
          joinedAt: user.createdAt,
        },
      });
    },
  );
}
