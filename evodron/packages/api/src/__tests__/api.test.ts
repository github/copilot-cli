import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../index';
import type { FastifyInstance } from 'fastify';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { getDb, schema } from '@evodron/db';
import { eq } from 'drizzle-orm';

let app: FastifyInstance;

// Use a unique temp file for each test run to avoid shared state
const testDbPath = path.join(os.tmpdir(), `evodron-test-${Date.now()}.db`);

// Set up required env before building app
process.env['EVODRON_JWT_SECRET'] = 'test-secret-that-is-long-enough-32chars!!';
process.env['EVODRON_DB_URL'] = `file:${testDbPath}`;

beforeAll(async () => {
  // Run migrations on the same file that getDb() will use
  const Database = (await import('better-sqlite3')).default;
  const db = new Database(testDbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const migrations = [
    `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, referral_code TEXT NOT NULL UNIQUE, referred_by TEXT, credits INTEGER NOT NULL DEFAULT 0, level TEXT NOT NULL DEFAULT 'bronze', is_admin INTEGER NOT NULL DEFAULT 0, is_banned INTEGER NOT NULL DEFAULT 0, consent_metrics INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, started_at TEXT NOT NULL, ended_at TEXT, commands_count INTEGER NOT NULL DEFAULT 0, client_version TEXT, ip_hash TEXT)`,
    `CREATE TABLE IF NOT EXISTS referrals (id TEXT PRIMARY KEY, referrer_id TEXT NOT NULL, referee_id TEXT NOT NULL UNIQUE, status TEXT NOT NULL DEFAULT 'pending', activated_at TEXT, rewarded_at TEXT, created_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS rewards (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, type TEXT NOT NULL, amount INTEGER NOT NULL, source TEXT NOT NULL, created_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS reward_rules (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, trigger TEXT NOT NULL, credits INTEGER NOT NULL, active INTEGER NOT NULL DEFAULT 1, description TEXT, updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS abuse_flags (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, reason TEXT NOT NULL, detail TEXT, resolved_at TEXT, flagged_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS ip_registry (id TEXT PRIMARY KEY, ip_hash TEXT NOT NULL, user_id TEXT NOT NULL, seen_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS refresh_tokens (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE, expires_at TEXT NOT NULL, created_at TEXT NOT NULL, revoked_at TEXT)`,
    `INSERT OR IGNORE INTO reward_rules (id, name, trigger, credits, active, description, updated_at) VALUES
      ('rule-referrer', 'referral_active_referrer', 'referral_active', 100, 1, 'Credits awarded to the referrer when a referee reaches active status', '${new Date().toISOString()}'),
      ('rule-onboarding', 'referral_onboarding_referee', 'referral_onboarding', 50, 1, 'Onboarding credits awarded to a referred user', '${new Date().toISOString()}'),
      ('rule-milestone', 'milestone_10_sessions', 'milestone_10_sessions', 25, 1, 'Bonus credits for completing 10 sessions', '${new Date().toISOString()}')`,
  ];

  db.transaction(() => {
    for (const sql of migrations) db.prepare(sql).run();
  })();
  db.close();

  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app?.close();
  // Clean up test DB file
  try { fs.unlinkSync(testDbPath); } catch { /* ignore */ }
  try { fs.unlinkSync(testDbPath + '-wal'); } catch { /* ignore */ }
  try { fs.unlinkSync(testDbPath + '-shm'); } catch { /* ignore */ }
});

describe('Health check', () => {
  it('GET /health returns ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('evodron-api');
    expect(body.db).toBe('ok');
    expect(body.version).toBeDefined();
  });
});

describe('Auth — register and login', () => {
  const email = `test-${Date.now()}@example.com`;
  const username = `user${Date.now()}`;
  const password = 'StrongPass123!';

  it('POST /auth/register creates a user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email, username, password },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeDefined();
    expect(body.data.refreshToken).toBeDefined();
  });

  it('POST /auth/register rejects duplicate email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email, username: username + '2', password },
    });
    expect(res.statusCode).toBe(409);
  });

  it('POST /auth/login with valid credentials returns tokens', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeDefined();
  });

  it('POST /auth/login with wrong password returns 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password: 'wrongpassword' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('POST /auth/refresh rotates refresh tokens', async () => {
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
    });
    const firstRefreshToken = loginRes.json().data.refreshToken as string;

    const refreshRes = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken: firstRefreshToken },
    });
    expect(refreshRes.statusCode).toBe(200);
    const rotatedRefreshToken = refreshRes.json().data.refreshToken as string;
    expect(rotatedRefreshToken).toBeDefined();
    expect(rotatedRefreshToken).not.toBe(firstRefreshToken);

    const reusedOldTokenRes = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken: firstRefreshToken },
    });
    expect(reusedOldTokenRes.statusCode).toBe(401);
  });

  it('POST /auth/logout revokes refresh tokens', async () => {
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
    });
    const refreshToken = loginRes.json().data.refreshToken as string;

    const logoutRes = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      payload: { refreshToken },
    });
    expect(logoutRes.statusCode).toBe(200);

    const refreshRes = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken },
    });
    expect(refreshRes.statusCode).toBe(401);
  });
});

describe('Users — /users/me', () => {
  let accessToken: string;

  beforeAll(async () => {
    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: `me-${Date.now()}@example.com`,
        username: `meuser${Date.now()}`,
        password: 'StrongPass123!',
      },
    });
    accessToken = reg.json().data.accessToken;
  });

  it('GET /users/me returns profile', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/users/me',
      headers: { authorization: 'Bearer ' + accessToken },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.referralCode).toBeDefined();
    expect(body.data.referralLink).toContain('/ref/');
  });

  it('GET /users/me without token returns 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/users/me' });
    expect(res.statusCode).toBe(401);
  });
});

describe('Referral system', () => {
  let referrerToken: string;
  let referralCode: string;

  beforeAll(async () => {
    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: `referrer-${Date.now()}@example.com`,
        username: `referrer${Date.now()}`,
        password: 'StrongPass123!',
      },
    });
    const data = reg.json().data;
    referrerToken = data.accessToken;
    referralCode = data.referralCode;
  });

  it('GET /referrals/code returns code and link', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/referrals/code',
      headers: { authorization: 'Bearer ' + referrerToken },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.code).toHaveLength(8);
    expect(body.data.link).toContain('/ref/');
  });

  it('Registering with valid referral code creates pending referral', async () => {
    const regRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: `referee-${Date.now()}@example.com`,
        username: `referee${Date.now()}`,
        password: 'StrongPass123!',
        referralCode,
      },
    });
    expect(regRes.statusCode).toBe(201);

    // Check referral stats
    const statsRes = await app.inject({
      method: 'GET',
      url: '/referrals/stats',
      headers: { authorization: 'Bearer ' + referrerToken },
    });
    const stats = statsRes.json().data;
    expect(stats.totalReferrals).toBeGreaterThanOrEqual(1);
    expect(stats.pendingReferrals).toBeGreaterThanOrEqual(1);
  });

  it('Registering with invalid referral code returns 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: `badref-${Date.now()}@example.com`,
        username: `badref${Date.now()}`,
        password: 'StrongPass123!',
        referralCode: 'INVALID1',
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe('INVALID_REFERRAL');
  });

  it('Referrer receives credits after referee completes the activation threshold', async () => {
    const registerReferee = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: `threshold-${Date.now()}@example.com`,
        username: `threshold${Date.now()}`,
        password: 'StrongPass123!',
        referralCode,
      },
    });
    const refereeToken = registerReferee.json().data.accessToken as string;

    for (let i = 0; i < 3; i++) {
      const startRes = await app.inject({
        method: 'POST',
        url: '/sessions/start',
        headers: { authorization: 'Bearer ' + refereeToken },
        payload: { clientVersion: '0.1.0' },
      });
      expect(startRes.statusCode).toBe(201);

      const sessionId = startRes.json().data.sessionId as string;
      const endRes = await app.inject({
        method: 'POST',
        url: '/sessions/end',
        headers: { authorization: 'Bearer ' + refereeToken },
        payload: { sessionId, commandsCount: i + 1 },
      });
      expect(endRes.statusCode).toBe(200);
    }

    const rewardsRes = await app.inject({
      method: 'GET',
      url: '/rewards',
      headers: { authorization: 'Bearer ' + referrerToken },
    });
    expect(rewardsRes.statusCode).toBe(200);
    expect(
      rewardsRes.json().data.rewards.some((reward: { type: string }) => reward.type === 'referral_active'),
    ).toBe(true);
  });
});

describe('Sessions', () => {
  let token: string;
  let sessionId: string;

  beforeAll(async () => {
    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: `session-${Date.now()}@example.com`,
        username: `sessionuser${Date.now()}`,
        password: 'StrongPass123!',
      },
    });
    token = reg.json().data.accessToken;
  });

  it('POST /sessions/start returns sessionId', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/sessions/start',
      headers: { authorization: 'Bearer ' + token },
      payload: { clientVersion: '0.1.0' },
    });
    expect(res.statusCode).toBe(201);
    sessionId = res.json().data.sessionId;
    expect(sessionId).toBeDefined();
  });

  it('POST /sessions/end completes session', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/sessions/end',
      headers: { authorization: 'Bearer ' + token },
      payload: { sessionId, commandsCount: 5 },
    });
    expect(res.statusCode).toBe(200);
  });
});

describe('Rewards', () => {
  let token: string;

  beforeAll(async () => {
    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: `rewards-${Date.now()}@example.com`,
        username: `rewarduser${Date.now()}`,
        password: 'StrongPass123!',
      },
    });
    token = reg.json().data.accessToken;
  });

  it('GET /rewards returns reward history', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/rewards',
      headers: { authorization: 'Bearer ' + token },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.rewards)).toBe(true);
  });
});

describe('Stats', () => {
  let token: string;

  beforeAll(async () => {
    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: `stats-${Date.now()}@example.com`,
        username: `statsuser${Date.now()}`,
        password: 'StrongPass123!',
      },
    });
    token = reg.json().data.accessToken;
  });

  it('GET /stats returns usage stats', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/stats',
      headers: { authorization: 'Bearer ' + token },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.level).toBe('bronze');
    expect(body.data.totalSessions).toBe(0);
  });
});

describe('Admin access control', () => {
  it('rejects non-admin users', async () => {
    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: `admin-block-${Date.now()}@example.com`,
        username: `adminblock${Date.now()}`,
        password: 'StrongPass123!',
      },
    });

    const token = reg.json().data.accessToken as string;
    const res = await app.inject({
      method: 'GET',
      url: '/admin/abuse-flags',
      headers: { authorization: 'Bearer ' + token },
    });

    expect(res.statusCode).toBe(403);
  });

  it('allows admin users to inspect abuse flags', async () => {
    const email = `admin-${Date.now()}@example.com`;
    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email,
        username: `admin${Date.now()}`,
        password: 'StrongPass123!',
      },
    });

    const userId = reg.json().data.userId as string;
    await getDb()
      .update(schema.users)
      .set({ isAdmin: true, updatedAt: new Date().toISOString() })
      .where(eq(schema.users.id, userId));

    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email,
        password: 'StrongPass123!',
      },
    });

    expect(loginRes.statusCode).toBe(200);
    const accessToken = loginRes.json().data.accessToken as string;

    const res = await app.inject({
      method: 'GET',
      url: '/admin/abuse-flags',
      headers: { authorization: 'Bearer ' + accessToken },
    });

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json().data.flags)).toBe(true);
  });
});
