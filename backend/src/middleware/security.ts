import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from '../config/env';

const extraOrigins = env.FRONTEND_URL.split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const allowedOrigins = Array.from(
  new Set([
    ...extraOrigins,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5000',
  ])
);

function isOriginPermitted(origin: string | undefined, requestHost?: string): boolean {
  if (!origin) return true;
  const normalized = origin.replace(/\/+$/, '');
  if (allowedOrigins.includes(normalized)) return true;

  try {
    const parsed = new URL(normalized);
    if (requestHost && parsed.host.toLowerCase() === requestHost.toLowerCase()) {
      return true;
    }
    if (
      parsed.hostname.endsWith('.onrender.com') ||
      parsed.hostname.endsWith('.up.railway.app') ||
      parsed.hostname.endsWith('.vercel.app')
    ) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

export const configureSecurityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Needed for inline theme bootstrap
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'", ...allowedOrigins, 'https://*.onrender.com', 'https://*.up.railway.app'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: null,
    },
  },
  crossOriginEmbedderPolicy: false,
});

export const configureCors = cors((req, callback) => {
  const origin = req.headers.origin;
  const forwardedHost = (req.headers['x-forwarded-host'] as string | undefined)?.split(',')[0]?.trim();
  const host = forwardedHost || req.headers.host;

  if (isOriginPermitted(origin, host)) {
    callback(null, {
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    });
  } else {
    callback(null, {
      origin: false,
    });
  }
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
    path: '/api/auth',
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
    path: '/api/auth',
  });

  // Also clear legacy cookie path if present
  res.clearCookie('refresh_token', {
    httpOnly: true,
    secure: isSecure,
    sameSite,
    path: '/api/auth/refresh',
  });
}

