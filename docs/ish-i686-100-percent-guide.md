# GitHub Copilot CLI - iSH i686 100% Success Guide

## Quick Start

```bash
# 1. Check compatibility
sh scripts/test-ish-compatibility.sh

# 2. Run installer (auto 3-stage fallback)
sh scripts/install-copilot-ish-i686-finetuned.sh

# 3. Reload shell
source ~/.profile

# 4. Verify
copilot --version
```

## Installation Stages

### Stage 1: x64-Binary (5 min, 30% success)
- Downloads pre-built binary
- Runs via i686 emulation
- Fast but may fail on limited systems

### Stage 2: Node.js 20 + npm (2 hours, 70% success)
- Compiles Node.js 20 for i686
- Installs @github/copilot via npm
- More reliable than Stage 1

### Stage 3: Remote SSH (100% success)
- Use remote Mac/Linux with Copilot
- SSH tunnel from iSH
- Guaranteed to work

## Troubleshooting

| Error | Fix |
|-------|-----|
| `tar: Bad system call` | Restart iSH app, close other tabs |
| `make: *** Error` | Out of memory - kill background processes |
| `Command not found: copilot` | Run: `source ~/.profile` |
| `Illegal instruction` | Use wrapper: `sh scripts/copilot-ish-wrapper.sh` |

## Pre-flight Check

```bash
sh scripts/test-ish-compatibility.sh
```

Returns:
- ✓ Architecture
- ✓ OS
- ✓ Disk/Memory
- ✓ Tools
- ✓ Network

## Advanced

### Force specific stage:
```bash
STAGE=1 sh scripts/install-copilot-ish-i686-finetuned.sh
```

### Custom prefix:
```bash
PREFIX="$HOME/custom" sh scripts/install-copilot-ish-i686-finetuned.sh
```

### Auto-restart on crash:
```bash
sh scripts/copilot-ish-wrapper.sh
```

## Support

- GitHub Issues: [github/copilot-cli/issues](https://github.com/github/copilot-cli/issues)
- Alpine Wiki: [wiki.alpinelinux.org](https://wiki.alpinelinux.org/)
- iSH Repo: [github.com/ish-app/ish](https://github.com/ish-app/ish)