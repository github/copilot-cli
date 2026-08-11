-- Evodron Referral Program — Database Schema

PRAGMA foreign_keys = ON;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  email               TEXT    NOT NULL UNIQUE,
  username            TEXT    NOT NULL,
  password_hash       TEXT    NOT NULL,
  referral_code       TEXT    NOT NULL UNIQUE,
  referred_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  is_active           INTEGER NOT NULL DEFAULT 0,  -- 1 once the user has completed first meaningful use
  created_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Referrals table
-- One row per referrer/referee pair; referee_id is UNIQUE (one referrer per user)
CREATE TABLE IF NOT EXISTS referrals (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  referrer_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referee_id   INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  status       TEXT    NOT NULL DEFAULT 'pending'
                CHECK(status IN ('pending', 'active', 'rewarded')),
  referral_depth INTEGER NOT NULL DEFAULT 1,  -- reserved for multi-level support
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  activated_at TEXT
);

-- Rewards table
CREATE TABLE IF NOT EXISTS rewards (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_type TEXT    NOT NULL
                CHECK(reward_type IN ('credit_evodron', 'feature_unlock', 'discount', 'subscription', 'custom')),
  amount      REAL    NOT NULL DEFAULT 0,
  reason      TEXT    NOT NULL
                CHECK(reason IN ('referral_activation', 'welcome_bonus', 'custom')),
  status      TEXT    NOT NULL DEFAULT 'available'
                CHECK(status IN ('available', 'claimed', 'expired')),
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  claimed_at  TEXT
);

-- Referral events log (audit trail, extensible)
CREATE TABLE IF NOT EXISTS referral_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  referral_id INTEGER NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
  event_type  TEXT    NOT NULL
                CHECK(event_type IN ('signup', 'first_use', 'reward_granted', 'reward_claimed')),
  metadata    TEXT,   -- JSON string for extensible payload
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_referral_code       ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id     ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_rewards_user_id           ON rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_events_referral  ON referral_events(referral_id);
