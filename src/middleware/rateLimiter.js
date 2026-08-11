'use strict';

const rateLimit = require('express-rate-limit');

/**
 * Strict rate limiter for authentication endpoints.
 * 10 requests per 15-minute window per IP.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max:      10,
  standardHeaders: 'draft-7',
  legacyHeaders:   false,
  message: { error: 'Too many requests, please try again later.' },
  skip: () => process.env.NODE_ENV === 'test',
});

/**
 * General API rate limiter.
 * 100 requests per 1-minute window per IP.
 */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max:      100,
  standardHeaders: 'draft-7',
  legacyHeaders:   false,
  message: { error: 'Too many requests, please try again later.' },
  skip: () => process.env.NODE_ENV === 'test',
});

module.exports = { authLimiter, apiLimiter };
