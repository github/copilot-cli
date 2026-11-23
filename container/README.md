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

Start the server with a random shared secret. SDK clients present this value as `connectionToken`; it controls who can connect, not which GitHub account a session uses. Do not use a GitHub token as the connection secret.

```sh
export COPILOT_CONNECTION_TOKEN="$(openssl rand -hex 32)"

docker run --rm \
  -p 127.0.0.1:4321:4321 \
  -e COPILOT_CONNECTION_TOKEN \
  ghcr.io/github/copilot-cli:1.0.114
```

In PowerShell on Windows:

```powershell
$bytes = [byte[]]::new(32)
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$env:COPILOT_CONNECTION_TOKEN = -join ($bytes | ForEach-Object { $_.ToString("x2") })

docker run --rm `
  -p 127.0.0.1:4321:4321 `
  -e COPILOT_CONNECTION_TOKEN `
  ghcr.io/github/copilot-cli:1.0.114
```

The server waits for an SDK client. No GitHub credential is needed to connect or ping. For example, install the Node.js SDK (`npm install @microsoft/copilot-sdk@2.0.0`) and run this client with the same `COPILOT_CONNECTION_TOKEN` in its environment. The example pins the SDK and image to compatible protocol versions.

```js
import { CopilotClient, RuntimeConnection } from "@microsoft/copilot-sdk";

const client = new CopilotClient({
  mode: "empty",
  runtime: RuntimeConnection.forTcp("127.0.0.1", 4321, {
    connectionToken: process.env.COPILOT_CONNECTION_TOKEN,
  }),
});

await client.start();
console.log(await client.ping("hello"));
await client.stop();
```

To use one GitHub account as the default for sessions, export `COPILOT_GITHUB_TOKEN` and add `-e COPILOT_GITHUB_TOKEN` before the image name. For a multi-user application, supply credentials per session instead.

### Generate a token for local use

With an image [built from this source](#building-locally), set `COPILOT_CONNECTION_TOKEN_GENERATE=true` to print a fresh connection token at startup:

```sh
docker run --rm --name copilot-local -p 127.0.0.1:4321:4321 \
  -e COPILOT_CONNECTION_TOKEN_GENERATE=true copilot-cli:local
```

Use the value after `Generated COPILOT_CONNECTION_TOKEN=` as the SDK's `connectionToken`. If running detached, read it with `docker logs copilot-local`. **Anyone who can read those logs can see the token**, and restarting the container generates a different one. Use a managed secret for shared deployments. `COPILOT_CONNECTION_TOKEN_GENERATE` must be `true` or `false`, and cannot be enabled when `COPILOT_CONNECTION_TOKEN` is set.

## Serving multiple users

Keep the port and connection secret private to your backend. The backend authenticates each user, records which sessions they own, and checks ownership before accessing, resuming, or deleting a session. A connection token admits a client to the server; it does not authorize access to an individual session.

Leave `COPILOT_GITHUB_TOKEN`, `GH_TOKEN`, and `GITHUB_TOKEN` unset on the server. In your backend, use `mode: "empty"` as above and pass the authenticated user's GitHub token when creating or resuming their session. For example, on a connected client:

```js
const session = await client.createSession({
  github: { token: user.githubToken }, // From your backend's authentication flow
  tools: { availableTools: [] },
});
```

Only enable tools that enforce the user's permissions. Sessions have separate histories and can have separate GitHub identities, but their tools run as the same OS user. If mutually untrusted tenants need shell or filesystem access, give each tenant a separate container with its own workspace, `COPILOT_HOME`, credentials, and connection secret. See the [SDK multi-tenancy guide](https://docs.github.com/en/copilot/how-tos/copilot-sdk/setup/multi-tenancy).

## Configuration

Configure the server with environment variables. Arguments after the image name are appended to the `copilot` command line, for example `--log-level debug`.

| Variable | Default | Description |
| --- | --- | --- |
| `COPILOT_CONNECTION_TOKEN` | unset | Required. Shared secret that SDK clients must present to connect. |
| `COPILOT_CONNECTION_TOKEN_GENERATE` | `false` | Set to `true` to generate and print a fresh token at startup for [local use](#generate-a-token-for-local-use). Cannot be combined with `COPILOT_CONNECTION_TOKEN`. |
| `COPILOT_PORT` | `4321` | Port the server listens on inside the container, from 1024 to 65535. |
| `COPILOT_GITHUB_TOKEN`, `GH_TOKEN`, `GITHUB_TOKEN` | unset | Optional server-wide GitHub identity for sessions without their own credential. The first variable set wins. A [fine-grained personal access token with the "Copilot Requests" permission](../README.md#launching-the-cli) works. |
| `COPILOT_HOME` | `/home/copilot/.copilot` | Where the CLI stores its configuration and state. |

The image is pinned to one CLI version, so auto-update is off (`COPILOT_AUTO_UPDATE=false`). Any other variable listed by `copilot help environment` also works, such as the `COPILOT_PROVIDER_*` variables for using your own model provider.

Paths in the image:

- `/home/copilot/workspace` is the working directory. Mount a project here to let the agent work on it.
- `/home/copilot/.copilot` holds configuration and state. Mount a volume here to keep them across containers.

The container runs as the non-root user `copilot` (uid 10001), so any mounted workspace or state directory it writes to must be writable by that user. Git is configured to trust only `/home/copilot/workspace`, allowing Git operations on a mounted repository even when its host UID differs. This is an exact-path exception, not a wildcard; mount repositories at the workspace path.

To run another `copilot` command instead of the server, override the entrypoint:

```sh
docker run --rm --entrypoint copilot ghcr.io/github/copilot-cli:latest --version
```

## Running on Kubernetes

Create the connection secret as a Kubernetes Secret. `--from-literal` stores it without a trailing newline:

```sh
kubectl create secret generic copilot-connection \
  --from-literal=token="$(openssl rand -hex 32)"
```

Set `COPILOT_CONNECTION_TOKEN` from the Secret and expose the server inside the cluster:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: copilot
spec:
  replicas: 1
  selector:
    matchLabels:
      app: copilot
  template:
    metadata:
      labels:
        app: copilot
    spec:
      enableServiceLinks: false # Keeps the "copilot" Service from overriding COPILOT_PORT
      containers:
        - name: copilot
          image: ghcr.io/github/copilot-cli:1.0.114
          env:
            - name: COPILOT_CONNECTION_TOKEN
              valueFrom:
                secretKeyRef:
                  name: copilot-connection
                  key: token
          ports:
            - containerPort: 4321
          readinessProbe:
            tcpSocket:
              port: 4321
---
apiVersion: v1
kind: Service
metadata:
  name: copilot
spec:
  selector:
    app: copilot
  ports:
    - port: 4321
```

SDK clients in the same namespace connect to `copilot:4321` with the same token.

- **Service links.** Without `enableServiceLinks: false`, Kubernetes sets `COPILOT_PORT=tcp://…` for a Service named `copilot`, and the container exits. Setting `COPILOT_PORT` in `env` also fixes this.
- **Rotation.** After updating the Secret, run `kubectl rollout restart deployment/copilot` so new pods pick up the token, and update clients to use the same value.
- **Replicas.** Each pod keeps its own sessions under `/home/copilot/.copilot`. Run one replica per server, or route each user's sessions to the same pod. Mount a persistent volume there to keep sessions across restarts.
- **Network access.** Keep the Service `ClusterIP` and limit which pods can reach it, for example with a NetworkPolicy.

## Security

- The server listens on all interfaces inside the container, and anyone who can reach the port and knows the token can run agent tools in the container. Publish the port on loopback (`-p 127.0.0.1:4321:4321`) or on an isolated container network, and use a long random token.
- The connection is plain TCP without TLS. Both the connection secret and any GitHub credentials sent by the SDK travel unencrypted. Keep the traffic on a trusted network, or protect it with TLS.
- Agent tools run inside the container with the permissions of the `copilot` user. Treat the container as the sandbox and give it only the files and credentials the agent needs.

## Waiting for the server

A published port can accept TCP connections before the server is ready to answer, for example behind Docker Desktop's port proxy. When you wait for the container to start, for instance with Testcontainers, check with a real client call such as `ping` instead of only checking that the port is open.

## Troubleshooting on Apple Silicon

If the server logs `qemu: uncaught target signal 11`, check whether `DOCKER_DEFAULT_PLATFORM` or a `--platform` flag forces `linux/amd64`. The image includes a native ARM64 build. Remove the override or pass `--platform linux/arm64` to `docker run` before the image name.

## Verifying an image

Images are published with a build provenance attestation:

```sh
gh attestation verify oci://ghcr.io/github/copilot-cli:1.0.105 --repo github/copilot-cli
```

The attestation is stored in the registry next to the image, so the package's tag list also shows a `sha256-<digest>` tag. That tag holds the attestation, not an image to run.

The image contains the `copilot` binary from the matching GitHub release, which the build verifies against the release's `SHA256SUMS.txt`. The license is at `/usr/share/licenses/copilot-cli/LICENSE.md`.

## Building locally

The smoke test requires a Unix environment (Linux or macOS), Python 3, and Docker configured to run Linux containers. Native Windows Python is not supported because the bind-mounted Git check uses Unix UID/GID APIs (`os.getuid()` and `os.getgid()`). On Windows, run the commands below from a Linux environment such as WSL 2.

Build from the repository root with the release version, without the leading `v`:

```sh
docker build -f container/Dockerfile --build-arg COPILOT_VERSION=1.0.105 -t copilot-cli:local .
python3 container/smoke_test.py copilot-cli:local --version 1.0.105
```

The smoke test checks the container's configuration, Git access to a bind-mounted repository owned by the host user, and a real client handshake with the running server. Add `--platform linux/arm64` or `--platform linux/amd64` to test a build for another architecture.

## Publishing

The [Publish container image from release](../.github/workflows/publish-container.yml) workflow runs when a release is published:

1. It validates the release: the tag looks like `vX.Y.Z` or `vX.Y.Z-N`, the release is published, its prerelease flag matches the version, and the Linux archives and `SHA256SUMS.txt` are fully uploaded.
2. It builds each architecture on a native runner and runs `container/smoke_test.py` against the result before anything is pushed.
3. It pushes the images by digest, combines them into one multi-platform image and tags it with the version. It also moves `latest` (stable releases) or `prerelease` (prereleases), unless that would move the tag to an older version. Finally it attests the build provenance.

The workflow builds with the files on `main`, not the ones at the release tag, so a fix to `container/` applies to the next publish without re-tagging.

The image is tagged before its attestation is created. If a run fails, re-run its failed jobs from the run page. The final job recreates the same multi-platform image from the recorded digests and tries the attestation again, so a temporary Sigstore failure leaves nothing to clean up.

To publish a release manually, start the workflow from `main` and enter the release tag, such as `v1.0.105`. This rebuilds both architectures and replaces the release's tag. Select **dry_run** to build and test without pushing.

The first publish creates the `ghcr.io/github/copilot-cli` package. Check in the package settings that it is public and linked to this repository, so that anyone can pull it.
