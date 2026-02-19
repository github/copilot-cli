# GitHub Copilot CLI: Liku Edition (Public Preview)

[![npm version](https://img.shields.io/npm/v/copilot-liku-cli.svg)](https://www.npmjs.com/package/copilot-liku-cli)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE.md)

The power of GitHub Copilot, now with visual-spatial awareness and advanced automation.

GitHub Copilot-Liku CLI brings AI-powered coding assistance and UI automation directly to your terminal. This "Liku Edition" extends the standard Copilot experience with an ultra-thin Electron overlay, allowing the agent to "see" and interact with your screen through a coordinated grid system and native UI automation.

See [our official documentation](https://docs.github.com/copilot/concepts/agents/about-copilot-cli) or the [Liku Architecture](ARCHITECTURE.md) for more information.

![Image of the splash screen for the Copilot CLI](https://github.com/user-attachments/assets/51ac25d2-c074-467a-9c88-38a8d76690e3)

## 🚀 Introduction and Overview

We're bringing the power of GitHub Copilot coding agent directly to your terminal, enhanced with Liku's visual awareness. Work locally and synchronously with an AI collaborator that understands your code AND your UI state.

- **Unified Intelligence:** Combines terminal-native development with visual-spatial awareness.
- **Ultra-Thin Overlay:** A transparent Electron layer for high-performance UI element detection and interaction.
- **Multi-Agent Orchestration:** A sophisticated **Supervisor-Builder-Verifier** pattern for complex, multi-step task execution.
- **Liku CLI Suite:** A comprehensive set of automation tools (`click`, `find`, `type`, `keys`, `screenshot`) available from any shell.
- **Defensive AI Architecture:** Engineered for minimal footprint ($<300$MB memory) and zero-intrusion workflows.

## 🛠️ The Liku CLI (`liku`)

The `liku` command is your entry point for visual interaction and automation. It can be used alongside the standard `copilot` command.

### Launching the Agent
```bash
liku start
# or simply
liku
```
This launches the Electron-based visual agent including the chat interface and the transparent overlay.

### Automation Commands
| Command | Usage | Description |
| :--- | :--- | :--- |
| `click` | `liku click "Submit" --double` | Click UI element by text or coordinates. |
| `find` | `liku find "Save" --type Button` | Locate elements using native UI Automation / OCR. |
| `type` | `liku type "Hello World"` | Input string at the current cursor position. |
| `keys` | `liku keys ctrl+s` | Send complex keyboard combinations. |
| `window` | `liku window "VS Code"` | Focus a specific application window. |
| `screenshot`| `liku screenshot` | Capture the current screen state for analysis. |
| `repl` | `liku repl` | Launch an interactive automation shell. |

### Power User Examples
- **Chained Automation**: `liku window "Notepad" && liku type "Done!" && liku keys ctrl+s`
- **Coordinate Precision**: `liku click 500,300 --right`
- **JSON Processing**: `liku find "*" --json | jq '.[0].name'`

## 👁️ Visual Awareness & Grid System

Liku perceives your workspace through a dual-mode interaction layer.

- **Passive Mode:** Fully click-through, remaining dormant until needed.
- **Dot-Grid Targeting:** When the agent needs to target a specific point, it generates a coordinate grid (Coarse ~100px or Fine ~25px) using alphanumeric labels (e.g., `A1`, `C3.21`).
- **Live UI Inspection:** Uses native accessibility trees (Windows UI Automation) to highlight and "lock onto" buttons, menus, and text fields in real-time.

### Global Shortcuts (Overlay)
- `Ctrl+Alt+Space`: Toggle the Chat Interface.
- `Ctrl+Alt+F`: Toggle **Fine Grid** (Precise targeting).
- `Ctrl+Alt+I`: Toggle **Inspect Mode** (UI Element highlighting).
- `Ctrl+Shift+O`: Toggle Overlay Visibility.

## 🤖 Multi-Agent System

The Liku Edition moves beyond single-turn responses with a specialized team of agents:

- **Supervisor**: Task planning and decomposition.
- **Builder**: Code implementation and file modifications.
- **Verifier**: Phased validation and automated testing.
- **Researcher**: Workspace context gathering and info retrieval.

### Chat Slash Commands
- `/orchestrate <task>`: Start full multi-agent workflow.
- `/research <query>`: Execute deep workspace/web research.
- `/build <spec>`: Generate implementation from a spec.
- `/verify <target>`: Run validation checks on a feature or UI.
- `/agentic`: Toggle **Autonomous Mode** (Allow AI actions without manual confirmation).

## 📦 Getting Started

### Prerequisites

- **Node.js** v22 or higher
- **npm** v10 or higher
- (On Windows) **PowerShell** v6 or higher
- An **active Copilot subscription**.

### Installation

#### Global Installation (Recommended for Users)

Install globally from npm:
```bash
npm install -g copilot-liku-cli
```

This will make the `liku` command available globally from any directory.

To verify installation:
```bash
liku --version
```

To update to the latest version:
```bash
npm update -g copilot-liku-cli
```

#### Local Development Installation

To install the Liku Edition for local development and contributing:
```bash
git clone https://github.com/TayDa64/copilot-Liku-cli
cd copilot-Liku-cli
npm install
npm link
```
This will make the `liku` command available globally, linked to your local development copy.

**Note for contributors:** Use `npm link` during development so changes are immediately reflected without reinstalling.

### Authenticate

If you're not logged in, launch the agent and use the `/login` slash command, or set a personal access token (PAT):
1. Visit [GitHub PAT Settings](https://github.com/settings/personal-access-tokens/new)
2. Enable "Copilot Requests" permission.
3. Export `GH_TOKEN` or `GITHUB_TOKEN` in your environment.

## ✅ Quick Verify (Recommended)

Shortcut source-of-truth is `src/main/index.js` (current mapping includes
chat `Ctrl+Alt+Space` and overlay `Ctrl+Shift+O` on Windows).

Run these checks in order after setup:

```bash
# 1) Deterministic runtime smoke test (recommended default)
npm run smoke:shortcuts

# 2) Direct chat visibility smoke (no keyboard emulation)
npm run smoke:chat-direct

# 3) UI automation baseline checks
npm run test:ui
```

Why this order:
- Confirms app/runtime health before shortcut diagnostics.
- Avoids accidental key injection into non-target apps.
- Produces reliable pass/fail exit codes for local automation.
- Keeps chat validation deterministic (direct in-app toggle) while still
  validating keyboard routing for overlay actions.

## 🛠️ Technical Architecture

GitHub Copilot-Liku CLI is built on a "Defensive AI" architecture—a design philosophy focused on minimal footprint, secure execution, and zero-intrusion workflows. 

### Performance Benchmarks

Engineered for performance and stability, the system hits the following metrics:
- **Memory Footprint**: $< 300$MB steady-state (~150MB baseline).
- **CPU Usage**: $< 0.5\%$ idle; $< 2\%$ in selection mode.
- **Startup Latency**: $< 3$ seconds from launch to functional state.

### Security & Isolation

- **Hardened Electron Environment**: Uses `contextIsolation` and `sandbox` modes to prevent prototype pollution.
- **Content Security Policy (CSP)**: Strict headers to disable unauthorized external resources.
- **Isolated Preload Bridges**: Secure IPC routing where renderers only have access to necessary system APIs.

## 🚧 Overlay Development

See `docs/inspect-overlay-plan.md` for the inspect overlay plan and acceptance criteria.

## 📚 Documentation

- **[Installation Guide](INSTALLATION.md)** - Detailed installation instructions for all platforms
- **[Quick Start Guide](QUICKSTART.md)** - Get up and running quickly
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute to the project
- **[Publishing Guide](PUBLISHING.md)** - How to publish the package to npm
- **[Release Process](RELEASE_PROCESS.md)** - How to create and manage releases
- **[Architecture](ARCHITECTURE.md)** - System design and architecture
- **[Configuration](CONFIGURATION.md)** - Configuration options
- **[Testing](TESTING.md)** - Testing guide and practices

## 📢 Feedback and Participation

We're excited to have you join us early in the Copilot CLI journey.

This is an early-stage preview, and we're building quickly. Expect frequent updates--please keep your client up to date for the latest features and fixes!

Your insights are invaluable! Open issue in this repo, join Discussions, and run `/feedback` from the CLI to submit a confidential feedback survey!
