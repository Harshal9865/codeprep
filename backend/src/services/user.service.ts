import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { hashPassword, verifyPassword } from '../utils/password';
import { prisma } from './prisma.service';
import { Logger } from '../utils/logger';

export interface AvatarValidationResult {
  valid: boolean;
  mimeType?: string;
  extension?: string;
  error?: string;
}

const ALLOWED_PIXEL_AVATARS = new Set([
  'pixel:bot-amber',
  'pixel:bot-cyan',
  'pixel:bot-emerald',
  'pixel:bot-violet',
  'pixel:dev-hoodie',
  'pixel:dev-glasses',
  'pixel:knight-bit',
  'pixel:cat-terminal',
]);

export class UserService {
  private static readonly UPLOADS_DIR = path.resolve(process.cwd(), 'uploads', 'avatars');

  /**
   * Initializes uploads directory if it doesn't exist
   */
  static ensureUploadsDir(): void {
    if (!fs.existsSync(UserService.UPLOADS_DIR)) {
      fs.mkdirSync(UserService.UPLOADS_DIR, { recursive: true });
    }
  }

  /**
   * Validates image magic bytes to defend against file spoofing and malicious scripts
   */
  static validateImageBuffer(buffer: Buffer): AvatarValidationResult {
    if (!buffer || buffer.length === 0) {
      return { valid: false, error: 'Empty file buffer received.' };
    }

    // Max 2MB file size limit
    if (buffer.length > 2 * 1024 * 1024) {
      return { valid: false, error: 'File size exceeds maximum 2MB limit.' };
    }

    // 1. JPEG check: Starts with FF D8 FF
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { valid: true, mimeType: 'image/jpeg', extension: 'jpg' };
    }

    // 2. PNG check: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return { valid: true, mimeType: 'image/png', extension: 'png' };
    }

    // 3. WebP check: RIFF header with WEBP type
    // Offset 0-3: 'RIFF' (0x52, 0x49, 0x46, 0x46)
    // Offset 8-11: 'WEBP' (0x57, 0x45, 0x42, 0x50)
    if (
      buffer.length >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      return { valid: true, mimeType: 'image/webp', extension: 'webp' };
    }

    // Check if user attempted SVG or HTML injection
    const headerStr = buffer.slice(0, 100).toString('utf8').toLowerCase();
    if (headerStr.includes('<svg') || headerStr.includes('<?xml') || headerStr.includes('<html')) {
      return { valid: false, error: 'Vector SVG and HTML uploads are prohibited for security.' };
    }

    return {
      valid: false,
      error: 'Unsupported image format. Allowed formats are strictly: JPEG, PNG, and WebP.',
    };
  }

  /**
   * Saves uploaded avatar safely
   */
  static async saveAvatar(userId: string, buffer: Buffer): Promise<string> {
    const validation = UserService.validateImageBuffer(buffer);
    if (!validation.valid || !validation.extension) {
      throw new Error(validation.error || 'Invalid image file.');
    }

    UserService.ensureUploadsDir();

    const uniqueId = crypto.randomUUID();
    const fileName = `avatar_${uniqueId}.${validation.extension}`;
    const filePath = path.join(UserService.UPLOADS_DIR, fileName);

    fs.writeFileSync(filePath, buffer);

    const relativeUrl = `/uploads/avatars/${fileName}`;

    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: relativeUrl },
    });

    Logger.info('UserService', `Avatar uploaded and saved for user ${userId}: ${fileName}`);
    return relativeUrl;
  }

  /**
   * Updates user preferences
   */
  static async updateProfile(
    userId: string,
    data: { displayName?: string; themePreference?: string; timezone?: string; avatarUrl?: string | null }
  ) {
    const updateData: Record<string, string | null> = {};

    if (data.displayName && data.displayName.trim().length > 0) {
      updateData.displayName = data.displayName.trim().slice(0, 50);
    }

    if (data.themePreference) {
      const normalizedTheme = data.themePreference === 'auto' ? 'dark' : data.themePreference;
      if (['dark', 'light', 'leetcode', 'vscode', 'tokyo', 'monokai'].includes(normalizedTheme)) {
        updateData.themePreference = normalizedTheme;
      }
    }

    if (data.timezone && data.timezone.trim().length > 0) {
      updateData.timezone = data.timezone.trim();
    }

    if (data.avatarUrl !== undefined) {
      if (data.avatarUrl === null || data.avatarUrl === '') {
        updateData.avatarUrl = null;
      } else if (ALLOWED_PIXEL_AVATARS.has(data.avatarUrl)) {
        updateData.avatarUrl = data.avatarUrl;
      }
    }

    return prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        themePreference: true,
        timezone: true,
        createdAt: true,
      },
    });
  }

  /**
   * Changes user password securely
   */
  static async changePassword(
    userId: string,
    currentPass: string,
    newPass: string
  ): Promise<{ success: boolean; message: string }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found.');
    }

    const matches = await verifyPassword(currentPass, user.passwordHash);
    if (!matches) {
      throw new Error('Current password is incorrect.');
    }

    if (newPass.length < 10) {
      throw new Error('New password must be at least 10 characters long.');
    }

    const newHash = await hashPassword(newPass);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    // Revoke all refresh tokens on password change
    await prisma.refreshToken.deleteMany({ where: { userId } });

    Logger.info('UserService', `Password successfully updated for user ${userId}. All existing sessions revoked.`);
    return { success: true, message: 'Password updated successfully. Please re-login.' };
  }

  /**
   * Full JSON data export for the user
   */
  static async exportUserData(userId: string) {
    const [user, submissions, drafts, timers, bookmarksAndNotes] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          displayName: true,
          themePreference: true,
          timezone: true,
          createdAt: true,
          lastLoginAt: true,
        },
      }),
      prisma.submission.findMany({
        where: { userId },
        select: {
          id: true,
          problemId: true,
          language: true,
          code: true,
          verdict: true,
          runtimeMs: true,
          memoryKb: true,
          submittedAt: true,
        },
        orderBy: { submittedAt: 'asc' },
      }),
      prisma.problemDraft.findMany({
        where: { userId },
        select: {
          problemId: true,
          code: true,
          updatedAt: true,
        },
      }),
      prisma.problemActiveTimer.findMany({
        where: { userId },
        select: {
          problemId: true,
          activeSeconds: true,
          lastHeartbeat: true,
        },
      }),
      prisma.problem.findMany({
        where: {
          OR: [{ isBookmark: true }, { userNotes: { not: null } }],
        },
        select: {
          id: true,
          title: true,
          isBookmark: true,
          userNotes: true,
          solvedWithAiHelp: true,
        },
      }),
    ]);

    return {
      metadata: {
        exportDate: new Date().toISOString(),
        version: '1.0.0',
        platform: 'CodePrep Interview Preparation Platform',
      },
      user,
      summary: {
        totalSubmissions: submissions.length,
        acceptedSubmissions: submissions.filter((s) => s.verdict === 'Accepted').length,
        bookmarkedProblems: bookmarksAndNotes.filter((p) => p.isBookmark).length,
        notesCount: bookmarksAndNotes.filter((p) => p.userNotes).length,
      },
      submissions,
      drafts,
      timers,
      savedProblems: bookmarksAndNotes,
    };
  }
}

