'use strict';

const express = require('express');
const { getDb } = require('../db/database');
const { apiLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

/**
 * GET /api/health
 * Returns the application health status.
 * No authentication required — used by load balancers and monitoring.
 */
router.get('/', apiLimiter, (req, res) => {
  const status = { status: 'ok', version: process.env.npm_package_version || '1.0.0', timestamp: new Date().toISOString() };

  try {
    getDb().prepare('SELECT 1').get();
    status.db = 'ok';
  } catch {
    status.db = 'error';
    status.status = 'degraded';
  }

  const code = status.status === 'ok' ? 200 : 503;
  return res.status(code).json(status);
});

module.exports = router;
