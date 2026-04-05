const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const DB_DIR = path.join(__dirname, "../../data");
const DB_PATH = path.join(DB_DIR, "finance.db");

const dbPath = process.env.NODE_ENV === "test" ? ":memory:" : DB_PATH;

if (process.env.NODE_ENV !== "test" && !fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT    NOT NULL,
    email        TEXT    NOT NULL UNIQUE,
    password_hash TEXT   NOT NULL,
    role         TEXT    NOT NULL DEFAULT 'viewer'
                         CHECK(role IN ('viewer', 'analyst', 'admin')),
    is_active    INTEGER NOT NULL DEFAULT 1
                         CHECK(is_active IN (0, 1)),
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    amount       REAL    NOT NULL CHECK(amount > 0),
    type         TEXT    NOT NULL CHECK(type IN ('income', 'expense')),
    category     TEXT    NOT NULL,
    date         TEXT    NOT NULL,
    notes        TEXT,
    created_by   INTEGER NOT NULL REFERENCES users(id),
    is_deleted   INTEGER NOT NULL DEFAULT 0 CHECK(is_deleted IN (0, 1)),
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_transactions_date     ON transactions(date);
  CREATE INDEX IF NOT EXISTS idx_transactions_type     ON transactions(type);
  CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
  CREATE INDEX IF NOT EXISTS idx_transactions_deleted  ON transactions(is_deleted);
`);

module.exports = db;
