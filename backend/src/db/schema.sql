PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS months (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    year       INTEGER NOT NULL,
    month      INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    notes      TEXT,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE (year, month)
);

CREATE TABLE IF NOT EXISTS income (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    month_id    INTEGER NOT NULL REFERENCES months(id) ON DELETE CASCADE,
    type        TEXT    NOT NULL CHECK (type IN ('paycheck', 'stock_bonus', 'performance_bonus', 'misc')),
    amount      REAL    NOT NULL,
    description TEXT,
    date        TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_income_month ON income(month_id);

CREATE TABLE IF NOT EXISTS expenses (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    month_id   INTEGER NOT NULL REFERENCES months(id) ON DELETE CASCADE,
    section    TEXT    NOT NULL CHECK (section IN ('wants', 'needs', 'savings')),
    category   TEXT    NOT NULL,
    detail     TEXT,
    amount     REAL    NOT NULL,
    date       TEXT,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_expenses_month   ON expenses(month_id);
CREATE INDEX IF NOT EXISTS idx_expenses_section ON expenses(section);

CREATE TABLE IF NOT EXISTS templates (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    section    TEXT    NOT NULL CHECK (section IN ('wants', 'needs', 'savings')),
    category   TEXT    NOT NULL,
    detail     TEXT,
    amount     REAL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS income_templates (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    type        TEXT    NOT NULL CHECK (type IN ('paycheck', 'stock_bonus', 'performance_bonus', 'misc')),
    description TEXT,
    amount      REAL,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
