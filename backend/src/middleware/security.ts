import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from '../config/env';

const extraOrigins = env.FRONTEND_URL.split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const allowedOrigins = Array.from(
  new Set([
    ...extraOrigins,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5000',
  ])
);

export const configureSecurityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Needed for inline theme bootstrap
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'", ...allowedOrigins],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: env.SECURE_COOKIES ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
});

export const configureCors = cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
});

export function setTokenCookies(res: Response, accessToken: string, refreshToken: string, rememberMe = true): void {
  const isSecure = env.SECURE_COOKIES;
  const sameSite = isSecure ? 'none' : 'lax';

  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite,
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: '/',
  });

  const refreshMaxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite,
    maxAge: refreshMaxAge,
    path: '/api/auth/refresh',
  });
}

export function clearTokenCookies(res: Response): void {
  const isSecure = env.SECURE_COOKIES;
  const sameSite = isSecure ? 'none' : 'lax';

  res.clearCookie('access_token', {
    httpOnly: true,
    secure: isSecure,
    sameSite,
    path: '/',
  });

  res.clearCookie('refresh_token', {
    httpOnly: true,
    secure: isSecure,
    sameSite,
    path: '/api/auth/refresh',
  });
}

