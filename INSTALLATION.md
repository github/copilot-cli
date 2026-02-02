# Installation Guide

This guide covers multiple installation methods for the Copilot-Liku CLI across different platforms.

## Table of Contents

- [Quick Install (npm)](#quick-install-npm)
- [Platform-Specific Installation](#platform-specific-installation)
  - [macOS](#macos)
  - [Windows](#windows)
  - [Linux](#linux)
- [Local Development](#local-development)
- [Troubleshooting](#troubleshooting)

---

## Quick Install (npm)

The fastest way to install Liku is via npm:

```bash
npm install -g copilot-liku-cli
```

Verify installation:
```bash
liku --version
liku --help
```

Start using Liku:
```bash
liku start
```

---

## Platform-Specific Installation

### macOS

#### Option 1: npm (Recommended)

```bash
npm install -g copilot-liku-cli
```

#### Option 2: Homebrew (Coming Soon)

Once we set up a Homebrew tap, you'll be able to install via:
```bash
brew tap TayDa64/liku
brew install liku
```

**Benefits of Homebrew:**
- Automatic updates via `brew upgrade`
- Better integration with macOS
- Easy uninstallation

#### Verify Installation

```bash
liku --version
```

### Windows

#### Option 1: npm (Recommended)

Open PowerShell or Command Prompt:
```powershell
npm install -g copilot-liku-cli
```

#### Option 2: Scoop (Coming Soon)

Once we set up a Scoop manifest, you'll be able to install via:
```powershell
scoop bucket add liku https://github.com/TayDa64/scoop-liku
scoop install liku
```

#### Option 3: Chocolatey (Coming Soon)

```powershell
choco install copilot-liku-cli
```

**Benefits of Scoop/Chocolatey:**
- Automatic updates
- System-wide installation
- Easy uninstallation

#### Verify Installation

```powershell
liku --version
```

### Linux

#### Option 1: npm (Recommended)

```bash
npm install -g copilot-liku-cli
```

#### Option 2: Distribution Packages (Future)

We plan to provide `.deb` and `.rpm` packages for easy installation on Debian/Ubuntu and Red Hat/Fedora systems.

**Ubuntu/Debian (Coming Soon):**
```bash
wget https://github.com/TayDa64/copilot-Liku-cli/releases/latest/download/liku.deb
sudo dpkg -i liku.deb
```

**Red Hat/Fedora (Coming Soon):**
```bash
wget https://github.com/TayDa64/copilot-Liku-cli/releases/latest/download/liku.rpm
sudo rpm -i liku.rpm
```

#### Verify Installation

```bash
liku --version
```

---

## Local Development

For contributors and developers who want to work on the Liku CLI source code:

### 1. Clone the Repository

```bash
git clone https://github.com/TayDa64/copilot-Liku-cli.git
cd copilot-Liku-cli
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Link for Global Usage

```bash
npm link
```

This creates a symbolic link from your global `node_modules` to your local development directory. Any changes you make will be immediately available when you run `liku`.

### 4. Verify Setup

```bash
liku --version
liku --help
```

For more details on contributing, see [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Troubleshooting

### Command Not Found

If you see `liku: command not found` after installation:

#### Check npm global path

```bash
npm bin -g
```

#### Add npm global bin to PATH

**macOS/Linux:**
Add this to your `~/.bashrc`, `~/.zshrc`, or `~/.profile`:
```bash
export PATH="$(npm bin -g):$PATH"
```

**Windows PowerShell:**
Add to your PowerShell profile:
```powershell
$env:PATH += ";$(npm bin -g)"
```

Or permanently via System Properties → Environment Variables.

### Permission Errors (npm global install)

#### Option 1: Use a Node version manager (Recommended)

Install Node via [nvm](https://github.com/nvm-sh/nvm) (Unix/Mac) or [nvm-windows](https://github.com/coreybutler/nvm-windows):

```bash
# Unix/Mac
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 22
nvm use 22
```

#### Option 2: Configure npm to use a user directory

```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
```

Then add `~/.npm-global/bin` to your PATH.

#### Option 3: Use sudo (Not Recommended)

```bash
sudo npm install -g copilot-liku-cli
```

**Note:** Using sudo can cause permission issues later. We recommend Option 1 or 2.

### Package Version Issues

#### Update to Latest Version

```bash
npm update -g copilot-liku-cli
```

#### Force Reinstall

```bash
npm uninstall -g copilot-liku-cli
npm install -g copilot-liku-cli
```

### Multiple Node Versions

If you have multiple Node versions installed, ensure you're using the correct one:

```bash
node --version    # Should be v22 or higher
which node        # Shows which Node is in use
```

### Windows-Specific Issues

#### PowerShell Execution Policy

If you see execution policy errors:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### Path Length Limitations

Windows has path length limitations. If you encounter errors, try:
1. Enable long path support (Windows 10 1607+)
2. Install in a shorter path

### Verifying Installation

Run these commands to verify everything is working:

```bash
# Check version
liku --version

# Show help
liku --help

# Test a simple command
liku screenshot --help
```

---

## Updating Liku

### npm Installation

```bash
npm update -g copilot-liku-cli
```

### Homebrew (macOS)

```bash
brew upgrade liku
```

### Scoop (Windows)

```powershell
scoop update liku
```

### Local Development

```bash
cd copilot-Liku-cli
git pull origin main
npm install
```

---

## Uninstalling

### npm

```bash
npm uninstall -g copilot-liku-cli
```

### Homebrew

```bash
brew uninstall liku
```

### Scoop

```powershell
scoop uninstall liku
```

### Local Development Link

```bash
npm unlink -g copilot-liku-cli
```

---

## Next Steps

After installation:

1. **Start the application:** `liku start`
2. **Read the Quick Start:** [QUICKSTART.md](QUICKSTART.md)
3. **Explore commands:** `liku --help`
4. **Read the full guide:** [README.md](README.md)

For issues or questions, please visit our [GitHub Issues](https://github.com/TayDa64/copilot-Liku-cli/issues).
