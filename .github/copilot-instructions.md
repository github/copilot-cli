# GitHub Copilot CLI Repository Instructions

## Repository Purpose

This is a **documentation and issue tracking repository** for the GitHub Copilot CLI product. The actual CLI code is not in this repo — it's distributed as the npm package `@github/copilot`. This repository contains:

- Public-facing documentation (`README.md`)
- Version history (`changelog.md`)
- GitHub workflows for issue/PR triage
- Issue templates for bug reports and feature requests

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

