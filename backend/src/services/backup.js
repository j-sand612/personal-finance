const fs = require('fs');
const os = require('os');
const path = require('path');
const db = require('../db/database');

const DEFAULT_BACKUP_DIR = path.join(os.homedir(), 'Desktop');

// Snapshots via VACUUM INTO rather than copying the file directly — the live DB is in WAL mode,
// so a plain file copy could miss recent commits still sitting in the -wal file.
function createBackup() {
  const backupDir = process.env.BACKUP_DIR ? path.resolve(process.env.BACKUP_DIR) : DEFAULT_BACKUP_DIR;
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const finalPath = path.join(backupDir, `finance-backup-${dateStr}.db`);
  const tmpPath = path.join(os.tmpdir(), `finance-backup-${Date.now()}.db`);

  // VACUUM INTO refuses to overwrite an existing file, so snapshot to a temp path
  // and copy over the final destination (which may already have today's backup).
  db.exec(`VACUUM INTO '${tmpPath.replace(/'/g, "''")}'`);
  fs.copyFileSync(tmpPath, finalPath);
  fs.unlinkSync(tmpPath);

  return finalPath;
}

module.exports = { createBackup };
