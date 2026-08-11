import { sqliteTable, text, integer, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core';

// ─── users ────────────────────────────────────────────────────────────────────

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  referralCode: text('referral_code').notNull().unique(),
  referredBy: text('referred_by').references((): AnySQLiteColumn => users.id),
  credits: integer('credits').notNull().default(0),
  level: text('level', { enum: ['bronze', 'silver', 'gold'] }).notNull().default('bronze'),
  isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
  isBanned: integer('is_banned', { mode: 'boolean' }).notNull().default(false),
  consentMetrics: integer('consent_metrics', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ─── sessions ─────────────────────────────────────────────────────────────────

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  startedAt: text('started_at').notNull(),
  endedAt: text('ended_at'),
  commandsCount: integer('commands_count').notNull().default(0),
  clientVersion: text('client_version'),
  ipHash: text('ip_hash'),
});

// ─── referrals ────────────────────────────────────────────────────────────────

export const referrals = sqliteTable('referrals', {
  id: text('id').primaryKey(),
  referrerId: text('referrer_id').notNull().references(() => users.id),
  refereeId: text('referee_id').notNull().unique().references(() => users.id),
  status: text('status', { enum: ['pending', 'active', 'rewarded', 'fraud'] })
    .notNull()
    .default('pending'),
  activatedAt: text('activated_at'),
  rewardedAt: text('rewarded_at'),
  createdAt: text('created_at').notNull(),
});

// ─── rewards ──────────────────────────────────────────────────────────────────

export const rewards = sqliteTable('rewards', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  type: text('type', {
    enum: ['referral_active', 'referral_onboarding', 'milestone', 'manual'],
  }).notNull(),
  amount: integer('amount').notNull(),
  source: text('source').notNull(),
  createdAt: text('created_at').notNull(),
});

// ─── reward_rules ─────────────────────────────────────────────────────────────

export const rewardRules = sqliteTable('reward_rules', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  trigger: text('trigger').notNull(),
  credits: integer('credits').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  description: text('description'),
  updatedAt: text('updated_at').notNull(),
});

// ─── abuse_flags ──────────────────────────────────────────────────────────────

export const abuseFlags = sqliteTable('abuse_flags', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  reason: text('reason').notNull(),
  detail: text('detail'),
  resolvedAt: text('resolved_at'),
  flaggedAt: text('flagged_at').notNull(),
});

// ─── ip_registry ──────────────────────────────────────────────────────────────

export const ipRegistry = sqliteTable('ip_registry', {
  id: text('id').primaryKey(),
  ipHash: text('ip_hash').notNull(),
  userId: text('user_id').notNull().references(() => users.id),
  seenAt: text('seen_at').notNull(),
});

// ─── refresh_tokens ───────────────────────────────────────────────────────────

export const refreshTokens = sqliteTable('refresh_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull(),
  revokedAt: text('revoked_at'),
});
