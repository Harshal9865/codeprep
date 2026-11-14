import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

export const loginLimiter = rateLimit({
  windowMs: env.NODE_ENV === 'development' ? 60 * 1000 : env.RATE_LIMIT_WINDOW_MS,
  max: env.NODE_ENV === 'development' ? 1000 : env.RATE_LIMIT_MAX_LOGIN_ATTEMPTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts from this IP address. Please wait a moment before retrying.',
  },
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 400, // Allow comfortable multi-user & workspace polling headroom
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Rate limit exceeded. Please throttle your requests.',
  },
});

