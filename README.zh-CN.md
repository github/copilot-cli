# GitHub Copilot CLI

[English](README.md) | [简体中文](README.zh-CN.md)

将 GitHub Copilot 的强大能力带到你的终端。

GitHub Copilot CLI 将 AI 编程辅助直接带到命令行，让你通过自然语言对话构建、调试和理解代码。它由与 GitHub Copilot 编码代理相同的代理运行框架提供支持，在深度融入 GitHub 工作流的同时，为你提供智能协助。

更多信息请参阅[官方文档](https://docs.github.com/copilot/concepts/agents/about-copilot-cli)。

![Copilot CLI 启动画面](https://github.com/user-attachments/assets/f40aa23d-09dd-499e-9457-1d57d3368887)

## 🚀 简介与概览

我们将 GitHub Copilot 编码代理的强大能力直接带到你的终端。使用 GitHub Copilot CLI，你可以在本地与 AI 代理同步协作，让它理解你的代码和 GitHub 上下文。

- **原生终端开发：** 直接在命令行中使用 Copilot 编码代理，无需切换上下文。
- **开箱即用的 GitHub 集成：** 使用自然语言访问仓库、议题和拉取请求，并通过现有 GitHub 帐户完成身份验证。
- **代理能力：** 与能够规划并执行复杂任务的 AI 协作者一起构建、编辑、调试和重构代码。
- **由 MCP 驱动的扩展能力：** 编码代理默认集成 GitHub MCP 服务器，也支持自定义 MCP 服务器来扩展功能。
- **完全掌控：** 执行前预览每项操作；未经明确批准，不会执行任何操作。

GitHub Copilot CLI 仍在不断发展。我们会根据你的反馈快速迭代，努力让它成为你在终端中的得力伙伴。

## 📦 开始使用

### 支持的平台

- **Linux**
- **macOS**
- **Windows**

### 前置条件

- （Windows）**PowerShell** v6 或更高版本
- 有效的 **Copilot 订阅**。请参阅 [Copilot 方案](https://github.com/features/copilot/plans?ref_cta=Copilot+plans+signup&ref_loc=install-copilot-cli&ref_page=docs)。

如果你通过组织或企业使用 GitHub Copilot，而组织所有者或企业管理员已在设置中禁用 GitHub Copilot CLI，则无法使用它。详情请参阅[管理组织中的 GitHub Copilot 策略与功能](http://docs.github.com/copilot/managing-copilot/managing-github-copilot-in-your-organization/managing-github-copilot-features-in-your-organization/managing-policies-for-copilot-in-your-organization)。

### 安装

使用安装脚本安装（macOS 和 Linux）：

```bash
curl -fsSL https://gh.io/copilot-install | bash
```

或者：

```bash
wget -qO- https://gh.io/copilot-install | bash
```

使用 `| sudo bash` 以 root 身份运行，并安装到 `/usr/local/bin`。

设置 `PREFIX` 可将程序安装到 `$PREFIX/bin/`。以 root 身份运行时，默认值为 `/usr/local`；以非 root 用户身份运行时，默认值为 `$HOME/.local`。

设置 `VERSION` 可安装指定版本；默认安装最新版本。

例如，将版本 `v0.0.369` 安装到自定义目录：

```bash
curl -fsSL https://gh.io/copilot-install | VERSION="v0.0.369" PREFIX="$HOME/custom" bash
```

使用 [Homebrew](https://formulae.brew.sh/cask/copilot-cli) 安装（macOS 和 Linux）：

```bash
brew install copilot-cli
```

```bash
brew install copilot-cli@prerelease
```

使用 [WinGet](https://github.com/microsoft/winget-cli) 安装（Windows）：

```bash
winget install GitHub.Copilot
```

```bash
winget install GitHub.Copilot.Prerelease
```

使用 [npm](https://www.npmjs.com/package/@github/copilot) 安装（macOS、Linux 和 Windows）：

```bash
npm install -g @github/copilot
```

```bash
npm install -g @github/copilot@prerelease
```

### 启动 CLI

```bash
copilot
```

首次启动时，你会看到动画横幅。之后如需再次查看，可使用 `--banner` 标志启动 `copilot`。

如果你尚未登录 GitHub，系统会提示你使用 `/login` 斜杠命令。输入该命令，并按照屏幕上的说明完成身份验证。

#### 使用个人访问令牌（PAT）进行身份验证

你也可以使用启用了“Copilot Requests”权限的细粒度 PAT 进行身份验证。

1. 访问 https://github.com/settings/personal-access-tokens/new
2. 在“Permissions”（权限）下，点击“add permissions”（添加权限），然后选择“Copilot Requests”
3. 生成令牌
4. 通过环境变量 `GH_TOKEN` 或 `GITHUB_TOKEN` 设置令牌（按此顺序优先使用）

### 使用 CLI

在包含待处理代码的文件夹中运行 `copilot`。

默认情况下，`copilot` 使用 Claude Sonnet 4.5。运行 `/model` 斜杠命令可选择其他可用模型，包括 Claude Sonnet 4 和 GPT-5。

### 容器镜像

Copilot CLI 也提供容器镜像，可作为 Copilot SDK 客户端使用的无头服务器。镜像发布在 `ghcr.io/github/copilot-cli`，支持 `linux/amd64` 和 `linux/arm64`。此镜像用于让 SDK 客户端连接服务器，而非用于交互式终端操作。

设置连接令牌和 GitHub 令牌，然后启动服务器：

```bash
export COPILOT_CONNECTION_TOKEN="$(openssl rand -hex 32)"
docker run --rm \
  -p 127.0.0.1:4321:4321 \
  -e COPILOT_CONNECTION_TOKEN \
  -e COPILOT_GITHUB_TOKEN \
  ghcr.io/github/copilot-cli:latest
```

运行命令前，请在环境中设置 `COPILOT_GITHUB_TOKEN`。如需固定部署版本，请使用发布标签，而不是 `latest`。SDK 连接示例、配置、安全注意事项和构建说明请参阅[容器镜像指南](./container/README.md)。

### 实验模式

实验模式可启用仍在开发中的新功能。你可以通过以下方式启用：

- 使用 `--experimental` 标志启动：`copilot --experimental`
- 在 CLI 中使用 `/experimental` 斜杠命令

启用后，该设置会保存到配置中，后续启动无需再使用 `--experimental` 标志。

#### 实验性功能

- **Autopilot 模式：** 一种新模式（按 `Shift+Tab` 可在不同模式间切换），会鼓励代理持续工作，直到任务完成。

每次向 GitHub Copilot CLI 提交提示，都会使你的每月高级请求额度减少一次。高级请求的详情请参阅[关于高级请求](https://docs.github.com/copilot/managing-copilot/monitoring-usage-and-entitlements/about-premium-requests)。

有关 GitHub Copilot CLI 的更多使用信息，请参阅[官方文档](https://docs.github.com/copilot/concepts/agents/about-copilot-cli)。

## 🔧 配置 LSP 服务器

GitHub Copilot CLI 支持语言服务器协议（LSP），以增强代码智能功能，例如跳转到定义、悬停信息和诊断。

### 安装语言服务器

Copilot CLI 不会捆绑 LSP 服务器，需要单独安装。例如，要启用 TypeScript 支持：

```bash
npm install -g typescript-language-server
```

对于其他语言，请安装相应的 LSP 服务器，并参照下方的示例进行配置。

### 配置 LSP 服务器

LSP 服务器通过专用的 LSP 配置文件进行设置。你可以在用户级或仓库级配置 LSP 服务器：

**用户级配置**（适用于所有项目）：
编辑 `~/.copilot/lsp-config.json`

**仓库级配置**（适用于指定项目）：
在仓库根目录创建 `.github/lsp.json`

配置示例：

```json
{
  "lspServers": {
    "typescript": {
      "command": "typescript-language-server",
      "args": ["--stdio"],
      "fileExtensions": {
        ".ts": "typescript",
        ".tsx": "typescript"
      }
    }
  }
}
```

### 查看 LSP 服务器状态

在交互会话中使用 `/lsp` 命令检查已配置的 LSP 服务器，或直接查看配置文件。

更多信息请参阅[更新日志](./changelog.md)。

## 📢 反馈与参与

欢迎你加入 Copilot CLI 的使用者社区。

我们正在快速开发，请及时更新客户端，以获取最新功能和修复。

你的反馈对我们非常重要！你可以在此仓库中提交议题、参与讨论，或在 CLI 中运行 `/feedback`，提交保密的反馈问卷。
