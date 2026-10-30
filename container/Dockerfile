# syntax=docker/dockerfile:1

# GitHub Copilot CLI running in server mode.
#
# Build from the repository root so that LICENSE.md is part of the build context:
#
#   docker build -f container/Dockerfile --build-arg COPILOT_VERSION=1.0.105 -t copilot-cli .
#
# COPILOT_VERSION is a release version without the leading "v" (for example
# 1.0.105, or 1.0.106-0 for a prerelease). The image contains the checksum-verified
# `copilot` binary attached to that GitHub release.
FROM debian:trixie-slim@sha256:f6b08b09a05725f9431502d3b5714f5c4576e82c1a84fa1debe0c24a7e0c3ec4

ARG TARGETARCH
ARG COPILOT_VERSION

LABEL org.opencontainers.image.title="GitHub Copilot CLI (server mode)" \
      org.opencontainers.image.description="GitHub Copilot CLI running as a headless server that Copilot SDK clients connect to over TCP" \
      org.opencontainers.image.source="https://github.com/github/copilot-cli" \
      org.opencontainers.image.documentation="https://github.com/github/copilot-cli/blob/main/container/README.md" \
      org.opencontainers.image.version="${COPILOT_VERSION}"

# ca-certificates: TLS to GitHub and the model providers. curl and git: commonly used by agent tools.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl git \
 && rm -rf /var/lib/apt/lists/*

RUN set -eu; \
    : "${COPILOT_VERSION:?Pass --build-arg COPILOT_VERSION=<release version>}"; \
    case "${TARGETARCH}" in \
      amd64) platform=linux-x64 ;; \
      arm64) platform=linux-arm64 ;; \
      *) echo "Unsupported architecture: ${TARGETARCH}" >&2; exit 1 ;; \
    esac; \
    asset="copilot-${platform}.tar.gz"; \
    base="https://github.com/github/copilot-cli/releases/download/v${COPILOT_VERSION}"; \
    workdir="$(mktemp -d)"; \
    cd "${workdir}"; \
    curl -fsSL --proto '=https' --retry 5 --retry-all-errors -o "${asset}" "${base}/${asset}"; \
    curl -fsSL --proto '=https' --retry 5 --retry-all-errors -o SHA256SUMS.txt "${base}/SHA256SUMS.txt"; \
    awk -v a="${asset}" '$2 == a || $2 == "*" a { print $1 "  " a; n++ } END { exit n != 1 }' SHA256SUMS.txt > asset.sha256; \
    sha256sum -c asset.sha256; \
    tar -xzf "${asset}" -C /usr/local/bin copilot; \
    chmod 0755 /usr/local/bin/copilot; \
    rm -rf "${workdir}"

RUN useradd --create-home --uid 10001 copilot \
 && install -d -o copilot -g copilot /home/copilot/workspace /home/copilot/.copilot
COPY --chmod=0755 container/entrypoint.sh /usr/local/bin/copilot-server
COPY LICENSE.md /usr/share/licenses/copilot-cli/LICENSE.md

USER copilot
# The image is pinned to one CLI version, so every invocation (including
# `--entrypoint copilot`) must stay on it instead of self-updating into ~/.copilot.
ENV HOME=/home/copilot \
    COPILOT_PORT=4321 \
    COPILOT_AUTO_UPDATE=false
WORKDIR /home/copilot/workspace
EXPOSE 4321
ENTRYPOINT ["/usr/local/bin/copilot-server"]
