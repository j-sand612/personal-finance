const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'finance.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// Apply schema — strip PRAGMA lines since we already handled them above
const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
const schemaNoPragmas = schema
  .split('\n')
  .filter((l) => !l.trim().startsWith('PRAGMA'))
  .join('\n');
db.exec(schemaNoPragmas);

// Migrations for columns added after initial schema
try { db.exec('ALTER TABLE months ADD COLUMN notes TEXT'); } catch {}

module.exports = db;
