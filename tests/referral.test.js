'use strict';

/**
 * Tests for the Evodron Referral Program core functionality.
 * Uses supertest against the Express app with an in-memory SQLite DB.
 */

process.env.JWT_SECRET = 'test-secret-do-not-use-in-production';
process.env.DB_PATH    = ':memory:';

const request = require('supertest');
const app     = require('../app');

// ── Helpers ──────────────────────────────────────────────────────────────

function bearer(token) {
  return 'Bearer ' + token;
}

async function register(agent, overrides = {}) {
  const body = {
    email:    overrides.email    || ('user_' + Date.now() + '_' + Math.random() + '@test.com'),
    username: overrides.username || 'TestUser',
    password: overrides.password || 'Password123',
    ...overrides,
  };
  return agent.post('/api/auth/register').send(body);
}

async function login(agent, email, password) {
  const res = await agent.post('/api/auth/login').send({ email, password: password || 'Password123' });
  return res.body.token;
}

// ── Auth Routes ───────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  const agent = request(app);

  test('registers a new user successfully', async () => {
    const res = await register(agent);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('referral_code');
    expect(res.body.user.referral_code).toHaveLength(8);
  });

  test('rejects duplicate email', async () => {
    const email = 'dup_' + Date.now() + '@test.com';
    await register(agent, { email });
    const res2 = await register(agent, { email });
    expect(res2.status).toBe(409);
  });

  test('rejects short password', async () => {
    const res = await register(agent, { password: 'short' });
    expect(res.status).toBe(400);
  });

  test('rejects missing fields', async () => {
    const res = await agent.post('/api/auth/register').send({ email: 'x@y.com' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  const agent = request(app);

  test('logs in with correct credentials', async () => {
    const email = 'login_' + Date.now() + '@test.com';
    await register(agent, { email });
    const token = await login(agent, email);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(10);
  });

  test('rejects wrong password', async () => {
    const email = 'wrongpw_' + Date.now() + '@test.com';
    await register(agent, { email });
    const res = await agent.post('/api/auth/login').send({ email, password: 'WrongPass1' });
    expect(res.status).toBe(401);
  });
});

// ── Referral Link ─────────────────────────────────────────────────────────

describe('GET /api/referral/link', () => {
  const agent = request(app);

  test('returns referral link for authenticated user', async () => {
    const email = 'link_' + Date.now() + '@test.com';
    await register(agent, { email });
    const token = await login(agent, email);
    const res   = await agent.get('/api/referral/link').set('Authorization', bearer(token));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('referral_link');
    expect(res.body.referral_link).toContain('ref=');
  });

  test('returns 401 without token', async () => {
    const res = await agent.get('/api/referral/link');
    expect(res.status).toBe(401);
  });
});

// ── Stats ─────────────────────────────────────────────────────────────────

describe('GET /api/referral/stats', () => {
  const agent = request(app);

  test('returns zero stats for new user', async () => {
    const email = 'stats_' + Date.now() + '@test.com';
    await register(agent, { email });
    const token = await login(agent, email);
    const res   = await agent.get('/api/referral/stats').set('Authorization', bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.total_invitations).toBe(0);
    expect(res.body.total_signups).toBe(0);
  });
});

// ── Referral flow ─────────────────────────────────────────────────────────

describe('Referral flow', () => {
  const agent = request(app);

  test('referee gets welcome bonus when registering with valid referral code', async () => {
    const refEmail = 'referrer_' + Date.now() + '@test.com';
    const refRes   = await register(agent, { email: refEmail });
    const refCode  = refRes.body.user.referral_code;

    const newEmail = 'referee_' + Date.now() + '@test.com';
    await register(agent, { email: newEmail, referral_code: refCode });
    const newToken = await login(agent, newEmail);

    const rewardRes = await agent.get('/api/referral/rewards').set('Authorization', bearer(newToken));
    expect(rewardRes.status).toBe(200);
    expect(rewardRes.body.available.length).toBeGreaterThan(0);
    expect(rewardRes.body.available[0].reason).toBe('welcome_bonus');
  });

  test('referrer stats increment after referee signs up', async () => {
    const refEmail = 'referrer2_' + Date.now() + '@test.com';
    const refRes   = await register(agent, { email: refEmail });
    const refCode  = refRes.body.user.referral_code;
    const refToken = await login(agent, refEmail);

    await register(agent, { email: 'referee2_' + Date.now() + '@test.com', referral_code: refCode });

    const statsRes = await agent.get('/api/referral/stats').set('Authorization', bearer(refToken));
    expect(statsRes.body.total_signups).toBe(1);
  });

  test('referrer gets reward after referee activates', async () => {
    const refEmail  = 'referrer3_' + Date.now() + '@test.com';
    const refRes    = await register(agent, { email: refEmail });
    const refCode   = refRes.body.user.referral_code;
    const refToken  = await login(agent, refEmail);

    const newEmail  = 'referee3_' + Date.now() + '@test.com';
    await register(agent, { email: newEmail, referral_code: refCode });
    const newToken  = await login(agent, newEmail);

    const activRes  = await agent.post('/api/referral/activate-use').set('Authorization', bearer(newToken));
    expect(activRes.status).toBe(200);
    expect(activRes.body.activated).toBe(true);

    const rwRes = await agent.get('/api/referral/rewards').set('Authorization', bearer(refToken));
    expect(rwRes.body.available.some(r => r.reason === 'referral_activation')).toBe(true);

    const statsRes = await agent.get('/api/referral/stats').set('Authorization', bearer(refToken));
    expect(statsRes.body.total_rewarded).toBe(1);
  });

  test('activate-use is idempotent', async () => {
    const email = 'idem_' + Date.now() + '@test.com';
    await register(agent, { email });
    const token = await login(agent, email);

    await agent.post('/api/referral/activate-use').set('Authorization', bearer(token));
    const res2  = await agent.post('/api/referral/activate-use').set('Authorization', bearer(token));
    expect(res2.status).toBe(200);
    expect(res2.body.already_active).toBe(true);
  });
});

// ── Program info ──────────────────────────────────────────────────────────

describe('GET /api/referral/program-info', () => {
  test('returns public program info without auth', async () => {
    const res = await request(app).get('/api/referral/program-info');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('conditions');
    expect(Array.isArray(res.body.conditions)).toBe(true);
  });
});
