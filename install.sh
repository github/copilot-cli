#!/usr/bin/env bash
set -e

# GitHub Copilot CLI Installation Script
# Usage: curl -fsSL https://gh.io/copilot-install | bash
#    or: wget -qO- https://gh.io/copilot-install | bash

echo "Installing GitHub Copilot CLI..."

# Detect platform
case "$(uname -s)" in
  Darwin*) PLATFORM="darwin" ;;
  Linux*) PLATFORM="linux" ;;
  *) echo "Error: Unsupported platform $(uname -s). For Windows, we recommend using: winget install GitHub.Copilot" >&2 ; exit 1 ;;
esac

# Detect architecture
case "$(uname -m)" in
  x86_64|amd64) ARCH="x64" ;;
  aarch64|arm64) ARCH="arm64" ;;
  *) echo "Error: Unsupported architecture $(uname -m)" >&2 ; exit 1 ;;
esac

DOWNLOAD_URL="https://github.com/github/copilot-cli/releases/latest/download/copilot-${PLATFORM}-${ARCH}.tar.gz"
echo "Downloading from: $DOWNLOAD_URL"

DOWNLOAD_DIR="${HOME}/.copilot"
mkdir -p "$DOWNLOAD_DIR"

# Download and extract
if command -v curl >/dev/null 2>&1; then
  curl -fsSL "$DOWNLOAD_URL" | tar -xz -C "$DOWNLOAD_DIR"
elif command -v wget >/dev/null 2>&1; then
  wget -qO- "$DOWNLOAD_URL" | tar -xz -C "$DOWNLOAD_DIR"
else
  echo "Error: Neither curl nor wget found. Please install one of them."
  exit 1
fi

if [ "$(id -u 2>/dev/null || echo 1)" -eq 0 ]; then
  PREFIX="${PREFIX:-/usr/local}"
else
  PREFIX="${PREFIX:-$HOME/.local}"
  mkdir -p "$INSTALL_DIR/bin"
fi
INSTALL_DIR="$PREFIX/bin"

# Install binary
if [ -f "copilot" ]; then
  mv copilot "$INSTALL_DIR/copilot"
  chmod +x "$INSTALL_DIR/copilot"
  echo "✓ GitHub Copilot CLI installed to $INSTALL_DIR/copilot"
else
  echo "Error: copilot binary not found in tarball"
  exit 1
fi

# Check if install directory is in PATH
if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
  echo ""
  echo "Warning: $INSTALL_DIR is not in your PATH"
  echo "Add it to your PATH by adding this line to your shell profile:"
  echo "  export PATH=\"\$PATH:$INSTALL_DIR\""
fi

echo ""
echo "Installation complete! Run 'copilot help' to get started."
