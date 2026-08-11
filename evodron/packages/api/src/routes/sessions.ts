import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, isNotNull } from 'drizzle-orm';
import { getDb, schema } from '@evodron/db';
import { authenticate } from '../middleware/auth';
import { uuid, now, hashIp } from '../middleware/helpers';
import { StartSessionSchema, EndSessionSchema } from '@evodron/shared';

export async function sessionRoutes(app: FastifyInstance) {
  const db = getDb();

  // ── POST /sessions/start ─────────────────────────────────────────────────

  app.post(
    '/start',
    { preHandler: [authenticate] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { sub: userId } = req.user as { sub: string };
      const parsed = StartSessionSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ success: false, error: 'Invalid input', code: 'VALIDATION_ERROR' });
      }

      const ip = (req.headers['x-forwarded-for'] as string) || req.ip || '0.0.0.0';
      const ipHash = hashIp(ip.split(',')[0]!.trim());
      const sessionId = uuid();
      const timestamp = now();

      await db.insert(schema.sessions).values({
        id: sessionId,
        userId,
        startedAt: timestamp,
        clientVersion: parsed.data.clientVersion ?? null,
        ipHash,
      });

      // Record IP for abuse detection
      await db.insert(schema.ipRegistry).values({
        id: uuid(),
        ipHash,
        userId,
        seenAt: timestamp,
      });

      return reply.code(201).send({ success: true, data: { sessionId } });
    },
  );

  // ── POST /sessions/end ───────────────────────────────────────────────────

  app.post(
    '/end',
    { preHandler: [authenticate] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { sub: userId } = req.user as { sub: string };
      const parsed = EndSessionSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ success: false, error: 'Invalid input', code: 'VALIDATION_ERROR' });
      }

      const { sessionId, commandsCount } = parsed.data;
      const timestamp = now();

      const session = await db
        .select()
        .from(schema.sessions)
        .where(and(eq(schema.sessions.id, sessionId), eq(schema.sessions.userId, userId)))
        .get();

      if (!session) {
        return reply.code(404).send({ success: false, error: 'Session not found', code: 'NOT_FOUND' });
      }

      await db
        .update(schema.sessions)
        .set({ endedAt: timestamp, commandsCount })
        .where(eq(schema.sessions.id, sessionId));

      // Check if a referral should be activated
      await checkAndActivateReferral(db, userId, timestamp);

      // Check milestones
      await checkMilestones(db, userId, timestamp);

      return reply.send({ success: true, data: { sessionId } });
    },
  );
}

// ─── Referral activation ──────────────────────────────────────────────────────

async function checkAndActivateReferral(
  db: ReturnType<typeof getDb>,
  userId: string,
  timestamp: string,
) {
  const minSessions = parseInt(process.env['EVODRON_REWARD_MIN_SESSIONS'] ?? '3', 10);

  const completedSessions = await db
    .select({ id: schema.sessions.id })
    .from(schema.sessions)
    .where(and(eq(schema.sessions.userId, userId), isNotNull(schema.sessions.endedAt)))
    .all();

  if (completedSessions.length < minSessions) return;

  // Look for pending referral where this user is the referee
  const referral = await db
    .select()
    .from(schema.referrals)
    .where(
      and(eq(schema.referrals.refereeId, userId), eq(schema.referrals.status, 'pending')),
    )
    .get();

  if (!referral) return;

  // Activate referral
  await db
    .update(schema.referrals)
    .set({ status: 'active', activatedAt: timestamp })
    .where(eq(schema.referrals.id, referral.id));

  // Get reward rule for referrer
  const referrerRule = await db
    .select()
    .from(schema.rewardRules)
    .where(
      and(
        eq(schema.rewardRules.trigger, 'referral_active'),
        eq(schema.rewardRules.active, true),
      ),
    )
    .get();

  if (referrerRule) {
    // Credit referrer
    await db.insert(schema.rewards).values({
      id: uuid(),
      userId: referral.referrerId,
      type: 'referral_active',
      amount: referrerRule.credits,
      source: `Referral activated: ${userId}`,
      createdAt: timestamp,
    });

    const referrer = await db
      .select({ credits: schema.users.credits })
      .from(schema.users)
      .where(eq(schema.users.id, referral.referrerId))
      .get();

    if (referrer) {
      await db
        .update(schema.users)
        .set({
          credits: referrer.credits + referrerRule.credits,
          updatedAt: timestamp,
        })
        .where(eq(schema.users.id, referral.referrerId));
    }

    // Mark referral as rewarded
    await db
      .update(schema.referrals)
      .set({ status: 'rewarded', rewardedAt: timestamp })
      .where(eq(schema.referrals.id, referral.id));
  }
}

// ─── Milestone check ──────────────────────────────────────────────────────────

async function checkMilestones(
  db: ReturnType<typeof getDb>,
  userId: string,
  timestamp: string,
) {
  const completedCount = (
    await db
      .select({ id: schema.sessions.id })
      .from(schema.sessions)
      .where(and(eq(schema.sessions.userId, userId), isNotNull(schema.sessions.endedAt)))
      .all()
  ).length;

  const milestoneTrigger = `milestone_${completedCount}_sessions`;

  const rule = await db
    .select()
    .from(schema.rewardRules)
    .where(
      and(
        eq(schema.rewardRules.trigger, milestoneTrigger),
        eq(schema.rewardRules.active, true),
      ),
    )
    .get();

  if (!rule) return;

  // Only award once — check if already awarded
  const alreadyAwarded = await db
    .select({ id: schema.rewards.id })
    .from(schema.rewards)
    .where(
      and(
        eq(schema.rewards.userId, userId),
        eq(schema.rewards.source, milestoneTrigger),
      ),
    )
    .get();

  if (alreadyAwarded) return;

  await db.insert(schema.rewards).values({
    id: uuid(),
    userId,
    type: 'milestone',
    amount: rule.credits,
    source: milestoneTrigger,
    createdAt: timestamp,
  });

  const user = await db
    .select({ credits: schema.users.credits })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .get();

  if (user) {
    const newCredits = user.credits + rule.credits;
    const newLevel = computeLevel(newCredits);
    await db
      .update(schema.users)
      .set({ credits: newCredits, level: newLevel, updatedAt: timestamp })
      .where(eq(schema.users.id, userId));
  }
}

function computeLevel(credits: number): 'bronze' | 'silver' | 'gold' {
  if (credits >= 1000) return 'gold';
  if (credits >= 300) return 'silver';
  return 'bronze';
}
