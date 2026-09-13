# Copilot CLI next-best-action extension

This is an original extension prototype using the **existing foreground Copilot
session**, not a new CLI or agent session. It does not modify the installed CLI.
It requires a CLI build exposing the experimental extension SDK, including
`session.getEvents()`, `session.rpc.mode.get()`, and `session.rpc.ui.ephemeralQuery()`.
It is installed separately rather than enabled by checking out this repository.

## LLM access

`joinSession()` attaches to the foreground session. Recommendations use
`session.rpc.ui.ephemeralQuery({ question })`, the experimental no-tools query API
over that session's current conversation. It does not submit a normal user turn,
read additional repository files, extract credentials, or install a permission handler.
The extension process is a normal part of the extension host; it does not spawn a
second CLI.

Before inference, `session.getEvents()` checks the current session for a prior
root user/assistant exchange. The guard examines event types and agent IDs, not
message contents, and resets after context clearing. It does not read another
session or log the returned history. Empty sessions do not make model requests.

This API uses the session's existing provider configuration. Queries can incur
model usage. They only run on explicit request, are shared between concurrent
callers, and are cached until the conversation or relevant settings change.
Failures propagate without automatic retries or a subprocess fallback.

On the locally exercised runtime, longer answers can be streamed successfully
while the RPC returns an empty `answer`. The adapter also subscribes to the
documented `ui.ephemeral_query` events and recovers only a complete, successful,
unambiguous stream. It reports that compatibility path once and still validates
the full recommendation schema. Overlapping side queries are rejected rather
than mixing their responses. No extra inference request is made.

The API does not expose a per-query cancellation handle. Invalidation discards
stale results but does not claim to cancel inference or billing. An old query
must settle before another starts; the extension never aborts the user's agent
turn to cancel a recommendation. Generation stops waiting after 60 seconds and
reports an error. A timed-out request may still be running: refreshing cannot
start another query until it settles, and late results are never displayed.
Automatic prefetch and quota-sensitive rollout need native lifecycle, cancellation,
and metering integration.
The live probes did not increment the session metrics returned by
`usage.getMetrics`; do not assume this means the requests are free or covered by
the main turn's usage limit.

## Use

The source is in `extensions/next-best-action/`, outside automatic discovery.
Copy that directory into your personal Copilot extensions directory to use it
across repositories, or into a repository's `.github/extensions/` for a
project-only installation. Install at only one scope: this runtime can report
duplicate tool names when both copies load. The Copilot extension host resolves
`@github/copilot-sdk/extension`; no npm dependency is required. Reload extensions
after editing or restart Copilot.

Run `/next-action` after a task finishes. The command reads the current mode and
chooses the appropriate UI; it never changes the mode or permissions.

A fresh session displays "No next-action context yet" instead of querying a model.
Opening a repository does not import the conversation from another CLI session.
Complete a task here, or resume the session containing your completed work, before
requesting suggestions. The first completed response invalidates the empty-context
result automatically; a refresh is not needed.

### Autopilot

The exercised Copilot runtime automatically declines extension input dialogs in
autopilot. This previously left "Preparing next-action suggestions..." as the last
message even though inference had finished. The command now prints up to three
numbered choices in the timeline instead. **Leave autopilot enabled.**

| Command | Effect |
| --- | --- |
| `/next-action` | Infer or reuse suggestions and display the numbered list. |
| `/next-action 1` | Preview the full prompt for choice 1, without submitting it. |
| `/next-action run 1` | Explicitly submit that previously previewed choice. |
| `/next-action run 1 <edited prompt>` | Submit your edited natural-language prompt instead. Preview choice 1 first. |
| `/next-action done` | Dismiss without starting a task. |
| `/next-action refresh` | Explicitly request a fresh batch, subject to the in-flight query guard. |

Replace `1` with a number from the displayed list. Preview and run commands never
generate suggestions themselves. A run requires the same choice to have been
previewed from the current list. Refresh, new conversation context, and mode or
permission changes clear the list and preview. A submission consumes that preview
before sending, so repeating the run command cannot submit it twice.

To do something else, type your own prompt normally. No modal UI or extra
permission approval is needed for the slash-command flow.

### Interactive mode

`/next-action` opens a choice form followed by a separate editable prompt form.
Only submitting the second form sends a new session turn. **Done** is initially
selected for safety; use the arrow keys to choose a recommendation. Done or
cancellation runs nothing. `/next-action refresh` requests fresh suggestions.

The read-only `next_action_recommendations` tool also exposes the same ranked
results when the user asks Copilot for follow-up options. This tool never sends
prompts or executes the actions. Normal tool approval rules apply; the extension
does not request permission bypass.

The host retains normal tool permissions and interaction mode when a confirmed
prompt is submitted. No `approveAll`, requested credential environment variables,
permission-skipping capability, or background repository introspection is used.

If a command fails, its error is printed in the timeline. Use `/next-action refresh`
to explicitly retry generation after resolving the error. Existing Copilot
sessions must reload extensions or run `/restart` to pick up installed updates;
updating the files does not replace an already-running extension process.

On the exercised host, querying an empty, uninitialized session fell back to
`claude-sonnet-4` before the model catalog was loaded and returned HTTP 400. The
context guard avoids that invalid request; it does not patch the host's fallback.
If a populated session still receives an unsupported-model error, inspect the
selection with `/model`, then explicitly retry with `/next-action refresh`.
The SDK exposes no per-query model override, and the extension never silently
switches models or starts another CLI to bypass the failure.

## Local repository trial

1. Open Copilot in the repository you want to try, or restart an existing session
   after installing the user extension. Finish a small task to establish context.
2. In autopilot, run `/next-action`, then `/next-action done`. In interactive mode,
   choose **Done** in the form. Neither path should submit or execute anything.
3. Run it again. In autopilot, preview with `/next-action 1`; in interactive mode,
   select a recommendation and cancel its editable prompt. Neither starts a task.
4. Preview again and submit a benign edited prompt. In autopilot, use
   `/next-action run 1 Summarize the current diff without modifying files.`;
   in interactive mode, submit that text in the editable form. This should create
   exactly one ordinary session turn, with the mode and permissions unchanged.
5. Use `/next-action refresh` for an explicit new inference request. New
   conversation context also invalidates the cache.

Native Tab suggestions and automatic post-autopilot popups are not part of this trial.

## Scope and upstream integration

This prototype supplies the same-session inference path and an explicitly opened
multiple-choice workflow. It **does not implement native Tab ghost text or
automatically open menus after autopilot completion**. The inspected extension
SDK exposes elicitation but no native input-buffer or completion-provider API.
Calling a picker only on explicit request avoids interrupting a user's draft.

Native integration should reuse this query path behind an opt-in feature, trigger
only on authoritative successful top-level goal completion, and attach cached
results to a host-owned completion provider and nonmodal post-goal picker.
This example is a separately installed extension, not a change to the native CLI
input loop or autopilot lifecycle.

## Development

Run `npm test` from the directory containing this README for the dependency-free
Node test suite. The tests use an injected session API and never make model requests.
