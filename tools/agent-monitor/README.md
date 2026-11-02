# Agent monitor

Independent, read-only terminal viewer for **one explicitly selected local Copilot
CLI session**. It does not change the built-in `/tasks` interface, load the Copilot
SDK, resume the session, install hooks, call a model, or write to the source log.

## Run on Windows

Requires Node.js 22 or later. In PowerShell:

```powershell
Set-Location "<checkout>\tools\agent-monitor"
npm ci
npm run build
$session = Join-Path $env:USERPROFILE ".copilot\session-state\<session-id>"
node .\dist\cli.js --session $session
```

Run this in a **separate interactive terminal tab** alongside Copilot. The viewer
replays the selected directory's `events.jsonl`, then follows newly appended
records. The directory can also belong to a historical session. There is no
automatic scan of other sessions.

For development, use `npm start -- --session "<absolute-session-directory>"`.
Use `node .\dist\cli.js --help` for command-line help.

## Views and keys

The invocation tree retains finished executions. The result pane shows the
selected execution's task, original response/error, recorded duration, and last
activity. The tool pane can display each recorded tool result. Long text is
loaded from the selected log on demand rather than copied to a new database.

| Key | Action |
| --- | --- |
| Up/Down or `k`/`j` | Select an execution |
| Left/Right or `h`/`l` | Collapse/expand its children |
| Enter | Toggle collapse |
| `f` | Cycle all, active, finished views; ancestors remain as context |
| Tab | Switch between the recorded result and tool log |
| `[` / `]` | Select previous/next tool |
| Page Up / Page Down | Scroll details |
| Home / End | First/last detail page |
| `q` or Escape | Quit and restore the previous terminal screen |

`DONE` means an invocation has a recorded `subagent.completed` or agent-attributed
`session.task_complete` event. `REPLIED`
means a response and turn end were recorded, but lifecycle completion was not.
Follow-up executions on a reused agent remain separate from its earlier work.
The finished filter includes replied executions without claiming the agent was
terminated. Running/unknown states are **last observed**, not a process-health
check; silence or end-of-file does not prove that an agent is dead or finished.

## Relationships and compatibility

Initial compatibility was verified against Copilot CLI **1.0.104**, using a local
parallel/nested-agent trace and a same-agent follow-up. The on-disk event format
is version-sensitive, not a supported stable public attachment API. Other CLI
versions display a compatibility warning; malformed or unsupported relevant
records produce explicit diagnostics rather than fabricated results.

- Invocation parents use verified launch-call ownership or
  `subagent.started.data.parentId`. Envelope `parentId` is the event chain and
  is never interpreted as an agent edge.
- Temporary waits use synchronous invocation or explicit `read_agent`
  `wait: true` data. A nonblocking status read is not a dependency.
- The verified format has no general prerequisite/`depends_on` DAG. Its absence
  is displayed explicitly. No graph edges are inferred from timing or prose.
- Background launch acknowledgement is not task completion.
- Missing outputs stay unavailable. Original text may already have been
  truncated by Copilot; the viewer cannot reconstruct it.
- Ephemeral events and unrecorded cancellation/liveness signals cannot be
  recovered from this file. Unknown agent-event types are diagnosed, not
  interpreted as cancellation or success.
- Detected source replacement/truncation rebuilds the view. A trailing record
  without a newline remains buffered until it is complete. Reading stops on a source
  error, with a visible diagnostic and a nonzero exit status on quit.

Text from the log is rendered without terminal control sequences. Session
content stays local: do not copy private transcripts into this repository.
This private package is a standalone local tool, not a modified distribution
of Copilot CLI or a claim that upstream accepts core CLI changes here.

## Validate

```powershell
npm run typecheck
npm test
npm run build
```

Tests use synthetic records and temporary files, covering replay/tailing,
UTF-8 boundaries, source reset, agent/result attribution, explicit waits,
reused agents, completed-history navigation, filtering, resizing, and scrolling.
