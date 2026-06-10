#!/usr/bin/env bash
set -e

# GitHub Copilot CLI Uninstallation Script
# Usage: curl -fsSL https://gh.io/copilot-uninstall | bash
#    or: wget -qO- https://gh.io/copilot-uninstall | bash
# Use | sudo bash to run as root and remove from /usr/local/bin
# Export PREFIX to remove from $PREFIX/bin/ directory (default: /usr/local for
# root, $HOME/.local for non-root), e.g., export PREFIX=$HOME/custom to remove
# from $HOME/custom/bin

echo "Uninstalling GitHub Copilot CLI..."

# Detect platform
case "$(uname -s || echo "")" in
  Darwin*|Linux*) ;;
  *)
    if command -v winget >/dev/null 2>&1; then
      echo "Windows detected. Uninstalling via winget..."
      winget uninstall GitHub.Copilot
      exit $?
    else
      echo "Error: Windows detected but winget not found. Please remove GitHub Copilot CLI using the package manager you installed it with." >&2
      exit 1
    fi
    ;;
esac

# Check if running as root, fallback to non-root
if [ "$(id -u 2>/dev/null || echo 1)" -eq 0 ]; then
  PREFIX="${PREFIX:-/usr/local}"
else
  PREFIX="${PREFIX:-$HOME/.local}"
fi
INSTALL_DIR="$PREFIX/bin"
TARGET="$INSTALL_DIR/copilot"

if [ ! -e "$TARGET" ]; then
  echo "Notice: No copilot binary found at $TARGET."

  if command -v copilot >/dev/null 2>&1; then
    FOUND_PATH="$(command -v copilot)"
    echo "Another copilot binary is still available at $FOUND_PATH."
    echo "If you installed it with Homebrew, npm, or another package manager, uninstall it with that tool."
  fi

  exit 0
fi

if [ ! -w "$TARGET" ] && [ "$(id -u 2>/dev/null || echo 1)" -ne 0 ]; then
  echo "Error: Could not remove $TARGET. You may not have write permissions." >&2
  echo "Try running this script with sudo or set PREFIX to the installation prefix used previously." >&2
  exit 1
fi

rm -f "$TARGET"
echo "✓ Removed $TARGET"

if [ -d "$INSTALL_DIR" ] && [ -z "$(ls -A "$INSTALL_DIR" 2>/dev/null)" ]; then
  rmdir "$INSTALL_DIR" 2>/dev/null || true
fi

echo ""
echo "Uninstall complete."
echo "If you previously added $INSTALL_DIR to your PATH, you can remove that entry from your shell profile manually."
