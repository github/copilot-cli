#!/usr/bin/env bash
set -e

# GitHub Copilot CLI Installation Script
# Usage: curl -fsSL https://gh.io/copilot-install | bash
#    or: wget -qO- https://gh.io/copilot-install | bash
# Use | sudo bash to run as root and install to /usr/local/bin
# Export PREFIX to install to $PREFIX/bin/ directory (default: /usr/local for
# root, $HOME/.local for non-root), e.g., export PREFIX=$HOME/custom to install
# to $HOME/custom/bin

is_true() {
  case "${1:-}" in
    1|true|TRUE|True|yes|YES|Yes|on|ON|On)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

print_usage() {
  cat <<'EOF'
Usage: install.sh [--no-cleanup] [--cleanup-only] [--dry-run] [--verbose]

Options:
  --no-cleanup    Skip automatic cleanup of older direct-install copies
  --cleanup-only  Run cleanup without downloading or installing
  --dry-run       Show what cleanup would remove without deleting anything
  --verbose       Print extra cleanup diagnostics

Environment variable equivalents:
  NO_CLEANUP=true
  CLEANUP_ONLY=true
  DRY_RUN=true
  VERBOSE=true
EOF
}

if is_true "${NO_CLEANUP:-}"; then NO_CLEANUP=true; else NO_CLEANUP=false; fi
if is_true "${CLEANUP_ONLY:-}"; then CLEANUP_ONLY=true; else CLEANUP_ONLY=false; fi
if is_true "${DRY_RUN:-}"; then DRY_RUN=true; else DRY_RUN=false; fi
if is_true "${VERBOSE:-}"; then VERBOSE=true; else VERBOSE=false; fi

while [ $# -gt 0 ]; do
  case "$1" in
    --no-cleanup)
      NO_CLEANUP=true
      ;;
    --cleanup-only)
      CLEANUP_ONLY=true
      ;;
    --dry-run)
      DRY_RUN=true
      ;;
    --verbose)
      VERBOSE=true
      ;;
    -h|--help)
      print_usage
      exit 0
      ;;
    *)
      echo "Error: Unknown argument $1" >&2
      print_usage >&2
      exit 1
      ;;
  esac
  shift
done

log_verbose() {
  if [ "$VERBOSE" = true ]; then
    echo "Verbose: $*"
  fi
}

require_unix_cleanup_platform() {
  case "$(uname -s || echo "")" in
    Darwin*|Linux*)
      ;;
    *)
      echo "Error: Cleanup mode is only supported for direct install-script copies on macOS and Linux." >&2
      exit 1
      ;;
  esac
}

normalize_path() {
  local path="$1"
  local dir
  local base

  [ -n "$path" ] || return 1

  case "$path" in
    /*) ;;
    *)
      path="$(pwd)/$path"
      ;;
  esac

  dir="$(dirname "$path")"
  base="$(basename "$path")"
  if [ -d "$dir" ]; then
    dir="$(cd "$dir" 2>/dev/null && pwd -P)" || return 1
    printf '%s/%s\n' "$dir" "$base"
  else
    printf '%s\n' "$path"
  fi
}

resolve_path() {
  local current="$1"
  local link_target
  local current_dir
  local hops=40

  current="$(normalize_path "$current")" || return 1
  while [ -L "$current" ]; do
    hops=$((hops - 1))
    if [ "$hops" -le 0 ]; then
      return 1
    fi

    link_target="$(readlink "$current" 2>/dev/null)" || return 1
    case "$link_target" in
      /*)
        current="$link_target"
        ;;
      *)
        current_dir="$(dirname "$current")"
        current="$current_dir/$link_target"
        ;;
    esac
    current="$(normalize_path "$current")" || return 1
  done

  printf '%s\n' "$current"
}

paths_match() {
  local left="$1"
  local right="$2"
  local left_normalized
  local right_normalized
  local left_resolved
  local right_resolved

  [ -n "$left" ] && [ -n "$right" ] || return 1

  left_normalized="$(normalize_path "$left" 2>/dev/null || printf '%s\n' "$left")"
  right_normalized="$(normalize_path "$right" 2>/dev/null || printf '%s\n' "$right")"
  if [ "$left_normalized" = "$right_normalized" ]; then
    return 0
  fi

  left_resolved="$(resolve_path "$left" 2>/dev/null || true)"
  right_resolved="$(resolve_path "$right" 2>/dev/null || true)"
  [ -n "$left_resolved" ] && [ "$left_resolved" = "$right_resolved" ]
}

trim_leading_zeros() {
  local value="${1:-0}"

  while [ "${#value}" -gt 1 ] && [ "${value#0}" != "$value" ]; do
    value="${value#0}"
  done

  printf '%s\n' "$value"
}

is_numeric() {
  case "${1:-}" in
    ''|*[!0-9]*)
      return 1
      ;;
    *)
      return 0
      ;;
  esac
}

compare_numeric_strings() {
  local left
  local right

  left="$(trim_leading_zeros "$1")"
  right="$(trim_leading_zeros "$2")"

  if [ "${#left}" -gt "${#right}" ]; then
    printf '1\n'
    return 0
  fi
  if [ "${#left}" -lt "${#right}" ]; then
    printf '%s\n' '-1'
    return 0
  fi
  if [ "$left" = "$right" ]; then
    printf '0\n'
    return 0
  fi
  if [ "$left" \> "$right" ]; then
    printf '1\n'
  else
    printf '%s\n' '-1'
  fi
}

compare_prerelease_identifiers() {
  local left="$1"
  local right="$2"

  if is_numeric "$left" && is_numeric "$right"; then
    compare_numeric_strings "$left" "$right"
    return 0
  fi
  if is_numeric "$left"; then
    printf '%s\n' '-1'
    return 0
  fi
  if is_numeric "$right"; then
    printf '1\n'
    return 0
  fi
  if [ "$left" = "$right" ]; then
    printf '0\n'
    return 0
  fi
  if [ "$left" \> "$right" ]; then
    printf '1\n'
  else
    printf '%s\n' '-1'
  fi
}

compare_versions() {
  local left="$1"
  local right="$2"
  local left_core
  local right_core
  local left_pre=""
  local right_pre=""
  local max_parts
  local index
  local cmp
  local left_part
  local right_part
  local saved_ifs="$IFS"
  local left_parts
  local right_parts
  local left_ids
  local right_ids

  [ -n "$left" ] && [ -n "$right" ] || return 1

  left_core="${left%%-*}"
  right_core="${right%%-*}"
  if [ "$left" != "$left_core" ]; then
    left_pre="${left#"$left_core"-}"
  fi
  if [ "$right" != "$right_core" ]; then
    right_pre="${right#"$right_core"-}"
  fi

  IFS=.
  left_parts=($left_core)
  right_parts=($right_core)
  IFS="$saved_ifs"

  max_parts="${#left_parts[@]}"
  if [ "${#right_parts[@]}" -gt "$max_parts" ]; then
    max_parts="${#right_parts[@]}"
  fi

  index=0
  while [ "$index" -lt "$max_parts" ]; do
    left_part="${left_parts[$index]:-0}"
    right_part="${right_parts[$index]:-0}"
    if ! is_numeric "$left_part" || ! is_numeric "$right_part"; then
      return 1
    fi
    cmp="$(compare_numeric_strings "$left_part" "$right_part")"
    if [ "$cmp" != "0" ]; then
      printf '%s\n' "$cmp"
      return 0
    fi
    index=$((index + 1))
  done

  if [ -z "$left_pre" ] && [ -z "$right_pre" ]; then
    printf '0\n'
    return 0
  fi
  if [ -z "$left_pre" ]; then
    printf '1\n'
    return 0
  fi
  if [ -z "$right_pre" ]; then
    printf '%s\n' '-1'
    return 0
  fi

  IFS=.
  left_ids=($left_pre)
  right_ids=($right_pre)
  IFS="$saved_ifs"

  max_parts="${#left_ids[@]}"
  if [ "${#right_ids[@]}" -gt "$max_parts" ]; then
    max_parts="${#right_ids[@]}"
  fi

  index=0
  while [ "$index" -lt "$max_parts" ]; do
    if [ "$index" -ge "${#left_ids[@]}" ]; then
      printf '%s\n' '-1'
      return 0
    fi
    if [ "$index" -ge "${#right_ids[@]}" ]; then
      printf '1\n'
      return 0
    fi
    cmp="$(compare_prerelease_identifiers "${left_ids[$index]}" "${right_ids[$index]}")"
    if [ "$cmp" != "0" ]; then
      printf '%s\n' "$cmp"
      return 0
    fi
    index=$((index + 1))
  done

  printf '0\n'
}

extract_version() {
  local version

  version="$(printf '%s\n' "$1" | grep -Eo 'v?[0-9]+(\.[0-9]+)+(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?(\+[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?' | head -n 1 || true)"
  version="${version#v}"
  version="${version%%+*}"
  printf '%s\n' "$version"
}

get_copilot_version() {
  local path="$1"
  local output
  local version

  output="$("$path" --version 2>/dev/null || true)"
  [ -n "$output" ] || return 1

  version="$(extract_version "$output")"
  [ -n "$version" ] || return 1

  printf '%s\n' "$version"
}

strip_surrounding_quotes() {
  local value="$1"

  case "$value" in
    \"*\")
      value="${value#\"}"
      value="${value%\"}"
      ;;
    \'*\')
      value="${value#\'}"
      value="${value%\'}"
      ;;
  esac

  printf '%s\n' "$value"
}

extract_copilot_path_from_command() {
  local command_line="$1"
  local token
  local candidate
  local resolved

  # Word-splitting is intentional here to tokenize the ps command output.
  # Paths containing spaces will not be matched; the caller treats a miss as
  # ambiguous and skips deletion, so this is safe.
  # shellcheck disable=SC2086
  for token in $command_line; do
    candidate="$(strip_surrounding_quotes "$token")"
    case "$candidate" in
      /*/copilot|/copilot)
        printf '%s\n' "$candidate"
        return 0
        ;;
      copilot)
        resolved="$(command -v copilot 2>/dev/null || true)"
        if [ -n "$resolved" ]; then
          printf '%s\n' "$resolved"
          return 0
        fi
        ;;
    esac
  done

  return 1
}

CANDIDATE_PATHS=()
IN_USE_PATHS=()
IN_USE_PATHS_AMBIGUOUS=false
REMOVED=()
WOULD_REMOVE=()
SKIPPED_IN_USE=()
SKIPPED_MANAGED=()
SKIPPED_UNKNOWN=()
SKIPPED_VERSION=()
SKIPPED_PERMISSIONS=()
SKIPPED_KEEP=()
SKIPPED_NOT_OLDER=()
SKIPPED_SESSION_AMBIGUOUS=()

add_candidate_path() {
  local path="$1"
  local existing

  [ -n "$path" ] || return 0

  path="$(normalize_path "$path" 2>/dev/null || printf '%s\n' "$path")"
  if [ ! -e "$path" ] && [ ! -L "$path" ]; then
    return 0
  fi

  for existing in "${CANDIDATE_PATHS[@]}"; do
    if [ "$existing" = "$path" ]; then
      return 0
    fi
  done

  CANDIDATE_PATHS+=("$path")
  log_verbose "Found cleanup candidate: $path"
}

add_in_use_path() {
  local path="$1"
  local resolved
  local existing

  [ -n "$path" ] || return 0

  path="$(normalize_path "$path" 2>/dev/null || printf '%s\n' "$path")"
  if [ -e "$path" ] || [ -L "$path" ]; then
    for existing in "${IN_USE_PATHS[@]}"; do
      if [ "$existing" = "$path" ]; then
        return 0
      fi
    done
    IN_USE_PATHS+=("$path")
    log_verbose "Active session is using: $path"
  fi

  resolved="$(resolve_path "$path" 2>/dev/null || true)"
  if [ -n "$resolved" ] && [ "$resolved" != "$path" ]; then
    for existing in "${IN_USE_PATHS[@]}"; do
      if [ "$existing" = "$resolved" ]; then
        return 0
      fi
    done
    IN_USE_PATHS+=("$resolved")
    log_verbose "Active session resolves to: $resolved"
  fi
}

add_result() {
  local category="$1"
  local message="$2"

  case "$category" in
    removed)
      REMOVED+=("$message")
      ;;
    would_remove)
      WOULD_REMOVE+=("$message")
      ;;
    skipped_in_use)
      SKIPPED_IN_USE+=("$message")
      ;;
    skipped_managed)
      SKIPPED_MANAGED+=("$message")
      ;;
    skipped_unknown)
      SKIPPED_UNKNOWN+=("$message")
      ;;
    skipped_version)
      SKIPPED_VERSION+=("$message")
      ;;
    skipped_permissions)
      SKIPPED_PERMISSIONS+=("$message")
      ;;
    skipped_keep)
      SKIPPED_KEEP+=("$message")
      ;;
    skipped_not_older)
      SKIPPED_NOT_OLDER+=("$message")
      ;;
    skipped_session_ambiguous)
      SKIPPED_SESSION_AMBIGUOUS+=("$message")
      ;;
  esac
}

print_group() {
  local title="$1"
  shift
  local item

  [ "$#" -gt 0 ] || return 0

  echo ""
  echo "$title:"
  for item in "$@"; do
    echo "  - $item"
  done
}

classify_candidate() {
  local path="$1"
  local normalized
  local resolved
  local combined

  normalized="$(normalize_path "$path" 2>/dev/null || printf '%s\n' "$path")"
  resolved="$(resolve_path "$path" 2>/dev/null || printf '%s\n' "$normalized")"

  if [ -L "$path" ]; then
    printf 'managed|symlinked install\n'
    return 0
  fi

  combined="$normalized:$resolved"
  case "$combined" in
    *"/node_modules/"*|*"/node_modules/.bin/"*|*".app/Contents/"*|*"/Cellar/"*|*"/Caskroom/"*|*"/Homebrew/"*|*"/home/linuxbrew/.linuxbrew/"*|*"/opt/homebrew/"*|*"/nix/store/"*|*"/snap/"*|*"/flatpak/"*|*"/copilot-sdk-"*)
      printf 'managed|package-managed path\n'
      return 0
      ;;
  esac

  if [ ! -f "$path" ] || [ ! -x "$path" ]; then
    printf 'unknown|not a standalone executable\n'
    return 0
  fi

  if [ "$(basename "$path")" != "copilot" ]; then
    printf 'unknown|unexpected file name\n'
    return 0
  fi

  if [ "$(basename "$(dirname "$path")")" = "bin" ]; then
    printf 'direct|standalone executable in bin directory\n'
    return 0
  fi

  printf 'unknown|path is not in a bin directory\n'
}

collect_cleanup_candidates() {
  local keep_target="$1"
  local candidate

  CANDIDATE_PATHS=()

  add_candidate_path "$HOME/.local/bin/copilot"
  add_candidate_path "/usr/local/bin/copilot"

  if command -v which >/dev/null 2>&1; then
    while IFS= read -r candidate; do
      [ -n "$candidate" ] || continue
      add_candidate_path "$candidate"
    done <<EOF
$(which -a copilot 2>/dev/null || true)
EOF
  fi

  candidate="$(command -v copilot 2>/dev/null || true)"
  if [ -n "$candidate" ]; then
    add_candidate_path "$candidate"
  fi

  if [ -n "$keep_target" ]; then
    add_candidate_path "$keep_target"
  fi
}

inspect_pid_for_copilot() {
  local pid="$1"
  local source_label="$2"
  local set_ambiguous="${3:-true}"
  local command_line
  local path

  command_line="$(ps -ww -o command= -p "$pid" 2>/dev/null | sed -e 's/^[[:space:]]*//' || true)"
  if [ -z "$command_line" ]; then
    if [ "$set_ambiguous" = true ]; then
      IN_USE_PATHS_AMBIGUOUS=true
    fi
    log_verbose "Could not inspect command line for $source_label PID $pid"
    return
  fi

  path="$(extract_copilot_path_from_command "$command_line" || true)"
  if [ -z "$path" ]; then
    if [ "$set_ambiguous" = true ]; then
      IN_USE_PATHS_AMBIGUOUS=true
    fi
    log_verbose "Could not resolve copilot path for $source_label PID $pid: $command_line"
    return
  fi

  add_in_use_path "$path"
}

collect_in_use_paths() {
  local lock
  local pid
  local line

  IN_USE_PATHS=()
  IN_USE_PATHS_AMBIGUOUS=false

  # Source 1: session lock files (created by recent CLI versions)
  for lock in "$HOME"/.copilot/session-state/*/inuse.*.lock; do
    [ -e "$lock" ] || continue

    pid="${lock##*/inuse.}"
    pid="${pid%.lock}"
    case "$pid" in
      ''|*[!0-9]*)
        log_verbose "Ignoring malformed session lock: $lock"
        continue
        ;;
    esac

    if ! kill -0 "$pid" 2>/dev/null; then
      log_verbose "Ignoring stale session lock: $lock"
      continue
    fi

    inspect_pid_for_copilot "$pid" "session lock"
  done

  # Source 2: process table scan for any running copilot process.
  # Older CLI versions did not create lock files, so this catches sessions
  # that predate the lock mechanism.  We scan full command lines because the
  # binary may be invoked through a wrapper (node, bash, etc.) where the
  # comm column only shows the interpreter.
  # The awk filter matches lines where any token is either an absolute path
  # ending in /copilot or the bare word "copilot" (PATH-resolved invocation).
  while IFS= read -r line; do
    pid="$(printf '%s\n' "$line" | awk '{print $1}')"
    case "$pid" in
      ''|*[!0-9]*)
        continue
        ;;
    esac
    # Skip our own process
    if [ "$pid" = "$$" ]; then
      continue
    fi
    inspect_pid_for_copilot "$pid" "running process" false
  done <<EOF
$(ps -axww -o pid,command 2>/dev/null | awk '/\/copilot( |$)/ || / copilot( |$)/' | grep -v grep || true)
EOF
}

candidate_is_in_use() {
  local path="$1"
  local resolved
  local existing

  path="$(normalize_path "$path" 2>/dev/null || printf '%s\n' "$path")"
  resolved="$(resolve_path "$path" 2>/dev/null || true)"

  for existing in "${IN_USE_PATHS[@]}"; do
    if [ "$existing" = "$path" ]; then
      return 0
    fi
    if [ -n "$resolved" ] && [ "$existing" = "$resolved" ]; then
      return 0
    fi
  done

  return 1
}

print_cleanup_summary() {
  local keep_target="$1"
  local keep_version="$2"
  local had_activity=false

  echo ""
  echo "Cleanup summary:"
  if [ -n "$keep_version" ]; then
    echo "  Keep target: $keep_target (version $keep_version)"
  else
    echo "  Keep target: $keep_target"
  fi

  if [ "${#REMOVED[@]}" -gt 0 ] || [ "${#WOULD_REMOVE[@]}" -gt 0 ]; then
    had_activity=true
  fi

  print_group "Removed" "${REMOVED[@]}"
  print_group "Would remove (dry run)" "${WOULD_REMOVE[@]}"
  print_group "Skipped because it is the selected CLI" "${SKIPPED_KEEP[@]}"
  print_group "Skipped because currently in use" "${SKIPPED_IN_USE[@]}"
  print_group "Skipped because package-manager-managed" "${SKIPPED_MANAGED[@]}"
  print_group "Skipped because ownership was unclear" "${SKIPPED_UNKNOWN[@]}"
  print_group "Skipped because version could not be parsed or compared" "${SKIPPED_VERSION[@]}"
  print_group "Skipped because active session inspection was ambiguous" "${SKIPPED_SESSION_AMBIGUOUS[@]}"
  print_group "Skipped because permissions were insufficient" "${SKIPPED_PERMISSIONS[@]}"
  print_group "Skipped because version is not older than the selected CLI" "${SKIPPED_NOT_OLDER[@]}"

  if [ "$had_activity" = false ]; then
    echo "  No older direct-install copilot binaries were removed."
  fi
}

run_cleanup() {
  local keep_target="$1"
  local keep_version
  local candidate
  local classification
  local reason
  local candidate_version
  local comparison
  local classification_result

  keep_target="$(normalize_path "$keep_target" 2>/dev/null || printf '%s\n' "$keep_target")"
  if [ ! -e "$keep_target" ] && [ ! -L "$keep_target" ]; then
    echo "Error: Cleanup keep target was not found at $keep_target." >&2
    return 1
  fi

  REMOVED=()
  WOULD_REMOVE=()
  SKIPPED_IN_USE=()
  SKIPPED_MANAGED=()
  SKIPPED_UNKNOWN=()
  SKIPPED_VERSION=()
  SKIPPED_PERMISSIONS=()
  SKIPPED_KEEP=()
  SKIPPED_NOT_OLDER=()
  SKIPPED_SESSION_AMBIGUOUS=()

  echo ""
  echo "Checking for older direct-install copilot binaries..."

  collect_cleanup_candidates "$keep_target"
  collect_in_use_paths

  keep_version="$(get_copilot_version "$keep_target" 2>/dev/null || true)"
  if [ -n "$keep_version" ]; then
    log_verbose "Keep target version: $keep_version"
  else
    log_verbose "Could not parse keep target version from $keep_target"
  fi

  for candidate in "${CANDIDATE_PATHS[@]}"; do
    if paths_match "$candidate" "$keep_target"; then
      add_result skipped_keep "$candidate"
      continue
    fi

    classification_result="$(classify_candidate "$candidate")"
    classification="${classification_result%%|*}"
    reason="${classification_result#*|}"

    case "$classification" in
      managed)
        add_result skipped_managed "$candidate ($reason)"
        continue
        ;;
      unknown)
        add_result skipped_unknown "$candidate ($reason)"
        continue
        ;;
      direct)
        ;;
      *)
        add_result skipped_unknown "$candidate (unexpected ownership classification)"
        continue
        ;;
    esac

    if candidate_is_in_use "$candidate"; then
      add_result skipped_in_use "$candidate"
      continue
    fi

    if [ "$IN_USE_PATHS_AMBIGUOUS" = true ]; then
      add_result skipped_session_ambiguous "$candidate (an active session could not be inspected safely)"
      continue
    fi

    if [ -z "$keep_version" ]; then
      add_result skipped_version "$candidate (keep target version could not be parsed)"
      continue
    fi

    candidate_version="$(get_copilot_version "$candidate" 2>/dev/null || true)"
    if [ -z "$candidate_version" ]; then
      add_result skipped_version "$candidate (candidate version could not be parsed)"
      continue
    fi

    comparison="$(compare_versions "$candidate_version" "$keep_version" 2>/dev/null || true)"
    if [ -z "$comparison" ]; then
      add_result skipped_version "$candidate (version comparison was ambiguous)"
      continue
    fi

    if [ "$comparison" != "-1" ]; then
      add_result skipped_not_older "$candidate (version $candidate_version is not older than $keep_version)"
      continue
    fi

    if [ "$DRY_RUN" = true ]; then
      add_result would_remove "$candidate (version $candidate_version < $keep_version)"
      continue
    fi

    if rm -f -- "$candidate" 2>/dev/null; then
      add_result removed "$candidate (version $candidate_version < $keep_version)"
    else
      add_result skipped_permissions "$candidate (could not remove it; check file ownership and permissions)"
    fi
  done

  print_cleanup_summary "$keep_target" "$keep_version"
}

if [ "$CLEANUP_ONLY" = true ]; then
  require_unix_cleanup_platform

  echo "Checking GitHub Copilot CLI installs..."
  SELECTED_COPILOT="$(command -v copilot 2>/dev/null || true)"
  if [ -z "$SELECTED_COPILOT" ]; then
    echo "Error: Cleanup-only mode requires copilot to be on your PATH so the selected CLI can be preserved." >&2
    exit 1
  fi

  run_cleanup "$SELECTED_COPILOT"
  exit 0
fi

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

# Set up authentication for GitHub requests if GITHUB_TOKEN is available
CURL_AUTH=()
WGET_AUTH=()
GIT_REMOTE="https://github.com/github/copilot-cli"
if [ -n "$GITHUB_TOKEN" ]; then
  CURL_AUTH=(-H "Authorization: token $GITHUB_TOKEN")
  WGET_AUTH=(--header="Authorization: token $GITHUB_TOKEN")
  GIT_REMOTE="https://x-access-token:${GITHUB_TOKEN}@github.com/github/copilot-cli"
fi

# Determine download URL based on VERSION
if [ "${VERSION}" = "latest" ] || [ -z "$VERSION" ]; then
  DOWNLOAD_URL="https://github.com/github/copilot-cli/releases/latest/download/copilot-${PLATFORM}-${ARCH}.tar.gz"
  CHECKSUMS_URL="https://github.com/github/copilot-cli/releases/latest/download/SHA256SUMS.txt"
elif [ "${VERSION}" = "prerelease" ]; then
  # Get the latest prerelease tag
  if ! command -v git >/dev/null 2>&1; then
    echo "Error: git is required to install prerelease versions" >&2
    exit 1
  fi
  VERSION="$(git ls-remote --tags --sort "version:refname" "$GIT_REMOTE" | tail -1 | awk -F/ '{print $NF}')"
  if [ -z "$VERSION" ]; then
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
trap 'rm -rf -- "$TMP_DIR"' EXIT
TMP_TARBALL="$TMP_DIR/copilot-${PLATFORM}-${ARCH}.tar.gz"
if command -v curl >/dev/null 2>&1; then
  curl -fsSL "${CURL_AUTH[@]}" "$DOWNLOAD_URL" -o "$TMP_TARBALL"
elif command -v wget >/dev/null 2>&1; then
  wget -qO "$TMP_TARBALL" "${WGET_AUTH[@]}" "$DOWNLOAD_URL"
else
  echo "Error: Neither curl nor wget found. Please install one of them."
  exit 1
fi

# Attempt to download checksums file and validate
TMP_CHECKSUMS="$TMP_DIR/SHA256SUMS.txt"
CHECKSUMS_AVAILABLE=false
if command -v curl >/dev/null 2>&1; then
  curl -fsSL "${CURL_AUTH[@]}" "$CHECKSUMS_URL" -o "$TMP_CHECKSUMS" 2>/dev/null && CHECKSUMS_AVAILABLE=true
elif command -v wget >/dev/null 2>&1; then
  wget -qO "$TMP_CHECKSUMS" "${WGET_AUTH[@]}" "$CHECKSUMS_URL" 2>/dev/null && CHECKSUMS_AVAILABLE=true
fi

if [ "$CHECKSUMS_AVAILABLE" = true ]; then
  if command -v sha256sum >/dev/null 2>&1; then
    if (cd "$TMP_DIR" && sha256sum -c --ignore-missing SHA256SUMS.txt >/dev/null 2>&1); then
      echo "✓ Checksum validated"
    else
      echo "Error: Checksum validation failed." >&2
      exit 1
    fi
  elif command -v shasum >/dev/null 2>&1; then
    if (cd "$TMP_DIR" && shasum -a 256 -c --ignore-missing SHA256SUMS.txt >/dev/null 2>&1); then
      echo "✓ Checksum validated"
    else
      echo "Error: Checksum validation failed." >&2
      exit 1
    fi
  else
    echo "Warning: No sha256sum or shasum found, skipping checksum validation."
  fi
fi

# Check that the file is a valid tarball
if ! tar -tzf "$TMP_TARBALL" >/dev/null 2>&1; then
  echo "Error: Downloaded file is not a valid tarball or is corrupted." >&2
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

if [ "$NO_CLEANUP" != true ]; then
  # Cleanup runs by default after every install.  It is best-effort; a failure
  # here must not prevent the install from completing or the PATH setup
  # instructions from being printed.
  run_cleanup "$INSTALL_DIR/copilot" || echo "Warning: Cleanup encountered an error but the install succeeded."
fi

# Check if installed binary is accessible
if ! command -v copilot >/dev/null 2>&1; then
  echo ""
  echo "Notice: $INSTALL_DIR is not in your PATH"

  # Detect shell profile file for PATH
  CURRENT_SHELL="$(basename "${SHELL:-/bin/sh}")"
  case "$CURRENT_SHELL" in
    zsh) RC_FILE="${ZDOTDIR:-$HOME}/.zprofile" ;;
    bash)
      if [ -f "$HOME/.bash_profile" ]; then
        RC_FILE="$HOME/.bash_profile"
      elif [ -f "$HOME/.bash_login" ]; then
        RC_FILE="$HOME/.bash_login"
      else
        RC_FILE="$HOME/.profile"
      fi
      ;;
    fish) RC_FILE="${XDG_CONFIG_HOME:-$HOME/.config}/fish/conf.d/copilot.fish" ;;
    *) RC_FILE="$HOME/.profile" ;;
  esac

  PATH_LINE="export PATH=\"$INSTALL_DIR:\$PATH\""
  if [ "$CURRENT_SHELL" = "fish" ]; then
    PATH_LINE="fish_add_path \"$INSTALL_DIR\""
  fi

  # Prompt user to add to shell rc file (only if interactive)
  if [ -t 0 ] || [ -e /dev/tty ]; then
    echo ""
    printf "Would you like to add it to %s? [y/N] " "$RC_FILE"
    if read -r REPLY </dev/tty 2>/dev/null; then
      if [ "$REPLY" = "y" ] || [ "$REPLY" = "Y" ]; then
        mkdir -p "$(dirname "$RC_FILE")"
        echo "$PATH_LINE" >> "$RC_FILE"
        echo "✓ Added PATH configuration to $RC_FILE"
        echo "  Restart your shell or run: source $RC_FILE"
      fi
    fi
  else
    echo ""
    echo "To add $INSTALL_DIR to your PATH permanently, add this to $RC_FILE:"
    echo "  $PATH_LINE"
  fi

  echo ""
  echo "Installation complete! To get started, run:"
  echo "  $PATH_LINE && copilot help"
else
  echo ""
  echo "Installation complete! Run 'copilot help' to get started."
fi
