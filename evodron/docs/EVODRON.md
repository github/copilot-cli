# EVODRON

EVODRON is an AI-powered developer platform that enriches the GitHub Copilot CLI experience with user accounts, a referral programme, reward credits, usage statistics, and anti-abuse protection.

> **Disclaimer:** EVODRON is not affiliated with, endorsed by, or officially connected to GitHub, Inc. or Microsoft Corporation. The GitHub Copilot CLI is a separate, third-party binary component. See [THIRD_PARTY.md](./THIRD_PARTY.md).

---

## Features

- **Evodron identity** — branded CLI with splash screen and EVODRON visual identity
- **User accounts** — registration, login, JWT authentication, profile management
- **Referral programme** — unique codes, shareable links, tracking, and anti-abuse
- **Reward credits** — virtual credits with configurable rules (no monetary value)
- **Usage statistics** — sessions, commands, credit history, level system
- **Anti-abuse** — IP tracking, self-referral prevention, fraud detection, rate limiting
- **Admin tools** — manage abuse flags, ban users, configure reward rules

---

## Quick Start

### Prerequisites

- Node.js >= 18
- (Optional) GitHub Copilot CLI for AI features — install with `curl -fsSL https://gh.io/copilot-install | bash`

### Setup

```bash
cd evodron
bash scripts/setup.sh
```

Then edit `.env` to set a secure `EVODRON_JWT_SECRET`.

### Start the API

```bash
npm run dev:api
```

### Build and use the CLI

```bash
npm run build
node packages/cli/dist/bin/evodron.js --help
```

### Register an account

```bash
evodron auth register
```

### Launch AI assistant (delegates to GitHub Copilot CLI)

```bash
evodron run -- "explain this code"
```

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `evodron auth register` | Create a new EVODRON account |
| `evodron auth login` | Log in |
| `evodron auth logout` | Log out |
| `evodron auth status` | Show login status |
| `evodron referral code` | Show your referral code and link |
| `evodron referral stats` | Show referral dashboard |
| `evodron rewards history` | Show reward credit history |
| `evodron rewards rules` | Show active reward rules |
| `evodron stats` | Show usage statistics |
| `evodron run [args...]` | Launch GitHub Copilot CLI (third-party) |

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Health check |
| POST | `/auth/register` | No | Register |
| POST | `/auth/login` | No | Login |
| POST | `/auth/refresh` | No | Refresh token |
| POST | `/auth/logout` | No | Logout |
| GET | `/users/me` | Yes | Get profile |
| PATCH | `/users/me/consent` | Yes | Update metrics consent |
| GET | `/referrals/code` | Yes | Get referral code |
| GET | `/referrals/stats` | Yes | Referral dashboard |
| POST | `/sessions/start` | Yes | Start session |
| POST | `/sessions/end` | Yes | End session |
| GET | `/rewards` | Yes | Reward history |
| GET | `/rewards/rules` | Yes | Active reward rules |
| GET | `/stats` | Yes | Usage stats |
| GET | `/admin/abuse-flags` | Admin | Unresolved abuse flags |
| POST | `/admin/abuse-flags/:id/resolve` | Admin | Resolve flag |
| POST | `/admin/users/:id/ban` | Admin | Ban user |
| GET | `/admin/reward-rules` | Admin | All reward rules |
| PATCH | `/admin/reward-rules/:id` | Admin | Update reward rule |

---

## Referral Programme

Each user receives a unique 8-character referral code and a shareable link.

When a new user registers using a referral link:
1. A `pending` referral is created linking referrer and referee.
2. The referee receives onboarding credits immediately.
3. After the referee completes `EVODRON_REWARD_MIN_SESSIONS` sessions, the referral becomes `active`.
4. The referrer receives referral credits.

**Anti-abuse measures:**
- Self-referral is blocked (a user cannot use their own code).
- Duplicate referrals are prevented (one referee → one referrer only).
- IP tracking flags accounts created from the same IP address excessively.
- Banned users' pending referrals are marked as fraud.
- Rewards only trigger after verified usage (minimum sessions threshold).

---

## Reward System

EVODRON credits are **virtual, internal units with no monetary value**. They cannot be exchanged for cash, goods, or services.

| Level | Credits required |
|-------|-----------------|
| Bronze | 0 |
| Silver | 300 |
| Gold | 1 000 |

Default reward rules:

| Rule | Trigger | Credits |
|------|---------|---------|
| Referral (referrer) | Referee reaches active status | 100 |
| Onboarding (referee) | Join via referral link | 50 |
| Milestone | Complete 10 sessions | 25 |

Rules are configurable via `PATCH /admin/reward-rules/:id` without code changes.

> ⚠️ **Legal notice:** Any future conversion of credits to real money would require legal, fiscal, and payment compliance work (payment institution registration, KYC, GDPR compliance, tax obligations). This is intentionally **not implemented**.

---

## Environment Variables

See `.env.example` for all available variables.

| Variable | Required | Description |
|----------|----------|-------------|
| `EVODRON_JWT_SECRET` | Yes | JWT signing secret (32+ chars) |
| `EVODRON_DB_URL` | Yes | SQLite path or PostgreSQL URL |
| `EVODRON_API_URL` | CLI | API URL (used by CLI) |
| `EVODRON_REFERRAL_BASE_URL` | No | Base URL for referral links |
| `EVODRON_REWARD_MIN_SESSIONS` | No | Minimum sessions before referral activates (default: 3) |
| `EVODRON_API_PORT` | No | API port (default: 3000) |
| `NODE_ENV` | No | `development` or `production` |
| `LOG_LEVEL` | No | Log level (default: `info`) |

---

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full architecture diagram and package descriptions.

---

## Third-Party Components

See [THIRD_PARTY.md](./THIRD_PARTY.md) for full attribution.

The GitHub Copilot CLI is a third-party binary component by GitHub, Inc. EVODRON uses it as an optional, unmodified sub-component for AI coding features.
