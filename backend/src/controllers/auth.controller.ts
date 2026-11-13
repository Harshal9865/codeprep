import { Request, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { connectPrisma } from '../services/prisma.service';
import { AuthService } from '../services/auth.service';
import { setTokenCookies, clearTokenCookies } from '../middleware/security';
import { Logger } from '../utils/logger';

const registerSchema = z.object({
  email: z.string().email('Invalid email address format.'),
  password: z.string().min(6, 'Password must be at least 6 characters long.'),
  displayName: z.string().min(2).max(50).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address format.'),
  password: z.string().min(1, 'Password is required.'),
  rememberMe: z.boolean().optional().default(true),
});

export class AuthController {
  static async checkStatus(req: Request, res: Response): Promise<void> {
    try {
      const isRegistrationAllowed = await AuthService.isRegistrationAllowed();

      // Check optional session silently without returning 401
      let currentUser = null;
      try {
        let token: string | undefined;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        } else if (req.cookies && req.cookies.access_token) {
          token = req.cookies.access_token;
        }

        if (token) {
          const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub: string };
          currentUser = await AuthService.getUserProfile(decoded.sub);
        }
      } catch {
        currentUser = null;
      }

      res.json({
        isRegistrationAllowed,
        authenticated: Boolean(currentUser),
        user: currentUser,
        instanceType: 'single-user-private',
      });
    } catch (error) {
      Logger.error('AuthController', 'Failed to check registration status', error);
      // Graceful fallback for single-user instance: allow first-time owner registration
      res.json({
        isRegistrationAllowed: true,
        authenticated: false,
        user: null,
        instanceType: 'single-user-private',
        statusNotice: 'Instance in setup mode',
      });
    }
  }

  static async register(req: Request, res: Response): Promise<void> {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.errors[0].message });
        return;
      }

      const { email, password, displayName } = parsed.data;
      const tokenPair = await AuthService.registerFirstUser(email, password, displayName);
      setTokenCookies(res, tokenPair.accessToken, tokenPair.refreshToken, true);

      res.status(201).json({
        message: 'Owner account successfully created and verified.',
        user: tokenPair.user,
        accessToken: tokenPair.accessToken,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed.';
      const statusCode = message.includes('permanently disabled') ? 403 : 400;
      res.status(statusCode).json({ error: message });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.errors[0].message });
        return;
      }

      const { email, password, rememberMe } = parsed.data;
      const tokenPair = await AuthService.login(email, password, rememberMe);
      setTokenCookies(res, tokenPair.accessToken, tokenPair.refreshToken, rememberMe);

      res.json({
        message: 'Authentication successful.',
        user: tokenPair.user,
        accessToken: tokenPair.accessToken,
      });
    } catch (error) {
      Logger.error('AuthController', 'Authentication failed', error);
      res.status(401).json({ error: error instanceof Error ? error.message : 'Invalid email or password.' });
    }
  }

  static async quickLogin(_req: Request, res: Response): Promise<void> {
    try {
      let tokenPair;
      try {
        tokenPair = await AuthService.quickLogin();
      } catch (dbErr) {
        Logger.warn('AuthController', 'Quick login encountered initial error, verifying database health and retrying...', dbErr);
        await connectPrisma();
        tokenPair = await AuthService.quickLogin();
      }
      setTokenCookies(res, tokenPair.accessToken, tokenPair.refreshToken, true);
      res.json({
        message: 'Quick login successful.',
        user: tokenPair.user,
        accessToken: tokenPair.accessToken,
      });
    } catch (error) {
      Logger.error('AuthController', 'Quick login failed', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Quick login failed.' });
    }
  }

  static async refresh(req: Request, res: Response): Promise<void> {
    try {
      let refreshToken = req.cookies?.refresh_token;
      if (!refreshToken && req.body?.refreshToken) {
        refreshToken = req.body.refreshToken;
      }

      if (!refreshToken) {
        res.status(401).json({ error: 'Refresh token required.' });
        return;
      }

      const tokenPair = await AuthService.refresh(refreshToken);
      setTokenCookies(res, tokenPair.accessToken, tokenPair.refreshToken, true);

      res.json({
        user: tokenPair.user,
        accessToken: tokenPair.accessToken,
      });
    } catch (error) {
      clearTokenCookies(res);
      res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
  }

  static async me(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized.' });
        return;
      }

      const user = await AuthService.getUserProfile(req.user.id);
      if (!user) {
        res.status(401).json({ error: 'User not found.' });
        return;
      }
      res.json({ user });
    } catch (error) {
      res.status(401).json({ error: 'Session invalid.' });
    }
  }

  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
      if (refreshToken) {
        await AuthService.logout(refreshToken);
      }
      clearTokenCookies(res);
      res.json({ message: 'Logged out successfully.' });
    } catch (error) {
      clearTokenCookies(res);
      res.json({ message: 'Logged out.' });
    }
  }
}

