#!/usr/bin/env bash
set -euo pipefail

# GitHub Copilot CLI Installation Script
# Usage: curl -fsSL https://gh.io/copilot-install | bash
#    or: wget -qO- https://gh.io/copilot-install | bash
# Use | sudo bash to run as root and install to /usr/local/bin
# Export PREFIX to install to $PREFIX/bin/ directory (default: /usr/local for
# root, $HOME/.local for non-root), e.g., export PREFIX=$HOME/custom to install
# to $HOME/custom/bin

echo "Installing GitHub Copilot CLI..."

# Detect platform
case "$(uname -s || echo "")" in
  Darwin*) PLATFORM="darwin" ;;
  Linux*) PLATFORM="linux" ;;
  *)
    if command -v winget >/dev/null 2>&1; then
      echo "Windows detected. Installing via winget..."
      winget install GitHub.Copilot
      exit $?
    else
      echo "Error: Windows detected but winget not found. Please see https://gh.io/install-copilot-readme" >&2
      exit 1
    fi
    ;;
esac

# Detect architecture
case "$(uname -m)" in
  x86_64|amd64) ARCH="x64" ;;
  aarch64|arm64) ARCH="arm64" ;;
  *) echo "Error: Unsupported architecture $(uname -m)" >&2 ; exit 1 ;;
esac

# Determine download URL based on VERSION
if [ "${VERSION}" = "latest" ] || [ -z "$VERSION" ]; then
  DOWNLOAD_URL="https://github.com/github/copilot-cli/releases/latest/download/copilot-${PLATFORM}-${ARCH}.tar.gz"
  CHECKSUMS_URL="https://github.com/github/copilot-cli/releases/latest/download/SHA256SUMS.txt"
elif [ "${VERSION}" = "prerelease" ]; then
  # Get the latest prerelease tag.
  # Prefer GitHub Releases API; fallback to git tags with a conservative prerelease regex.
  VERSION=""

  if command -v curl >/dev/null 2>&1; then
    VERSION="$(curl -fsSL https://api.github.com/repos/github/copilot-cli/releases \
      | awk -F'"' '/"prerelease": true/ {p=1} p && /"tag_name":/ {print $4; exit}')" || true
  fi

  if [ -z "${VERSION}" ]; then
    if ! command -v git >/dev/null 2>&1; then
      echo "Error: git is required to install prerelease versions (or install curl)." >&2
      exit 1
    fi

    VERSION="$(git ls-remote --tags https://github.com/github/copilot-cli \
      | awk -F/ '{print $NF}' \
      | sed 's/\^{}$//' \
      | grep -E '^v?[0-9].*-(rc|beta|alpha|pre|preview)' \
      | sort -V \
      | tail -1)" || true
  fi

  if [ -z "${VERSION}" ]; then
    echo "Error: Could not determine prerelease version" >&2
    exit 1
  fi

  echo "Latest prerelease version: $VERSION"
  DOWNLOAD_URL="https://github.com/github/copilot-cli/releases/download/${VERSION}/copilot-${PLATFORM}-${ARCH}.tar.gz"
  CHECKSUMS_URL="https://github.com/github/copilot-cli/releases/download/${VERSION}/SHA256SUMS.txt"
else
  # Prefix version with 'v' if not already present
  case "$VERSION" in
    v*) ;;
    *) VERSION="v$VERSION" ;;
  esac
  DOWNLOAD_URL="https://github.com/github/copilot-cli/releases/download/${VERSION}/copilot-${PLATFORM}-${ARCH}.tar.gz"
  CHECKSUMS_URL="https://github.com/github/copilot-cli/releases/download/${VERSION}/SHA256SUMS.txt"
fi
echo "Downloading from: $DOWNLOAD_URL"

# Download and extract with error handling
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
TMP_TARBALL="$TMP_DIR/copilot-${PLATFORM}-${ARCH}.tar.gz"
if command -v curl >/dev/null 2>&1; then
  curl -fsSL --retry 3 --retry-delay 2 "$DOWNLOAD_URL" -o "$TMP_TARBALL"
elif command -v wget >/dev/null 2>&1; then
  wget --tries=3 -qO "$TMP_TARBALL" "$DOWNLOAD_URL"
else
  echo "Error: Neither curl nor wget found. Please install one of them." >&2
  exit 1
fi

# Attempt to download checksums file and validate
TMP_CHECKSUMS="$TMP_DIR/SHA256SUMS.txt"
CHECKSUMS_AVAILABLE=false
if command -v curl >/dev/null 2>&1; then
  curl -fsSL --retry 3 --retry-delay 2 "$CHECKSUMS_URL" -o "$TMP_CHECKSUMS" 2>/dev/null && CHECKSUMS_AVAILABLE=true
elif command -v wget >/dev/null 2>&1; then
  wget --tries=3 -qO "$TMP_CHECKSUMS" "$CHECKSUMS_URL" 2>/dev/null && CHECKSUMS_AVAILABLE=true
fi

if [ "$CHECKSUMS_AVAILABLE" = true ]; then
  target_filename="copilot-${PLATFORM}-${ARCH}.tar.gz"
  expected="$(grep -E "${target_filename}$" "$TMP_CHECKSUMS" | head -n1 | awk '{print $1}')" || true

  if [ -z "$expected" ]; then
    echo "Warning: checksum entry not found for ${target_filename}; skipping checksum validation." >&2
  else
    if command -v sha256sum >/dev/null 2>&1; then
      actual="$(sha256sum "$TMP_TARBALL" | awk '{print $1}')"
    elif command -v shasum >/dev/null 2>&1; then
      actual="$(shasum -a 256 "$TMP_TARBALL" | awk '{print $1}')"
    else
      echo "Error: No sha256sum or shasum found. Cannot validate download integrity." >&2
      echo "Install sha256sum or shasum, or set SKIP_CHECKSUM=1 to bypass (not recommended)." >&2
      if [ "${SKIP_CHECKSUM:-0}" != "1" ]; then
        exit 1
      fi
      actual=""
    fi

    if [ -n "${actual}" ] && [ "$expected" = "$actual" ]; then
      echo "✓ Checksum validated"
    elif [ -n "${actual}" ]; then
      echo "Error: Checksum validation failed." >&2
      exit 1
    fi
  fi
fi

# Check that the file is a valid tarball
if ! tar -tzf "$TMP_TARBALL" >/dev/null 2>&1; then
  echo "Error: Downloaded file is not a valid tarball or is corrupted." >&2
  exit 1
fi

# Validate tarball contents (avoid extracting unexpected files into bin/)
if ! tar -tzf "$TMP_TARBALL" | grep -qx 'copilot'; then
  echo "Error: tarball contents unexpected (expected a single 'copilot' binary)." >&2
  exit 1
fi

# Check if running as root, fallback to non-root
if [ "$(id -u 2>/dev/null || echo 1)" -eq 0 ]; then
  PREFIX="${PREFIX:-/usr/local}"
else
  PREFIX="${PREFIX:-$HOME/.local}"
fi
INSTALL_DIR="$PREFIX/bin"
if ! mkdir -p "$INSTALL_DIR"; then
  echo "Error: Could not create directory $INSTALL_DIR. You may not have write permissions." >&2
  echo "Try running this script with sudo or set PREFIX to a directory you own (e.g., export PREFIX=\$HOME/.local)." >&2
  exit 1
fi

# Install binary
if [ -f "$INSTALL_DIR/copilot" ]; then
  echo "Notice: Replacing copilot binary found at $INSTALL_DIR/copilot."
fi
tar -xz -C "$INSTALL_DIR" -f "$TMP_TARBALL"
chmod +x "$INSTALL_DIR/copilot"
echo "✓ GitHub Copilot CLI installed to $INSTALL_DIR/copilot"

# Check if installed binary is accessible
if ! command -v copilot >/dev/null 2>&1; then
  echo ""
  echo "Notice: $INSTALL_DIR is not in your PATH"

  # Detect shell rc file
  case "$(basename "${SHELL:-/bin/sh}")" in
    zsh)  RC_FILE="$HOME/.zshrc" ;;
    bash)
      if [ -f "$HOME/.bashrc" ]; then RC_FILE="$HOME/.bashrc"; else RC_FILE="$HOME/.bash_profile"; fi
      ;;
    *)    RC_FILE="$HOME/.profile" ;;
  esac

  # Prompt user to add to shell rc file (only if interactive)
  if [ -t 0 ] || [ -e /dev/tty ]; then
    echo ""
    printf "Would you like to add it to %s? [y/N] " "$RC_FILE"
    if read -r REPLY </dev/tty 2>/dev/null; then
      if [ "$REPLY" = "y" ] || [ "$REPLY" = "Y" ]; then
        echo "export PATH=\"$INSTALL_DIR:\$PATH\"" >> "$RC_FILE"
        echo "✓ Added PATH export to $RC_FILE"
      fi
    fi
  else
    echo ""
    echo "To add $INSTALL_DIR to your PATH permanently, add this to $RC_FILE:"
    echo "  export PATH=\"$INSTALL_DIR:\$PATH\""
  fi
fi

echo ""
echo "Installation complete! Run 'copilot help' to get started."
