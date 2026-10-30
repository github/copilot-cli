#!/bin/sh
# Starts the Copilot CLI as a server that clients connect to over TCP.
# Any arguments are appended to the `copilot` command line.
set -eu

# The server listens on all interfaces, so never start it without a secret.
if [ -z "${COPILOT_CONNECTION_TOKEN:-}" ]; then
    echo "COPILOT_CONNECTION_TOKEN must be set to a non-empty secret that clients present to connect" >&2
    exit 1
fi

case "${COPILOT_PORT:-}" in
    ''|*[!0-9]*|??????*) echo "COPILOT_PORT must be an integer between 1024 and 65535" >&2; exit 1 ;;
esac
if [ "$COPILOT_PORT" -lt 1024 ] || [ "$COPILOT_PORT" -gt 65535 ]; then
    echo "COPILOT_PORT must be an integer between 1024 and 65535" >&2
    exit 1
fi

exec /usr/local/bin/copilot --headless --no-auto-update \
    --host 0.0.0.0 --port "$COPILOT_PORT" "$@"
