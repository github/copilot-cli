// SPDX-License-Identifier: MIT

import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { Writable } from "node:stream";
import test from "node:test";
import {
  encodeTerminalNotification,
  selectTerminalTarget,
  showTerminalNotification,
} from "./terminal-notifications.mjs";

function tty(options = {}) {
  const chunks = [];
  const stream = new Writable({
    write(chunk, encoding, done) {
      chunks.push(chunk.toString());
      done();
    },
    ...options,
  });
  stream.isTTY = true;
  return { stream, chunks };
}

function context(overrides = {}) {
  return {
    platform: "darwin",
    env: { TERM_PROGRAM: "ghostty", TERM: "xterm-ghostty" },
    stdout: tty().stream,
    stderr: tty().stream,
    ...overrides,
  };
}

const payload = { summary: "Copilot", subtitle: "project", body: "Agent finished" };

test("Ghostty uses OSC 777 and keeps the title, subtitle, and body", async () => {
  const { stream, chunks } = tty();
  assert.equal(
    await showTerminalNotification(payload, context({ stdout: stream })),
    "sent",
  );
  assert.deepEqual(chunks, ["\x1b]777;notify;Copilot;project - Agent finished\x07"]);
  assert.equal(stream.listenerCount("error"), 0);
});

test("iTerm2 uses OSC 9, not OSC 777", async () => {
  const { stream, chunks } = tty();
  await showTerminalNotification(payload, context({
    env: { TERM_PROGRAM: "iTerm.app", TERM: "xterm-256color" },
    stdout: stream,
  }));
  assert.deepEqual(chunks, ["\x1b]9;Copilot: project - Agent finished\x07"]);
});

test("Ghostty TERM fallback requires an absent TERM_PROGRAM", () => {
  assert.equal(
    selectTerminalTarget(context({ env: { TERM: "xterm-ghostty" } })).protocol,
    "osc777",
  );
  assert.equal(
    selectTerminalTarget(context({
      env: { TERM: "xterm-ghostty", TERM_PROGRAM: "Apple_Terminal" },
    })),
    undefined,
  );
});

for (const platform of ["linux", "win32"]) {
  test(`${platform} returns unsupported`, async () => {
    assert.equal(
      await showTerminalNotification(payload, context({ platform })),
      "unsupported",
    );
  });
}

for (const env of [
  { TERM_PROGRAM: "Apple_Terminal" },
  { TERM_PROGRAM: "not-ghostty" },
  { TERM_PROGRAM: "vscode" },
  { TERM_PROGRAM: "ghostty", TERM: "dumb" },
  { TERM_PROGRAM: "ghostty", TERM: "screen-256color" },
  { TERM_PROGRAM: "ghostty", TERM: "tmux-256color" },
  { TERM_PROGRAM: "ghostty", TMUX: "test-socket" },
  { TERM_PROGRAM: "ghostty", STY: "test-session" },
  { TERM_PROGRAM: "ghostty", SSH_CONNECTION: "present" },
  { TERM_PROGRAM: "ghostty", SSH_CLIENT: "present" },
  { TERM_PROGRAM: "ghostty", SSH_TTY: "test-tty" },
  { TERM_PROGRAM: "ghostty", HERDR_ENV: "present" },
  { TERM_PROGRAM: "ghostty", HERDR_PANE_ID: "test-pane" },
  { TERM_PROGRAM: "ghostty", HERDR_SOCKET_PATH: "test-socket" },
  { TERM_PROGRAM: "ghostty", COPILOT_MULTIPLEXER: "herdr" },
  { TERM_PROGRAM: "ghostty", COPILOT_MULTIPLEXER: "tmux" },
  {},
]) {
  test(`unsupported context emits no OSC: ${JSON.stringify(env)}`, async () => {
    const out = tty();
    const err = tty();
    assert.equal(await showTerminalNotification(payload, context({
      env,
      stdout: out.stream,
      stderr: err.stream,
    })), "unsupported");
    assert.deepEqual(out.chunks, []);
    assert.deepEqual(err.chunks, []);
  });
}

test("the disable switch prevents terminal output", async () => {
  const out = tty();
  const err = tty();
  assert.equal(await showTerminalNotification(payload, context({
    env: {
      TERM_PROGRAM: "ghostty",
      COPILOT_DISABLE_DESKTOP_NOTIFICATIONS: "1",
    },
    stdout: out.stream,
    stderr: err.stream,
  })), "disabled");
  assert.deepEqual(out.chunks, []);
  assert.deepEqual(err.chunks, []);
});

test("redirected output receives no escape sequences", async () => {
  const out = tty();
  const err = tty();
  out.stream.isTTY = false;
  err.stream.isTTY = false;
  assert.equal(await showTerminalNotification(payload, context({
    stdout: out.stream,
    stderr: err.stream,
  })), "unsupported");
  assert.deepEqual(out.chunks, []);
  assert.deepEqual(err.chunks, []);
});

test("stderr TTY is used when stdout is redirected", async () => {
  const out = tty();
  const err = tty();
  out.stream.isTTY = false;
  await showTerminalNotification(payload, context({
    stdout: out.stream,
    stderr: err.stream,
  }));
  assert.deepEqual(out.chunks, []);
  assert.equal(err.chunks.length, 1);
});

test("destroyed and ended streams are not selected", () => {
  const out = tty();
  const err = tty();
  out.stream.destroy();
  err.stream.end();
  assert.equal(selectTerminalTarget(context({
    stdout: out.stream,
    stderr: err.stream,
  })), undefined);
});

for (const protocol of ["osc777", "osc9"]) {
  test(`${protocol} rejects control-character and field-separator injection`, () => {
    const controls = Array.from(
      { length: 65 },
      (_, index) => String.fromCharCode(index < 32 ? index : index + 95),
    ).join("");
    const sequence = encodeTerminalNotification({
      summary: `Copilot${controls};title`,
      subtitle: "line\nbreak",
      body: "\x1b]52;c;clipboard\x07\x9c",
    }, protocol);
    assert.equal(sequence[0], "\x1b");
    assert.equal(sequence.at(-1), "\x07");
    assert.doesNotMatch(sequence.slice(1, -1), /[\x00-\x1f\x7f-\x9f]/);
    assert.equal(sequence.split(";").length, protocol === "osc777" ? 4 : 2);
  });
}

test("Unicode text survives sanitization", () => {
  assert.equal(
    encodeTerminalNotification({ summary: "\u4f60\u597d", body: "\ud83d\udc4d" }, "osc9"),
    "\x1b]9;\u4f60\u597d: \ud83d\udc4d\x07",
  );
});

test("empty bodies are valid; invalid input is not silently accepted", () => {
  assert.equal(
    encodeTerminalNotification({ summary: "Copilot" }, "osc777"),
    "\x1b]777;notify;Copilot;\x07",
  );
  assert.throws(() => encodeTerminalNotification({ summary: "\n;" }, "osc777"), /empty/);
  assert.throws(() => encodeTerminalNotification({ summary: 42 }, "osc9"), /string/);
  assert.throws(() => encodeTerminalNotification(payload, "osc999"), /Unsupported/);
});

test("backpressure waits for completion instead of reporting failure", async () => {
  let complete;
  const stream = new EventEmitter();
  stream.isTTY = true;
  stream.write = (sequence, callback) => {
    complete = callback;
    return false;
  };
  let finished = false;
  const result = showTerminalNotification(payload, context({ stdout: stream }))
    .then((value) => { finished = true; return value; });
  await Promise.resolve();
  assert.equal(finished, false);
  complete();
  assert.equal(await result, "sent");
  assert.equal(stream.listenerCount("error"), 0);
});

test("asynchronous stream errors propagate without an unhandled event", async () => {
  const failure = new Error("EIO");
  const { stream } = tty({ write(chunk, encoding, done) { done(failure); } });
  await assert.rejects(
    showTerminalNotification(payload, context({ stdout: stream })),
    (error) => error === failure,
  );
  assert.equal(stream.listenerCount("error"), 0);
});

test("synchronous stream errors propagate and remove the listener", async () => {
  const stream = new EventEmitter();
  stream.isTTY = true;
  stream.write = () => { throw new Error("write failed"); };
  await assert.rejects(
    showTerminalNotification(payload, context({ stdout: stream })),
    /write failed/,
  );
  assert.equal(stream.listenerCount("error"), 0);
});
