import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { hashPassword, verifyPassword } from '../utils/password';
import { prisma, checkpointWal } from './prisma.service';
import { Logger } from '../utils/logger';
import { UserProblemStateService } from './userProblemState.service';

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

const SAFE_DATA_IMAGE_REGEX = /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/;

function isAllowedAvatarUrl(value: string): boolean {
  if (ALLOWED_PIXEL_AVATARS.has(value)) return true;
  if (value.length <= 2_800_000 && SAFE_DATA_IMAGE_REGEX.test(value)) return true;
  return false;
}

export class UserService {
  private static resolveUploadsRoot(): string {
    if (process.env.UPLOADS_DIR?.trim()) {
      return path.resolve(process.env.UPLOADS_DIR.trim());
    }
    const dbUrl = (process.env.DATABASE_URL || '').trim();
    if (dbUrl.startsWith('file:')) {
      const rawPath = dbUrl.slice(5).split('?')[0];
      if (
        rawPath &&
        rawPath !== ':memory:' &&
        path.isAbsolute(rawPath) &&
        !path.normalize(rawPath).startsWith(path.resolve(process.cwd()))
      ) {
        return path.join(path.dirname(path.normalize(rawPath)), 'uploads');
      }
    }
    return path.resolve(process.cwd(), 'uploads');
  }

  private static readonly UPLOADS_DIR = path.join(UserService.resolveUploadsRoot(), 'avatars');

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
   * Validates and stores uploaded avatar directly in the database as a safe Base64 data URI
   * so profile photos persist cleanly across stateless container redeploys.
   */
  static async saveAvatar(userId: string, buffer: Buffer): Promise<string> {
    const validation = UserService.validateImageBuffer(buffer);
    if (!validation.valid || !validation.mimeType) {
      throw new Error(validation.error || 'Invalid image file.');
    }

    const dataUri = `data:${validation.mimeType};base64,${buffer.toString('base64')}`;

    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: dataUri },
    });

    Logger.info('UserService', `Avatar stored persistently in database for user ${userId} (${validation.mimeType})`);
    return dataUri;
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
      } else if (isAllowedAvatarUrl(data.avatarUrl)) {
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

    if (newPass.length < 6) {
      throw new Error('New password must be at least 6 characters long.');
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
    const [user, submissions, drafts, timers, userProblemStates, allowLegacy] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          displayName: true,
          avatarUrl: true,
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
      prisma.userProblemState.findMany({
        where: {
          userId,
          OR: [
            { isBookmark: true },
            { userNotes: { not: null } },
            { solvedWithAiHelp: true },
            { unlockedAiSolution: true },
          ],
        },
        include: {
          problem: {
            select: { title: true },
          },
        },
      }),
      UserProblemStateService.isPrimaryOwner(userId),
    ]);

    const savedMap = new Map<
      number,
      {
        id: number;
        title: string;
        isBookmark: boolean;
        userNotes: string | null;
        solvedWithAiHelp: boolean;
        unlockedAiSolution?: boolean;
      }
    >();

    for (const row of userProblemStates) {
      if (row.isBookmark || row.userNotes || row.solvedWithAiHelp || row.unlockedAiSolution) {
        savedMap.set(row.problemId, {
          id: row.problemId,
          title: row.problem?.title || `Problem #${row.problemId}`,
          isBookmark: row.isBookmark,
          userNotes: row.userNotes,
          solvedWithAiHelp: row.solvedWithAiHelp,
          unlockedAiSolution: row.unlockedAiSolution,
        });
      }
    }

    if (allowLegacy) {
      const legacyProblems = await prisma.problem.findMany({
        where: {
          OR: [
            { isBookmark: true },
            { userNotes: { not: null } },
            { solvedWithAiHelp: true },
            { unlockedAiSolution: true },
          ],
        },
        select: {
          id: true,
          title: true,
          isBookmark: true,
          userNotes: true,
          solvedWithAiHelp: true,
          unlockedAiSolution: true,
        },
      });
      for (const lp of legacyProblems) {
        if (!savedMap.has(lp.id)) {
          savedMap.set(lp.id, lp);
        }
      }
    }

    const bookmarksAndNotes = Array.from(savedMap.values());

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

  /**
   * Restores user profile settings, submissions, drafts, timers, bookmarks, and notes from an exported JSON snapshot
   */
  static async importUserData(userId: string, rawDump: unknown) {
    if (!rawDump || typeof rawDump !== 'object') {
      throw new Error('Invalid backup file format. Expected JSON backup object.');
    }

    const dump = rawDump as {
      user?: {
        displayName?: string;
        avatarUrl?: string | null;
        themePreference?: string;
        timezone?: string;
      } | null;
      submissions?: Array<{
        problemId: number;
        language?: string;
        code: string;
        verdict: string;
        runtimeMs?: number | null;
        memoryKb?: number | null;
        submittedAt?: string;
      }>;
      drafts?: Array<{
        problemId: number;
        code: string;
      }>;
      timers?: Array<{
        problemId: number;
        activeSeconds?: number;
      }>;
      savedProblems?: Array<{
        id: number;
        isBookmark?: boolean;
        userNotes?: string | null;
        solvedWithAiHelp?: boolean;
        unlockedAiSolution?: boolean;
      }>;
    };

    const existingProblems = await prisma.problem.findMany({ select: { id: true } });
    const validProblemIds = new Set(existingProblems.map((p) => p.id));

    const existingSubmissions = await prisma.submission.findMany({
      where: { userId },
      select: { problemId: true, verdict: true, submittedAt: true, code: true },
    });
    const submissionSignatures = new Set(
      existingSubmissions.map(
        (s) => `${s.problemId}|${s.verdict}|${s.submittedAt.toISOString()}|${s.code}`
      )
    );

    let submissionsRestored = 0;
    let draftsRestored = 0;
    let timersRestored = 0;
    let savedProblemsRestored = 0;

    await prisma.$transaction(async (tx) => {
      if (dump.user) {
        const updateUser: Record<string, string | null> = {};
        if (typeof dump.user.displayName === 'string' && dump.user.displayName.trim()) {
          updateUser.displayName = dump.user.displayName.trim().slice(0, 50);
        }
        if (
          typeof dump.user.themePreference === 'string' &&
          ['dark', 'light', 'leetcode', 'vscode', 'tokyo', 'monokai'].includes(dump.user.themePreference)
        ) {
          updateUser.themePreference = dump.user.themePreference;
        }
        if (typeof dump.user.timezone === 'string' && dump.user.timezone.trim()) {
          updateUser.timezone = dump.user.timezone.trim();
        }
        if (typeof dump.user.avatarUrl === 'string' && isAllowedAvatarUrl(dump.user.avatarUrl)) {
          updateUser.avatarUrl = dump.user.avatarUrl;
        }
        if (Object.keys(updateUser).length > 0) {
          await tx.user.update({ where: { id: userId }, data: updateUser });
        }
      }

      if (Array.isArray(dump.submissions)) {
        for (const sub of dump.submissions) {
          const pid = Number(sub?.problemId);
          if (!validProblemIds.has(pid) || typeof sub.code !== 'string' || typeof sub.verdict !== 'string') {
            continue;
          }
          const submittedAtDate = sub.submittedAt ? new Date(sub.submittedAt) : new Date();
          const safeDate = Number.isNaN(submittedAtDate.getTime()) ? new Date() : submittedAtDate;
          const sig = `${pid}|${sub.verdict}|${safeDate.toISOString()}|${sub.code}`;
          if (submissionSignatures.has(sig)) continue;
          submissionSignatures.add(sig);

          await tx.submission.create({
            data: {
              problemId: pid,
              userId,
              language: sub.language === 'sql' ? 'sql' : 'cpp17',
              code: sub.code,
              verdict: sub.verdict,
              runtimeMs: typeof sub.runtimeMs === 'number' ? sub.runtimeMs : null,
              memoryKb: typeof sub.memoryKb === 'number' ? sub.memoryKb : null,
              submittedAt: safeDate,
            },
          });
          submissionsRestored++;
        }
      }

      if (Array.isArray(dump.drafts)) {
        for (const draft of dump.drafts) {
          const pid = Number(draft?.problemId);
          if (!validProblemIds.has(pid) || typeof draft.code !== 'string') continue;
          await tx.problemDraft.upsert({
            where: { problemId_userId: { problemId: pid, userId } },
            update: { code: draft.code },
            create: { problemId: pid, userId, code: draft.code },
          });
          draftsRestored++;
        }
      }

      if (Array.isArray(dump.timers)) {
        for (const timer of dump.timers) {
          const pid = Number(timer?.problemId);
          const secs = Math.max(0, Math.floor(Number(timer?.activeSeconds) || 0));
          if (!validProblemIds.has(pid)) continue;
          const existing = await tx.problemActiveTimer.findUnique({
            where: { problemId_userId: { problemId: pid, userId } },
          });
          await tx.problemActiveTimer.upsert({
            where: { problemId_userId: { problemId: pid, userId } },
            update: { activeSeconds: Math.max(existing?.activeSeconds || 0, secs) },
            create: { problemId: pid, userId, activeSeconds: secs },
          });
          timersRestored++;
        }
      }

      if (Array.isArray(dump.savedProblems)) {
        for (const sp of dump.savedProblems) {
          const pid = Number(sp?.id);
          if (!validProblemIds.has(pid)) continue;
          const updateState: Record<string, boolean | string | null> = {};
          if (typeof sp.isBookmark === 'boolean') updateState.isBookmark = sp.isBookmark;
          if (sp.userNotes !== undefined) updateState.userNotes = sp.userNotes;
          if (typeof sp.solvedWithAiHelp === 'boolean') updateState.solvedWithAiHelp = sp.solvedWithAiHelp;
          if (typeof sp.unlockedAiSolution === 'boolean') updateState.unlockedAiSolution = sp.unlockedAiSolution;
          if (Object.keys(updateState).length > 0) {
            await tx.userProblemState.upsert({
              where: { problemId_userId: { problemId: pid, userId } },
              update: updateState,
              create: {
                problemId: pid,
                userId,
                isBookmark: Boolean(sp.isBookmark),
                userNotes: sp.userNotes ?? null,
                solvedWithAiHelp: Boolean(sp.solvedWithAiHelp),
                unlockedAiSolution: Boolean(sp.unlockedAiSolution),
              },
            });
            savedProblemsRestored++;
          }
        }
      }
    });

    await checkpointWal();

    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
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

    Logger.info('UserService', `Imported backup for user ${userId}`, {
      submissionsRestored,
      draftsRestored,
      timersRestored,
      savedProblemsRestored,
    });

    return {
      user: updatedUser,
      restored: {
        submissionsRestored,
        draftsRestored,
        timersRestored,
        savedProblemsRestored,
      },
    };
  }
}

