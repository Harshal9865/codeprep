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
  `CREATE TABLE IF NOT EXISTS "UserProblemState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "problemId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "isBookmark" BOOLEAN NOT NULL DEFAULT false,
    "userNotes" TEXT,
    "unlockedAiSolution" BOOLEAN NOT NULL DEFAULT false,
    "solvedWithAiHelp" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserProblemState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserProblemState_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "UserProblemState_problemId_userId_key" ON "UserProblemState"("problemId", "userId");`,
  `CREATE INDEX IF NOT EXISTS "UserProblemState_userId_isBookmark_idx" ON "UserProblemState"("userId", "isBookmark");`,
];

function isPostgresUrl(dbUrl = process.env.DATABASE_URL || ''): boolean {
  const normalized = dbUrl.trim().toLowerCase();
  return normalized.startsWith('postgres://') || normalized.startsWith('postgresql://');
}

const POSTGRES_SCHEMA_DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL DEFAULT 'Developer',
    "avatarUrl" TEXT,
    "themePreference" TEXT NOT NULL DEFAULT 'dark',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3)
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");`,
  `CREATE TABLE IF NOT EXISTS "RefreshToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Problem_slug_key" ON "Problem"("slug");`,
  `CREATE INDEX IF NOT EXISTS "Problem_category_topic_idx" ON "Problem"("category", "topic");`,
  `CREATE INDEX IF NOT EXISTS "Problem_difficulty_idx" ON "Problem"("difficulty");`,
  `CREATE TABLE IF NOT EXISTS "ProblemDraft" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "problemId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProblemDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProblemDraft_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ProblemDraft_problemId_userId_key" ON "ProblemDraft"("problemId", "userId");`,
  `CREATE TABLE IF NOT EXISTS "ProblemActiveTimer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "problemId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "activeSeconds" INTEGER NOT NULL DEFAULT 0,
    "lastHeartbeat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
    "runtimeMs" DOUBLE PRECISION,
    "memoryKb" DOUBLE PRECISION,
    "failedTestCase" TEXT,
    "stdout" TEXT,
    "stderr" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "UserBadge_userId_badgeKey_key" ON "UserBadge"("userId", "badgeKey");`,
  `CREATE INDEX IF NOT EXISTS "UserBadge_userId_idx" ON "UserBadge"("userId");`,
  `CREATE TABLE IF NOT EXISTS "UserProblemState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "problemId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "isBookmark" BOOLEAN NOT NULL DEFAULT false,
    "userNotes" TEXT,
    "unlockedAiSolution" BOOLEAN NOT NULL DEFAULT false,
    "solvedWithAiHelp" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserProblemState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserProblemState_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "UserProblemState_problemId_userId_key" ON "UserProblemState"("problemId", "userId");`,
  `CREATE INDEX IF NOT EXISTS "UserProblemState_userId_isBookmark_idx" ON "UserProblemState"("userId", "isBookmark");`,
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveConfiguredDbPath(): string | null {
  const dbUrl = (process.env.DATABASE_URL || '').trim();
  if (!dbUrl.startsWith('file:')) return null;
  let rawPath = dbUrl.slice(5).split('?')[0];
  if (!rawPath || rawPath === ':memory:') return null;
  if (rawPath.startsWith('///')) {
    rawPath = rawPath.slice(2);
  }
  return path.isAbsolute(rawPath)
    ? path.normalize(rawPath)
    : path.resolve(process.cwd(), 'prisma', rawPath);
}

function ensureConfiguredDbDirectory(): void {
  const configured = resolveConfiguredDbPath();
  if (!configured) return;
  const dir = path.dirname(configured);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getSqliteDbPaths(): string[] {
  const configured = resolveConfiguredDbPath();
  return [
    ...(configured ? [configured] : []),
    path.resolve(__dirname, '../../prisma/dev.db'),
    path.resolve(process.cwd(), 'prisma', 'dev.db'),
    path.resolve(process.cwd(), 'dev.db'),
  ];
}

function loadPgPrismaClientConstructor(): typeof PrismaClient {
  const candidates = [
    '.prisma/client-pg',
    path.resolve(__dirname, '../../node_modules/.prisma/client-pg'),
  ];
  for (const candidate of candidates) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require(candidate) as { PrismaClient: typeof PrismaClient };
      if (mod?.PrismaClient) return mod.PrismaClient;
    } catch {
      // Try next candidate
    }
  }
  throw new Error(
    'PostgreSQL Prisma client (.prisma/client-pg) is not generated. Run: npx prisma generate --schema=prisma/schema.postgres.prisma'
  );
}

function createClient(dbUrl?: string): PrismaClient {
  const targetUrl = dbUrl || process.env.DATABASE_URL || '';
  if (isPostgresUrl(targetUrl)) {
    const PgClient = loadPgPrismaClientConstructor();
    return new PgClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
      ...(dbUrl ? { datasources: { db: { url: dbUrl } } } : {}),
    });
  }

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

function isCorruptionError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes('malformed') ||
    msg.includes('corrupt') ||
    msg.includes('not a database') ||
    msg.includes('sqlite_corrupt') ||
    msg.includes('sqlite_notadb')
  );
}

async function applySqlitePragmas(client: PrismaClient): Promise<void> {
  try {
    await client.$executeRawUnsafe('PRAGMA foreign_keys = ON;');
    await client.$queryRawUnsafe('PRAGMA busy_timeout = 5000;');
    await client.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
    await client.$executeRawUnsafe('PRAGMA synchronous = NORMAL;');
  } catch {}
}

async function applySchemaDdl(client: PrismaClient): Promise<void> {
  await applySqlitePragmas(client);
  for (const stmt of PRISMA_SCHEMA_DDL) {
    await client.$executeRawUnsafe(stmt);
  }
}

async function checkIntegrityOk(client: PrismaClient): Promise<{ ok: boolean; corrupted: boolean }> {
  try {
    const check = await client.$queryRawUnsafe<Array<{ quick_check?: string }>>('PRAGMA quick_check;');
    const status = check?.[0]?.quick_check;
    if (status && status.toLowerCase() !== 'ok') {
      Logger.warn('PrismaService', `SQLite quick_check reported: ${status}`);
      return { ok: false, corrupted: true };
    }
    return { ok: true, corrupted: false };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    Logger.warn('PrismaService', `SQLite integrity check failed: ${msg}`);
    return { ok: false, corrupted: isCorruptionError(err) };
  }
}

async function verifyDatabaseHealth(client: PrismaClient): Promise<{ healthy: boolean; corrupted: boolean }> {
  const integrity = await checkIntegrityOk(client);
  if (!integrity.ok) {
    return { healthy: false, corrupted: integrity.corrupted };
  }

  try {
    await client.user.count();
    await client.problem.count();
    await client.refreshToken.count();
    await client.submission.count();
    return { healthy: true, corrupted: false };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    Logger.warn('PrismaService', `SQLite health check failed: ${msg}`);
    return { healthy: false, corrupted: isCorruptionError(err) };
  }
}

export async function connectPrisma(): Promise<void> {
  if (isPostgresUrl()) {
    try {
      await activeClient.$connect();
      for (const stmt of POSTGRES_SCHEMA_DDL) {
        await activeClient.$executeRawUnsafe(stmt);
      }
      await activeClient.user.count();
      await activeClient.problem.count();
      await activeClient.submission.count();
      Logger.info('PrismaService', 'Connected to PostgreSQL database successfully.');
      return;
    } catch (error) {
      Logger.error('PrismaService', 'Failed to connect to PostgreSQL database', error);
      throw error;
    }
  }

  try {
    ensureConfiguredDbDirectory();
    await activeClient.$connect();

    // Check file integrity BEFORE touching schema; never rebuild a healthy DB just because new tables are missing
    const preIntegrity = await checkIntegrityOk(activeClient);
    let needsRebuild = preIntegrity.corrupted;

    if (!needsRebuild) {
      try {
        await applySchemaDdl(activeClient);
        const health = await verifyDatabaseHealth(activeClient);
        if (!health.healthy) {
          needsRebuild = health.corrupted;
          if (!health.corrupted) {
            throw new Error('SQLite schema health verification failed without file corruption');
          }
        }
      } catch (err) {
        if (isCorruptionError(err)) {
          needsRebuild = true;
        } else {
          throw err;
        }
      }
    }

    if (needsRebuild) {
      Logger.warn('PrismaService', 'SQLite database file is corrupted. Quarantining and rebuilding clean database...');
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
      if (!postCheck.healthy) {
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
    }

    Logger.info('PrismaService', 'Connected to SQLite database successfully.');
  } catch (error) {
    Logger.error('PrismaService', 'Failed to connect to SQLite database', error);
    throw error;
  }
}

export async function checkpointWal(): Promise<void> {
  if (isPostgresUrl()) return;
  try {
    await activeClient.$queryRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE);');
  } catch {
    // Ignore if DB not in WAL mode or already closed
  }
}

export async function disconnectPrisma(): Promise<void> {
  await checkpointWal();
  await activeClient.$disconnect();
  Logger.info('PrismaService', `Disconnected from ${isPostgresUrl() ? 'PostgreSQL' : 'SQLite'} database.`);
}
