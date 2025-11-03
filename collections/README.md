# Copilot CLI Collections

This directory contains collections of custom agents and instructions for GitHub Copilot CLI, following the [awesome-copilot template](https://github.com/github/awesome-copilot/blob/main/collections/TEMPLATE.md).

## Available Collections

### `integrations.collection.yml`
Pre-built agents for integrating Copilot CLI with external platforms and services.

**Included Agents:**
- **Awesome Copilot Discovery**: Meta discovery of Copilot collections, agents, and prompts
- **Commander Brandynette**: Meta-orchestration for multi-agent workflows, URL management, cross-platform integration
- **C# .NET Development**: Expert guidance for C# and .NET with ASP.NET, async patterns, xUnit testing
- **GitHub Issue Helper**: Issue triage, creation, and management for copilot-cli repository
- **Hugging Face ML**: AI/ML model integration for text, vision, audio, and multimodal tasks
- **Reddit Devvit Helper**: Reddit app development using the Devvit platform
- **Stripe Integration**: Payment processing, subscriptions, and financial operations
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
