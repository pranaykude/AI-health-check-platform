const rateLimit = require('express-rate-limit');

const { sendError } = require('../utils/response');

/**
 * Global API Rate Limiter
 * Limits each IP to 100 requests per 15 minutes
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased for debugging
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  statusCode: 429,
  handler: (req, res, next, options) => {
    sendError(res, 'Too many requests from this IP, please try again after 15 minutes', 429, ['Rate limit exceeded']);
  },
});

module.exports = apiLimiter;
