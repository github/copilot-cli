# Copilot CLI container image

A container image that runs [GitHub Copilot CLI](../README.md) as a headless server. [Copilot SDK](https://github.com/github/copilot-sdk) clients connect to it over TCP, so the agent runtime can run in a container, a CI job or a pod instead of on the machine that runs your application.

A new image is published to the GitHub Container Registry for every Copilot CLI release:

```text
ghcr.io/github/copilot-cli
```

| Tag | Points to |
| --- | --- |
| `1.0.105`, `1.0.106-0`, … | The release with that version. |
| `latest` | The newest stable release. |
| `prerelease` | The newest prerelease. |

Images are available for `linux/amd64` and `linux/arm64`. Tags are mutable: running the publish workflow again for a release replaces that release's tag, so reference the image by digest when you need a build that can never change.

## Quick start

Start the server with a secret that clients must present, and a token that lets the CLI use Copilot (see [Configuration](#configuration)):

```sh
export COPILOT_CONNECTION_TOKEN="$(openssl rand -hex 32)"

docker run --rm \
  -p 127.0.0.1:4321:4321 \
  -e COPILOT_CONNECTION_TOKEN \
  -e COPILOT_GITHUB_TOKEN \
  ghcr.io/github/copilot-cli:latest
```

Then connect with a Copilot SDK client. For example, with the Node.js SDK (`npm install @github/copilot-sdk`):

```js
import { CopilotClient, RuntimeConnection } from "@github/copilot-sdk";

const client = new CopilotClient({
  connection: RuntimeConnection.forUri("localhost:4321", {
    connectionToken: process.env.COPILOT_CONNECTION_TOKEN,
  }),
});

await client.start();
console.log(await client.ping("hello"));
await client.stop();
```

The other Copilot SDKs can connect to a running server in the same way. See the [SDK documentation](https://github.com/github/copilot-sdk).

## Configuration

Configure the server with environment variables. Arguments after the image name are appended to the `copilot` command line, for example `--log-level debug`.

| Variable | Default | Description |
| --- | --- | --- |
| `COPILOT_CONNECTION_TOKEN` | required | Secret that clients must present to connect. The container refuses to start without it. |
| `COPILOT_PORT` | `4321` | Port the server listens on inside the container, from 1024 to 65535. |
| `COPILOT_GITHUB_TOKEN`, `GH_TOKEN`, `GITHUB_TOKEN` | | Token the CLI uses to authenticate with GitHub. The first one that is set wins. A [fine-grained personal access token with the "Copilot Requests" permission](../README.md#launching-the-cli) works. |
| `COPILOT_HOME` | `/home/copilot/.copilot` | Where the CLI stores its configuration and state. |

The image is pinned to one CLI version, so auto-update is off (`COPILOT_AUTO_UPDATE=false`). Any other variable listed by `copilot help environment` also works, such as the `COPILOT_PROVIDER_*` variables for using your own model provider.

Paths in the image:

- `/home/copilot/workspace` is the working directory. Mount a project here to let the agent work on it.
- `/home/copilot/.copilot` holds configuration and state. Mount a volume here to keep them across containers.

The container runs as the non-root user `copilot` (uid 10001), so bind mounts must be writable by that user.

To run another `copilot` command instead of the server, override the entrypoint:

```sh
docker run --rm --entrypoint copilot ghcr.io/github/copilot-cli:latest --version
```

## Security

- The server listens on all interfaces inside the container, and anyone who can reach the port and knows the token can run agent tools in the container. Publish the port on loopback (`-p 127.0.0.1:4321:4321`) or on an isolated container network, and use a long random token.
- The connection is plain TCP without TLS, so the token is sent unencrypted. Keep the traffic on a trusted network, or terminate TLS in front of the container.
- Agent tools run inside the container with the permissions of the `copilot` user. Treat the container as the sandbox and give it only the files and credentials the agent needs.

## Waiting for the server

A published port can accept TCP connections before the server is ready to answer, for example behind Docker Desktop's port proxy. When you wait for the container to start, for instance with Testcontainers, check with a real client call such as `ping` instead of only checking that the port is open.

## Verifying an image

Images are published with a build provenance attestation:

```sh
gh attestation verify oci://ghcr.io/github/copilot-cli:1.0.105 --repo github/copilot-cli
```

The attestation is stored in the registry next to the image, so the package's tag list also shows a `sha256-<digest>` tag. That tag holds the attestation, not an image to run.

The image contains the `copilot` binary from the matching GitHub release, which the build verifies against the release's `SHA256SUMS.txt`. The license is at `/usr/share/licenses/copilot-cli/LICENSE.md`.

## Building locally

Build from the repository root with the release version, without the leading `v`:

```sh
docker build -f container/Dockerfile --build-arg COPILOT_VERSION=1.0.105 -t copilot-cli:local .
python3 container/smoke_test.py copilot-cli:local --version 1.0.105
```

The smoke test needs only Python 3 and Docker. It checks the container's configuration and a real client handshake with the running server. Add `--platform linux/arm64` or `--platform linux/amd64` to test a build for another architecture.

## Publishing

The [Publish container image from release](../.github/workflows/publish-container.yml) workflow runs when a release is published:

1. It validates the release: the tag looks like `vX.Y.Z` or `vX.Y.Z-N`, the release is published, its prerelease flag matches the version, and the Linux archives and `SHA256SUMS.txt` are fully uploaded.
2. It builds each architecture on a native runner and runs `container/smoke_test.py` against the result before anything is pushed.
3. It pushes the images by digest, combines them into one multi-platform image and tags it with the version. It also moves `latest` (stable releases) or `prerelease` (prereleases), unless that would move the tag to an older version. Finally it attests the build provenance.

The workflow builds with the files on `main`, not the ones at the release tag, so a fix to `container/` applies to the next publish without re-tagging.

The image is tagged before its attestation is created. If a run fails, re-run its failed jobs from the run page. The final job recreates the same multi-platform image from the recorded digests and tries the attestation again, so a temporary Sigstore failure leaves nothing to clean up.

To publish a release manually, start the workflow from `main` and enter the release tag, such as `v1.0.105`. This rebuilds both architectures and replaces the release's tag. Select **dry_run** to build and test without pushing.

The first publish creates the `ghcr.io/github/copilot-cli` package. Check in the package settings that it is public and linked to this repository, so that anyone can pull it.
