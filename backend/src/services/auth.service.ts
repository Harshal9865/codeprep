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
  private static readonly OWNER_USER_ID = 'owner-admin-codeprep';
  private static readonly DEMO_USER_ID = 'guest-demo-codeprep';
  static readonly DEMO_EMAIL = 'demo@codeprep.dev';

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

  private static getConfiguredOwnerConfig() {
    const hasExplicitEmail = Boolean(env.OWNER_EMAIL && env.OWNER_EMAIL.includes('@'));
    const hasExplicitPassword = Boolean(env.OWNER_PASSWORD && env.OWNER_PASSWORD.length >= 6);
    const hasExplicitName = Boolean(env.OWNER_NAME);
    return {
      email: hasExplicitEmail ? env.OWNER_EMAIL.toLowerCase() : 'admin@codeprep.dev',
      password: hasExplicitPassword ? env.OWNER_PASSWORD : 'Password123!',
      name: hasExplicitName ? env.OWNER_NAME : 'Harshal Patel',
      hasExplicitEmail,
      hasExplicitPassword,
      hasExplicitName,
    };
  }

  static async seedDefaultUser(): Promise<void> {
    try {
      const cfg = this.getConfiguredOwnerConfig();
      const userCount = await prisma.user.count();

      if (userCount === 0) {
        const passwordHash = await hashPassword(cfg.password);
        await prisma.user.create({
          data: {
            id: this.OWNER_USER_ID,
            email: cfg.email,
            passwordHash,
            displayName: cfg.name,
            themePreference: 'dark',
            timezone: env.DEFAULT_TIMEZONE,
          },
        });
        Logger.info('AuthService', `Default owner account initialized: ${cfg.email}`);
        return;
      }

      const ownerUser =
        (await prisma.user.findUnique({ where: { id: this.OWNER_USER_ID } })) ||
        (await prisma.user.findUnique({ where: { email: cfg.email } })) ||
        (await prisma.user.findUnique({ where: { email: 'admin@codeprep.dev' } }));

      if (!ownerUser) {
        if (cfg.hasExplicitEmail || cfg.hasExplicitPassword) {
          const passwordHash = await hashPassword(cfg.password);
          await prisma.user.create({
            data: {
              id: this.OWNER_USER_ID,
              email: cfg.email,
              passwordHash,
              displayName: cfg.name,
              themePreference: 'dark',
              timezone: env.DEFAULT_TIMEZONE,
            },
          });
          Logger.info('AuthService', `Configured owner account initialized: ${cfg.email}`);
        }
        return;
      }

      const updates: Record<string, string> = {};
      if (cfg.hasExplicitEmail && ownerUser.email !== cfg.email) {
        const collision = await prisma.user.findUnique({
          where: { email: cfg.email },
          select: { id: true },
        });
        if (!collision || collision.id === ownerUser.id) {
          updates.email = cfg.email;
        }
      }
      if (cfg.hasExplicitPassword) {
        const alreadyMatches = await verifyPassword(cfg.password, ownerUser.passwordHash);
        if (!alreadyMatches) {
          updates.passwordHash = await hashPassword(cfg.password);
        }
      }
      if (cfg.hasExplicitName && ownerUser.displayName !== cfg.name) {
        updates.displayName = cfg.name;
      } else if (ownerUser.displayName === 'Lead Engineer') {
        updates.displayName = cfg.name;
      }

      if (Object.keys(updates).length > 0) {
        await prisma.user.update({
          where: { id: ownerUser.id },
          data: updates,
        });
        Logger.info('AuthService', `Synchronized configured owner credentials for ${updates.email || ownerUser.email}`);
      }
    } catch (err) {
      Logger.warn('AuthService', 'Notice during default user check', err);
    }
  }

  private static async ensureDemoUserWithSampleActivity() {
    let demoUser = await prisma.user.findUnique({ where: { email: this.DEMO_EMAIL } });
    if (!demoUser) {
      const passwordHash = await hashPassword('DemoGuest123!');
      demoUser = await prisma.user.create({
        data: {
          id: this.DEMO_USER_ID,
          email: this.DEMO_EMAIL,
          passwordHash,
          displayName: 'Guest Reviewer',
          themePreference: 'dark',
          timezone: env.DEFAULT_TIMEZONE,
        },
      });
    }

    try {
      const existingSubCount = await prisma.submission.count({ where: { userId: demoUser.id } });
      if (existingSubCount === 0) {
        const seedEntries = [
          {
            problemId: 1,
            language: 'cpp17',
            runtimeMs: 4.2,
            memoryKb: 10240,
            daysAgo: 4,
            code: `class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        unordered_map<int, int> seen;\n        for (int i = 0; i < (int)nums.size(); ++i) {\n            int need = target - nums[i];\n            if (seen.count(need)) return {seen[need], i};\n            seen[nums[i]] = i;\n        }\n        return {};\n    }\n};`,
          },
          {
            problemId: 3,
            language: 'cpp17',
            runtimeMs: 6.1,
            memoryKb: 9800,
            daysAgo: 3,
            code: `class Solution {\npublic:\n    int maxSubArray(vector<int>& nums) {\n        int best = nums[0], cur = nums[0];\n        for (size_t i = 1; i < nums.size(); ++i) {\n            cur = max(nums[i], cur + nums[i]);\n            best = max(best, cur);\n        }\n        return best;\n    }\n};`,
          },
          {
            problemId: 2,
            language: 'cpp17',
            runtimeMs: 5.4,
            memoryKb: 10100,
            daysAgo: 2,
            code: `class Solution {\npublic:\n    bool isValid(string s) {\n        string st;\n        for (char c : s) {\n            if (c == '(' || c == '{' || c == '[') st.push_back(c);\n            else {\n                if (st.empty()) return false;\n                char top = st.back();\n                if ((c == ')' && top != '(') || (c == '}' && top != '{') || (c == ']' && top != '[')) return false;\n                st.pop_back();\n            }\n        }\n        return st.empty();\n    }\n};`,
          },
          {
            problemId: 501,
            language: 'sql',
            runtimeMs: 1.8,
            memoryKb: 2048,
            daysAgo: 1,
            code: 'SELECT * FROM employees ORDER BY id;',
          },
        ];

        const existingProblems = await prisma.problem.findMany({
          where: { id: { in: seedEntries.map((s) => s.problemId) } },
          select: { id: true },
        });
        const existingSet = new Set(existingProblems.map((p) => p.id));

        for (const item of seedEntries) {
          if (!existingSet.has(item.problemId)) continue;
          const submittedAt = new Date(Date.now() - item.daysAgo * 86_400_000);
          await prisma.submission.create({
            data: {
              problemId: item.problemId,
              userId: demoUser.id,
              language: item.language,
              code: item.code,
              verdict: 'Accepted',
              runtimeMs: item.runtimeMs,
              memoryKb: item.memoryKb,
              submittedAt,
            },
          });
        }
      }
    } catch (err) {
      Logger.warn('AuthService', 'Optional demo activity seed skipped', err);
    }

    return demoUser;
  }

  static async quickLogin(requestedEmail?: string): Promise<TokenPair> {
    const normalizedRequested = requestedEmail?.toLowerCase().trim();
    const cfg = this.getConfiguredOwnerConfig();
    let user = null;

    if (normalizedRequested === this.DEMO_EMAIL) {
      user = await this.ensureDemoUserWithSampleActivity();
      return this.generateTokenPair(user.id, true);
    }

    if (normalizedRequested && normalizedRequested !== 'admin@codeprep.dev' && normalizedRequested !== cfg.email) {
      user = await prisma.user.findUnique({ where: { email: normalizedRequested } });
    }

    if (!user && (!normalizedRequested || normalizedRequested === 'admin@codeprep.dev' || normalizedRequested === cfg.email)) {
      user =
        (await prisma.user.findUnique({ where: { email: cfg.email } })) ||
        (await prisma.user.findUnique({ where: { id: this.OWNER_USER_ID } })) ||
        (await prisma.user.findUnique({ where: { email: 'admin@codeprep.dev' } })) ||
        (await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } }));
    }

    if (!user) {
      await this.seedDefaultUser();
      const targetLookup = normalizedRequested || cfg.email;
      user =
        (await prisma.user.findUnique({ where: { email: targetLookup } })) ||
        (await prisma.user.findUnique({ where: { email: cfg.email } })) ||
        (await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } }));
    }

    if (!user) {
      const passwordHash = await hashPassword(cfg.password);
      user = await prisma.user.create({
        data: {
          id: this.OWNER_USER_ID,
          email: cfg.email,
          passwordHash,
          displayName: cfg.name,
          themePreference: 'dark',
          timezone: env.DEFAULT_TIMEZONE,
        },
      });
      Logger.info('AuthService', 'Created default owner account for quick login.');
    } else if (user.displayName === 'Lead Engineer') {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { displayName: cfg.name },
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
    const cfg = this.getConfiguredOwnerConfig();
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user && (normalizedEmail === cfg.email || normalizedEmail === 'admin@codeprep.dev')) {
      await this.seedDefaultUser();
      user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
    } else if (!user && normalizedEmail === this.DEMO_EMAIL) {
      user = await this.ensureDemoUserWithSampleActivity();
    }

    if (!user) {
      const userCount = await prisma.user.count();
      if (userCount === 0) {
        Logger.info('AuthService', 'First login attempt with empty database: automatically creating account.');
        return this.registerFirstUser(normalizedEmail, plainPassword, cfg.name);
      }
      Logger.warn('AuthService', 'Authentication failed: Account not found.', { email: normalizedEmail });
      throw new Error('Account not found. Switch to Create Account or sign in with an existing account.');
    }

    const isValid = await verifyPassword(plainPassword, user.passwordHash);
    if (!isValid) {
      if (cfg.hasExplicitPassword && normalizedEmail === cfg.email && plainPassword === cfg.password) {
        const newHash = await hashPassword(cfg.password);
        await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });
        Logger.info('AuthService', 'Synchronized configured owner password hash.');
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

