# CLAUDE.md - AI Assistant Guide for GitHub Copilot CLI Repository

## 🎯 Repository Overview

**IMPORTANT:** This is the **public documentation and issue tracking repository** for GitHub Copilot CLI. The actual source code is maintained separately and distributed as the npm package `@github/copilot`.

This repository serves as:
- Public documentation and README
- Issue tracking and community feedback
- Feature request management
- Release changelog documentation

**What this repository IS NOT:**
- Source code repository (no src/ or lib/ directories)
- Build/test infrastructure
- Package distribution point

## 📁 Repository Structure

```
/home/user/copilot-cli/
├── README.md              # User-facing documentation (installation, usage)
├── changelog.md           # Comprehensive version history (primary source of architectural info)
├── LICENSE.md             # Pre-release license terms
└── .github/
    ├── ISSUE_TEMPLATE/
    │   ├── bug_report.yml        # Structured bug report template
    │   └── feature_request.yml   # Feature request template
    └── workflows/
        ├── triage-issues.yml              # Auto-labels new issues
        ├── close-single-word-issues.yml   # Auto-closes invalid issues
        ├── stale-issues.yml               # 365-day stale issue management
        ├── feature-request-comment.yml    # Acknowledges feature requests
        └── [other issue management workflows]
```

## 🏗️ GitHub Copilot CLI Architecture

While the source code isn't in this repository, understanding the architecture is crucial for assisting users:

### Core Concepts

**Agentic Architecture:**
- Built on GitHub's "agentic harness" - an AI agent system
- Plans and executes complex multi-step tasks
- Tool-based design pattern (agent calls tools, user approves)
- Preview-first approach: nothing executes without user confirmation

**Technology Stack:**
- Node.js v22+ (minimum requirement)
- npm v10+
- Cross-platform: Linux, macOS, Windows
- Shell support: Bash, PowerShell v6+

### Tool System

The CLI uses a tool-calling architecture where the AI can invoke:

**Built-in Tools:**
- File operations: read, write, edit, glob, grep
- Shell command execution (with permission system)
- Git operations
- Web fetch and search

**GitHub MCP Server Tools** (default, limited set since v0.0.350):
```
Code: get_file_contents, search_code, search_repositories
Git: list_branches, list_commits, get_commit
Issues: get_issue, list_issues, get_issue_comments, search_issues
PRs: pull_request_read, list_pull_requests, search_pull_requests
Workflows: list_workflows, list_workflow_runs, get_workflow_run,
           get_job_logs, get_workflow_run_logs
Users: user_search
```

**Custom MCP Servers:**
- Extensible via `~/.copilot/mcp-config.json`
- Support for third-party MCP servers

### Permission System

Sophisticated path-based permission model:
- Per-path read/write permissions
- Whitelist/blacklist for tools via `--allow-tool`, `--deny-tool`
- Glob pattern matching for tool rules
- Smart heuristics to minimize permission prompts

### Configuration Files

**~/.copilot/config** - User preferences:
```json
{
  "log_level": "none|error|warning|info|debug|all|default",
  "show_banner": boolean,
  "screen_reader": boolean,
  "model": "string"
}
```

**~/.copilot/mcp-config.json** - MCP server configuration:
```json
{
  "mcpServers": {
    "server-name": {
      "command": "command-string",
      "env": {
        "VAR_NAME": "${REFERENCE}"
      }
    }
  }
}
```

**~/.copilot/agents/** - Custom agent definitions
**.github/agents/** - Repository-level agents (v0.0.353+)

### Slash Commands

Internal commands use `/` prefix:
- `/login` - Authentication
- `/model [model]` - Model selection (Sonnet 4.5, Sonnet 4, Haiku 4.5, GPT-5)
- `/mcp add|list|remove` - MCP server management
- `/cwd [path]` - Change working directory
- `/clear` - Clear session
- `/usage` - Usage statistics
- `/terminal-setup` - Configure terminal
- `/feedback` - Submit feedback
- `/user list|show|switch` - User management
- `/agent <agent>` - Invoke custom agent (v0.0.353+)
- `/delegate` - Async task delegation (creates PR, v0.0.353+)
- `/exit`, `/quit` - Exit CLI

### Authentication

Multiple methods (in order of precedence):
1. OAuth Device Flow (primary)
2. Personal Access Token via `GH_TOKEN` or `GITHUB_TOKEN`
3. GitHub CLI (`gh`) authentication
4. GitHub Enterprise via `GH_HOST` environment variable

### Key Features

**Input Patterns:**
- Natural language prompts
- `@file.png` - Include files/images in context
- `!command` - Direct shell execution
- Multi-line input support (Kitty protocol)

**Session Management:**
- Persistent sessions with resume (`--resume`, `--continue`)
- Session state: `~/.copilot/session-state/`
- Timeline-based conversation UI

**Advanced Capabilities:**
- Parallel tool execution (v0.0.349+)
- Async task delegation (v0.0.353+)
- Token-by-token streaming (v0.0.348+)
- Image support via @-mentions (v0.0.333+)
- Custom agents (v0.0.353+)

## 🔧 Working with This Repository

### Issue Management

**Automated Workflows:**
- New issues auto-labeled as "triage"
- Single-word issues auto-closed
- Stale issues closed after 365 days
- Feature requests get acknowledgment comment
- "More info needed" workflow
- "Unable to reproduce" handling

**When Helping with Issues:**
1. Check if it's a duplicate (search existing issues)
2. Verify it's about the Copilot CLI (not VS Code, GitHub.com, etc.)
3. Request minimal reproducible examples
4. Reference changelog.md for version-specific behavior
5. Note platform differences (Windows vs Linux vs macOS)
6. Check if it's resolved in newer versions

### Documentation Updates

**README.md:**
- Installation and prerequisites
- Quick start guide
- Feature overview
- Links to official docs

**changelog.md:**
- Most detailed source of product information
- Documents every release (v0.0.X format)
- Contains architectural decisions and breaking changes
- Reference this for historical context

### Pull Requests for This Repo

When creating PRs for documentation:
1. Update README.md for user-facing changes
2. Keep changelog.md accurate (typically maintained by maintainers)
3. Ensure cross-platform accuracy (Windows paths, shell syntax)
4. Link to related issues
5. Preview markdown rendering

## 📝 Conventions for AI Assistants

### When Working with Issues

**DO:**
- Read the full issue and all comments before responding
- Check changelog.md for relevant version information
- Ask clarifying questions if the issue is vague
- Provide workarounds while bugs are being fixed
- Reference specific versions (e.g., "fixed in v0.0.350")
- Consider cross-platform implications
- Link to official documentation when relevant

**DON'T:**
- Make promises about implementation timelines
- Attempt to access or modify source code (it's not here)
- Assume features without checking changelog
- Provide solutions that bypass security/permission systems
- Recommend outdated installation methods

### When Explaining the Product

**Key Points to Emphasize:**
1. **Preview-First:** All actions require user confirmation
2. **Terminal-Native:** No context switching required
3. **GitHub Integration:** Deep integration with GitHub services
4. **Extensible:** MCP servers for custom tools
5. **Cross-Platform:** Works on Linux, macOS, Windows
6. **Agentic:** Plans and executes multi-step tasks
7. **Premium Requests:** Each interaction counts toward quota

### Common User Confusion Points

**"It's not working":**
- Check Node.js version (v22+ required)
- Verify active Copilot subscription
- Check organization/enterprise policy settings
- Try `copilot --version` to verify installation
- Check `~/.copilot/config` for log level

**Authentication Issues:**
- Order of precedence: OAuth > PAT > gh CLI
- PAT needs "Copilot Requests" permission
- GHE users need `GH_HOST` set
- `/login` command for re-authentication

**Permission Prompts:**
- Expected behavior for security
- Can use `--allow-tool` / `--deny-tool` flags
- Can grant persistent path permissions
- Smart heuristics added in v0.0.351

**MCP Server Confusion:**
- Default GitHub MCP server is bundled
- Limited tool set by default (v0.0.350+)
- Custom servers need `~/.copilot/mcp-config.json`
- Check MCP server compatibility

## 🚀 Development Workflow for This Repository

### Branch Strategy

- Main branch: Production documentation
- Feature branches: For documentation updates
- PR-based workflow with review

### Git Commands

When working with this repository:

```bash
# Check current branch
git status

# Create feature branch
git checkout -b docs/update-description

# Commit changes
git add CLAUDE.md
git commit -m "Add comprehensive CLAUDE.md for AI assistants"

# Push to remote
git push -u origin docs/update-description
```

### Commit Message Style

Based on recent commits in changelog:
- Clear, descriptive summaries
- Reference specific features or fixes
- Use present tense: "Add feature" not "Added feature"
- Examples:
  - "Update changelog for custom agents and /delegate command"
  - "Fix formatting of changelog entry for clarity"
  - "Update README with new authentication methods"

## 📚 Reference Information

### Key Files to Check

1. **changelog.md** - Most comprehensive product information
2. **README.md** - Installation and basic usage
3. **.github/ISSUE_TEMPLATE/** - Valid issue formats
4. **LICENSE.md** - Legal terms and restrictions

### External Resources

- [Official Documentation](https://docs.github.com/copilot/concepts/agents/about-copilot-cli)
- [npm Package](https://www.npmjs.com/package/@github/copilot)
- [Copilot Plans](https://github.com/features/copilot/plans)
- [Model Context Protocol](https://modelcontextprotocol.io/)

### Version History Highlights

- **v0.0.353** - Custom agents, /delegate command for async tasks
- **v0.0.350** - Limited GitHub MCP server tools by default, bundled dependencies
- **v0.0.349** - Parallel tool execution
- **v0.0.348** - Token-by-token streaming, bundled node-pty
- **v0.0.342** - New session state format, GHE support via GH_HOST
- **v0.0.333** - Image support via @-mentions, ! for shell execution
- **v0.0.329** - Glob patterns for tool allow/deny rules

## ⚠️ Important Reminders

1. **This is NOT the source code repository** - Direct users to file issues, not to expect code changes here
2. **Changelog is authoritative** - Use it as primary reference for features and behavior
3. **Cross-platform considerations** - Windows behaves differently (PowerShell vs bash)
4. **Subscription required** - Copilot subscription needed, premium requests tracked
5. **Pre-release software** - Expect frequent updates and changes
6. **Security model** - Permission system is fundamental, don't suggest bypasses
7. **GitHub context** - Deeply integrated with GitHub, not a general-purpose CLI tool

## 🎯 Quick Decision Tree for AI Assistants

**User asks about installation/usage →** Reference README.md
**User reports a bug →** Check if duplicate, ask for repro, reference changelog for version info
**User asks about features →** Check changelog.md for feature availability and version
**User has authentication issues →** Guide through auth methods in order of precedence
**User wants to extend functionality →** Explain MCP servers and custom agents
**User asks about source code →** Clarify this is docs repo, source is private
**User asks about specific version behavior →** Reference changelog.md for that version
**Documentation needs updating →** Create PR with clear description and rationale

---

**Last Updated:** 2025-12-04 (for repository state at commit 0d2c9de)
**For Questions:** File an issue in this repository or check official documentation
