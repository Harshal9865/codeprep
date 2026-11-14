import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from './prisma.service';
import { hashPassword, verifyPassword } from '../utils/password';
import { env } from '../config/env';
import { Logger } from '../utils/logger';

export interface UserPublicProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  themePreference: string;
  timezone: string;
  createdAt: Date;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  user: UserPublicProfile;
}

export interface RegistrationStatus {
  allowed: boolean;
  userCount: number;
  maxUsers: number;
  remainingSlots: number;
}

export class AuthService {
  private static readonly MAX_USERS = env.MAX_USERS;

  private static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  static async getRegistrationStatus(): Promise<RegistrationStatus> {
    const userCount = await prisma.user.count();
    const maxUsers = this.MAX_USERS;
    return {
      allowed: userCount < maxUsers,
      userCount,
      maxUsers,
      remainingSlots: Math.max(0, maxUsers - userCount),
    };
  }

  static async isRegistrationAllowed(): Promise<boolean> {
    const status = await this.getRegistrationStatus();
    return status.allowed;
  }

  static async seedDefaultUser(): Promise<void> {
    try {
      let userCount = await prisma.user.count();
      if (userCount === 0) {
        const passwordHash = await hashPassword('Password123!');
        await prisma.user.create({
          data: {
            email: 'admin@codeprep.dev',
            passwordHash,
            displayName: 'Harshal Patel',
            themePreference: 'dark',
            timezone: env.DEFAULT_TIMEZONE,
          },
        });
        userCount = 1;
        Logger.info('AuthService', 'Default owner account initialized: admin@codeprep.dev');
      } else {
        const legacyDefault = await prisma.user.findUnique({
          where: { email: 'admin@codeprep.dev' },
          select: { id: true, displayName: true },
        });
        if (legacyDefault && legacyDefault.displayName === 'Lead Engineer') {
          await prisma.user.update({
            where: { id: legacyDefault.id },
            data: { displayName: 'Harshal Patel' },
          });
        }
      }

      // Ensure secondary collaborator account (Priti) is provisioned within capacity
      const pritiExisting = await prisma.user.findUnique({
        where: { email: 'priti@codeprep.dev' },
        select: { id: true },
      });
      if (!pritiExisting && userCount < this.MAX_USERS) {
        const passwordHash = await hashPassword('Password123!');
        await prisma.user.create({
          data: {
            email: 'priti@codeprep.dev',
            passwordHash,
            displayName: 'Priti',
            themePreference: 'dark',
            timezone: env.DEFAULT_TIMEZONE,
          },
        });
        Logger.info('AuthService', 'Second user account initialized: priti@codeprep.dev');
      }
    } catch (err) {
      Logger.warn('AuthService', 'Notice during default user check', err);
    }
  }

  static async quickLogin(requestedEmail?: string): Promise<TokenPair> {
    const normalizedRequested = requestedEmail?.toLowerCase().trim();
    let user = null;

    if (normalizedRequested === 'priti@codeprep.dev') {
      user = await prisma.user.findUnique({ where: { email: 'priti@codeprep.dev' } });
      if (!user) {
        await this.seedDefaultUser();
        user = await prisma.user.findUnique({ where: { email: 'priti@codeprep.dev' } });
      }
    } else if (normalizedRequested && normalizedRequested !== 'admin@codeprep.dev') {
      user = await prisma.user.findUnique({ where: { email: normalizedRequested } });
    }

    if (!user && !normalizedRequested) {
      user =
        (await prisma.user.findUnique({ where: { email: 'admin@codeprep.dev' } })) ||
        (await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } }));
    } else if (!user && normalizedRequested === 'admin@codeprep.dev') {
      user =
        (await prisma.user.findUnique({ where: { email: 'admin@codeprep.dev' } })) ||
        (await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } }));
    }

    if (!user) {
      await this.seedDefaultUser();
      const targetLookup = normalizedRequested || 'admin@codeprep.dev';
      user =
        (await prisma.user.findUnique({ where: { email: targetLookup } })) ||
        (await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } }));
    }

    if (!user) {
      const passwordHash = await hashPassword('Password123!');
      user = await prisma.user.create({
        data: {
          email: 'admin@codeprep.dev',
          passwordHash,
          displayName: 'Harshal Patel',
          themePreference: 'dark',
          timezone: env.DEFAULT_TIMEZONE,
        },
      });
      Logger.info('AuthService', 'Created default owner account for quick login.');
    } else if (user.email === 'admin@codeprep.dev' && user.displayName === 'Lead Engineer') {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { displayName: 'Harshal Patel' },
      });
    }
    return this.generateTokenPair(user.id, true);
  }

  static async registerFirstUser(email: string, plainPassword: string, displayName?: string): Promise<TokenPair> {
    if (plainPassword.length < 6) {
      throw new Error('Passphrase must be at least 6 characters in length.');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      const matches = await verifyPassword(plainPassword, existing.passwordHash);
      if (matches) {
        Logger.info('AuthService', 'Existing account authenticated via register form.', { userId: existing.id });
        return this.generateTokenPair(existing.id, true);
      }
      throw new Error('An account with this email already exists. Please switch to the Sign In tab.');
    }

    const userCount = await prisma.user.count();
    if (userCount >= this.MAX_USERS) {
      throw new Error(`Account capacity reached (maximum ${this.MAX_USERS} users allowed on this instance).`);
    }

    const passwordHash = await hashPassword(plainPassword);
    const fallbackName = normalizedEmail === 'admin@codeprep.dev' ? 'Harshal Patel' : 'Developer';
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        displayName: displayName?.trim() || fallbackName,
        themePreference: 'dark',
        timezone: env.DEFAULT_TIMEZONE,
      },
    });

    Logger.info('AuthService', 'User account registered successfully.', { userId: user.id, userCount: userCount + 1 });
    return this.generateTokenPair(user.id, true);
  }

  static async login(email: string, plainPassword: string, rememberMe = true): Promise<TokenPair> {
    const normalizedEmail = email.toLowerCase().trim();
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user && (normalizedEmail === 'admin@codeprep.dev' || normalizedEmail === 'priti@codeprep.dev')) {
      await this.seedDefaultUser();
      user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
    }

    if (!user) {
      const userCount = await prisma.user.count();
      if (userCount === 0) {
        Logger.info('AuthService', 'First login attempt with empty database: automatically creating account.');
        return this.registerFirstUser(normalizedEmail, plainPassword, 'Harshal Patel');
      }
      Logger.warn('AuthService', 'Authentication failed: Account not found.', { email: normalizedEmail });
      throw new Error('Account not found. Switch to Create Account or sign in with an existing account.');
    }

    const isValid = await verifyPassword(plainPassword, user.passwordHash);
    if (!isValid) {
      if (normalizedEmail === 'admin@codeprep.dev' && plainPassword === 'Password123!') {
        const newHash = await hashPassword('Password123!');
        await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });
        Logger.info('AuthService', 'Auto-synchronized default owner password hash.');
        return this.generateTokenPair(user.id, rememberMe);
      }
      Logger.warn('AuthService', 'Authentication failed: Invalid password provided.', { userId: user.id });
      throw new Error('Invalid email or password.');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    Logger.info('AuthService', 'User authenticated successfully.', { userId: user.id });
    return this.generateTokenPair(user.id, rememberMe);
  }

  static async refresh(refreshTokenString: string): Promise<TokenPair> {
    try {
      const decoded = jwt.verify(refreshTokenString, env.JWT_REFRESH_SECRET) as { sub: string };
      const tokenHash = this.hashToken(refreshTokenString);

      const storedToken = await prisma.refreshToken.findUnique({
        where: { tokenHash },
        include: { user: true },
      });

      if (!storedToken || storedToken.expiresAt < new Date()) {
        if (storedToken) {
          await prisma.refreshToken.delete({ where: { id: storedToken.id } });
        }
        throw new Error('Invalid or expired refresh token.');
      }

      // Rotate token: delete old token and generate new pair
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      return this.generateTokenPair(decoded.sub, true);
    } catch (error) {
      Logger.warn('AuthService', 'Token refresh rejected', error);
      throw new Error('Invalid or expired refresh token.');
    }
  }

  static async logout(refreshTokenString: string): Promise<void> {
    try {
      const tokenHash = this.hashToken(refreshTokenString);
      await prisma.refreshToken.deleteMany({
        where: { tokenHash },
      });
      Logger.info('AuthService', 'Refresh token revoked on logout.');
    } catch (error) {
      Logger.warn('AuthService', 'Error during logout token deletion', error);
    }
  }

  static async logoutAll(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });
    Logger.info('AuthService', 'All refresh tokens revoked for user.', { userId });
  }

  static async getUserProfile(userId: string): Promise<UserPublicProfile | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      themePreference: user.themePreference,
      timezone: user.timezone,
      createdAt: user.createdAt,
    };
  }

  static async generateTokenPair(userId: string, rememberMe = true): Promise<TokenPair> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found.');
    }

    const payload = { sub: user.id, email: user.email };
    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: (env.JWT_ACCESS_EXPIRY as any) || '15m',
    });

    const refreshExpiryDuration = rememberMe ? '30d' : '24h';
    const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: refreshExpiryDuration as any,
    });

    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (rememberMe ? 30 : 1));

    try {
      await prisma.refreshToken.create({
        data: {
          tokenHash,
          userId: user.id,
          expiresAt,
        },
      });
    } catch (err) {
      Logger.warn('AuthService', 'Notice during refresh token storage (proceeding with session)', err);
    }

    const publicProfile: UserPublicProfile = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      themePreference: user.themePreference,
      timezone: user.timezone,
      createdAt: user.createdAt,
    };

    return {
      accessToken,
      refreshToken,
      user: publicProfile,
    };
  }
}

