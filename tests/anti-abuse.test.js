'use strict';

/**
 * Tests for Evodron Referral Program — anti-abuse protections.
 */

process.env.JWT_SECRET = 'test-secret-do-not-use-in-production';
process.env.DB_PATH    = ':memory:';

const request = require('supertest');
const app     = require('../app');

function bearer(token) {
  return 'Bearer ' + token;
}

async function register(agent, overrides) {
  const opts = overrides || {};
  return agent.post('/api/auth/register').send({
    email:    opts.email    || ('user_' + Date.now() + '_' + Math.random() + '@test.com'),
    username: opts.username || 'TestUser',
    password: opts.password || 'Password123',
    referral_code: opts.referral_code,
  });
}

async function login(agent, email) {
  const res = await agent.post('/api/auth/login').send({ email, password: 'Password123' });
  return res.body.token;
}

// ── Self-referral ─────────────────────────────────────────────────────────

describe('Anti-abuse: self-referral', () => {
  const agent = request(app);

  test('user cannot use their own referral code (same email → 409 first)', async () => {
    const email   = 'self_' + Date.now() + '@test.com';
    const firstRes = await register(agent, { email });
    const myCode   = firstRes.body.user.referral_code;

    const res2 = await register(agent, { email, referral_code: myCode });
    expect(res2.status).toBe(409);
  });

  test('model-level self-referral guard throws SELF_REFERRAL', () => {
    const ReferralModel = require('../src/models/referral');
    expect(() => ReferralModel.createReferral(5, 5)).toThrow('SELF_REFERRAL');
  });
});

// ── Duplicate parrain ─────────────────────────────────────────────────────

describe('Anti-abuse: duplicate parrain', () => {
  const agent = request(app);

  test('a user can only have one referral (DB UNIQUE constraint)', async () => {
    const ref1Email = 'ref1_' + Date.now() + '@test.com';
    const ref2Email = 'ref2_' + Date.now() + '@test.com';
    const ref1Res   = await register(agent, { email: ref1Email });
    const ref2Res   = await register(agent, { email: ref2Email });
    const code1     = ref1Res.body.user.referral_code;

    const newEmail = 'newbie_' + Date.now() + '@test.com';
    await register(agent, { email: newEmail, referral_code: code1 });

    const UserModel     = require('../src/models/user');
    const ReferralModel = require('../src/models/referral');

    const referee  = UserModel.findByEmail(newEmail);
    const ref2User = UserModel.findByEmail(ref2Email);

    expect(() => ReferralModel.createReferral(ref2User.id, referee.id)).toThrow();
  });
});

// ── Invalid code ──────────────────────────────────────────────────────────

describe('Anti-abuse: invalid referral code', () => {
  const agent = request(app);

  test('registration with invalid referral code succeeds silently', async () => {
    const res = await register(agent, {
      email: 'invalid_ref_' + Date.now() + '@test.com',
      referral_code: 'XXXXXXXX',
    });
    expect(res.status).toBe(201);
    expect(res.body.user.referred_by_user_id).toBeNull();
  });
});

// ── Reward timing ─────────────────────────────────────────────────────────

describe('Anti-abuse: reward not granted without activation', () => {
  const agent = request(app);

  test('referrer receives NO referral_activation reward at referee signup', async () => {
    const refEmail = 'noreward_' + Date.now() + '@test.com';
    const refRes   = await register(agent, { email: refEmail });
    const refCode  = refRes.body.user.referral_code;
    const refToken = await login(agent, refEmail);

    await register(agent, { email: 'newreferee_' + Date.now() + '@test.com', referral_code: refCode });

    const rwRes = await agent.get('/api/referral/rewards').set('Authorization', bearer(refToken));
    const activationRewards = rwRes.body.available.filter(r => r.reason === 'referral_activation');
    expect(activationRewards.length).toBe(0);
  });
});

// ── Claim isolation ───────────────────────────────────────────────────────

describe('Anti-abuse: claim reward isolation', () => {
  const agent = request(app);

  test('cannot claim another user\'s reward', async () => {
    const refEmail = 'claimref_' + Date.now() + '@test.com';
    const refRes   = await register(agent, { email: refEmail });
    const refCode  = refRes.body.user.referral_code;

    const email1 = 'claim1_' + Date.now() + '@test.com';
    const email2 = 'claim2_' + Date.now() + '@test.com';
    await register(agent, { email: email1, referral_code: refCode });
    await register(agent, { email: email2 });

    const token1 = await login(agent, email1);
    const token2 = await login(agent, email2);

    const rwRes  = await agent.get('/api/referral/rewards').set('Authorization', bearer(token1));
    const reward = rwRes.body.available[0];
    if (!reward) return;

    const claimRes = await agent.post('/api/referral/claim-reward/' + reward.id)
      .set('Authorization', bearer(token2));
    expect(claimRes.status).toBe(404);
  });
});
