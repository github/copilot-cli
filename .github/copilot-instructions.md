# Copilot CLI — Copilot Session Instructions

Purpose: Help future Copilot sessions quickly understand how to build, run, and explore this repository and surface repository-specific conventions the agent should respect.

---

## Quick commands (found in repository)
- Launch CLI (after installing): `copilot`
- Install (macOS / Linux): `curl -fsSL https://gh.io/copilot-install | bash` or `wget -qO- https://gh.io/copilot-install | bash`
- Homebrew (macOS/Linux): `brew install copilot-cli` or `brew install copilot-cli@prerelease`
- npm: `npm install -g @github/copilot`
- Windows (winget): `winget install GitHub.Copilot` or `winget install GitHub.Copilot.Prerelease`

Notes: This repository contains release/install artifacts and docs (install.sh, changelog.md). No repository-local build/test/lint configuration or test suite files were found; there are no per-repo `Makefile`, `package.json`, `go.mod`, or test runners present.

---

## High-level architecture (big picture)
- The project ships a standalone CLI binary (`copilot`) with an install wrapper (install.sh).
- The CLI is an agentic wrapper that: authenticates to GitHub, interacts with a remote Copilot coding agent/MCP server, and can host repository-level LSP integrations for richer code intelligence.
- Runtime pieces visible in repo: installation script + docs + release artifacts (tarballs referenced in install.sh) and GitHub workflows in `.github/workflows`.
- Configuration surfaces: repo-level LSP config (see `.github/lsp.json` pattern in README), environment-based auth (GITHUB_TOKEN / GH_TOKEN), and runtime flags (e.g., `--experimental`).

---

## Key repository conventions for Copilot sessions
- Authentication: prefer `GITHUB_TOKEN`/`GH_TOKEN` (env) for non-interactive runs. The installer and README reference `GH_TOKEN` for authenticated downloads.
- Install script behavior: `PREFIX` and `VERSION` environment vars control install destination and release tag; PATH modifications may be written to shell RC files.
- Experimental features: `--experimental` flag or `/experimental` slash command toggles experimental features persistently in user config — Copilot agents should surface this option, not toggle it without user consent.
- LSP servers: repo-level config lives at `.github/lsp.json` (if present). Agents may suggest LSP server commands (e.g., `npm install -g typescript-language-server`) but must not assume the server is installed.
- User prompts: the installer and CLI are interactive; an agent must not bypass prompts. Always present suggested commands and wait for user approval before making changes.

---

## Files to reference when answering repo-specific questions
- `README.md` — primary usage, install, LSP config examples, and experimental flags
- `install.sh` — installation steps, env variables (`PREFIX`, `VERSION`), checksum validation details
- `changelog.md` — release notes and feature history
- `.github/` — workflows and issue templates (useful for CI and contributor expectations)

---

If you (or a Copilot session) need to run repo-local builds/tests later, prefer discovering and using the project’s native tooling (Make, npm, go, python test runners) if added — do not invent commands.

---

Recommended additions included below: LSP servers, single-test commands, and a release checklist.

---

## Recommended LSP servers (install if you plan to use language features)
- TypeScript/JavaScript: `npm install -g typescript-language-server typescript` (server: `typescript-language-server --stdio`)
- Go: `go install golang.org/x/tools/gopls@latest` (server: `gopls`)
- Python: `pip install 'python-lsp-server[all]'` or `pip install 'pylsp'` (server: `pylsp`)
- Ruby: `gem install solargraph` (server: `solargraph`)
- Rust: `rustup component add rust-src && cargo install rust-analyzer` (or use distro package)
- Java: Install Eclipse JDT Language Server via your package manager or editor integration

Notes: Only recommend installing these; do not assume repository uses a language until files are present.

---

## Example single-test commands (useful snippets agents can suggest when a language appears)
- npm / JavaScript / TypeScript
  - Run full test suite: `npm test` or `npm run test`
  - Run a single test file: `npx jest path/to/file.test.js` or `npm test -- path/to/file.test.js`
  - Run a single test case (Jest): `npx jest -t 'test name'`

- Go
  - Run all tests: `go test ./...`
  - Run tests in a package: `go test ./pkg/name`
  - Run a single test function: `go test -run TestFunctionName`

- Python (pytest)
  - Run all tests: `pytest`
  - Run a single file: `pytest tests/test_module.py`
  - Run a single test: `pytest tests/test_module.py::test_function`

- Java (Maven / Gradle)
  - Maven single test: `mvn -Dtest=ClassNameTest -DfailIfNoTests=false test`
  - Gradle single test: `./gradlew test --tests "com.example.TestClass.testMethod"`

- Ruby (RSpec)
  - Run file: `rspec spec/models/user_spec.rb`
  - Run example: `rspec spec/models/user_spec.rb:42`

- Rust (cargo)
  - Run all tests: `cargo test`
  - Run a single test: `cargo test test_name -- --exact`

Agents should detect which test runner is present (package.json, go.mod, pyproject.toml, setup.cfg, Cargo.toml, Gemfile, etc.) before suggesting commands.

---

## Release checklist (concise steps agents can follow or present to users)
- Update changelog and bump version/tag
- Run linters and tests locally: use repository-native commands if present
- Build release artifacts (if applicable): follow repo's build script or `make release`
- Generate checksums and attach them to release assets (`sha256sum`)
- Create GitHub release and upload artifacts; include changelog entry
- Update documentation (`README.md`, `.github/*`) and LSP config if needed
- Ensure CI workflows pass for the release branch

Agents must present these steps as suggestions and ask for confirmation before performing any publishing actions (creating tags/releases).

---

Summary: Added recommended LSP servers, single-test command examples for common languages, and a concise release checklist. If you'd like, tailor the single-test examples to the specific languages in this repo or add CI commands found in `.github/workflows`.
