# EVODRON Architecture

## Overview

EVODRON is an AI-powered developer platform that orchestrates the GitHub Copilot CLI to deliver a richer, identity-branded experience with user accounts, referral programmes, reward credits, and usage statistics.

```
┌──────────────────────────────────────────────────────────┐
│                        USER                              │
│                     evodron <cmd>                        │
└──────────────────────┬───────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────┐
│              EVODRON CLI WRAPPER (packages/cli)          │
│  • Splash screen / branding                              │
│  • Local config (~/.evodron/config.json)                 │
│  • Auth token management                                 │
│  • Usage metrics (local, with consent)                   │
│  • Delegates to GitHub Copilot CLI for AI tasks          │
└──────┬───────────────────────────────────────────────────┘
       │ HTTPS (JWT)
┌──────▼───────────────────────────────────────────────────┐
│            EVODRON API (packages/api)                    │
│                                                          │
│  Routes:                                                 │
│  POST /auth/register          — create account           │
│  POST /auth/login             — get JWT + refresh token  │
│  POST /auth/refresh           — rotate JWT               │
│  GET  /users/me               — profile + credits        │
│  GET  /referrals/code         — my referral code/link    │
│  GET  /referrals/stats        — referrals dashboard      │
│  POST /sessions/start         — log session start        │
│  POST /sessions/end           — log session end          │
│  GET  /rewards                — reward history           │
│  GET  /stats                  — usage statistics         │
│  GET  /admin/abuse-flags      — abuse management (admin) │
│                                                          │
│  Middleware:                                             │
│  • JWT authentication                                    │
│  • Rate limiting (per IP + per user)                     │
│  • Anti-abuse detection                                  │
└──────┬───────────────────────────────────────────────────┘
       │ Drizzle ORM
┌──────▼───────────────────────────────────────────────────┐
│         DATABASE (packages/db)                           │
│                                                          │
│  SQLite (development / small production)                 │
│  PostgreSQL (large production — swap DB_URL)             │
│                                                          │
│  Tables:                                                 │
│  users         — accounts, referral codes                │
│  sessions      — usage tracking per user                 │
│  referrals     — parrain→filleul relationships           │
│  rewards       — credit ledger                           │
│  reward_rules  — configurable reward triggers            │
│  abuse_flags   — fraud/abuse detection records           │
│  ip_registry   — IP tracking for anti-fraud              │
└──────────────────────────────────────────────────────────┘
```

## Packages

### `packages/shared`
TypeScript types and Zod schemas shared between CLI and API packages. Zero runtime dependencies beyond `zod`.

### `packages/db`
Drizzle ORM schema definitions and migrations. Supports SQLite (via `better-sqlite3`) in development and small deployments, and PostgreSQL (via `postgres`) in production — controlled by `DB_URL`.

### `packages/api`
Fastify-based REST API. Handles authentication (JWT), referrals, rewards, sessions, stats, and abuse detection. All routes are rate-limited. Auth-required routes validate JWT on every request.

### `packages/cli`
The `evodron` CLI wrapper. Provides the branded entry point. Handles local config, authentication against the API, and delegates AI coding tasks to the GitHub Copilot CLI binary. Collects opt-in usage metrics.

## Security considerations

- Passwords are hashed with bcrypt (cost factor 12).
- JWTs expire after 15 minutes; refresh tokens after 30 days.
- Refresh tokens are stored hashed in the database; rotation invalidates the old token.
- Rate limiting: 100 req/min per IP globally; 20 req/min on auth endpoints.
- Anti-abuse: IP deduplication, self-referral prevention, minimum activity threshold before reward.
- No API keys, secrets, or passwords are ever stored in the codebase.

## Referral system

1. Each registered user receives a unique 8-character alphanumeric referral code.
2. A shareable link is derived from `EVODRON_REFERRAL_BASE_URL/ref/<code>`.
3. When a new user registers with `?ref=<code>`, the `referrals` row is created with status `pending`.
4. After the referee reaches `EVODRON_REWARD_MIN_SESSIONS` active sessions, status becomes `active`.
5. Reward credits are credited to both referee and referrer via the configurable `reward_rules`.

## Reward system (virtual credits only)

- Credits are a **virtual, internal unit** with no monetary value.
- Reward rules are stored in the `reward_rules` table and can be updated without code changes.
- Default rules: referrer receives 100 credits per active referee; referee receives 50 onboarding credits.
- No cash-out, fiat conversion, or financial features are implemented.
- Any future financial feature would require legal, fiscal, and payment compliance work first.

## EVODRON is not affiliated with GitHub or Microsoft

The GitHub Copilot CLI is a third-party binary component. See `THIRD_PARTY.md`.
