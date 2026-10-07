const fs = require('fs');
const os = require('os');
const path = require('path');
const db = require('../db/database');

// Snapshots via VACUUM INTO rather than copying the file directly — the live DB is in WAL mode,
// so a plain file copy could miss recent commits still sitting in the -wal file.
// Returns a temp file path; the caller is responsible for deleting it.
function createBackup() {
  const tmpPath = path.join(os.tmpdir(), `finance-backup-${Date.now()}.db`);
  db.exec(`VACUUM INTO '${tmpPath.replace(/'/g, "''")}'`);
  return tmpPath;
}

function backupFilename() {
  const dateStr = new Date().toISOString().slice(0, 10);
  return `finance-backup-${dateStr}.db`;
}

module.exports = { createBackup, backupFilename };
