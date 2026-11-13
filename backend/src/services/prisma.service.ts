import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { Logger } from '../utils/logger';

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

const PRISMA_SCHEMA_DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL DEFAULT 'Developer',
    "avatarUrl" TEXT,
    "themePreference" TEXT NOT NULL DEFAULT 'dark',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" DATETIME
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");`,
  `CREATE TABLE IF NOT EXISTS "RefreshToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");`,
  `CREATE INDEX IF NOT EXISTS "RefreshToken_userId_idx" ON "RefreshToken"("userId");`,
  `CREATE TABLE IF NOT EXISTS "Problem" (
    "id" INTEGER NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "constraints" TEXT NOT NULL,
    "examplesJson" TEXT NOT NULL,
    "functionSignature" TEXT NOT NULL,
    "cppHarnessTemplate" TEXT,
    "isBookmark" BOOLEAN NOT NULL DEFAULT false,
    "userNotes" TEXT,
    "unlockedAiSolution" BOOLEAN NOT NULL DEFAULT false,
    "solvedWithAiHelp" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Problem_slug_key" ON "Problem"("slug");`,
  `CREATE INDEX IF NOT EXISTS "Problem_category_topic_idx" ON "Problem"("category", "topic");`,
  `CREATE INDEX IF NOT EXISTS "Problem_difficulty_idx" ON "Problem"("difficulty");`,
  `CREATE TABLE IF NOT EXISTS "ProblemDraft" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "problemId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProblemDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProblemDraft_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ProblemDraft_problemId_userId_key" ON "ProblemDraft"("problemId", "userId");`,
  `CREATE TABLE IF NOT EXISTS "ProblemActiveTimer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "problemId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "activeSeconds" INTEGER NOT NULL DEFAULT 0,
    "lastHeartbeat" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPaused" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "ProblemActiveTimer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProblemActiveTimer_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ProblemActiveTimer_problemId_userId_key" ON "ProblemActiveTimer"("problemId", "userId");`,
  `CREATE TABLE IF NOT EXISTS "Submission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "problemId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "runtimeMs" REAL,
    "memoryKb" REAL,
    "failedTestCase" TEXT,
    "stdout" TEXT,
    "stderr" TEXT,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Submission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Submission_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );`,
  `CREATE INDEX IF NOT EXISTS "Submission_problemId_verdict_idx" ON "Submission"("problemId", "verdict");`,
  `CREATE INDEX IF NOT EXISTS "Submission_userId_submittedAt_idx" ON "Submission"("userId", "submittedAt");`,
  `CREATE TABLE IF NOT EXISTS "AiLesson" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "problemId" INTEGER NOT NULL,
    "techniqueLesson" TEXT NOT NULL,
    "visualTraceJson" TEXT NOT NULL,
    "workedExamples" TEXT NOT NULL,
    "approachProgression" TEXT NOT NULL,
    "verifiedSolution" TEXT NOT NULL,
    "similarProblemsJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiLesson_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "AiLesson_problemId_key" ON "AiLesson"("problemId");`,
  `CREATE TABLE IF NOT EXISTS "UserBadge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "badgeKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unlockedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "UserBadge_userId_badgeKey_key" ON "UserBadge"("userId", "badgeKey");`,
  `CREATE INDEX IF NOT EXISTS "UserBadge_userId_idx" ON "UserBadge"("userId");`,
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getSqliteDbPaths(): string[] {
  return [
    path.resolve(__dirname, '../../prisma/dev.db'),
    path.resolve(process.cwd(), 'prisma', 'dev.db'),
    path.resolve(process.cwd(), 'dev.db'),
  ];
}

function createClient(dbUrl?: string): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    ...(dbUrl ? { datasources: { db: { url: dbUrl } } } : {}),
  });
}

let activeClient: PrismaClient = global.prismaGlobal || createClient();
if (process.env.NODE_ENV !== 'production') {
  global.prismaGlobal = activeClient;
}

// Proxy ensures any imported `prisma` reference always points to the active healthy client
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const value = (activeClient as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === 'function') {
      return value.bind(activeClient);
    }
    return value;
  },
});

async function quarantineCorruptedDatabases(): Promise<boolean> {
  const timestamp = Date.now();
  const seen = new Set<string>();
  let allCleared = true;

  for (const dbPath of getSqliteDbPaths()) {
    const resolved = path.resolve(dbPath);
    if (seen.has(resolved)) continue;
    seen.add(resolved);

    const dir = path.dirname(resolved);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Remove orphaned WAL/SHM/journal sidecars first
    for (const suffix of ['-wal', '-shm', '-journal']) {
      const sidecar = `${resolved}${suffix}`;
      if (fs.existsSync(sidecar)) {
        try {
          fs.unlinkSync(sidecar);
        } catch {}
      }
    }

    if (fs.existsSync(resolved)) {
      const backupName = `${resolved}.corrupt.${timestamp}`;
      let removed = false;
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          fs.renameSync(resolved, backupName);
          Logger.warn('PrismaService', `Quarantined malformed SQLite file to ${backupName}`);
          removed = true;
          break;
        } catch {
          try {
            fs.unlinkSync(resolved);
            Logger.warn('PrismaService', `Removed malformed SQLite file ${resolved}`);
            removed = true;
            break;
          } catch (err) {
            if (attempt < 3) {
              await sleep(250);
            } else {
              Logger.error('PrismaService', `Database file locked by Windows at ${resolved}`, err);
            }
          }
        }
      }
      if (!removed) {
        allCleared = false;
      }
    }
  }

  return allCleared;
}

async function applySchemaDdl(client: PrismaClient): Promise<void> {
  try {
    await client.$executeRawUnsafe('PRAGMA foreign_keys = ON;');
    await client.$queryRawUnsafe('PRAGMA busy_timeout = 5000;');
  } catch {}
  for (const stmt of PRISMA_SCHEMA_DDL) {
    await client.$executeRawUnsafe(stmt);
  }
}

async function verifyDatabaseHealth(client: PrismaClient): Promise<boolean> {
  try {
    const check = await client.$queryRawUnsafe<Array<{ quick_check?: string }>>('PRAGMA quick_check;');
    const status = check?.[0]?.quick_check;
    if (status && status.toLowerCase() !== 'ok') {
      Logger.warn('PrismaService', `SQLite quick_check reported: ${status}`);
      return false;
    }

    await client.user.count();
    await client.problem.count();
    await client.refreshToken.count();
    await client.submission.count();
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    Logger.warn('PrismaService', `SQLite health check failed: ${msg}`);
    return false;
  }
}

export async function connectPrisma(): Promise<void> {
  try {
    await activeClient.$connect();

    const isHealthy = await verifyDatabaseHealth(activeClient);
    if (!isHealthy) {
      Logger.warn('PrismaService', 'SQLite database is malformed or missing tables. Rebuilding clean database...');
      await activeClient.$disconnect();
      await sleep(250);

      const cleared = await quarantineCorruptedDatabases();
      if (!cleared) {
        // Windows still holds an OS lock on dev.db; fail over to a clean local SQLite file
        const fallbackPath = path.resolve(__dirname, '../../prisma/codeprep-local.db');
        const fallbackUrl = `file:${fallbackPath.replace(/\\/g, '/')}`;
        Logger.warn('PrismaService', `Switching to clean fallback SQLite database: ${fallbackPath}`);
        activeClient = createClient(fallbackUrl);
        if (process.env.NODE_ENV !== 'production') {
          global.prismaGlobal = activeClient;
        }
      }

      await activeClient.$connect();
      await applySchemaDdl(activeClient);

      const postCheck = await verifyDatabaseHealth(activeClient);
      if (!postCheck) {
        const emergencyPath = path.resolve(__dirname, `../../prisma/codeprep-${Date.now()}.db`);
        const emergencyUrl = `file:${emergencyPath.replace(/\\/g, '/')}`;
        await activeClient.$disconnect();
        activeClient = createClient(emergencyUrl);
        if (process.env.NODE_ENV !== 'production') {
          global.prismaGlobal = activeClient;
        }
        await activeClient.$connect();
        await applySchemaDdl(activeClient);
      }

      Logger.info('PrismaService', 'Rebuilt clean SQLite schema successfully.');
    } else {
      await applySchemaDdl(activeClient);
    }

    Logger.info('PrismaService', 'Connected to SQLite database successfully.');
  } catch (error) {
    Logger.error('PrismaService', 'Failed to connect to SQLite database', error);
    throw error;
  }
}

export async function checkpointWal(): Promise<void> {
  try {
    await activeClient.$queryRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE);');
  } catch {
    // Ignore if DB not in WAL mode or already closed
  }
}

export async function disconnectPrisma(): Promise<void> {
  await checkpointWal();
  await activeClient.$disconnect();
  Logger.info('PrismaService', 'Disconnected from SQLite database.');
}
