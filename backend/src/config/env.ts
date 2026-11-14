import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const resolvedDefaultFrontend =
  process.env.RENDER_EXTERNAL_URL ||
  (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : undefined) ||
  'http://localhost:5173';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  FRONTEND_URL: z.string().default(resolvedDefaultFrontend),
  DATABASE_URL: z.string().default('file:./dev.db'),
  JWT_ACCESS_SECRET: z.string().min(16).default('codeprep-dev-access-secret-minimum-16-chars-long'),
  JWT_REFRESH_SECRET: z.string().min(16).default('codeprep-dev-refresh-secret-minimum-16-chars-long'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('30d'),
  COOKIE_SECRET: z.string().default('codeprep-cookie-secret-string'),
  SECURE_COOKIES: z.string().default('false').transform((val) => val === 'true'),
  DEFAULT_TIMEZONE: z.string().default('Asia/Kolkata'),
  OWNER_EMAIL: z.string().optional().default('').transform((val) => val.trim().toLowerCase()),
  OWNER_PASSWORD: z.string().optional().default(''),
  OWNER_NAME: z.string().optional().default('').transform((val) => val.trim()),
  AI_PROVIDER: z.enum(['gemini', 'claude', 'mock']).default('gemini'),
  AI_API_KEY: z
    .string()
    .optional()
    .default(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || ''),
  AI_MODEL_NAME: z.string().default('gemini-2.5-flash'),
  SANDBOX_TYPE: z.enum(['docker', 'local-process']).default('docker'),
  SANDBOX_TIMEOUT_MS: z.string().default('2000').transform((val) => parseInt(val, 10)),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform((val) => parseInt(val, 10)),
  RATE_LIMIT_MAX_LOGIN_ATTEMPTS: z.string().default('20').transform((val) => parseInt(val, 10)),
  MAX_USERS: z.string().default('100').transform((val) => Math.max(10, parseInt(val, 10) || 100)),
});

export const env = envSchema.parse(process.env);

