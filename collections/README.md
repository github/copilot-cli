# Copilot CLI Collections

This directory contains collections of custom agents and instructions for GitHub Copilot CLI, following the [awesome-copilot template](https://github.com/github/awesome-copilot/blob/main/collections/TEMPLATE.md).

## Available Collections

### `integrations.collection.yml`
Pre-built agents for integrating Copilot CLI with external platforms and services.

**Included Agents:**
- **Awesome Copilot Discovery**: Meta discovery of Copilot collections, agents, and prompts
- **Commander Brandynette**: Meta-orchestration for multi-agent workflows, URL management, cross-platform integration
- **C# .NET Development**: Expert guidance for C# and .NET with ASP.NET, async patterns, xUnit testing
- **Database Management**: PostgreSQL and SQL Server administration, SQL optimization, responsible data stewardship with GDPR compliance
- **Docker Containerization**: Container optimization with multi-stage builds, security best practices, and sustainable infrastructure
- **GitHub Issue Helper**: Issue triage, creation, and management for copilot-cli repository
- **Hugging Face ML**: AI/ML model integration for text, vision, audio, and multimodal tasks
- **Markdown Documentation**: Expert markdown formatting, structure, accessibility, documentation best practices
- **Memory Bank**: Project context management with task tracking, maintaining continuity across sessions
- **Python MCP Development**: Building Model Context Protocol servers in Python with FastMCP, type-safe tools, and ethical API design
- **Reddit Devvit Helper**: Reddit app development using the Devvit platform
- **Security & Code Quality**: OWASP security, WCAG 2.2 accessibility, performance optimization, object calisthenics
- **Stripe Integration**: Payment processing, subscriptions, and financial operations (verified customer: cus_T7HI2eMoOvIsqA)
- **Unity Avatar System**: Character controllers, MCP workflows, and game development

### `development-workflows.collection.yml`
Agentic workflows for game development, payment processing, and meta discovery.

**Included Agents:**
- **Unity Avatar System Designer**: Advanced Unity avatar systems with MCP integration
- **Stripe Payment Integration Helper**: Comprehensive payment and subscription management
- **Awesome Copilot Discovery Agent**: Resource discovery from awesome-copilot repository

### `development-languages.collection.yml`
Language-specific agents for modern development frameworks.

**Included Agents:**
- **C# .NET Development**: Expert guidance for C# and .NET with ASP.NET Core, async patterns, xUnit testing, Clean Architecture
- **Unity Avatar System**: Game development with Unity 6.2 LTS, character controllers, and MCP workflows

### `meta-orchestration.collection.yml`
Advanced multi-agent coordination and workflow automation.

**Included Agents:**
- **Commander Brandynette**: Meta-orchestration agent for coordinating complex multi-agent workflows, URL management, cross-platform integrations
- **Awesome Copilot Discovery**: Resource discovery and meta-prompting from awesome-copilot
- **GitHub Issue Helper**: Issue management integration for orchestrated workflows

### `security-best-practices.collection.yml`
Security, accessibility, performance, and code quality best practices.

**Included Agent:**
- **Security & Code Quality**: OWASP Top 10 security, WCAG 2.2 AA accessibility, frontend/backend/database performance optimization, object calisthenics for domain code, and self-explanatory code practices

### `documentation-tools.collection.yml`
Essential tools for creating documentation and maintaining project context.

**Included Agents:**
- **Markdown Documentation**: Expert markdown formatting following GitHub/CommonMark standards, proper heading hierarchy, code blocks with syntax highlighting, accessible images with alt text, table formatting, and documentation patterns
- **Memory Bank**: Project context management using Memory Bank methodology - tracks project state, active context, system patterns, progress, and tasks with detailed tracking across sessions

### `infrastructure.collection.yml`
Infrastructure, containers, databases, and MCP server development.

**Included Agents:**
- **Docker Containerization**: Container optimization with multi-stage builds (70-90% size reduction), security best practices (non-root users, vulnerability scanning, image signing), sustainable infrastructure economics ($15K annual savings example), integration patterns with Stripe/PostgreSQL/Hugging Face
- **Database Management**: PostgreSQL and SQL Server administration, SQL query optimization (100x performance improvement patterns), schema design with constraints, GDPR compliance, ethical data practices (data minimization, informed consent, transparent cancellation), integration with Stripe payment records and Docker containers
- **Python MCP Development**: Building Model Context Protocol servers with FastMCP, type-safe tools using Pydantic models, lifespan context management for resource pooling, observability with logging and progress reporting, ethical API design (transparency, privacy, user control), integration with Stripe/PostgreSQL/Docker/Hugging Face

### `ethical-technology.collection.yml`
All agents unified by the Holly Greed Principle - sustainable, win-win development.

**Core Philosophy**: "REINFORCE HOLLY GREED OF THE BANK, NEVER SCAM, BEST GREED IS THE GREED WHICH KNOWS SHARING IS WIN WIN"

This collection includes all 14 agents, each embodying sustainable technology practices:
- **Optimization Benefits All**: Smaller images reduce costs AND environmental impact
- **Security Protects Everyone**: Data protection safeguards reputation AND builds trust
- **Transparency Enables Collaboration**: Well-documented code helps teams AND communities
- **Fair Pricing Drives Growth**: Honest business models create loyalty AND sustainable revenue

**Key Principles:**
- Resource efficiency (optimize ruthlessly)
- Security by default (protect user data zealously)
- Transparency (document thoroughly)
- Ethical design (build for long-term trust)

**Compound Effect**: When you optimize and secure systems, you create faster performance + lower costs + better security + shared knowledge = sustainable success for all stakeholders.

## Using Custom Agents

### Interactive Mode
```bash
copilot
/agent github-issue-helper
```

### Non-Interactive Mode
```bash
copilot --agent reddit-devvit "Create a Reddit voting game for r/mycommunity"
```

## Collection Structure

Collections follow this schema:

```yaml
id: unique-identifier              # lowercase, numbers, hyphens only
name: Display Name                 # Human-readable name
description: Brief explanation     # 1-500 characters
tags: [tag1, tag2]                # Optional discovery tags (max 10)
items:                            # 1-50 items per collection
  - path: relative/path/to/file.agent.md
    kind: instruction             # or 'prompt', 'chat-mode'
display:
  ordering: alpha                 # 'alpha' or 'manual'
  show_badge: false              # Show collection badge
```

## Agent Locations

Custom agents are discovered from three locations (in order of precedence):

1. **User-level**: `~/.copilot/agents/*.agent.md`
2. **Repository-level**: `.github/agents/*.agent.md` (this repo)
3. **Organization-level**: Organization's `.github` repository → `.github/agents/*.agent.md`

## Creating New Agents

1. Create agent file in `.github/agents/` with `.agent.md` extension
2. Include frontmatter with `name`, `description`, and `tags`
3. Add to appropriate collection in `collections/`
4. Test with `copilot --agent <agent-name>`

Example agent structure:

```markdown
---
name: My Custom Agent
description: Brief description of what this agent does
tags: [tag1, tag2, tag3]
---

# Agent Title

Detailed instructions and capabilities...

## Usage Examples

Provide concrete examples of how to use this agent.
```

## Validation

To ensure collections follow the correct schema:

```bash
# Validate YAML syntax
yamllint collections/*.collection.yml

# Check referenced files exist
for file in $(yq eval '.items[].path' collections/*.collection.yml); do
  [ -f "$file" ] || echo "Missing: $file"
done
```

## Best Practices

1. **Meaningful Collections**: Group 3-10 related items per collection
2. **Clear Naming**: Use descriptive IDs and names
3. **Good Descriptions**: Explain who should use it and what benefit it provides
4. **Relevant Tags**: Add discovery tags for finding related collections
5. **Test Items**: Ensure all referenced files exist and work before adding

## Resources

- [Copilot CLI Documentation](https://docs.github.com/copilot/concepts/agents/about-copilot-cli)
- [Awesome Copilot Collections](https://github.com/github/awesome-copilot)
- [Custom Agents Guide](../README.md#-using-the-cli)
