#!/bin/sh
# Starts the Copilot CLI as a server that clients connect to over TCP.
# Any arguments are appended to the `copilot` command line.
set -eu

# The server listens on all interfaces, so never start it without a secret.
if [ -z "${COPILOT_CONNECTION_TOKEN:-}" ]; then
    echo "Set COPILOT_CONNECTION_TOKEN to a shared secret." >&2
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

if [ "$COPILOT_CONNECTION_TOKEN" = generate ]; then
    COPILOT_CONNECTION_TOKEN=$(openssl rand -hex 32) || exit 1
    export COPILOT_CONNECTION_TOKEN
    printf 'Generated COPILOT_CONNECTION_TOKEN=%s\n' "$COPILOT_CONNECTION_TOKEN" >&2
fi

exec /usr/local/bin/copilot --headless --no-auto-update \
    --host 0.0.0.0 --port "$COPILOT_PORT" "$@"
