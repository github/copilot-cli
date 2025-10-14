# GitHub Copilot CLI (Public Preview)

The power of GitHub Copilot, now in your terminal.

GitHub Copilot CLI brings AI-powered coding assistance directly to your command line, enabling you to build, debug, and understand code through natural language conversations. Powered by the same agentic harness as GitHub's Copilot coding agent, it provides intelligent assistance while staying deeply integrated with your GitHub workflow.

See [our official documentation](https://docs.github.com/copilot/concepts/agents/about-copilot-cli) for more information.

![Image of the splash screen for the Copilot CLI](https://github.com/user-attachments/assets/51ac25d2-c074-467a-9c88-38a8d76690e3)

## 🚀 Introduction and Overview

We're bringing the power of GitHub Copilot coding agent directly to your terminal. With GitHub Copilot CLI, you can work locally and synchronously with an AI agent that understands your code and GitHub context.

- **Terminal-native development:** Work with Copilot coding agent directly in your command line — no context switching required.
- **GitHub integration out of the box:** Access your repositories, issues, and pull requests using natural language, all authenticated with your existing GitHub account.
- **Agentic capabilities:** Build, edit, debug, and refactor code with an AI collaborator that can plan and execute complex tasks.
- **MCP-powered extensibility:** Take advantage of the fact that the coding agent ships with GitHub's MCP server by default and supports custom MCP servers to extend capabilities.
- **Full control:** Preview every action before execution — nothing happens without your explicit approval.

We're still early in our journey, but with your feedback, we're rapidly iterating to make the GitHub Copilot CLI the best possible companion in your terminal.

## ⚡ Quick Start

Get up and running in 3 steps:

```bash
# 1. Install
npm install -g @github/copilot

# 2. Launch
copilot

# 3. Authenticate (first time only)
/login
```

That's it! Start typing your coding questions or tasks in natural language.

## 📦 Getting Started

### Supported Platforms

- **Linux**
- **macOS**
- **Windows** (experimental)

### Prerequisites

- **Node.js** v22 or higher
- **npm** v10 or higher
- (On Windows) **PowerShell** v6 or higher
- An **active Copilot subscription**. See [Copilot plans](https://github.com/features/copilot/plans?ref_cta=Copilot+plans+signup&ref_loc=install-copilot-cli&ref_page=docs).

If you have access to GitHub Copilot via your organization or enterprise, you cannot use GitHub Copilot CLI if your organization owner or enterprise administrator has disabled it in the organization or enterprise settings. See [Managing policies and features for GitHub Copilot in your organization](http://docs.github.com/copilot/managing-copilot/managing-github-copilot-in-your-organization/managing-github-copilot-features-in-your-organization/managing-policies-for-copilot-in-your-organization) for more information.

### Installation

Install globally with npm:
```bash
npm install -g @github/copilot
```

### Launching the CLI

```bash
copilot
```

On first launch, you'll be greeted with our adorable animated banner! If you'd like to see this banner again, launch `copilot` with the `--banner` flag. 

If you're not currently logged in to GitHub, you'll be prompted to use the `/login` slash command. Enter this command and follow the on-screen instructions to authenticate.

#### Authenticate with a Personal Access Token (PAT)

You can also authenticate using a fine-grained PAT with the "Copilot Requests" permission enabled.

1. Visit https://github.com/settings/personal-access-tokens/new
2. Under "Permissions," click "add permissions" and select "Copilot Requests"
3. Generate your token
4. Add the token to your environment via the environment variable `GH_TOKEN` or `GITHUB_TOKEN` (in order of precedence)

### Using the CLI

Launch `copilot` in a folder that contains code you want to work with. 

By default, `copilot` utilizes Claude Sonnet 4.5. Run the `/model` slash command to choose from other available models, including Claude Sonnet 4 and GPT-5.

#### Common Commands

Once inside the CLI, you can use these slash commands:

- `/login` - Authenticate with your GitHub account
- `/model` - Switch between available AI models
- `/feedback` - Submit feedback about your experience
- `/clear` - Clear the current conversation
- `/exit` - Exit the CLI

#### Usage Tips

- **Start specific:** Begin prompts in the directory you want to work in for better context
- **Use natural language:** Describe what you want to accomplish in plain English
- **Review before approving:** Always review suggested changes before accepting them
- **Leverage GitHub context:** The CLI can access your repositories, issues, and PRs

Each time you submit a prompt to GitHub Copilot CLI, your monthly quota of premium requests is reduced by one. For information about premium requests, see [About premium requests](https://docs.github.com/copilot/managing-copilot/monitoring-usage-and-entitlements/about-premium-requests).

For more information about how to use the GitHub Copilot CLI, see [our official documentation](https://docs.github.com/copilot/concepts/agents/about-copilot-cli).


## 📢 Feedback and Participation

We're excited to have you join us early in the Copilot CLI journey.

This is an early-stage preview, and we're building quickly. Expect frequent updates—please keep your client up to date for the latest features and fixes!

### How to Provide Feedback

Your insights are invaluable! Here's how you can help:

- **Report issues:** Open an issue in this repo with detailed bug reports
- **Join discussions:** Participate in GitHub Discussions to share ideas
- **Quick feedback:** Run `/feedback` from within the CLI for a confidential survey
- **Stay updated:** Check the [changelog](./changelog.md) for recent updates

### Getting Help

- **Documentation:** See our [official documentation](https://docs.github.com/copilot/concepts/agents/about-copilot-cli)
- **Issues:** Search existing issues before creating new ones
- **Community:** Join discussions with other users and maintainers
