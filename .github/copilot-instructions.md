# GitHub Copilot CLI — Repository Guide

## What This Repository Is

This is the **public distribution and issue-tracking repository** for the GitHub Copilot CLI. It does not contain the CLI source code. The compiled binaries are published as GitHub Releases and consumed by the various install paths below.

The repository's main artifacts are:
- `install.sh` — the curl-pipe-bash installer for Linux/macOS
- `.github/workflows/` — release automation and issue triage
- `README.md` / `changelog.md` — user-facing documentation

## install.sh

This is the primary code file in the repo. Key conventions:
- `set -e` is active throughout; every command failure aborts.
- Downloads a `tar.gz` release asset named `copilot-${PLATFORM}-${ARCH}.tar.gz` from GitHub Releases.
- Validates the tarball against `SHA256SUMS.txt` when either `sha256sum` or `shasum` is available.
- Install prefix: `/usr/local` (root) or `$HOME/.local` (non-root), overridable via `$PREFIX`.
- Supports `VERSION` env var: empty/`latest` → latest release; `prerelease` → newest git tag; anything else is treated as a version string (prefixed with `v` if missing).
- Uses `/dev/tty` for interactive prompts so the script works correctly when piped from `curl`.

## GitHub Actions Workflows

### WinGet Release (`winget.yml`)
Triggered on every published release. Runs on `windows-latest` (winget-create requires Windows). Steps:
1. Downloads `wingetcreate.exe` from `https://aka.ms/wingetcreate/latest`.
2. Calls `wingetcreate update` with `--out manifests` to generate manifests locally (does **not** use `--submit`).
3. **Post-processes** the `*.installer.yaml` to inject a `Microsoft.PowerShell >= 7.0.0` package dependency — this is a manual fixup because winget-create doesn't support it natively.
4. Calls `wingetcreate submit` on the manifest directory.

Package IDs: `GitHub.Copilot` (stable) / `GitHub.Copilot.Prerelease` (pre-release), selected based on `github.event.release.prerelease`.

### Issue Triage Workflows
Several workflows manage issue lifecycle automatically: `triage-issues.yml`, `stale-issues.yml`, `close-invalid.yml`, `no-response.yml`, `close-single-word-issues.yml`, `feature-request-comment.yml`, `remove-triage-label.yml`, `unable-to-reproduce-comment.yml`, `on-issue-close.yml`.

All new issues receive the `triage` label (set in `bug_report.yml` and `feature_request.yml` templates).

## LSP Configuration (for users, relevant when editing docs)

Users configure LSP servers via:
- **User-level:** `~/.copilot/lsp-config.json`
- **Repo-level:** `.github/lsp.json`

Format:
```json
{
  "lspServers": {
    "typescript": {
      "command": "typescript-language-server",
      "args": ["--stdio"],
      "fileExtensions": { ".ts": "typescript", ".tsx": "typescript" }
    }
  }
}
```

## Dev Container

The devcontainer (`mcr.microsoft.com/devcontainers/base:ubuntu`) includes:
- `shellcheck` and `bash-ide-vscode` — use these when editing `install.sh`
- `vscode-markdownlint` — enforced for `.md` files
- `vscode-yaml` — for workflow and template YAML
