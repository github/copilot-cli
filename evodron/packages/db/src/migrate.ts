/**
 * EVODRON database migration runner.
 * Creates all tables if they do not exist.
 */
import Database from 'better-sqlite3';

const url = process.env['EVODRON_DB_URL'] ?? 'file:./evodron.db';
const filePath = url.startsWith('file:') ? url.slice(5) : url;

const db = new Database(filePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const migrations = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    referral_code TEXT NOT NULL UNIQUE,
    referred_by TEXT REFERENCES users(id),
    credits INTEGER NOT NULL DEFAULT 0,
    level TEXT NOT NULL DEFAULT 'bronze' CHECK(level IN ('bronze','silver','gold')),
    is_admin INTEGER NOT NULL DEFAULT 0,
    is_banned INTEGER NOT NULL DEFAULT 0,
    consent_metrics INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    started_at TEXT NOT NULL,
    ended_at TEXT,
    commands_count INTEGER NOT NULL DEFAULT 0,
    client_version TEXT,
    ip_hash TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS referrals (
    id TEXT PRIMARY KEY,
    referrer_id TEXT NOT NULL REFERENCES users(id),
    referee_id TEXT NOT NULL UNIQUE REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','rewarded','fraud')),
    activated_at TEXT,
    rewarded_at TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS rewards (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    type TEXT NOT NULL CHECK(type IN ('referral_active','referral_onboarding','milestone','manual')),
    amount INTEGER NOT NULL,
    source TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS reward_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    trigger TEXT NOT NULL,
    credits INTEGER NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    description TEXT,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS abuse_flags (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL,
    detail TEXT,
    resolved_at TEXT,
    flagged_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS ip_registry (
    id TEXT PRIMARY KEY,
    ip_hash TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id),
    seen_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS refresh_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    revoked_at TEXT
  )`,
  // Indexes
  `CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id)`,
  `CREATE INDEX IF NOT EXISTS idx_rewards_user_id ON rewards(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_abuse_flags_user ON abuse_flags(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_ip_registry_hash ON ip_registry(ip_hash)`,
  `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id)`,
  `INSERT OR IGNORE INTO reward_rules (id, name, trigger, credits, active, description, updated_at) VALUES
    ('rule-referrer', 'referral_active_referrer', 'referral_active', 100, 1, 'Credits awarded to the referrer when a referee reaches active status', datetime('now')),
    ('rule-onboarding', 'referral_onboarding_referee', 'referral_onboarding', 50, 1, 'Onboarding credits awarded to a new user who joined via referral', datetime('now')),
    ('rule-milestone-10', 'milestone_10_sessions', 'milestone_10_sessions', 25, 1, 'Bonus credits for completing 10 sessions', datetime('now'))`,
];

db.transaction(() => {
  for (const sql of migrations) {
    db.prepare(sql).run();
  }
})();

console.log('✅ EVODRON database migrated successfully');
db.close();
