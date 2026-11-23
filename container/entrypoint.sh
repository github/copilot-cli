#!/bin/sh
# Starts the Copilot CLI as a server that clients connect to over TCP.
# Any arguments are appended to the `copilot` command line.
set -eu

# The server listens on all interfaces, so never start it without a secret.
if [ -n "${COPILOT_CONNECTION_TOKEN_FILE:-}" ]; then
    if [ -n "${COPILOT_CONNECTION_TOKEN:-}" ]; then
        echo "Set only one of COPILOT_CONNECTION_TOKEN and COPILOT_CONNECTION_TOKEN_FILE" >&2
        exit 1
    fi
    if [ ! -f "$COPILOT_CONNECTION_TOKEN_FILE" ] || ! COPILOT_CONNECTION_TOKEN=$(cat 2>/dev/null < "$COPILOT_CONNECTION_TOKEN_FILE"); then
        echo "COPILOT_CONNECTION_TOKEN_FILE must point to a readable regular file" >&2
        exit 1
    fi
    if [ -z "$COPILOT_CONNECTION_TOKEN" ]; then
        echo "COPILOT_CONNECTION_TOKEN_FILE must contain a non-empty connection secret" >&2
        exit 1
    fi
    export COPILOT_CONNECTION_TOKEN
elif [ -z "${COPILOT_CONNECTION_TOKEN:-}" ]; then
    echo "Set COPILOT_CONNECTION_TOKEN to a shared secret, or COPILOT_CONNECTION_TOKEN_FILE to its file path." >&2
    echo 'To generate a secret locally: export COPILOT_CONNECTION_TOKEN="$(openssl rand -hex 32)"' >&2
    exit 1
fi

case "$COPILOT_CONNECTION_TOKEN" in
    gho_*|ghp_*|ghu_*|ghs_*|ghr_*|github_pat_*)
        echo "Warning: COPILOT_CONNECTION_TOKEN looks like a GitHub token. Use a random shared secret for SDK connections instead." >&2 ;;
esac

case "${COPILOT_PORT:-}" in
    tcp://*)
        # Kubernetes injects <SERVICE>_PORT=tcp://... for a Service named "copilot".
        echo "COPILOT_PORT was replaced by a Kubernetes Service link. Set enableServiceLinks: false in the pod spec, or set COPILOT_PORT explicitly." >&2
        exit 1 ;;
    ''|*[!0-9]*|??????*) echo "COPILOT_PORT must be an integer between 1024 and 65535" >&2; exit 1 ;;
esac
if [ "$COPILOT_PORT" -lt 1024 ] || [ "$COPILOT_PORT" -gt 65535 ]; then
    echo "COPILOT_PORT must be an integer between 1024 and 65535" >&2
    exit 1
fi

if [ -z "${COPILOT_CONNECTION_TOKEN_FILE:-}" ] && [ "$COPILOT_CONNECTION_TOKEN" = generate ]; then
    COPILOT_CONNECTION_TOKEN=$(openssl rand -hex 32) || exit 1
    export COPILOT_CONNECTION_TOKEN
    printf 'Generated COPILOT_CONNECTION_TOKEN=%s\n' "$COPILOT_CONNECTION_TOKEN" >&2
fi

exec /usr/local/bin/copilot --headless --no-auto-update \
    --host 0.0.0.0 --port "$COPILOT_PORT" "$@"
