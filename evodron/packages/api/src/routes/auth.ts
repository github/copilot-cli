import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { RegisterSchema, LoginSchema } from '@evodron/shared';
import { getDb, schema } from '@evodron/db';
import { hashIp, randomCode, uuid, now } from '../middleware/helpers';

const BCRYPT_ROUNDS = 12;
const REFRESH_EXPIRY_DAYS = 30;

export async function authRoutes(app: FastifyInstance) {
  const db = getDb();

  // ── POST /auth/register ──────────────────────────────────────────────────

  app.post(
    '/register',
    {
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const parsed = RegisterSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid input',
          code: 'VALIDATION_ERROR',
          details: parsed.error.flatten(),
        });
      }

      const { email, username, password, referralCode } = parsed.data;

      // Check uniqueness
      const existing = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.email, email.toLowerCase()))
        .get();

      if (existing) {
        return reply.code(409).send({
          success: false,
          error: 'Email already registered',
          code: 'EMAIL_EXISTS',
        });
      }

      const existingUsername = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.username, username))
        .get();

      if (existingUsername) {
        return reply.code(409).send({
          success: false,
          error: 'Username already taken',
          code: 'USERNAME_EXISTS',
        });
      }

      // Resolve referrer
      let referrerId: string | undefined;
      if (referralCode) {
        const referrer = await db
          .select({ id: schema.users.id })
          .from(schema.users)
          .where(eq(schema.users.referralCode, referralCode))
          .get();

        if (!referrer) {
          return reply.code(400).send({
            success: false,
            error: 'Invalid referral code',
            code: 'INVALID_REFERRAL',
          });
        }
        referrerId = referrer.id;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const userId = uuid();
      const userReferralCode = randomCode(8);
      const timestamp = now();

      // Create user
      await db.insert(schema.users).values({
        id: userId,
        email: email.toLowerCase(),
        username,
        passwordHash,
        referralCode: userReferralCode,
        referredBy: referrerId ?? null,
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      // Create referral record
      if (referrerId) {
        // Anti-self-referral (cannot refer yourself)
        if (referrerId === userId) {
          // This cannot happen here since user doesn't exist yet, but guard anyway
        } else {
          await db.insert(schema.referrals).values({
            id: uuid(),
            referrerId,
            refereeId: userId,
            status: 'pending',
            createdAt: timestamp,
          });

          // Onboarding reward for referee
          const onboardingRule = await db
            .select()
            .from(schema.rewardRules)
            .where(
              and(
                eq(schema.rewardRules.trigger, 'referral_onboarding'),
                eq(schema.rewardRules.active, true),
              ),
            )
            .get();

          if (onboardingRule) {
            await db.insert(schema.rewards).values({
              id: uuid(),
              userId,
              type: 'referral_onboarding',
              amount: onboardingRule.credits,
              source: `Referral onboarding from code ${referralCode}`,
              createdAt: timestamp,
            });

            await db
              .update(schema.users)
              .set({ credits: onboardingRule.credits, updatedAt: timestamp })
              .where(eq(schema.users.id, userId));
          }
        }
      }

      // Track IP
      const ip = (req.headers['x-forwarded-for'] as string) || req.ip || '0.0.0.0';
      const ipHash = hashIp(ip.split(',')[0]!.trim());

      await db.insert(schema.ipRegistry).values({
        id: uuid(),
        ipHash,
        userId,
        seenAt: timestamp,
      });

      // Detect suspicious IP reuse (same IP already used for multiple accounts)
      const ipCount = (
        await db
          .select({ userId: schema.ipRegistry.userId })
          .from(schema.ipRegistry)
          .where(eq(schema.ipRegistry.ipHash, ipHash))
      ).length;

      if (ipCount > 5) {
        await db.insert(schema.abuseFlags).values({
          id: uuid(),
          userId,
          reason: 'ip_reuse',
          detail: `IP hash ${ipHash} has been seen for ${ipCount} accounts`,
          flaggedAt: timestamp,
        });
      }

      // Issue tokens
      const tokens = await issueTokens(app, db, userId, false);

      return reply.code(201).send({
        success: true,
        data: { ...tokens, userId, username, referralCode: userReferralCode },
      });
    },
  );

  // ── POST /auth/login ─────────────────────────────────────────────────────

  app.post(
    '/login',
    {
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const parsed = LoginSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ success: false, error: 'Invalid input', code: 'VALIDATION_ERROR' });
      }

      const { email, password } = parsed.data;

      const user = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, email.toLowerCase()))
        .get();

      if (!user) {
        // Constant-time response to prevent user enumeration
        await bcrypt.hash('dummy', 1);
        return reply.code(401).send({ success: false, error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
      }

      if (user.isBanned) {
        return reply.code(403).send({ success: false, error: 'Account suspended', code: 'ACCOUNT_BANNED' });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return reply.code(401).send({ success: false, error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
      }

      const tokens = await issueTokens(app, db, user.id, user.isAdmin);

      return reply.send({
        success: true,
        data: { ...tokens, userId: user.id, username: user.username },
      });
    },
  );

  // ── POST /auth/refresh ───────────────────────────────────────────────────

  app.post('/refresh', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as { refreshToken?: string };
    const refreshToken = body?.refreshToken;

    if (!refreshToken) {
      return reply.code(400).send({ success: false, error: 'refreshToken required', code: 'MISSING_TOKEN' });
    }

    const tokenHash = hashToken(refreshToken);
    const expiry = new Date().toISOString();

    const stored = await db
      .select()
      .from(schema.refreshTokens)
      .where(
        and(
          eq(schema.refreshTokens.tokenHash, tokenHash),
          gt(schema.refreshTokens.expiresAt, expiry),
          isNull(schema.refreshTokens.revokedAt),
        ),
      )
      .get();

    if (!stored) {
      return reply.code(401).send({ success: false, error: 'Invalid or expired refresh token', code: 'INVALID_TOKEN' });
    }

    const user = await db
      .select({ id: schema.users.id, isAdmin: schema.users.isAdmin, isBanned: schema.users.isBanned })
      .from(schema.users)
      .where(eq(schema.users.id, stored.userId))
      .get();

    if (!user || user.isBanned) {
      return reply.code(403).send({ success: false, error: 'Account suspended', code: 'ACCOUNT_BANNED' });
    }

    // Revoke old token
    await db
      .update(schema.refreshTokens)
      .set({ revokedAt: now() })
      .where(eq(schema.refreshTokens.id, stored.id));

    const tokens = await issueTokens(app, db, user.id, user.isAdmin);
    return reply.send({ success: true, data: tokens });
  });

  // ── POST /auth/logout ────────────────────────────────────────────────────

  app.post('/logout', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as { refreshToken?: string };
    const refreshToken = body?.refreshToken;

    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await db
        .update(schema.refreshTokens)
        .set({ revokedAt: now() })
        .where(eq(schema.refreshTokens.tokenHash, tokenHash));
    }

    return reply.send({ success: true, data: { message: 'Logged out' } });
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function issueTokens(
  app: FastifyInstance,
  db: ReturnType<typeof getDb>,
  userId: string,
  isAdmin: boolean,
) {
  const accessToken = app.jwt.sign({ sub: userId, isAdmin }, { expiresIn: '15m' });

  const rawRefresh = crypto.randomBytes(48).toString('hex');
  const tokenHash = hashToken(rawRefresh);
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRY_DAYS * 86400000).toISOString();

  await db.insert(schema.refreshTokens).values({
    id: uuid(),
    userId,
    tokenHash,
    expiresAt,
    createdAt: now(),
  });

  return {
    accessToken,
    refreshToken: rawRefresh,
    expiresIn: 900,
  };
}
