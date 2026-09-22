const rateLimit = require('express-rate-limit');

const createLimiter = (windowMs, max, message) =>
  process.env.DISABLE_RATE_LIMITS === 'true'
    ? (_req, _res, next) => next()
    :
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: message || 'Too many requests. Please try again later.' },
  });

const authLimiter = process.env.DISABLE_AUTH_RATE_LIMIT === 'true'
  ? (_req, _res, next) => next()
  : createLimiter(15 * 60 * 1000, 10, 'Too many login attempts. Please try again after 15 minutes.');
const generalLimiter = createLimiter(15 * 60 * 1000, 200, 'Too many requests. Please try again later.');
const strictLimiter = createLimiter(15 * 60 * 1000, 50, 'Too many requests. Please slow down.');

module.exports = { authLimiter, generalLimiter, strictLimiter };
