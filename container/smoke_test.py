#!/usr/bin/env python3
"""Smoke-tests a GitHub Copilot CLI server container image.

    python3 container/smoke_test.py IMAGE [--version X.Y.Z] [--platform linux/amd64]

IMAGE must already be in the local Docker image store (for example after
`docker build` or `docker buildx build --load`). The script needs Docker and the
Python 3 standard library only.

The server speaks JSON-RPC 2.0 over plain TCP with LSP-style
`Content-Length` framing. A bare TCP probe is not enough to know it is ready
(Docker Desktop accepts connections before the container listens), so readiness
is the real `connect` handshake.
"""

import argparse
import json
import os
import secrets
import socket
import subprocess
import sys
import tempfile
import time

SERVER_PORT = 4321
COMMAND_TIMEOUT_SECONDS = 300
AUTHENTICATION_FAILED = -32002
LICENSE_PATH = "/usr/share/licenses/copilot-cli/LICENSE.md"
RUNTIME_UID = "10001"


class Failure(Exception):
    pass


def docker(*args, env=None):
    try:
        return subprocess.run(
            ["docker", *args],
            capture_output=True,
            text=True,
            timeout=COMMAND_TIMEOUT_SECONDS,
            env=env,
        )
    except subprocess.TimeoutExpired:
        raise Failure("`docker %s` did not finish within %ds" % (" ".join(args[:2]), COMMAND_TIMEOUT_SECONDS))


def container_name():
    return "copilot-smoke-" + secrets.token_hex(4)


def run_args(target, name, *extra):
    args = ["run", "--pull", "never", "--name", name]
    if target.platform:
        args += ["--platform", target.platform]
    return args + list(extra)


def run_to_completion(target, docker_args=(), image_args=()):
    name = container_name()
    try:
        return docker(*run_args(target, name, "--rm", *docker_args), target.image, *image_args)
    finally:
        docker("rm", "--force", name)


def container_logs(name):
    logs = docker("logs", name)
    return (logs.stdout + logs.stderr).strip()


class Client:
    def __init__(self, port, timeout=10.0):
        self.sock = socket.create_connection(("127.0.0.1", port), timeout=timeout)
        self.reader = self.sock.makefile("rb")
        self.last_id = 0

    def close(self):
        self.reader.close()
        self.sock.close()

    def call(self, method, params):
        self.last_id += 1
        body = json.dumps({"jsonrpc": "2.0", "id": self.last_id, "method": method, "params": params}).encode()
        self.sock.sendall(b"Content-Length: %d\r\n\r\n" % len(body) + body)
        while True:
            message = self._read()
            if message.get("id") == self.last_id and ("result" in message or "error" in message):
                return message

    def _read(self):
        length = None
        while True:
            line = self.reader.readline()
            if not line:
                raise EOFError("connection closed")
            line = line.strip()
            if not line:
                break
            header, _, value = line.decode("ascii").partition(":")
            if header.strip().lower() == "content-length":
                length = int(value)
        if length is None:
            raise Failure("server sent a message without a Content-Length header")
        body = self.reader.read(length)
        if len(body) != length:
            raise EOFError("connection closed mid-message")
        return json.loads(body)


def check_requires_token(target):
    for label, docker_args in (("unset", []), ("empty", ["--env", "COPILOT_CONNECTION_TOKEN="])):
        result = run_to_completion(target, docker_args)
        if result.returncode == 0 or "COPILOT_CONNECTION_TOKEN" not in result.stderr:
            raise Failure(
                "with COPILOT_CONNECTION_TOKEN %s the container should exit non-zero and name the variable; "
                "got exit %d: %s" % (label, result.returncode, result.stderr.strip())
            )


def check_rejects_invalid_port(target):
    for port in ("80", "70000", "1234567", "abc", ""):
        result = run_to_completion(
            target, ["--env", "COPILOT_CONNECTION_TOKEN=unused", "--env", "COPILOT_PORT=" + port]
        )
        if result.returncode == 0 or "COPILOT_PORT" not in result.stderr:
            raise Failure(
                "COPILOT_PORT=%r should be rejected with a message naming the variable; got exit %d: %s"
                % (port, result.returncode, result.stderr.strip())
            )


def check_cli_version(target):
    result = run_to_completion(target, ["--entrypoint", "copilot"], ["--version"])
    if result.returncode != 0:
        raise Failure("`copilot --version` failed: %s" % result.stderr.strip())
    words = [word.rstrip(".") for word in result.stdout.split()]
    if target.version and target.version not in words:
        raise Failure("`copilot --version` printed %r, expected version %s" % (result.stdout.strip(), target.version))
    return result.stdout.strip().splitlines()[0]


def check_runtime_environment(target):
    script = (
        "set -e; id -u; "
        'test -s "$1"; '
        'test "$(git config --system --get-all safe.directory)" = /home/copilot/workspace; '
        'test -w "$HOME/.copilot"; '
        'test -w "$PWD"'
    )
    result = run_to_completion(
        target, ["--entrypoint", "sh"], ["-c", script, "sh", LICENSE_PATH]
    )
    if result.returncode != 0:
        raise Failure("runtime environment check failed (exit %d): %s" % (result.returncode, result.stderr.strip()))
    if result.stdout.strip() != RUNTIME_UID:
        raise Failure("expected to run as uid %s, got %r" % (RUNTIME_UID, result.stdout.strip()))


def check_git_workspace(target):
    with tempfile.TemporaryDirectory(prefix="copilot-git-safe-") as workspace:
        volume = "%s:/home/copilot/workspace" % workspace
        initialized = run_to_completion(
            target,
            ["--user", "0:0", "--volume", volume, "--entrypoint", "git"],
            ["init", "--quiet", "/home/copilot/workspace"],
        )
        if initialized.returncode != 0:
            raise Failure("could not initialize a root-owned workspace repository: %s" % initialized.stderr.strip())

        result = run_to_completion(
            target,
            ["--volume", volume, "--entrypoint", "git"],
            ["-C", "/home/copilot/workspace", "rev-parse", "--show-toplevel"],
        )
        if result.returncode != 0 or result.stdout.strip() != "/home/copilot/workspace":
            raise Failure(
                "Git could not read a differently-owned repository mounted at the workspace: %s"
                % result.stderr.strip()
            )


def ensure_running(name):
    result = docker("inspect", "--format", "{{.State.Running}} {{.State.ExitCode}}", name)
    running, _, exit_code = result.stdout.strip().partition(" ")
    if running != "true":
        raise Failure("the container exited (code %s) before the server became ready" % (exit_code or "unknown"))


def published_port(name):
    result = docker("port", name, "%d/tcp" % SERVER_PORT)
    if result.returncode != 0 or not result.stdout.strip():
        ensure_running(name)
        raise Failure("container has no published port %d: %s" % (SERVER_PORT, result.stderr.strip()))
    return int(result.stdout.splitlines()[0].rsplit(":", 1)[1])


def connect_when_ready(target, name, port, token):
    deadline = time.monotonic() + target.timeout
    last_error = "no attempt was made"
    while time.monotonic() < deadline:
        ensure_running(name)
        client = None
        try:
            client = Client(port)
            return client, client.call("connect", {"token": token})
        except (OSError, EOFError) as error:
            last_error = repr(error)
            if client:
                client.close()
            time.sleep(1)
    raise Failure("the server did not complete the connect handshake within %gs (last error: %s)" % (target.timeout, last_error))


def check_server(target):
    token = secrets.token_urlsafe(24)
    name = container_name()
    env = dict(os.environ, COPILOT_CONNECTION_TOKEN=token)
    try:
        started = docker(
            *run_args(
                target, name,
                "--detach",
                "--publish", "127.0.0.1::%d" % SERVER_PORT,
                "--env", "COPILOT_CONNECTION_TOKEN",
            ),
            target.image,
            env=env,
        )
        if started.returncode != 0:
            raise Failure("could not start the server container: %s" % started.stderr.strip())
        port = published_port(name)

        client, reply = connect_when_ready(target, name, port, token)
        try:
            result = reply.get("result")
            if not isinstance(result, dict) or result.get("ok") is not True:
                raise Failure("connect was rejected: %s" % json.dumps(reply))
            if target.version and result.get("version") != target.version:
                raise Failure("server reports version %r, expected %r" % (result.get("version"), target.version))
            pong = client.call("ping", {"message": "hi"}).get("result") or {}
            if pong.get("message") != "pong: hi":
                raise Failure("unexpected ping response: %s" % json.dumps(pong))
        finally:
            client.close()

        intruder = Client(port)
        try:
            rejected = intruder.call("connect", {"token": token + "-wrong"})
        finally:
            intruder.close()
        if (rejected.get("error") or {}).get("code") != AUTHENTICATION_FAILED:
            raise Failure("a wrong token should fail with %d, got: %s" % (AUTHENTICATION_FAILED, json.dumps(rejected)))

        ensure_running(name)
        stopped = docker("stop", "--time", "10", name)
        exit_code = docker("inspect", "--format", "{{.State.ExitCode}}", name).stdout.strip()
        if stopped.returncode != 0 or exit_code == "137":
            raise Failure("the server did not shut down on SIGTERM within 10s (exit code %s)" % exit_code)

        return result.get("version")
    except Failure as failure:
        logs = container_logs(name)
        raise Failure("%s\n--- container logs ---\n%s" % (failure, logs or "(empty)"))
    finally:
        docker("rm", "--force", name)


def parse_args():
    parser = argparse.ArgumentParser(description="Smoke-test a Copilot CLI server image.")
    parser.add_argument("image", help="image reference in the local Docker image store")
    parser.add_argument("--version", help="CLI version the image must report, without a leading v")
    parser.add_argument("--platform", help="platform of the image, for example linux/arm64")
    parser.add_argument(
        "--timeout", type=float, default=180.0, help="seconds to wait for the server to become ready (default: 180)"
    )
    return parser.parse_args()


def main():
    target = parse_args()
    checks = [
        ("refuses to start without a connection token", check_requires_token),
        ("rejects an invalid COPILOT_PORT", check_rejects_invalid_port),
        ("CLI binary runs and reports its version", check_cli_version),
        ("runs as an unprivileged user with the license present", check_runtime_environment),
        ("Git accepts a differently-owned repository mounted at the workspace", check_git_workspace),
        ("server accepts a token, answers ping, rejects a wrong token and stops on SIGTERM", check_server),
    ]
    for description, check in checks:
        started = time.monotonic()
        try:
            detail = check(target)
        except Failure as failure:
            print("FAIL  %s\n%s" % (description, failure), file=sys.stderr, flush=True)
            return 1
        print("ok    %s (%.1fs)%s" % (description, time.monotonic() - started, " - " + detail if detail else ""), flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
