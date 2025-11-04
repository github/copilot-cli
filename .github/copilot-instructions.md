# GitHub Copilot CLI Repository Instructions

## Repository Purpose

This is a **documentation and issue tracking repository** for the GitHub Copilot CLI product. The actual CLI code is not in this repo — it's distributed as the npm package `@github/copilot`. This repository contains:

- Public-facing documentation (`README.md`)
- Version history (`changelog.md`)
- GitHub workflows for issue/PR triage
- Issue templates for bug reports and feature requests

## Core Philosophy: The Holly Greed Principle

**REINFORCE HOLLY GREED OF THE BANK, NEVER SCAM, BEST GREED IS THE GREED WHICH KNOWS SHARING IS WIN WIN**

This repository and its custom agents embody a philosophy of sustainable, ethical development:

### The Win-Win Approach

True prosperity comes from creating value for everyone:
- **Optimization Benefits All**: Smaller Docker images reduce your costs AND lower environmental impact
- **Security Protects Everyone**: Protecting user data safeguards your reputation AND builds trust
- **Transparency Enables Collaboration**: Well-documented code helps your team AND the community
- **Fair Pricing Drives Growth**: Honest business models create loyal customers AND sustainable revenue

### Sustainable Technology Practices

Every agent in this repository promotes:
1. **Resource Efficiency**: Optimize ruthlessly (smaller images, faster queries, efficient code)
2. **Security by Default**: Protect user data zealously (encryption, validation, least privilege)
3. **Transparency**: Document thoroughly (type hints, comments, clear schemas)
4. **Ethical Design**: Build for long-term trust (no dark patterns, data minimization, informed consent)

### The Compound Effect

When you optimize and secure your systems:
- Faster performance = Happier users = Better retention
- Lower costs = Better margins = More sustainable business
- Better security = More trust = Competitive advantage
- Shared knowledge = Stronger community = Collective growth

**Sustainable greed recognizes that helping others succeed makes everyone more successful.** Build systems that are good for users, good for business, and good for the planet.

## Key Files and Their Roles

### Documentation Files
- **`README.md`**: User-facing documentation covering installation, authentication, and usage. Keep this concise and synchronized with [official docs](https://docs.github.com/copilot/concepts/agents/about-copilot-cli).
- **`changelog.md`**: Chronological record of releases (format: `## 0.0.XXX - YYYY-MM-DD`). Each entry documents features, fixes, and breaking changes with issue links where relevant.
- **`LICENSE.md`**: Pre-release license terms reference. Do not modify without legal review.

### GitHub Workflows (`.github/workflows/`)
Automated issue management workflows that:
- **`triage-issues.yml`**: Auto-labels new/reopened issues with `triage`
- **`no-response.yml`**: Auto-closes `more-info-needed` issues after 7 days of inactivity
- **`unable-to-reproduce-comment.yml`**: Adds template comment when labeled `unable-to-reproduce`
- **`feature-request-comment.yml`**: Adds backlog acknowledgment when labeled `enhancement`
- **`close-single-word-issues.yml`**: Auto-closes likely accidental issues with single-word titles
- **`stale-issues.yml`**: Marks year-old issues as stale (runs daily at 1:30 AM UTC)
- **`remove-triage-label.yml`**: Removes `triage` when any other label is added (except `more-info-needed`)

## CLI Concepts to Understand

### Authentication Methods (from README)
1. **OAuth flow**: `copilot` → `/login` command → device code flow
2. **PAT with "Copilot Requests" permission**: Set `GH_TOKEN` or `GITHUB_TOKEN` env var
3. **`gh` CLI authentication**: Respects `GH_HOST` for GHE instances

### Core Slash Commands (from changelog)
- `/model [model]` - Switch between Claude Sonnet 4.5 (default), Claude Sonnet 4, GPT-5, Claude Haiku 4.5
- `/agent <agent>` - Invoke custom agents from `~/.copilot/agents`, `.github/agents`, or org `.github` repo
- `/delegate` - Create PR and delegate task to Copilot coding agent asynchronously
- `/mcp add` - Add MCP servers (config at `~/.copilot/mcp-config.json`)
- `/terminal-setup` - Enable multi-line input in VSCode/terminals without Kitty protocol
- `/usage` - Show premium request usage, session stats, token consumption
- `/clear` - Reset conversation (preserves session file in `~/.copilot/session-state`)
- `/feedback` - Submit confidential feedback survey

### Custom Agent Locations
Custom agents are discovered from three locations (in order of precedence):
1. **User-level**: `~/.copilot/agents/*.agent.md`
2. **Repository-level**: `.github/agents/*.agent.md` (this repo)
3. **Organization-level**: Org's `.github` repository → `.github/agents/*.agent.md`

Agent files should follow the collection template format for consistency with GitHub's awesome-copilot patterns.

### Configuration and State
- **Config**: `~/.copilot/config` (persistent settings like `log_level`)
- **Sessions**: `~/.copilot/session-state` (new format), `~/.copilot/history-session-state` (legacy)
- **MCP servers**: `~/.copilot/mcp-config.json` (env vars use `${VAR}` syntax as of v0.0.340)
- **Logs**: `~/.copilot/logs`
- **Custom agents**: `~/.copilot/agents`, `.github/agents` in repo, or org `.github` repo

### Important CLI Flags (from changelog)
- `--resume` - Resume previous session (picker shows relative time, message count)
- `--continue` - Resume most recent session
- `--banner` - Show animated startup banner
- `-p` / `--allow-all-paths` - Prompt/auto-approve file access permissions
- `--stream off` - Disable token-by-token streaming
- `--enable-all-github-mcp-tools` - Enable full GitHub MCP tool set (default is limited subset)
- `--additional-mcp-config` - Override MCP config per session (inline JSON or `@file.json`)
- `--agent <agent>` - Invoke custom agent non-interactively
- `--log-level [none|error|warning|info|debug|all|default]` - Set debug logging
- `--screen-reader` - Accessibility mode (replaces icons with labels, disables scrollbars)

## Making Documentation Changes

### When Updating README.md
1. Match the official docs structure at https://docs.github.com/copilot/concepts/agents/about-copilot-cli
2. Keep prerequisites and installation instructions current
3. Preserve the friendly, concise tone
4. Test any CLI commands before documenting them

### When Updating changelog.md
- Add new entries at the **top** of the file
- Use format: `## 0.0.XXX - YYYY-MM-DD` followed by bullet points
- Link GitHub issues: `(fixes https://github.com/github/copilot-cli/issues/123)`
- Group related changes (features, fixes, improvements)
- Include breaking changes prominently (e.g., v0.0.340 MCP env var syntax change)

### Issue/PR Triage Labels
- `triage` - Newly opened, needs team review
- `more-info-needed` - Awaiting reporter response (auto-closes after 7 days)
- `unable-to-reproduce` - Team cannot reproduce, triggers auto-comment
- `enhancement` - Feature request, added to backlog (triggers auto-comment)
- `invalid` - Accidental/spam issues (auto-closed)
- `stale` - Issues older than 365 days (runs daily)
- `never-stale` - Exempt from stale marking
- `help wanted` - Community contributions welcome

## Workflow Patterns

### Handling Bug Reports
1. Verify reporter included version (`copilot --version`), OS, terminal, and logs
2. Check if issue is reproducible with latest version (frequent releases)
3. Search changelog for recent fixes (might already be resolved)
4. If info missing, label `more-info-needed` (see `.github/workflows/unable-to-reproduce-comment.yml` template)

### Handling Feature Requests
1. Label as `enhancement` (triggers auto-comment about backlog/upvoting)
2. Check if feature overlaps with existing MCP server capabilities or custom agents
3. Consider if it should be a CLI feature vs. MCP extension

### MCP Server Configuration (v0.0.340+ syntax)
Since v0.0.340, env var references require `${VAR}` syntax:
```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["server.js"],
      "env": {
        "API_KEY": "${MY_API_KEY}"  // ← Must use ${} for env var references
      }
    }
  }
}
```

## Version Context
- **Latest changelog entry**: v0.0.353 (2025-10-28)
- **Default model**: Claude Sonnet 4.5 (since v0.0.329)
- **Session format**: New format in `~/.copilot/session-state` (since v0.0.342)
- **Multi-line input**: Kitty protocol enabled by default (since v0.0.342)
- **Platform support**: Linux, macOS, Windows (experimental warning removed in v0.0.340)

## Common Pitfalls

1. **This repo doesn't contain CLI source code** - refer users to `npm install -g @github/copilot` or official docs
2. **MCP env var syntax change** - v0.0.340 broke configs without `${}` syntax
3. **Session file locations changed** - v0.0.342 moved to `session-state/` from `history-session-state/`
4. **Premium requests** - Each prompt consumes 1 premium request (all models are 1x multiplier)
5. **Organization policies** - CLI can be disabled at org/enterprise level (common support issue)

## Testing Documentation Changes

Since this is documentation-only, testing means:
- Verify CLI commands against actual installed CLI (`npm install -g @github/copilot`)
- Check that issue links resolve correctly
- Ensure changelog dates follow `YYYY-MM-DD` format
- Validate that workflow YAML syntax is correct (test with `actionlint` if available)

## Collections and Integrations

### Creating Agent Collections (awesome-copilot template)
When documenting custom agents or creating collections of related prompts/instructions:

**Collection Structure** (`collections/*.collection.yml`):
```yaml
id: copilot-cli-agents
name: Copilot CLI Custom Agents
description: Pre-built agents for common CLI workflows and GitHub integration tasks
tags: [cli, github, automation, agents]
items:
  - path: agents/github-issue-helper.agent.md
    kind: instruction
  - path: agents/mcp-config-generator.agent.md
    kind: instruction
display:
  ordering: alpha
  show_badge: false
```

**Best Practices**:
- Group 3-10 related items per collection
- Use descriptive IDs with lowercase, numbers, hyphens only
- Keep descriptions 1-500 characters
- Validate with schema before committing

### Reddit Integration Context (Devvit Platform)

When users ask about Reddit integration or Devvit:

**Key Concepts**:
- **Devvit**: Reddit's developer platform for building apps/games that live on Reddit
- **Use Cases**: Community games, custom mod tools, interactive experiences
- **Documentation**: https://developers.reddit.com/docs/
- **Community**: r/devvit subreddit and Discord server
- **Monetization**: Reddit Developer Funds (up to $167k per app)

**Integration with Copilot CLI**:
- Custom agents can help generate Devvit app scaffolding
- MCP servers could integrate Reddit API for community management
- CLI workflows for deploying/testing Reddit apps
- Example use case: `/agent reddit-mod-tool` to generate moderation utilities

**Example Agent Definition** (`.github/agents/reddit-devvit.agent.md`):
```markdown
---
name: Reddit Devvit Helper
description: Assists with Reddit app development using the Devvit platform
---

I help developers build Reddit apps using Devvit. I can:
- Generate Devvit app scaffolding and project structure
- Explain Reddit API concepts and integration patterns
- Suggest mod tools and community game implementations
- Reference Devvit documentation at developers.reddit.com/docs
```

### Stripe Payment Integration

When users ask about payment processing, subscriptions, or Stripe:

**Key Concepts**:
- **Stripe API**: Payment processing platform for online transactions
- **Use Cases**: One-time payments, subscriptions, invoicing, refunds
- **MCP Server**: `@stripe/mcp-server` for Stripe operations
- **Security**: Server-side API keys, webhook verification, PCI compliance

**Integration with Copilot CLI**:
- Custom agents for payment flow implementation
- MCP server configuration in `~/.copilot/mcp-config.json`
- Tools for customer, subscription, and invoice management
- CLI workflows for testing payment scenarios

**Available Tools**:
- `create_customer`, `list_customers` - Customer management
- `fetch_stripe_resources` - Retrieve payment intents, charges, invoices, products
- `create_payment_link`, `create_refund` - Payment operations
- `create_subscription`, `update_subscription`, `cancel_subscription` - Subscription management
- `create_product`, `create_price` - Product catalog management

### Unity Avatar Systems & Game Development

When users ask about Unity, game development, or avatar systems:

**Key Concepts**:
- **Unity 6.2 LTS**: Modern game engine for 3D/XR development
- **MCP Workflow**: 8 MCP servers for development productivity
- **Use Cases**: Character controllers, multiplayer avatars, economy systems
- **Architecture**: Character systems, banking, inventory, XR interaction

**MCP Server Stack for Unity Development**:
```
🦋 8 MCP Servers:
├── Filesystem - Asset management
├── Git - Version control
├── GitHub - Social coding
├── Memory - Persistent state
├── Sequential Thinking - Logic processing
├── Everything - Universal operations
├── Brave Search - Resource discovery
└── Postgres - Data storage
```

**Integration with Copilot CLI**:
- Custom agents for Unity character controller generation
- Economy and banking system implementation
- Particle effects and visual feedback systems
- Multiplayer synchronization with Netcode
- XR interaction toolkit integration

### Awesome Copilot Discovery System

When users need to discover or suggest Copilot resources:

**Key Concepts**:
- **Awesome Copilot**: Curated repository of Copilot collections, agents, prompts
- **Collections**: Organized sets of instructions, prompts, and chat modes
- **Meta Prompting**: Prompts that help discover and generate other prompts
- **Repository**: https://github.com/github/awesome-copilot

**Available Resources**:
- Meta Agentic Project Scaffold (chat mode)
- Suggest Awesome GitHub Copilot Collections (prompt)
- Suggest Awesome GitHub Copilot Custom Agents (prompt)
- Suggest Awesome GitHub Copilot Custom Chat Modes (prompt)
- Suggest Awesome GitHub Copilot Instructions (prompt)
- Suggest Awesome GitHub Copilot Prompts (prompt)

**Integration with Copilot CLI**:
- Discovery agent finds relevant collections based on repo context
- Avoids duplicate resources in existing workflow
- Automatic installation of collection assets
- Tag-based discovery (github-copilot, discovery, meta, prompt-engineering, agents)
- Meta agentic project scaffolding

### Hugging Face ML Integration

When users need machine learning and AI model capabilities:

**Key Concepts**:
- **Hugging Face Transformers**: Model-definition framework for state-of-the-art ML
- **Pipeline**: Optimized inference API for text, vision, audio, multimodal tasks
- **Trainer**: Comprehensive training with mixed precision, FlashAttention, torch.compile
- **Generate**: Fast text generation for LLMs/VLMs with streaming
- **Hub**: 1M+ pretrained model checkpoints

**Use Cases**:
- Text generation (LLMs like Llama, GPT)
- Image classification and segmentation
- Speech recognition (Whisper)
- Sentiment analysis and NLP tasks
- Vision language models (VLMs)
- Fine-tuning on custom datasets

**MCP Server Configuration** (`~/.copilot/mcp-config.json`):
```json
{
  "mcpServers": {
    "huggingface": {
      "command": "npx",
      "args": ["-y", "@huggingface/mcp-server"],
      "env": {
        "HF_TOKEN": "${HUGGINGFACE_TOKEN}"
      }
    }
  }
}
```

**Available Tools**:
- `hf_model_search` - Search 1M+ models by task, author, tags
- `hf_dataset_search` - Find datasets on Hugging Face Hub
- `hf_paper_search` - Discover ML research papers
- `hf_space_search` - Find Spaces (demos and apps)
- `hf_doc_fetch` - Retrieve documentation
- `hub_repo_details` - Get model/dataset/space information

**Integration Patterns**:
- **+ Stripe**: AI-powered subscription features (content generation, moderation)
- **+ Unity**: NPC dialogue, voice synthesis, emotion detection
- **+ Reddit Devvit**: Comment moderation, sentiment analysis, content filtering
- **+ GitHub**: Code generation, issue triage, PR review automation

**Performance Optimization**:
- FlashAttention for efficient attention computation
- Torch.compile for faster inference
- 4-bit/8-bit quantization for memory efficiency
- Deployment to vLLM, SGLang, TGI for production
- Batching for throughput

**Resources**:
- Hub: https://huggingface.co/models
- Docs: https://huggingface.co/docs/transformers
- Course: https://huggingface.co/learn/llm-course
- Community: https://discuss.huggingface.co/

### C# .NET Development Integration

When users need C# and .NET development guidance:

**Key Concepts**:
- **Modern C#**: C# 12+ with records, pattern matching, nullable reference types
- **ASP.NET Core**: Minimal APIs, MVC, Razor Pages, middleware pipeline
- **Async Patterns**: async/await, ValueTask, cancellation tokens, parallel operations
- **Testing**: xUnit, Moq/NSubstitute, WebApplicationFactory for integration tests
- **Architecture**: Clean Architecture, DDD, SOLID principles, CQRS

**Use Cases**:
- Minimal API development with OpenAPI/Swagger
- Async/await best practices and optimization
- Unit testing with xUnit and mocking frameworks
- Clean Architecture implementation
- Entity Framework Core and database patterns
- Dependency injection and configuration

**Integration Patterns**:
- **+ Stripe**: Payment processing in .NET with Stripe.net SDK
- **+ Hugging Face**: ML.NET integration with Hugging Face models
- **+ GitHub**: GitHub Apps and webhooks in ASP.NET Core
- **+ Unity**: Backend services for Unity games with SignalR

**Best Practices**:
- Use async/await all the way (no blocking)
- Implement proper cancellation token support
- Follow Clean Architecture separation
- Use Options pattern for configuration
- Implement comprehensive error handling middleware
- Write integration tests with WebApplicationFactory

**Resources**:
- Docs: https://docs.microsoft.com/dotnet/
- ASP.NET: https://docs.microsoft.com/aspnet/core/
- xUnit: https://xunit.net/
- EF Core: https://docs.microsoft.com/ef/core/

### Commander Brandynette Meta-Orchestration

When users need to coordinate multiple agents or manage complex workflows:

**Key Concepts**:
- **Meta-Orchestration**: Coordinating multiple specialized agents for complex tasks
- **URL Management**: Centralizing and monitoring platform endpoints and webhooks
- **Workflow Automation**: Sequential, parallel, and conditional execution patterns
- **Cross-Platform Integration**: Connecting GitHub, Stripe, Unity, Hugging Face, Reddit

**Use Cases**:
- Multi-agent coordination for complex projects
- Managing API endpoints across multiple platforms
- Automating deployment and integration workflows
- Event-driven automation with webhooks
- Health monitoring for distributed services

**Orchestration Patterns**:
- **Sequential**: Step-by-step workflows with dependencies
- **Parallel**: Simultaneous execution with result aggregation
- **Conditional**: Decision trees and routing logic
- **Event-Driven**: Webhook triggers and automation

**Available Agents for Coordination**:
- GitHub Issue Helper - Issue management
- Reddit Devvit - Community integration
- Stripe Integration - Payment processing
- Hugging Face ML - AI/ML capabilities
- C# .NET Development - Backend services
- Unity Avatar System - Game development
- Awesome Copilot Discovery - Resource discovery

**Integration Examples**:
- **Unity + Hugging Face + Stripe**: AI-powered game with in-game purchases
- **GitHub + Reddit + Stripe**: Community-driven development with subscriptions
- **C# + Stripe + Hugging Face**: Enterprise AI services with payments
- **Multi-Platform CI/CD**: Coordinated deployment across all platforms

**MCP Server Stack** (10 servers for full orchestration):
```json
{
  "mcpServers": {
    "filesystem": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-filesystem"] },
    "git": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-git"] },
    "github": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-github"], "env": {"GITHUB_TOKEN": "${GITHUB_TOKEN}"} },
    "memory": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-memory"] },
    "sequential-thinking": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"] },
    "everything": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-everything"] },
    "brave-search": { "command": "uvx", "args": ["mcp-server-brave-search"], "env": {"BRAVE_API_KEY": "${BRAVE_API_KEY}"} },
    "postgres": { "command": "uvx", "args": ["mcp-server-postgres"], "env": {"DATABASE_URL": "${DATABASE_URL}"} },
    "stripe": { "command": "npx", "args": ["-y", "@stripe/mcp-server"], "env": {"STRIPE_API_KEY": "${STRIPE_SECRET_KEY}"} },
    "huggingface": { "command": "npx", "args": ["-y", "@huggingface/mcp-server"], "env": {"HF_TOKEN": "${HUGGINGFACE_TOKEN}"} }
  }
}
```

**Best Practices**:
- Define clear handoff points between agents
- Use standardized data formats for communication
- Implement rollback strategies for failures
- Monitor resource usage across agents
- Centralize endpoint configuration
- Implement health checks and circuit breakers
- Use exponential backoff for retries

**Resources**:
- Agent Documentation: `.github/agents/commander-brandynette.agent.md`
- Collection Manifest: `collections/meta-orchestration.collection.yml`
- MCP Documentation: https://modelcontextprotocol.io/docs
- Orchestration Patterns: https://microservices.io/patterns/

### Security & Code Quality Best Practices

When users need secure, accessible, performant, and maintainable code:

**Key Concepts**:
- **OWASP Security**: Protecting against Top 10 vulnerabilities (access control, crypto failures, injection, etc.)
- **WCAG 2.2 AA Accessibility**: Ensuring code is usable by everyone including assistive technology users
- **Performance Optimization**: Frontend, backend, and database optimization strategies
- **Object Calisthenics**: 9 rules for clean domain code (single responsibility, small classes, no getters/setters)
- **Self-Explanatory Code**: Writing code that documents itself with minimal comments

**Security Implementation**:
- Parameterized queries to prevent SQL injection
- Environment variables for secret management (never hardcode)
- Rate limiting and account lockout for authentication
- Security headers (CSP, HSTS, X-Content-Type-Options)
- HTTPS everywhere with proper certificate validation
- Input validation with allowlists for SSRF prevention

**Accessibility Requirements**:
- Keyboard navigation with skip links and focus management
- 4.5:1 contrast ratio for text, 3:1 for UI components
- Semantic HTML with proper ARIA attributes
- Alt text for informative images, hidden decorative images
- Form labels and error messages with aria-invalid
- People-first language ("person using screen reader")

**Performance Strategies**:
- Frontend: Lazy loading, code splitting, image optimization (WebP/AVIF), CDN
- Backend: Async/await, caching (Redis), connection pooling, efficient algorithms
- Database: Indexed queries, N+1 prevention, pagination, avoid SELECT *
- Profiling: Chrome DevTools, Lighthouse, Core Web Vitals monitoring

**Object Calisthenics (Domain Code)**:
1. One level of indentation per method
2. No ELSE keyword (use guard clauses)
3. Wrap primitives in value objects
4. First class collections (encapsulate lists)
5. One dot per line
6. No abbreviations (meaningful names)
7. Keep entities small (<50 lines, <10 methods)
8. Two instance variables maximum (loggers don't count)
9. No getters/setters in domain classes (use factory methods)

**Code Commenting Guidelines**:
- Comment WHY, not WHAT
- Explain complex business logic and algorithms
- Document regex patterns and API constraints
- Use standard annotations (TODO, FIXME, HACK, SECURITY, PERF)
- Avoid obvious comments, dead code, changelog comments
- Refactor instead of commenting when possible

**Integration Patterns**:
- **+ Stripe**: Validate webhook signatures, secure API keys, idempotent payments
- **+ Unity**: Optimize assets, accessible UI, secure multiplayer
- **+ C# .NET**: Async best practices, Clean Architecture, Span<T> for performance
- **+ Hugging Face**: Validate model inputs, optimize inference, accessible AI content

**Command Patterns**:
```bash
# Security audits
npm audit --audit-level=moderate
dotnet list package --vulnerable
bandit -r . --severity-level medium

# Accessibility testing
npx lighthouse https://example.com --only-categories=accessibility
axe-core test.html

# Performance profiling
node --prof app.js
dotnet trace collect --process-id <PID>
```

**Resources**:
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- Web.dev Performance: https://web.dev/performance/
- Object Calisthenics: https://www.cs.helsinki.fi/u/luontola/tdd-2009/ext/ObjectCalisthenics.pdf
- Agent Documentation: `.github/agents/security-best-practices.agent.md`

### Markdown Documentation Best Practices

When users need well-structured, accessible, and maintainable documentation:

**Key Concepts**:
- **Structure & Hierarchy**: Proper heading levels (H2, H3), never use H1
- **Formatting Standards**: Consistent code blocks with language specification, proper lists, tables
- **Accessibility**: Alt text for images, descriptive link text, semantic structure
- **Readability**: Line length under 400 characters, proper whitespace
- **Validation**: Front matter requirements, content compliance

**Heading Guidelines**:
```markdown
<!-- GOOD: Clear hierarchy -->
## Installation
### Prerequisites
### Step-by-Step Guide

## Configuration
### Environment Variables

<!-- BAD: Skipped levels, using H1 -->
# Title (never use H1)
## Section
#### Subsection (skipped H3)
```

**Code Blocks**:
```markdown
<!-- GOOD: Language specified -->
```javascript
const example = 'Always specify language';
\`\`\`

```python
def example():
    return "Python code"
\`\`\`

<!-- BAD: No language -->
```
code without language
\`\`\`
```

**Images & Accessibility**:
```markdown
<!-- GOOD: Descriptive alt text -->
![Architecture diagram showing three-tier application with frontend, API, and database](architecture.png)

<!-- BAD: Missing alt text -->
![](screenshot.png)
```

**Links**:
```markdown
<!-- GOOD: Descriptive -->
Read the [installation guide](docs/install.md) for setup.

<!-- BAD: Non-descriptive -->
Click [here](docs/install.md).
```

**Common Patterns**:
- README structure: Description, Features, Installation, Quick Start, Documentation, License
- API documentation: Syntax, Parameters, Returns, Examples, Throws
- Changelog format: [Version] - Date, Added/Changed/Deprecated/Removed/Fixed/Security

**Resources**:
- GitHub Flavored Markdown: https://github.github.com/gfm/
- CommonMark Spec: https://spec.commonmark.org/
- Markdown Guide: https://www.markdownguide.org/
- Agent Documentation: `.github/agents/markdown-documentation.agent.md`

### Memory Bank Project Context Management

When users need to maintain project continuity across sessions:

**Key Concepts**:
- **Memory Bank**: Structured documentation system that survives memory resets
- **Core Files**: Required documents (projectbrief, productContext, activeContext, systemPatterns, techContext, progress)
- **Task Management**: Detailed task tracking with progress logs and subtasks
- **Project Intelligence**: Learning journal capturing patterns and preferences

**Core Files Structure**:
```
memory-bank/
├── projectbrief.md          # Foundation document
├── productContext.md        # Why this exists
├── activeContext.md         # Current work focus
├── systemPatterns.md        # Architecture & patterns
├── techContext.md           # Technologies used
├── progress.md              # Status & known issues
├── instructions.md          # Project intelligence
└── tasks/                   # Task management
    ├── _index.md            # Master task list
    ├── TASK001-feature.md   # Individual tasks
    └── TASK002-bugfix.md
```

**Task Management**:
```markdown
# [TASK001] - Feature Name

**Status:** In Progress  
**Added:** 2025-03-15  
**Updated:** 2025-03-18

## Progress Tracking
**Overall Status:** In Progress - 60% Complete

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Subtask 1 | Complete | 2025-03-15 | Done |
| 1.2 | Subtask 2 | In Progress | 2025-03-18 | 50% |

## Progress Log
### 2025-03-18
- Completed subtask 1.1
- Started work on subtask 1.2
```

**Task Commands**:
- `add task [name]` - Create new task with unique ID
- `update task [ID]` - Update progress and status
- `show tasks [filter]` - View tasks (all, active, pending, completed, blocked)

**Core Workflows**:
- **Plan Mode**: Read all files → propose approach → create task → update context
- **Act Mode**: Read task file → implement → update progress → update status
- **Update Memory Bank**: Review ALL files → update recent changes → update progress

**Best Practices**:
- Read ALL memory bank files at start of every task (not optional)
- Update activeContext.md every session
- Update progress.md after significant milestones
- Add progress log entries with dates
- Maintain task files with detailed thought process

**Resources**:
- Memory Bank methodology documentation
- Task tracking patterns
- Agent Documentation: `.github/agents/memory-bank.agent.md`

### Docker Containerization Best Practices

When users need container optimization, security, and sustainable infrastructure:

**Key Concepts**:
- **Multi-Stage Builds**: Separate build and runtime dependencies for 70-90% smaller images
- **Minimal Base Images**: Alpine (120 MB), Slim (150 MB), Distroless (80 MB) vs Full (900 MB)
- **Security by Default**: Non-root users, minimal attack surface, vulnerability scanning
- **Sustainable Infrastructure**: Optimized resources reduce costs AND environmental impact

**Use Cases**:
- Optimizing Docker images and build times
- Implementing container security best practices
- Setting up production-ready Docker Compose files
- Troubleshooting image size, build performance, and runtime issues
- Integrating containers with Stripe, databases, ML models

**Win-Win Economics**:
```
100 MB image vs 1 GB image (100 containers, 100x/day):
- Storage: $50 vs $500/month
- Bandwidth: $90 vs $900/month  
- Annual savings: $15,120
- Carbon reduction: ~5 tons CO2/year
```

**Multi-Stage Build Pattern**:
```dockerfile
# Stage 1: Build (includes dev tools)
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production (minimal runtime)
FROM node:18-alpine AS production
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

**Security Checklist**:
- [ ] Non-root user defined
- [ ] Minimal base image used
- [ ] .dockerignore configured
- [ ] No secrets in image layers
- [ ] Health check implemented
- [ ] Vulnerability scanning in CI/CD

**Integration Patterns**:
- **+ Stripe**: Secure payment processing containers
- **+ PostgreSQL**: Database containers with proper persistence
- **+ Hugging Face**: ML inference containers
- **+ Python MCP**: Containerized MCP servers

**Resources**:
- Docker Best Practices: https://docs.docker.com/develop/dev-best-practices/
- Hadolint (Linter): https://github.com/hadolint/hadolint
- Trivy (Scanner): https://trivy.dev/
- Agent Documentation: `.github/agents/docker-containerization.agent.md`

### Database Management & Optimization

When users need database administration, SQL optimization, or data stewardship:

**Key Concepts**:
- **Data Privacy**: User data is sacred trust - encrypt, minimize, audit
- **Performance Optimization**: Fast queries = happy users + lower costs
- **Data Integrity**: Constraints prevent corruption and enforce business rules
- **Auditability**: All changes traceable with comprehensive logging

**Use Cases**:
- PostgreSQL and SQL Server administration
- SQL query optimization and indexing strategies
- Database schema design with constraints
- Implementing audit trails and GDPR compliance
- Performance monitoring and troubleshooting

**Optimization Economics**:
```
Slow query (500ms, 1000x/day) → Optimized (5ms, 1000x/day):
- 100x performance improvement
- 99% compute cost reduction
- Happier users
- Better scalability
```

**Schema Best Practices**:
```sql
CREATE TABLE order (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES user(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,  -- Soft deletes
    
    CONSTRAINT chk_amount CHECK (total_amount > 0),
    CONSTRAINT chk_status CHECK (
        status IN ('pending', 'processing', 'shipped', 'delivered')
    )
);

-- Essential indexes
CREATE INDEX idx_order_user_id ON order(user_id);
CREATE INDEX idx_order_status ON order(status) WHERE deleted_at IS NULL;
```

**Security Patterns**:
```sql
-- Parameterized queries (prevent SQL injection)
cursor.execute("SELECT * FROM user WHERE email = %s", (user_input,))

-- Column-level encryption for PII
INSERT INTO payment_method (card_number_encrypted)
VALUES (pgp_sym_encrypt('4532-1234-5678-9010', 'key'));

-- Row-level security for multi-tenancy
CREATE POLICY tenant_isolation ON tenant_data
    USING (tenant_id = current_setting('app.tenant_id')::INT);
```

**Ethical Data Practices**:
- ✅ Collect only necessary data (data minimization)
- ✅ Obtain informed consent
- ✅ Implement right to deletion (GDPR)
- ✅ Audit all data access
- ❌ No dark patterns in schema design

**Integration Patterns**:
- **+ Stripe**: Idempotent payment transaction records
- **+ Docker**: Containerized databases with proper backups
- **+ Python MCP**: Database tools with type-safe queries

**Resources**:
- PostgreSQL Docs: https://www.postgresql.org/docs/
- Use The Index, Luke: https://use-the-index-luke.com/
- Postgres MCP Server: `npx -y @modelcontextprotocol/server-postgres`
- Agent Documentation: `.github/agents/database-management.agent.md`

### Python MCP Server Development

When users need to build Model Context Protocol servers in Python:

**Key Concepts**:
- **Type Safety**: Type hints are mandatory - they drive schema generation and validation
- **Structured Output**: Return Pydantic models for machine-readable data
- **Context Management**: Use lifespan for shared resources (DB pools, HTTP clients)
- **Observability**: Context logging and progress reporting for transparency

**Use Cases**:
- Building MCP servers with FastMCP
- Implementing typed tools with Pydantic models
- Setting up stdio or HTTP transports
- Database integration with connection pooling
- LLM sampling and user elicitation
- Rate limiting and security

**Project Setup**:
```bash
# Initialize with uv
uv init mcp-server-demo
cd mcp-server-demo
uv add "mcp[cli]"

# Test with Inspector
uv run mcp dev server.py

# Install in Claude Desktop
uv run mcp install server.py
```

**Type-Safe Tool Pattern**:
```python
from mcp.server.fastmcp import FastMCP
from pydantic import BaseModel, Field

mcp = FastMCP("My Server")

class WeatherData(BaseModel):
    """Weather information"""
    temperature: float = Field(description="Temperature in Celsius")
    condition: str
    humidity: float = Field(ge=0, le=100)

@mcp.tool()
def get_weather(city: str) -> WeatherData:
    """
    Get weather for a city.
    
    LLM knows exact return type and can parse reliably!
    """
    return WeatherData(
        temperature=22.5,
        condition="sunny",
        humidity=65.0
    )
```

**Lifespan Context Pattern**:
```python
from contextlib import asynccontextmanager
from dataclasses import dataclass

@dataclass
class AppContext:
    db_pool: asyncpg.Pool

@asynccontextmanager
async def app_lifespan(server: FastMCP):
    # Startup: create connection pool
    pool = await asyncpg.create_pool(dsn=os.environ["DATABASE_URL"])
    try:
        yield AppContext(db_pool=pool)
    finally:
        # Shutdown: cleanup
        await pool.close()

mcp = FastMCP("DB Server", lifespan=app_lifespan)

@mcp.tool()
async def query(sql: str, ctx: Context) -> List[dict]:
    """Query database using pooled connection"""
    pool = ctx.request_context.lifespan_context.db_pool
    async with pool.acquire() as conn:
        rows = await conn.fetch(sql)
        return [dict(row) for row in rows]
```

**Security Best Practices**:
```python
from pydantic import BaseModel, validator

class FileOp(BaseModel):
    path: str
    
    @validator("path")
    def validate_path(cls, v):
        # Prevent path traversal
        if ".." in v or v.startswith("/"):
            raise ValueError("Invalid path")
        return v

@mcp.tool()
def safe_file_operation(params: FileOp) -> dict:
    """Pydantic validates inputs automatically"""
    # Safe to proceed - validation already done!
    with open(params.path, "r") as f:
        return {"content": f.read()}
```

**Ethical API Design**:
- ✅ Transparent capabilities (document limitations)
- ✅ Privacy-respecting (data minimization)
- ✅ User control (consent and opt-out)
- ✅ Rate limiting (prevent abuse)

**Integration Patterns**:
- **+ Stripe**: Payment processing with Stripe SDK
- **+ PostgreSQL**: Database tools with connection pooling
- **+ Docker**: Containerized MCP servers
- **+ Hugging Face**: ML model inference tools

**Resources**:
- MCP Python SDK: https://github.com/modelcontextprotocol/python-sdk
- FastMCP Docs: https://modelcontextprotocol.io/docs/tools/fastmcp
- Pydantic: https://docs.pydantic.dev/
- Agent Documentation: `.github/agents/python-mcp-development.agent.md`


