#!/usr/bin/env node

/**
 * Database Backup Script for DigitalOcean Deployment
 *
 * This script creates and manages backups of the SQLite database.
 * It runs automatically before deployments to prevent data loss.
 *
 * Usage:
 *   node scripts/backup-db.js              - Create a backup
 *   node scripts/backup-db.js --restore    - Restore from latest backup
 *   node scripts/backup-db.js --list       - List all backups
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Configuration
const CONFIG = {
  // Local database paths
  localDbPath: path.join(ROOT_DIR, 'dev.sqlite'),
  localPrismaDbPath: path.join(ROOT_DIR, 'prisma', 'dev.sqlite'),

  // Production database path (on DigitalOcean)
  prodDbPath: '/data/prod.sqlite',

  // Backup directory
  backupDir: path.join(ROOT_DIR, 'backups'),

  // Maximum number of backups to keep
  maxBackups: 10,

  // Backup file prefix
  backupPrefix: 'db-backup'
};

// Ensure backup directory exists
function ensureBackupDir() {
  if (!fs.existsSync(CONFIG.backupDir)) {
    fs.mkdirSync(CONFIG.backupDir, { recursive: true });
    console.log(`✅ Created backup directory: ${CONFIG.backupDir}`);
  }
}

// Get timestamp for backup filename
function getTimestamp() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-');
}

// Get the database path based on environment
function getDatabasePath() {
  // Check if running in production (DigitalOcean)
  if (process.env.NODE_ENV === 'production' || fs.existsSync(CONFIG.prodDbPath)) {
    if (fs.existsSync(CONFIG.prodDbPath)) {
      return CONFIG.prodDbPath;
    }
  }

  // Check local paths
  if (fs.existsSync(CONFIG.localDbPath)) {
    return CONFIG.localDbPath;
  }

  if (fs.existsSync(CONFIG.localPrismaDbPath)) {
    return CONFIG.localPrismaDbPath;
  }

  return null;
}

// Create a backup
function createBackup() {
  ensureBackupDir();

  const dbPath = getDatabasePath();
  if (!dbPath) {
    console.error('❌ No database file found to backup');
    process.exit(1);
  }

  const timestamp = getTimestamp();
  const env = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';
  const backupFileName = `${CONFIG.backupPrefix}-${env}-${timestamp}.sqlite`;
  const backupPath = path.join(CONFIG.backupDir, backupFileName);

  try {
    // Copy the database file
    fs.copyFileSync(dbPath, backupPath);
    console.log(`✅ Backup created: ${backupFileName}`);
    console.log(`   Source: ${dbPath}`);
    console.log(`   Destination: ${backupPath}`);

    // Also create a "latest" symlink/copy for easy restoration
    const latestPath = path.join(CONFIG.backupDir, `${CONFIG.backupPrefix}-${env}-latest.sqlite`);
    if (fs.existsSync(latestPath)) {
      fs.unlinkSync(latestPath);
    }
    fs.copyFileSync(backupPath, latestPath);
    console.log(`✅ Latest backup updated: ${CONFIG.backupPrefix}-${env}-latest.sqlite`);

    // Clean up old backups
    cleanupOldBackups(env);

    return backupPath;
  } catch (error) {
    console.error(`❌ Failed to create backup: ${error.message}`);
    process.exit(1);
  }
}

// Clean up old backups, keeping only the most recent ones
function cleanupOldBackups(env) {
  const files = fs.readdirSync(CONFIG.backupDir)
    .filter(f => f.startsWith(`${CONFIG.backupPrefix}-${env}-`) && !f.includes('latest'))
    .sort()
    .reverse();

  if (files.length > CONFIG.maxBackups) {
    const toDelete = files.slice(CONFIG.maxBackups);
    toDelete.forEach(file => {
      const filePath = path.join(CONFIG.backupDir, file);
      fs.unlinkSync(filePath);
      console.log(`🗑️  Deleted old backup: ${file}`);
    });
  }
}

// Restore from a backup
function restoreBackup(backupFile = null) {
  const env = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';

  // If no specific backup file, use the latest
  if (!backupFile) {
    backupFile = `${CONFIG.backupPrefix}-${env}-latest.sqlite`;
  }

  const backupPath = path.join(CONFIG.backupDir, backupFile);

  if (!fs.existsSync(backupPath)) {
    console.error(`❌ Backup file not found: ${backupPath}`);
    listBackups();
    process.exit(1);
  }

  // Determine target path
  let targetPath;
  if (process.env.NODE_ENV === 'production') {
    targetPath = CONFIG.prodDbPath;
  } else {
    targetPath = CONFIG.localDbPath;
  }

  try {
    // Create a backup of current database before restoring
    if (fs.existsSync(targetPath)) {
      const preRestoreBackup = path.join(CONFIG.backupDir, `pre-restore-${getTimestamp()}.sqlite`);
      fs.copyFileSync(targetPath, preRestoreBackup);
      console.log(`✅ Pre-restore backup created: ${preRestoreBackup}`);
    }

    // Restore the backup
    fs.copyFileSync(backupPath, targetPath);
    console.log(`✅ Database restored from: ${backupFile}`);
    console.log(`   Target: ${targetPath}`);
  } catch (error) {
    console.error(`❌ Failed to restore backup: ${error.message}`);
    process.exit(1);
  }
}

// List all available backups
function listBackups() {
  ensureBackupDir();

  const files = fs.readdirSync(CONFIG.backupDir)
    .filter(f => f.endsWith('.sqlite'))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.log('📭 No backups found');
    return;
  }

  console.log('\n📦 Available backups:\n');
  files.forEach((file, index) => {
    const filePath = path.join(CONFIG.backupDir, file);
    const stats = fs.statSync(filePath);
    const size = (stats.size / 1024).toFixed(2);
    const modified = stats.mtime.toISOString();

    const isLatest = file.includes('latest');
    const marker = isLatest ? '⭐' : '  ';

    console.log(`${marker} ${index + 1}. ${file}`);
    console.log(`      Size: ${size} KB | Modified: ${modified}`);
  });
  console.log('');
}

// Main execution
const args = process.argv.slice(2);

if (args.includes('--restore')) {
  const backupFileIndex = args.indexOf('--restore') + 1;
  const backupFile = args[backupFileIndex] && !args[backupFileIndex].startsWith('--')
    ? args[backupFileIndex]
    : null;
  restoreBackup(backupFile);
} else if (args.includes('--list')) {
  listBackups();
} else {
  createBackup();
}
