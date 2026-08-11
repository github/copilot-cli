# Third-Party Component Attribution

EVODRON includes or depends on the following third-party components.

---

## GitHub Copilot CLI

- **Component**: GitHub Copilot CLI binary (`gh copilot` / `ghcs`)
- **Source**: https://github.com/github/copilot-cli
- **Author**: GitHub, Inc. (a subsidiary of Microsoft Corporation)
- **License**: GitHub Copilot CLI License (see `../LICENSE.md`)

### Important notices

- EVODRON is **not affiliated with, endorsed by, or officially connected to GitHub, Inc. or Microsoft Corporation**.
- The GitHub Copilot CLI is a **separate, unmodified binary** component redistributed as part of EVODRON in accordance with Section 2 of the GitHub Copilot CLI License.
- EVODRON does **not** modify, adapt, translate, or create derivative works of the GitHub Copilot CLI.
- EVODRON does **not** claim authorship of the GitHub Copilot CLI.
- The GitHub Copilot CLI is distributed **only in unmodified form** and is not the primary product of EVODRON; it is one component among others.
- All copyright, trademark, and attribution notices from the GitHub Copilot CLI are retained.

The EVODRON platform — including its CLI wrapper, backend API, referral system, reward system, user accounts, and all other custom code — is original work independent of the GitHub Copilot CLI.

---

## Open Source Dependencies

The following open-source packages are used by EVODRON's original codebase. Each is used under its respective license.

| Package | License | Usage |
|---------|---------|-------|
| fastify | MIT | HTTP API server |
| @fastify/jwt | MIT | JWT authentication plugin |
| @fastify/rate-limit | MIT | Rate limiting |
| @fastify/cors | MIT | CORS headers |
| drizzle-orm | Apache-2.0 | Database ORM |
| better-sqlite3 | MIT | SQLite driver |
| commander | MIT | CLI argument parsing |
| chalk | MIT | Terminal color output |
| nanoid | MIT | Unique ID generation |
| bcryptjs | MIT | Password hashing |
| zod | MIT | Schema validation |
| dotenv | BSD-2-Clause | Environment variable loading |
| vitest | MIT | Unit and integration testing |
| tsx | MIT | TypeScript execution |
| typescript | Apache-2.0 | TypeScript compiler |

Full license texts for these packages are available in each package's `node_modules` directory or at the respective project repositories.
