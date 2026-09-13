// SPDX-License-Identifier: MIT

export function selectTerminalTarget(context = process) {
  const { platform, env, stdout, stderr } = context;
  if (
    platform !== "darwin" ||
    env.TERM === "dumb" ||
    env.TMUX ||
    env.STY ||
    /^(?:screen|tmux)(?:[.-]|$)/i.test(env.TERM ?? "") ||
    env.SSH_CONNECTION ||
    env.SSH_CLIENT ||
    env.SSH_TTY ||
    env.HERDR_ENV ||
    env.HERDR_PANE_ID ||
    env.HERDR_SOCKET_PATH ||
    ["tmux", "herdr"].includes(env.COPILOT_MULTIPLEXER)
  ) {
    return undefined;
  }

  const terminal = (env.TERM_PROGRAM ?? "").toLowerCase();
  let protocol;
  if (terminal === "ghostty" || (!terminal && env.TERM === "xterm-ghostty")) {
    protocol = "osc777";
  } else if (terminal === "iterm.app") {
    protocol = "osc9";
  } else {
    return undefined;
  }

  const stream = [stdout, stderr].find(
    (candidate) =>
      candidate?.isTTY === true &&
      candidate.writable !== false &&
      !candidate.writableEnded &&
      !candidate.destroyed,
  );
  return stream ? { protocol, stream } : undefined;
}

export function encodeTerminalNotification(payload, protocol) {
  const sanitize = (value) => {
    if (typeof value !== "string") {
      throw new TypeError("Notification text must be a string");
    }
    return value
      .replace(/[\x00-\x1f\x7f-\x9f;]/g, " ")
      .replace(/\s+/gu, " ")
      .trim();
  };

  const title = sanitize(payload.summary);
  if (!title) {
    throw new TypeError("Notification summary must not be empty");
  }
  const details = [payload.subtitle, payload.body]
    .filter((value) => value !== undefined)
    .map(sanitize)
    .filter(Boolean)
    .join(" - ");

  if (protocol === "osc777") {
    return `\x1b]777;notify;${title};${details}\x07`;
  }
  if (protocol === "osc9") {
    return `\x1b]9;${[title, details].filter(Boolean).join(": ")}\x07`;
  }
  throw new RangeError(`Unsupported notification protocol: ${protocol}`);
}

export async function showTerminalNotification(payload, context = process) {
  if (context.env.COPILOT_DISABLE_DESKTOP_NOTIFICATIONS === "1") {
    return "disabled";
  }
  const target = selectTerminalTarget(context);
  if (!target) {
    return "unsupported";
  }

  const sequence = encodeTerminalNotification(payload, target.protocol);
  let onError;
  try {
    await new Promise((resolve, reject) => {
      onError = reject;
      target.stream.once("error", onError);
      // A false write result is backpressure, not a failed notification.
      target.stream.write(sequence, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  } finally {
    if (onError) target.stream.removeListener("error", onError);
  }
  return "sent";
}
