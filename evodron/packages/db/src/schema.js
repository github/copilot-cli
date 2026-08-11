"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshTokens = exports.ipRegistry = exports.abuseFlags = exports.rewardRules = exports.rewards = exports.referrals = exports.sessions = exports.users = void 0;
const sqlite_core_1 = require("drizzle-orm/sqlite-core");
// ─── users ────────────────────────────────────────────────────────────────────
exports.users = (0, sqlite_core_1.sqliteTable)('users', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    email: (0, sqlite_core_1.text)('email').notNull().unique(),
    username: (0, sqlite_core_1.text)('username').notNull().unique(),
    passwordHash: (0, sqlite_core_1.text)('password_hash').notNull(),
    referralCode: (0, sqlite_core_1.text)('referral_code').notNull().unique(),
    referredBy: (0, sqlite_core_1.text)('referred_by').references(() => exports.users.id),
    credits: (0, sqlite_core_1.integer)('credits').notNull().default(0),
    level: (0, sqlite_core_1.text)('level', { enum: ['bronze', 'silver', 'gold'] }).notNull().default('bronze'),
    isAdmin: (0, sqlite_core_1.integer)('is_admin', { mode: 'boolean' }).notNull().default(false),
    isBanned: (0, sqlite_core_1.integer)('is_banned', { mode: 'boolean' }).notNull().default(false),
    consentMetrics: (0, sqlite_core_1.integer)('consent_metrics', { mode: 'boolean' }).notNull().default(false),
    createdAt: (0, sqlite_core_1.text)('created_at').notNull(),
    updatedAt: (0, sqlite_core_1.text)('updated_at').notNull(),
});
// ─── sessions ─────────────────────────────────────────────────────────────────
exports.sessions = (0, sqlite_core_1.sqliteTable)('sessions', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    userId: (0, sqlite_core_1.text)('user_id').notNull().references(() => exports.users.id),
    startedAt: (0, sqlite_core_1.text)('started_at').notNull(),
    endedAt: (0, sqlite_core_1.text)('ended_at'),
    commandsCount: (0, sqlite_core_1.integer)('commands_count').notNull().default(0),
    clientVersion: (0, sqlite_core_1.text)('client_version'),
    ipHash: (0, sqlite_core_1.text)('ip_hash'),
});
// ─── referrals ────────────────────────────────────────────────────────────────
exports.referrals = (0, sqlite_core_1.sqliteTable)('referrals', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    referrerId: (0, sqlite_core_1.text)('referrer_id').notNull().references(() => exports.users.id),
    refereeId: (0, sqlite_core_1.text)('referee_id').notNull().unique().references(() => exports.users.id),
    status: (0, sqlite_core_1.text)('status', { enum: ['pending', 'active', 'rewarded', 'fraud'] })
        .notNull()
        .default('pending'),
    activatedAt: (0, sqlite_core_1.text)('activated_at'),
    rewardedAt: (0, sqlite_core_1.text)('rewarded_at'),
    createdAt: (0, sqlite_core_1.text)('created_at').notNull(),
});
// ─── rewards ──────────────────────────────────────────────────────────────────
exports.rewards = (0, sqlite_core_1.sqliteTable)('rewards', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    userId: (0, sqlite_core_1.text)('user_id').notNull().references(() => exports.users.id),
    type: (0, sqlite_core_1.text)('type', {
        enum: ['referral_active', 'referral_onboarding', 'milestone', 'manual'],
    }).notNull(),
    amount: (0, sqlite_core_1.integer)('amount').notNull(),
    source: (0, sqlite_core_1.text)('source').notNull(),
    createdAt: (0, sqlite_core_1.text)('created_at').notNull(),
});
// ─── reward_rules ─────────────────────────────────────────────────────────────
exports.rewardRules = (0, sqlite_core_1.sqliteTable)('reward_rules', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    name: (0, sqlite_core_1.text)('name').notNull().unique(),
    trigger: (0, sqlite_core_1.text)('trigger').notNull(),
    credits: (0, sqlite_core_1.integer)('credits').notNull(),
    active: (0, sqlite_core_1.integer)('active', { mode: 'boolean' }).notNull().default(true),
    description: (0, sqlite_core_1.text)('description'),
    updatedAt: (0, sqlite_core_1.text)('updated_at').notNull(),
});
// ─── abuse_flags ──────────────────────────────────────────────────────────────
exports.abuseFlags = (0, sqlite_core_1.sqliteTable)('abuse_flags', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    userId: (0, sqlite_core_1.text)('user_id').notNull().references(() => exports.users.id),
    reason: (0, sqlite_core_1.text)('reason').notNull(),
    detail: (0, sqlite_core_1.text)('detail'),
    resolvedAt: (0, sqlite_core_1.text)('resolved_at'),
    flaggedAt: (0, sqlite_core_1.text)('flagged_at').notNull(),
});
// ─── ip_registry ──────────────────────────────────────────────────────────────
exports.ipRegistry = (0, sqlite_core_1.sqliteTable)('ip_registry', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    ipHash: (0, sqlite_core_1.text)('ip_hash').notNull(),
    userId: (0, sqlite_core_1.text)('user_id').notNull().references(() => exports.users.id),
    seenAt: (0, sqlite_core_1.text)('seen_at').notNull(),
});
// ─── refresh_tokens ───────────────────────────────────────────────────────────
exports.refreshTokens = (0, sqlite_core_1.sqliteTable)('refresh_tokens', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    userId: (0, sqlite_core_1.text)('user_id').notNull().references(() => exports.users.id),
    tokenHash: (0, sqlite_core_1.text)('token_hash').notNull().unique(),
    expiresAt: (0, sqlite_core_1.text)('expires_at').notNull(),
    createdAt: (0, sqlite_core_1.text)('created_at').notNull(),
    revokedAt: (0, sqlite_core_1.text)('revoked_at'),
});
//# sourceMappingURL=schema.js.map