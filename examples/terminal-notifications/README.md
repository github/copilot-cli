# Proposal: terminal-owned macOS notifications

This is an original, standalone reference implementation for discussion. It does
not change the shipped Copilot CLI or modify its installed files. Integration
into the actual notification implementation requires a maintainer change.

## Problem

On macOS in Ghostty, clicking a Copilot CLI desktop notification can open Script
Editor instead of returning to the terminal.

This was observed with the unmodified
[1.0.84-1 prerelease](https://github.com/github/copilot-cli/releases/tag/v1.0.84-1).
Comparison with the official release ruled out a stale local notification patch.
The macOS notification path uses AppleScript, which attributes the notification
to the scripting host rather than the originating terminal.

To reproduce:

1. Enable desktop notifications and start an interactive Copilot CLI session in Ghostty.
2. Submit a request and switch to another application.
3. Wait for a completion or attention notification.
4. Click it.

Expected: return to the terminal, without opening Script Editor.

## Proposed behavior

For supported local macOS terminals, prefer a notification protocol implemented
by the terminal itself:

| Terminal | Protocol |
| --- | --- |
| Ghostty | OSC 777 |
| iTerm2 | OSC 9 |

The terminal owns these notifications and handles their click actions.

[`terminal-notifications.mjs`](./terminal-notifications.mjs) provides:

- `selectTerminalTarget(context)`: select a supported terminal and writable TTY.
- `encodeTerminalNotification(payload, protocol)`: encode sanitized notification text.
- `showTerminalNotification(payload, context)`: emit a notification and return
  `"sent"`, `"unsupported"`, or `"disabled"`; reject on invalid text or write errors.

The optional context defaults to `process` and exposes `platform`, `env`,
`stdout`, and `stderr`. It also makes the implementation independently testable.

## Integration requirements

Keep the existing notification setting, event formatting, focus gate, rate
limiting, and in-flight deduplication. Keep an existing protocol-aware host or
multiplexer notification backend ahead of this terminal path.

Before native delivery, try the terminal backend. On `"unsupported"`, use the
existing native backend. On an exception, log the failure and use the existing
native backend. On `"disabled"`, do not deliver through another backend.

Only mark a notification as sent after the selected backend reports success.
Do not require the native backend to be available before trying an independently
supported terminal backend.

The example removes C0/C1 control characters, DEL, and field separators from
notification text. It writes one complete sequence only to a writable TTY,
preferring stdout and then stderr. It awaits the write callback: a `false`
return value from `write()` means backpressure, not delivery failure.

## Scope and tradeoffs

Linux, Windows, unknown terminals, SSH, tmux, screen, and unsupported multiplexer
contexts return `"unsupported"`. Passthrough support should be implemented and
tested explicitly, not guessed from inherited environment variables.

Terminal notification permissions, sounds, grouping, urgency, and foreground
suppression can differ from native notifications. Existing notification IDs,
timeouts, and urgency fields cannot all be represented by OSC 777/9. Preserve
existing payload length limits in the caller.

`"sent"` confirms the sequence was written, not that the OS displayed it.
Disabled terminal notification permissions cannot be detected from a successful
TTY write. Users must enable notifications for the terminal.

For terminals without a suitable protocol, a supported native notification
helper with explicit terminal activation is a separate possible solution.

## Validation

The example has no external dependencies. Run its tests with Node.js:

```sh
node --test examples/terminal-notifications/terminal-notifications.test.mjs
```

The tests cover protocol selection, unsupported environments, disabled
notifications, redirected output, control-character sanitization, backpressure,
and synchronous/asynchronous write errors. They do not launch Copilot, load its
runtime, read user configuration, or send real desktop notifications.

In a separate macOS desktop acceptance run using this backend, the notification's
default click action brought Ghostty to the foreground from another application
without opening Script Editor. That run covered one Ghostty window, not iTerm2
or multiple-window behavior. Those cases still need maintainer validation before
integrating a product change.

## License

Only the original files in this example directory are offered under the
[MIT license](./LICENSE). No Copilot runtime source, binaries, local installation
wrappers, or user configuration are included. This example's license does not
change the license of Copilot CLI.
