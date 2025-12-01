const rateLimit = require('express-rate-limit');
const env = require('../config/env');

/**
 * Rate limiter middleware
 * Limits requests per IP address
 */
const rateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
      details: `Limit: ${env.RATE_LIMIT_MAX_REQUESTS} requests per ${env.RATE_LIMIT_WINDOW_MS / 1000} seconds`
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = rateLimiter;
