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
      const registration = await AuthService.getRegistrationStatus();

      // Check optional session silently without returning 401
      let currentUser = null;
      let refreshedAccessToken: string | undefined;

      const candidateTokens: string[] = [];
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        candidateTokens.push(authHeader.substring(7));
      }
      if (req.cookies?.access_token) {
        candidateTokens.push(req.cookies.access_token);
      }

      for (const token of candidateTokens) {
        try {
          const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub: string };
          currentUser = await AuthService.getUserProfile(decoded.sub);
          if (currentUser) break;
        } catch {
          currentUser = null;
        }
      }

      // Silently rotate valid refresh_token cookie on status check (avoids 401 /auth/refresh noise)
      if (!currentUser && req.cookies?.refresh_token) {
        try {
          const tokenPair = await AuthService.refresh(req.cookies.refresh_token);
          setTokenCookies(res, tokenPair.accessToken, tokenPair.refreshToken, true);
          currentUser = tokenPair.user;
          refreshedAccessToken = tokenPair.accessToken;
        } catch {
          clearTokenCookies(res);
          currentUser = null;
        }
      }

      res.json({
        isRegistrationAllowed: registration.allowed,
        userCount: registration.userCount,
        maxUsers: registration.maxUsers,
        remainingSlots: registration.remainingSlots,
        authenticated: Boolean(currentUser),
        user: currentUser,
        ...(refreshedAccessToken ? { accessToken: refreshedAccessToken } : {}),
        instanceType: 'multi-user-private',
      });
    } catch (error) {
      Logger.error('AuthController', 'Failed to check registration status', error);
      // Graceful fallback for setup mode
      res.json({
        isRegistrationAllowed: true,
        userCount: 0,
        maxUsers: env.MAX_USERS,
        remainingSlots: env.MAX_USERS,
        authenticated: false,
        user: null,
        instanceType: 'multi-user-private',
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
        message: 'Account successfully created and verified.',
        user: tokenPair.user,
        accessToken: tokenPair.accessToken,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed.';
      const statusCode =
        message.includes('permanently disabled') ||
        message.includes('capacity reached') ||
        message.includes('limit reached')
          ? 403
          : message.includes('already exists')
            ? 409
            : 400;
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

  static async quickLogin(req: Request, res: Response): Promise<void> {
    try {
      const requestedEmail = typeof req.body?.email === 'string' ? req.body.email : undefined;
      let tokenPair;
      try {
        tokenPair = await AuthService.quickLogin(requestedEmail);
      } catch (dbErr) {
        Logger.warn('AuthController', 'Quick login encountered initial error, verifying database health and retrying...', dbErr);
        await connectPrisma();
        tokenPair = await AuthService.quickLogin(requestedEmail);
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

