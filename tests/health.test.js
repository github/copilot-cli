'use strict';

process.env.JWT_SECRET = 'test-secret-do-not-use-in-production';
process.env.DB_PATH    = ':memory:';

const request = require('supertest');
const app     = require('../app');

describe('GET /api/health', () => {
  test('returns 200 with status ok and db ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.db).toBe('ok');
    expect(res.body).toHaveProperty('timestamp');
  });
});
