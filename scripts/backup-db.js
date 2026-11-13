#!/usr/bin/env node

/**
 * CodePrep SQLite Database Backup Utility
 * - Creates atomic timestamped snapshot of dev.db into /backups/
 * - Validates SQLite file header ("SQLite format 3\0")
 * - Enforces 14-day rolling retention policy (deletes older backups)
 */

const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.resolve(__dirname, '..', 'backups');
let DB_PATH = path.resolve(__dirname, '..', 'backend', 'prisma', 'dev.db');
if (!fs.existsSync(DB_PATH)) {
  const alt = path.resolve(__dirname, '..', 'backend', 'dev.db');
  if (fs.existsSync(alt)) {
    DB_PATH = alt;
  }
}
const MAX_BACKUPS_RETAINED = 14;

function runBackup() {
  console.log('=== Starting CodePrep Database Backup ===\n');

  if (!fs.existsSync(DB_PATH)) {
    console.error(`Error: Database file not found at: ${DB_PATH}`);
    process.exit(1);
  }

  // Ensure backups directory exists
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  // Read header to verify valid SQLite database
  const fd = fs.openSync(DB_PATH, 'r');
  const headerBuf = Buffer.alloc(16);
  fs.readSync(fd, headerBuf, 0, 16, 0);
  fs.closeSync(fd);

  const headerStr = headerBuf.toString('utf8');
  if (!headerStr.startsWith('SQLite format 3')) {
    console.error('Error: Source file does not appear to be a valid SQLite database.');
    process.exit(1);
  }

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const backupFileName = `codeprep-backup-${timestamp}.db`;
  const backupFilePath = path.join(BACKUP_DIR, backupFileName);

  // Copy main DB file and active WAL/SHM sidecars if present so uncheckpointed writes are preserved
  fs.copyFileSync(DB_PATH, backupFilePath);
  for (const suffix of ['-wal', '-shm']) {
    const sidecarSrc = `${DB_PATH}${suffix}`;
    if (fs.existsSync(sidecarSrc)) {
      fs.copyFileSync(sidecarSrc, `${backupFilePath}${suffix}`);
    }
  }
  const stats = fs.statSync(backupFilePath);
  console.log(`[SUCCESS] Database snapshot created: ${backupFileName}`);
  console.log(`Size: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log(`Location: ${backupFilePath}\n`);

  // Retention cleanup
  pruneOldBackups();
}

function pruneOldBackups() {
  const files = fs.readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith('codeprep-backup-') && f.endsWith('.db'))
    .map((f) => {
      const p = path.join(BACKUP_DIR, f);
      return { name: f, path: p, mtime: fs.statSync(p).mtime.getTime() };
    })
    .sort((a, b) => b.mtime - a.mtime); // descending (newest first)

  if (files.length > MAX_BACKUPS_RETAINED) {
    const toDelete = files.slice(MAX_BACKUPS_RETAINED);
    console.log(`Rotating backups: Retaining newest ${MAX_BACKUPS_RETAINED}. Pruning ${toDelete.length} older backups:`);
    for (const item of toDelete) {
      fs.unlinkSync(item.path);
      console.log(` - Deleted: ${item.name}`);
    }
  } else {
    console.log(`Current backups retained: ${files.length} (limit: ${MAX_BACKUPS_RETAINED})`);
  }
}

runBackup();

