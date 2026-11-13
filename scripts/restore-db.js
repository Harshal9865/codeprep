#!/usr/bin/env node

/**
 * CodePrep SQLite Database Restore Utility
 * Restores dev.db from a specified backup file after verifying SQLite integrity.
 * Usage: node scripts/restore-db.js [path-to-backup.db]
 */

const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.resolve(__dirname, '..', 'backups');
let DB_PATH = path.resolve(__dirname, '..', 'backend', 'prisma', 'dev.db');
if (!fs.existsSync(DB_PATH) && fs.existsSync(path.resolve(__dirname, '..', 'backend', 'dev.db'))) {
  DB_PATH = path.resolve(__dirname, '..', 'backend', 'dev.db');
}

function runRestore() {
  console.log('=== Starting CodePrep Database Restore ===\n');

  let targetBackup = process.argv[2];

  if (!targetBackup) {
    // If not supplied, pick the latest backup in backups/
    if (!fs.existsSync(BACKUP_DIR)) {
      console.error('Error: No backups directory found.');
      process.exit(1);
    }

    const backups = fs.readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith('codeprep-backup-') && f.endsWith('.db'))
      .map((f) => ({ name: f, path: path.join(BACKUP_DIR, f), mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime() }))
      .sort((a, b) => b.mtime - a.mtime);

    if (backups.length === 0) {
      console.error('Error: No backup files found in backups/ directory.');
      process.exit(1);
    }

    targetBackup = backups[0].path;
    console.log(`No backup path specified. Using latest detected backup: ${backups[0].name}`);
  }

  const resolvedTarget = path.resolve(targetBackup);
  if (!fs.existsSync(resolvedTarget)) {
    console.error(`Error: Backup file not found at: ${resolvedTarget}`);
    process.exit(1);
  }

  // Validate SQLite header
  const fd = fs.openSync(resolvedTarget, 'r');
  const headerBuf = Buffer.alloc(16);
  fs.readSync(fd, headerBuf, 0, 16, 0);
  fs.closeSync(fd);

  if (!headerBuf.toString('utf8').startsWith('SQLite format 3')) {
    console.error('Error: Specified file is corrupted or not a valid SQLite database.');
    process.exit(1);
  }

  // Before overwriting, create a safety copy of current dev.db if it exists
  if (fs.existsSync(DB_PATH)) {
    const safetyCopy = `${DB_PATH}.pre-restore-${Date.now()}`;
    fs.copyFileSync(DB_PATH, safetyCopy);
    console.log(`Created pre-restore safety copy: ${path.basename(safetyCopy)}`);
  }

  // Restore
  fs.copyFileSync(resolvedTarget, DB_PATH);
  console.log(`[SUCCESS] Database restored from ${path.basename(resolvedTarget)} to ${DB_PATH}`);
}

runRestore();

