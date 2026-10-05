import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "data");
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "neuroquest.sqlite"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  team_name TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  icon TEXT NOT NULL,
  skill TEXT NOT NULL,
  description TEXT NOT NULL,
  instructions TEXT NOT NULL,
  rounds INTEGER NOT NULL,
  round_seconds INTEGER NOT NULL,
  scoring_note TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id TEXT NOT NULL REFERENCES activities(id),
  round_no INTEGER NOT NULL,
  type TEXT NOT NULL,
  prompt TEXT NOT NULL,
  description TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  answer_json TEXT NOT NULL,
  UNIQUE(activity_id, round_no)
);

CREATE TABLE IF NOT EXISTS attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  activity_id TEXT NOT NULL REFERENCES activities(id),
  current_round INTEGER NOT NULL DEFAULT 1,
  round_limit INTEGER,
  score INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  round_started_at TEXT NOT NULL,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  attempt_id INTEGER NOT NULL REFERENCES attempts(id),
  question_id INTEGER NOT NULL REFERENCES questions(id),
  round_no INTEGER NOT NULL,
  answer_json TEXT NOT NULL,
  is_correct INTEGER NOT NULL,
  points INTEGER NOT NULL,
  elapsed_ms INTEGER NOT NULL,
  answered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_questions_activity ON questions(activity_id, round_no);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON attempts(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_responses_attempt ON responses(attempt_id, round_no);
`);

// Upgrade databases created by earlier project builds without deleting student records.
const attemptColumns = db.prepare("PRAGMA table_info(attempts)").all().map(column => column.name);
if (!attemptColumns.includes("round_limit")) db.exec("ALTER TABLE attempts ADD COLUMN round_limit INTEGER");
const userColumns = db.prepare("PRAGMA table_info(users)").all().map(column => column.name);
if (!userColumns.includes("team_name")) db.exec("ALTER TABLE users ADD COLUMN team_name TEXT");
db.exec(`DROP INDEX IF EXISTS idx_users_team_name;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_team_name ON users(lower(team_name)) WHERE team_name IS NOT NULL`);

export default db;
