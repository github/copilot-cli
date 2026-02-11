## 0.0.406 - 2026-02-07

- Add support for Claude Opus 4.6 Fast (Preview)
- Markdown formatting displays in non-interactive mode output
- Display warning when user has no Copilot subscription
- Commands from plugins are now translated into skills
- Add `/changelog` command to view release notes
- plugin marketplace add accepts URLs as sources
- `--no-experimental` flag disables experimental features
- CLI interface renders without extra blank line
- `/mcp show` displays enabled/disabled status for MCP tools
- MCP tool responses now include structured content (images, resources) for richer UI display in VS Code

## 0.0.405 - 2026-02-05

- Plugin and marketplace names support uppercase letters
- `/experimental` shows help screen listing experimental features
- Fix SQL tool disconnects
- Plugins can bundle LSP server configurations

## 0.0.404 - 2026-02-05

- Add support for claude-opus-4.6 model
- `/allow-all` and `/yolo` execute immediately
- MCP servers shut down concurrently for improved performance
- Cancel --resume session picker to start a new session
- MCP server configurations default to all tools when tools parameter not specified
- Add `/tasks` command to view and manage background tasks
- Enable background agents for all users
- Simplify and clarify `/delegate` command messaging
- GITHUB_TOKEN environment variable now accessible in agent shell sessions

## 0.0.403 - 2026-02-04

- Windows Task Manager displays correct application name
- Introduce security check preventing use of modules outside of application bundle
- ACP model info includes usage multiplier and enablement status
- Fix logic checking user organization membership
- Stop MCP servers before updating plugins
- Detached shell processes work on vanilla macOS installations
- Escape key consistently aborts permission dialogs regardless of selection
- Plugin skills work in prompt mode
- Config files preserve custom fields when CLI updates them
- Reasoning summaries enabled by default for supporting models
- Support comma-separated tools in custom agent frontmatter
- Skills with unknown frontmatter fields now load with warnings instead of being silently skipped

## 0.0.402 - 2026-02-03

- ACP server supports agent and plan session modes
- MCP configuration applies to ACP mode
- Agent creation wizard styling improvements
- Custom agents with unknown fields load with warnings instead of errors
- Custom agents receive environment context when run as subagents
- Plugins can provide hooks for session lifecycle events
- Plugin update command works for direct plugins and handles Windows file locks
- Stop MCP servers when uninstalling plugins

## 0.0.401 - 2026-02-03

- Support `.agents/skills` directory for auto-loading skills
- Improve handling of chat history when switching between model families
- MCP tools returning structuredContent now display correctly in CLI
- Support Claude-style .mcp.json format without mcpServers wrapper
- Inserting new line with shift+enter keybinding in VS Code integrated terminal
- Large multi-line pastes work correctly
- ACP terminal-auth passes correct arguments to login
- Arrow and special keys work reliably when held down
- Slash command ghost text appends correctly
- Add `copilot login` subcommand and support ACP terminal-auth
- Add agentStop and subagentStop hooks to control agent completion
- CLI handles unknown keypresses gracefully
- /diff displays accurate line numbers with dual column layout

## 0.0.400 - 2026-01-30

- Add MCP server instructions support
- Timeline displays user responses to `ask_user` tool prompts with username
- Ordered lists display with numbers instead of dashes
- Add theme picker with `/theme` command and GitHub Dark/Light themes
- Fix support for pasting large content on Windows Terminal
- Better handle large results from grep and glob tools to avoid memory issues
- CLI now sends DELETE requests to remove MCP servers when shutting down
- Fix not being able to arrow key out of text inputs in select lists
- ACP server supports changing models during a session
- ACP server support permission flags: --yolo, --allow-all, etc. and permissions config
- Show progress indicator in terminal tab when thinking
- Remove bundled LSP servers (TypeScript, Python)
- Improve compatibility with remote MCP servers that use OAuth
- Markdown table headers display in bold
- Add autopilot mode for autonomous task completion (experimental)
- Add fuzzy search to model picker
- Freeform text input in list pickers works correctly
- Add `copilot plugin` subcommand for non-interactive plugin management
- CLI is more responsive in sessions with many messages
- Shell path detection more accurately handles spaces, quotes, and Windows switches
- Diff mode file list uses carousel navigation, showing up to 5 files at a time
- Holding backspace continues deleting text
- Better support for UNIX keyboard bindings (Ctrl+A/E/W/U/K, Alt+arrows) and multiline content in various text inputs
- Add `launch_messages` config for startup announcements
- The Code Review tool handles large changesets by ignoring build artifacts and limiting to 100 files

## 0.0.399 - 2026-01-29

- Compaction messages show clearer command hints to view checkpoint summaries
- Press Ctrl+X then / to run slash commands without losing your input
- Improve `/diff` command with better visual indicators and scroll acceleration
- Add `/allow-all` and `/yolo` commands to auto-approve all permissions during a session
- Add Copilot option for agent creation wizard to generate name, description, and instructions based on initial agent description
- Add LSP (Language Server Protocol) tool for code intelligence (requires experimental flag)
- Sessions get AI-generated names from first message
- Skills remain effective after conversation history is compacted
- /usage now includes token consumption from sub-agents (e.g., the general-purpose agent)
- Support `.claude/commands/` single-file commands as simpler alternative to skills
- Skills load correctly on Windows
- Add `/diff` command to review session changes
- Undo/rewind to previous states with double-Esc

## 0.0.398 - 2026-01-28

- Fix a regression that caused "Invalid session id" errors for agent shell calls
- CLI header uses middle-truncation for paths in narrow terminals, preserving first and last folders
- Skills from parent directories are now invocable and work in non-git directories

## 0.0.397 - 2026-01-28

- `/mcp show <server-name>` displays server details and available tools
- Header layout adapts better to narrow terminal widths
- Plan mode input text is more readable
- Content pasted into the prompt over 30 KB is automatically saved to workspace files
- Homebrew tools work correctly on macOS with zsh as default shell
- Add --acp flag to start as Agent Client Protocol server
- Directories now appear in @mention autocomplete
- Session summary displays accurate line counts

## 0.0.396 - 2026-01-27

- Skill names can include uppercase letters
- Ctrl+E moves cursor to end of line when typing without expanding timeline
- `/skills add` works with directories that contain SKILL.md directly
- Subagent timeline entries display with bold, capitalized names
- Timeline entries show filled circle for success status
- Improve horizontal alignment of UI elements
- Simplify compaction timeline entries
- Create custom agents through interactive CLI wizard
- Tool filtering flags now apply to subagents
- Error messages consistently reference /login and /logout commands
- Add `copilot version` and `copilot update` commands
- preToolUse hooks can deny tool execution and modify arguments
- Fix PTY leak in bash session handling
- `/plugin install` supports GitHub repos, URLs, and local paths
- Add `/experimental` command and `--experimental` flag to opt into experimental features
- Add `/init` command to generate Copilot instructions
- Reorder model picker list for better organization
- Plugins can provide custom agents
- Open plan files in VS Code on WSL and devcontainers
- /diff shows changes from entire repository when run from subdirectory
- /skills add correctly counts skills when directory path has trailing slash
- Undo/rewind shows accurate count of affected files
- Pre-releases on GitHub now show detailed changelog notes

## 0.0.395 - 2026-01-26

- Select escape item shows blinking cursor to indicate text input
- `/mcp show` displays all configured MCP servers including defaults and servers from additional configuration.
- `/mcp show` displays servers from installed plugins
- Rewind shows clear warning in non-git repos or repos without commits
- Cursor hides when terminal loses focus
- Formatted text and links display correctly when wrapping
- Load local shell configuration in agent sessions
- Plugin skills are now usable by the agent
- CLI handles missing tree-sitter files gracefully instead of crashing
- Completed tool calls display in prompt mode
- Add commenting to /diff mode for line-specific feedback

## 0.0.394 - 2026-01-24

- Deduplicate identical model instruction files to save context
- Exit summary displays accurate usage metrics instead of zeros
- Getting git branch works in repositories with no commits
- Add support for GitHub Enterprise Cloud (\*.ghe.com) in /delegate command
- Directory path uses consistent muted text color with git branch and model display
- Plugin skills work in agent responses
- Timeline hides startup messages to reduce noise
- Fixed timeline entry regression where read_agent and other tools showed incorrect content
- Git status updates on-demand instead of polling every 15 seconds
- SDK supports infinite sessions with automatic context compaction
- Memory loading errors are handled gracefully without user warnings
- `/delegate` command accepts optional prompt, uses conversation context
- Auto-update no longer removes old CLI package versions
- Improve task completion with clearer detached process guidance
- Simplified bottom bar by hiding some keyboard hints
- Queue slash commands alongside messages using Ctrl+D
- Press `/` to search sessions in `/resume`

## 0.0.393 - 2026-01-23

- Show conversation compaction status as timeline messages instead of header indicator
- Memory loading no longer warns when outside a Git repository
- Add support for GHE Cloud (\*.ghe.com) remote custom agents
- Plugin uninstall now works correctly
- Expose MCP server and tool names in tool.execution_start events for better error handling
- Add Esc-Esc to undo file changes to any previous snapshot

## 0.0.392 - 2026-01-22

- Add `/plugin` command for plugin marketplace management
- Add /rename command as alias for /session rename
- Add /plugin update command to update installed plugins
- Edit tool now displays diffs when expanded in timeline

## 0.0.390 - 2026-01-22

- Preserve extended thinking after compaction
- Custom agents with MCP servers avoid unnecessary restarts
- Enable steering during plan mode

## 0.0.389 - 2026-01-22

- Improve `/session` command visual hierarchy and colors
- Subagents receive correct tools when using different models
- grep and glob tools now find hidden files and dotfiles
- Add MSI installer for Windows
- Remove Node version requirement from npm package
- MCP servers can now authenticate using OAuth 2.0 with automatic token management and refresh
- Display progress messages from MCP tools in timeline
- Plugins can bundle MCP servers that load automatically when installed
- Invoke skills using slash commands like /skill-name
- Add `/diff` command to review changes made during the current session
- Show warning when repository memory fails to load
- Subagents no longer hang on user input requests
- Rate limit errors now show retry timing in user-friendly messages
- Messages sent during `/compact` are automatically queued
- Add `/models` as alias for `/model` command
- Change license to MIT License
- Reduce padding in welcome header
- Shell commands (!) can run in parallel while agent is working

## 0.0.388 - 2026-01-20

- Add `/review` command to analyze code changes
- Make session event messages more concise and visually clean
- Clean up old package versions during auto-update check to free disk space
- `--enable-all-github-mcp-tools` flag now enables read-write GitHub MCP tools
- `/share gist` shows helpful error on GitHub Enterprise Cloud with data residency
- Remove commit hash from CLI header
- Redesign CLI header with branded mascot and streamlined welcome message

## 0.0.387 - 2026-01-20

- Skill tool handles large directories without exceeding context limits
- Add ask_user tool for interactive clarification questions
- Add plan mode with dedicated panel for viewing implementation plans

## 0.0.386 - 2026-01-19

- Background compaction preserves tool call sequences correctly
- Add `/resume` command to switch sessions

## 0.0.385 - 2026-01-19

- The store_memory tool is only included when memory is enabled for the user
- Input placeholder now says "Type" instead of "Enter" to avoid confusion with Enter key
- Cursor now correctly positioned at end of line when navigating history with down arrow
- The new memory feature gracefully handles Copilot running without a repository
- Control-C message now displays for 5 seconds instead of 1 second
- Display current intent in terminal tab title
- Combine all custom instruction files instead of using priority-based fallbacks
- Enable infinite sessions with automatic long-running context management through compaction checkpoints
- MCP server management when swapping between custom agents with /agent
- Press Escape to cancel manual `/compact` command
- Model switching from Codex to Opus preserves conversation history correctly

## 0.0.384 - 2026-01-16

- Add `&` prefix shortcut for delegating prompts to run in background (equivalent to `/delegate`)
- Tab completion cycles correctly based on typed prefix, not completed text
- Allow users to configure the reasoning effort for gpt models
- MCP servers now start correctly for custom agents
- Shell commands now display error output when they fail
- Fixed bug causing model call failures after compaction in some scenarios
- Login flow respects OAuth slow_down interval and includes debug logging
- Custom agent discovery now follows symbolic links to agent definition files
- Add additional prompting for custom agent delegation
- Add `/cd` as an alias for `/cwd` command
- Files created by the CLI are available for @-mention
- Enable extended thinking for Anthropic Claude models
- Screen reader mode shows static text instead of animated spinners during login
- Selecting 'approve for session' now auto-approves pending parallel permission requests of the same type
- Reasoning view setting persists across sessions
- Provide clearer error messages when repository is not found or access is denied
- Inject repo memories in the prompt and add memory storage tool to remember facts across sessions
- Show delay time when Copilot reads shell output with a delay
- Support proxy URLs without scheme (e.g., localhost:9999)

## 0.0.382 - 2026-01-14

- Add support for GPT-5.2-Codex model
- Add `--config-dir` flag to override default configuration directory location

## 0.0.381 - 2026-01-13

- Add --allow-all and --yolo flags to enable all permissions at once
- Ghost text and tab completion show correct alias when typing slash commands like '/q' for '/quit'
- Add `/new` as an alias for `/clear` command
- Shell mode history navigation now filters by prefix - typing `!git` and pressing up arrow cycles only through previous git commands

## 0.0.380 - 2026-01-13

- Retrieving models handles network errors from firewalled routes gracefully, raises errors appropriately
- Bash command text aligns with output in timeline events
- Large output hints now suggest appropriate tools for different content types including JSON
- The `--agent` flag now works in interactive mode
- Provide inline feedback when rejecting tool permission requests so agents don't have to stop due to denying permissions
- web-fetch tool now rejects file:// URLs and suggests using view tool instead
- Terminal escape sequences no longer appear as text input
- Auto-compaction runs in background without blocking the conversation.
- Abort signals now propagate to sub-agents, allowing task cancellation to stop all nested agent work
- Custom agent tool aliasing for the task tool
- Allow reading files >10MB when using view_range parameter
- Sessions with large conversation history load faster on startup
- Send messages while Copilot is thinking to steer or queue
- Keyboard shortcuts: Ctrl+O now expands recent timeline, Ctrl+E expands all timeline (Ctrl+R unbound for future use)

## 0.0.377 - 2026-01-08

- Large file messages now encourage incremental reading with view_range instead of discouraging all reading

## 0.0.376 - 2026-01-08

- Loading remote sessions using GraphQL ID or session picker
- Task tool subagents can now process images
- Downgrading CLI version no longer requires manually clearing downloaded packages
- Large tool outputs are written to disk and models are encouraged to use efficient search tools

## 0.0.375 - 2026-01-07

- Add Ctrl+T to toggle reasoning summaries for supported models
- Add --share and --share-gist flags for session sharing in non-interactive mode
- File edits no longer hang when approving multiple concurrent edits
- Responses with reasoning no longer cause duplicate assistant messages
- Shutdown MCP servers after subagent execution completes
- SVG files are now treated as text files instead of binary images
- Fix 'Connection Error' issues due to subscription-based route used in chat completions

## 0.0.374 - 2026-01-02

- MCP server type help text displays correct options
- Model picker shows clearer message with settings link when models are unavailable
- Add auto-compaction at 95% token limit and `/compact` command
- Built-in subagents for exploring and managing tasks
- Built in `web_fetch` tool for fetching web content

## 0.0.373 - 2025-12-30

- Tab completion for path arguments in slash commands like `/cwd` and `/add-dir`
- Enable Copilot Spaces tools in GitHub MCP Server
- GitHub URL resolves correctly for GHE
- Kill command filtering now allows commands when 'kill' appears as an argument
- Device code authorization polling begins immediately instead of waiting for clipboard and browser

## 0.0.372 - 2025-12-19

- Enable disabled models directly in CLI when selecting or specifying them
- Add `/context` command to visualize token usage
- Add `--resume` flag to continue remote sessions locally
- Add URL permission controls which affect common shell commands which access the web
- Long commands no longer show duplicate intention headers when wrapping

## 0.0.371 - 2025-12-18

- Normal text respects terminal's default foreground color
- Update skills help text to reference correct ~/.copilot/skills/ directory

## 0.0.370 - 2025-12-18

- Disabled MCP servers are now properly ignored when using --disable-mcp-server
- Shared sessions correctly render nested markdown codeblocks
- Log levels now output all messages of that level and higher severity
- Load CA certificates from system and environment variables
- Improve `/model` error messages to show available and unavailable models
- Model picker uses two-column layout with aligned multipliers and clearer visual indicators
- Add STDIO type as synonymous for Local for MCP servers in CLI configuration UI
- Diff display uses your configured git pager (delta, diff-so-fancy)
- Use platform-specific executable from npm install when available
- Publish SHA256 checksums for CLI executables in releases
- Add --available-tools and --excluded-tools to filter which tools the model can use
- Ensure animated or non-animated banner is displayed based on banner and screen reader preferences
- Fix truncation logic for codex models

## 0.0.369 - 2025-12-11

- Add support for GPT-5.2

## 0.0.368 - 2025-12-10

- PRU usage rates now displayed correctly
- Fix checkmark and x icon rendering
- Add grep tool Codex models
- Numpad keys work in prompts with Kitty keyboard protocol

## 0.0.367 - 2025-12-04

- GPT-5.1-Codex-Max is now available in GitHub Copilot CLI

## 0.0.366 - 2025-12-03

- Add `infer` property to control custom agent tool visibility
- Add CLI executables to GitHub release artifacts
- Add apply_patch toolchain for OpenAI Codex models

## 0.0.365 - 2025-11-25

- Add `--silent` option to suppress stats output for scripting

## 0.0.364 - 2025-11-25

- Add syntax highlighting for diffs
- Fix light theme markdown rendering

## 0.0.363 - 2025-11-24

- Opus 4.5, GPT-4.1 and GPT-5-Mini are now available in GitHub Copilot CLI
- Image data paste now prioritizes pasting contents of image files instead of their file icons.
- Improved timeline rendering of shell tool names
- Add support for GITHUB_ASKPASS environment variable for authentication
- MCP servers work in `--prompt` mode

## 0.0.362 - 2025-11-20

- Fix issues with image drag and drop on Windows
- Shell commands are no longer included in Bash and PowerShell history files
- Paste image data from your clipboard directly into the CLI
- Cleanup and update prompts and tool instructions to be more fluid

## 0.0.360 - 2025-11-18

- Fix file operations timing out while waiting for user permission

## 0.0.359 - 2025-11-17

- Support adding images to context via drag & dropping and pasting paths to image files. Improved how image slugs are rendered in the input box
- Add `/share` command to save session as markdown file or GitHub gist
- Fix a bug where cached tokens were displaying as zero at the end of the session
- Enable `USE_BUILTIN_RIPGREP` environment variable to optionally use ripgrep from PATH
- Fix an issue where sourcing custom agents from the remote repository's default branch led to confusions about whether the local copy of the agent was being used
- Fix custom agents configuration issues
- Improve `Ctrl+C` performance
- Improve tool argument parsing safety
- Distinguish tool names from paths and improve tool success/error icons
- `copilot -p` will no longer interactively prompt for permission requests
- Remove unnecessary whitespace from tool descriptions

## 0.0.358 - 2025-11-14

- Recovery release to fix availability of GPT-5.1, GPT-5.1-Codex, and GPT-5.1-Codex-Mini models

## 0.0.357 - 2025-11-13

- Recovery release to fix an issue with image resizing

## 0.0.356 - 2025-11-13

- GPT-5.1, GPT-5.1-Codex, and GPT-5.1-Codex-Mini are now available in GitHub Copilot CLI

## 0.0.355 - 2025-11-12

- Enabled the CLI agent to read its own `/help` and README to answer questions about its capabilities
- Improved parsing of VS Code-formatted custom agents with the `.agent.md` suffix
- Sanitize tool names to fix issues with special characters
- Bundled `ripgrep` and added `grep` and `glob` tools for more performant searching of codebases
- Fixed malformed tool call handling before it reaches the UI
- Prevent double line wraps in markdown messages
- Fixed a bug where the file selector was used in multi-line input that led to unexpected up/down arrow behavior
- Fixed a bug where remote MCP server configuration in custom agents was not fetched properly
- Added more detail and improved the styling of the `/session` command's output
- Removed the internal `NODE_ENV` variable from the shell tool's environment
- Fixed a memory leak when using the interactive shell tool
- Improved line number formatting in file view output
- Lowered the default shell tool timeout and updated prompt language to not imply that timeout means failure
- Ensured that we query the terminal background color before rendering
- Ensured that the agent won't run `pkill` on its own PID
- Fixed a bug where `copilot` would not quit after an abort signal
- Ensure `!` commands on Windows use PowerShell when available
- Fixed a bug in Windows Terminal where keyboard input was not accepted

## 0.0.354 - 2025-11-03

- Exit with nonzero code when `-p` mode fails due to LLM backend errors (auth failures, quota exhaustion, network issues)
- Support for MCP server tool notifications
- Support for `COPILOT_GITHUB_TOKEN` environment variable for authentication (takes precedence over `GH_TOKEN`)
- Improved shell command safety with better heredoc handling outside of commands
- Diff hunk lines now properly fill the width of the diff box
- MCP servers in GitHub Actions environments automatically use `GITHUB_WORKSPACE` as working directory
- `/delegate` command now works correctly when no local changes exist
- Custom agents with special characters in filenames no longer fail
- Better error messages when using unsupported models with `/model` command
- Alternative model providers now work correctly when using different OpenAI base URLs

## 0.0.353 - 2025-10-28

- Added support for custom agents. Custom agent definitions are pulled from `~/.copilot/agents`, `.github/agents` in your repository, or your organization's `.github` repository. You can explicitly invoke an agent with the `/agent` slash command interactively or `--agent <agent>` noninteractively. Agents are also provided as tools that the model can call during completion of a task
- Added a `/delegate` command to delegate a task asynchronously to Copilot coding agent. Any unstaged changes will be committed to a new branch, a PR will be opened in your GitHub repository, and Copilot will complete work in the background.

## 0.0.352 - 2025-10-27

- Improve handling of MCP tools containing slashes
- Improve error message from `/model <model>` command when using an unsupported model

## 0.0.351 - 2025-10-24

- Improved our path detection heuristic to avoid various annoying, unnecessary permissions requests:
    - Running many standard bash/PowerShell commands that are known to be readonly (Fixes part of https://github.com/github/sweagentd/issues/7372)
    - Commands like `npm test -- --something` in PowerShell
    - Shell redirections like `> some_file.txt` in paths you've already granted write permissions, `> /dev/null`, and `2>&1` (Fixes https://github.com/github/copilot-cli/issues/211)
    - Arguments to `gh api` like `gh api /repos/user/repo/ec` (Fixes https://github.com/github/copilot-cli/issues/216)
- Improved prompting for Sonnet 4.5 to reduce the number of intermediate markdown files left in the workspace
- 👀 ...see you at [GitHub Universe](https://githubuniverse.com/)!

## 0.0.350 - 2025-10-23

- To conserve context window space, we've limited the list of tools available to the default GitHub MCP server. In our tests, the model will use the [GitHub CLI, `gh`](https://github.com/cli/cli) (if installed) in lieu of missing MCP tools. We added an `--enable-all-github-mcp-tools` if you wish to turn on all available tools.
  Default available tools are: - Code & Repo navigation - get_file_contents - search_code - search_repositories - list_branches - list_commits - get_commit - Issue Management - get_issue - list_issues - get_issue_comments - search_issues - PR Management - pull_request_read - list_pull_requests - search_pull_requests - Workflow Info - list_workflows - list_workflow_runs - get_workflow_run - get_job_logs - get_workflow_run_logs - Misc search - user_search
- Bundled `sharp` dependency into the CLI package -- we're one step closer to implementing https://github.com/github/copilot-cli/issues/16, and this fixes some startup blockers on Windows (fixes https://github.com/github/copilot-cli/issues/309 & https://github.com/github/copilot-cli/issues/287)
- Fixed a bug where input tokens were not tracked properly (Fixes https://github.com/github/copilot-cli/issues/337)
- Fixed a bug where MCP tools with arguments would fail with streaming enabled
- Added additional debug logging that will help us investigate https://github.com/github/copilot-cli/issues/346

## 0.0.349 - 2025-10-22

- The model can now call multiple tools in parallel. Each tool must be confirmed in advance. This behavior can be disabled with the `--disable-parallel-tools-execution` flag
- Added `/quit` as an alias of `/exit` (fixes https://github.com/github/copilot-cli/issues/357)
- Fixed a bug where every streamed output chunk was sent back to the model as part of the conversation (fixes https://github.com/github/copilot-cli/issues/379)
- Ensure that environment variables are expanded before running path permission checks
- Fixed a bug where Ctrl+K deleted to the end of the visual line in the input box rather than the logical line
- Added the temp directory to the paths that the model has access to by default (fixes https://github.com/github/copilot-cli/issues/306)

## 0.0.348 - 2025-10-21

- Copilot's output now streams in token-by-token! This can be disabled with `--stream off`
- Made improvements to the memory footprint of Copilot CLI, especially when dealing with shell commands that produce very large outputs
- Ensured we preserve comments in VSCode config files when using `/terminal-setup` (fixes https://github.com/github/copilot-cli/issues/325)
- Bundled `node-pty` into the CLI package -- we're one step closer to implementing https://github.com/github/copilot-cli/issues/16
- Fixed an issue where local tool calling broke sessions (fixes https://github.com/github/copilot-cli/issues/365, https://github.com/github/copilot-cli/issues/364, https://github.com/github/copilot-cli/issues/366)
- Added our LICENSE.md to our Node package (fixes https://github.com/github/copilot-cli/issues/371)
- Added debug logging to authentication status changes to get to the bottom of https://github.com/github/copilot-cli/issues/346

## 0.0.347 - 2025-10-20

- Fixed more bugs where incorrect PRU consumption stats were displayed on the frontend
  For more information, see https://github.com/github/copilot-cli/issues/351#issuecomment-3423735333
- Fixed a bug where pasted input content that was backspaced away was still sent to the model
- Improved line wrapping and alignment when rendering file diffs

## 0.0.346 - 2025-10-19

- Fixed a bug where model sourced from configuration file was not accounted for correctly in estimating premium request usage
  For more information, see https://github.com/github/copilot-cli/issues/351#issuecomment-3419045411

## 0.0.345 - 2025-10-18

- Fixed a bug where premium requests were being overcounted for some users (https://github.com/github/copilot-cli/issues/351). If you were affected, we are working on refunding your overcharged premium requests!

## 0.0.344 - 2025-10-17

- Enabled GitHub MCP server in prompt mode
- Added support to the bash tool for executing detached processes
- Added list of supported models as part of `copilot help config` text
- Fixed session abort handling to properly clean up orphaned tool call when pressing <kbd>Esc</kbd> or force-quitting
- Enforced minimum Node version requirement at launch
- Simplified messaging for `/terminal-setup`

## 0.0.343 - 2025-10-16

- ```
  Added new model:
  Run slash model to equip
  Haiku 4.5.
  ```
- Added a flag to augment MCP server configuration to temporarily add or override server configuration per session: `--additional-mcp-config` (fixes https://github.com/github/copilot-cli/issues/288)
    - You can pass MCP server configuration in two ways:
        - Inline JSON: `copilot --additional-mcp-config '{"mcpServers": {"my-tool": {...}}}'`
        - From a file (prefix with @): `copilot --additional-mcp-config @/path/to/config.json`
    - You can also pass the flag multiple times (later values override earlier ones): `copilot --additional-mcp-config @base.json --additional-mcp-config @overrides.json`
- Improved our prompts to ensure the agent uses Windows-style paths on Windows (fixes https://github.com/github/copilot-cli/issues/261)
- Added a prompt for users to run `/terminal-setup` if needed to enable multi-line input
- Various visual improvements:
    - Added a shimmer effect to the "Thinking..." indicator
    - Removed the box around user messages in the timeline
    - Increased the contrast of removed intraline highlights in diffs
    - Allow cycling through slash commands (from the bottom of the list back to the top)
    - Aligned permission/confirmation prompts to ensure all use the same visual style

## 0.0.342 - 2025-10-15

- Overhauled our session logging format:
    - Introduced a new session logging format that decouples how we store sessions from how we display them in the timeline. The new format is cleaner, more concise, and scalable, and will allow us to more easily implement new features down the line.
    - New sessions are stored in `~/.copilot/session-state`
    - Legacy sessions are stored in `~/.copilot/history-session-state` -- these will be migrated to the new format & location as you resume them from `copilot --resume`
- Enabled the Kitty protocol by default. Multi-line input is now supported via Shift+Ctrl on terminal that support the Kitty protocol. Multi-line input is also supported in VSCode and its forks by running the `/terminal-setup` command (fixes https://github.com/github/copilot-cli/issues/14)
- Enabled non-interactive GHE logins by respecting the `GH_HOST` environment variable for PAT and `gh` authentication modes (fixes https://github.com/github/copilot-cli/issues/296)
- Improved debug log collection convenience by adding a persistent `log_level` option in `~/.copilot/config`. Possible values: `["none", "error", "warning", "info", "debug", "all", "default"]`
- Added debug logging when calls to `/model` result in Copilot API errors. This should help us diagnose some policy/model access edge cases like https://github.com/github/copilot-cli/issues/268 and https://github.com/github/copilot-cli/issues/116
- Added `gradlew` to the list of commands whose subcommands can be whitelisted (fixes https://github.com/github/copilot-cli/issues/217#issuecomment-3393844685)
- Fixed a bug where sessions could enter a stuck state after a failed MCP tool call (fixes https://github.com/github/copilot-cli/issues/312)
- Made the output of `--help` text more concise

## 0.0.341 - 2025-10-14

- Added `/terminal-setup` command to set up multi-line input on terminals not implementing the kitty protocol
- Fixed a bug where rejecting an MCP tool call would reject all future tool calls (fixes https://github.com/github/copilot-cli/issues/290)
- Fixed a regression where calling `/model` with an argument did not work properly
- Added each model's premium request multiplier to the `/model` list (currently, all our supported models are 1x)

## 0.0.340 - 2025-10-13

- Removed the "Windows support is experimental" warning -- we've made some big strides in improving Windows support the last two weeks! Please continue to report any issues/feedback
- Improved debugging by including the Copilot API request ID for model calls errors and stack traces for client errors
- Fixed an issue where consecutive orphaned tool calls led to a "Each `tool_use` block must have a corresponding `tool_result` block in the next message" message (fixes https://github.com/github/copilot-cli/issues/102)
- Added a prompt to approve new paths in `-p` mode. Also added `--allow-all-paths` argument that approves access to all paths.
- Changed parsing of environment variables in MCP server configuration to treat the value of the `env` section as literal values (fixes https://github.com/github/copilot-cli/issues/26).
  Customers who have configured MCP Servers for use with the CLI will need to make a slight modification to their `~/.copilot/mcp-config.json`. For any servers they have added with an `env` section, they will need to go add a `$` to the start of the "value" pair of the key value pair of each entry in the env-block, so to have the values treated as references to environment variables.

    For example: Before:

    ```json
    {
        "env": {
            "GITHUB_ACCESS_TOKEN": "GITHUB_TOKEN"
        }
    }
    ```

    Before this change, the CLI would read the value of `GITHUB_TOKEN` from the environment of the CLI and set the environment variable named `GITHUB_ACCESS_TOKEN` in the MCP process to that value. With this change, `GITHUB_ACCESS_TOKEN` would now be set to the literal value `GITHUB_TOKEN`. To get the old behavior, change to this:

    ```json
    {
        "env": {
            "GITHUB_ACCESS_TOKEN": "${GITHUB_TOKEN}"
        }
    }
    ```

## 0.0.339 - 2025-10-10

- Improved argument input to MCP servers in `/mcp add` -- previously, users had to use comma-separated syntax to specify arguments. Now, the "Command" field allows users to input the full command to start the server as if they were running it in a shell
- Fixed a bug when using the Kitty protocol that led to text containing `u` to not paste correctly. Kitty protocol support is still behind the `COPILOT_KITTY` environment variable. (Fixes https://github.com/github/copilot-cli/issues/259)
- Fixed a bug when using the Kitty protocol that led to the process hanging in VSCode terminal on Windows. Kitty protocol support is still behind the `COPILOT_KITTY` environment variable. (Fixes https://github.com/github/copilot-cli/issues/257)
- Improved the error handling in the `/model` picker when no models are available (fixes https://github.com/github/copilot-cli/issues/229)

## 0.0.338 - 2025-10-09

- Moved Kitty protocol support behind the `COPILOT_KITTY` environment variable due to observed regressions (https://github.com/github/copilot-cli/issues/257, https://github.com/github/copilot-cli/issues/259)
- Fixed a wrapping issue in multi-line prompts with empty lines

## 0.0.337 - 2025-10-08

- Added validation for MCP server names (fixes https://github.com/github/copilot-cli/issues/110)
- Added support for Ctrl+B and Ctrl+F for moving cursor back and forward (fixes https://github.com/github/copilot-cli/issues/214)
- Added support for multi-line input for terminals that support the [Kitty protocol](https://sw.kovidgoyal.net/kitty/keyboard-protocol/) (partially fixes https://github.com/github/copilot-cli/issues/14 -- broader terminal support coming soon!)
- Updated the OAuth login UI to begin polling as soon as the device code is generated (this will _more solidly_ fix SSH edge-cases as described in https://github.com/github/copilot-cli/issues/89)

## 0.0.336 - 2025-10-07

- Enabled proxy support via HTTPS_PROXY/HTTP_PROXY environment variables regardless of Node version (Fixes https://github.com/github/copilot-cli/issues/41)
- Significantly reduced token consumption, round trips per problem, and time to result. We'll share more specific data in our weekly changelog on Friday!
- Improved file write performances (especially on Windows) by not relying on the shell to fetch the current working directory
- Fixed a bug where `/clear` did not properly reset the context truncation tracking state
- Hid the "Welcome to GitHub Copilot CLI" welcome message on session resumption and `/clear` for a cleaner look
- Improved the alignment of tables where the scrollbar is present
- Improved the output of `--help` by making it more concise
- Added a prompt for users who launch with `--screen-reader` to persistently save this preference
- Potentially improved flickering in some cases; we're still working on this!

## 0.0.335 - 2025-10-06

- Improved visibility into file edits by showing file diffs in the timeline by default, without the need to Ctrl+R
- Improved slash command input by showing argument hints in the input box
- Improved the display of the interface in windows less than 80 columns wide
- Reduced the number of colors and improved the spacing of Markdown rendering
- Added a warning when attempting to use proxy support in an environment where it won't work (Node <24, required environment variables not set) (A more permanent fix for https://github.com/github/copilot-cli/issues/41 is coming ~tomorrow)
- Updated the context truncation message's color from an error color to a warning color
- Fixed a bug where `copilot` logs might not have been properly created on Windows
- Fixed a bug where Powershell users with custom profiles might have had issues running commands (Fixes https://github.com/github/copilot-cli/issues/196)
- Fixed a bug where prompts were truncated after pasting and other edge cases (Fixes https://github.com/github/copilot-cli/issues/208, https://github.com/github/copilot-cli/issues/218)
- Fixed a bug where users would see a login prompt on startup despite being logged in (fixes https://github.com/github/copilot-cli/issues/202)
- Fixed a bug where some SSH users in certain environments were unable to get the OAuth login link and had their processes hang trying to open a browser (fixes https://github.com/github/copilot-cli/issues/89)

## 0.0.334 - 2025-10-03

- Improved the experience of pasting large content: when pasting more than 10 lines, it's displayed as a compact token like `[Paste #1 - 15 lines]` instead of flooding the terminal.
- Added a warning when conversation context approaches ≤20% remaining of the model's limit that truncation will soon occur. At this point, we recommend you begin a new session (improves https://github.com/github/copilot-cli/issues/29)
- Removed the on-exit usage stats from the persisted session history
- Added the current version to startup logs to aid in bug reporting
- Removed cycling through TAB autocomplete items if an argument is present. This prevents running `/cwd /path/to/whatever`, hitting `TAB`, then seeing `/clear` autocomplete

## 0.0.333 - 2025-10-02

- Added image support! `@`-mention files to add them as input to the model.
- Improved proxy support for users on Node.JS v24+. See [this comment](https://github.com/github/copilot-cli/issues/41#issuecomment-3362444262) for more details (Fixes https://github.com/github/copilot-cli/issues/41)
- Added support for directly executing shell commands and bypassing the model by prepending input with `!` (fixes https://github.com/github/copilot-cli/issues/186, https://github.com/github/copilot-cli/issues/12)
- Added `/usage` slash command to provide stats about Premium request usage, session time, code changes, and per-model token use. This information is also printed at the conclusion of a session (Fixes https://github.com/github/copilot-cli/issues/27, https://github.com/github/copilot-cli/issues/121)
- Improved `--screen-reader` mode by replacing icons in the timeline with informative labels
- Added a `--continue` flag to resume the most recently closed session
- Updated the `/clear` command to properly clear old timeline entries/session information (Fixes https://github.com/github/copilot-cli/issues/170)

## 0.0.332 - 2025-10-01

- Switched to using per-subscription Copilot API endpoints in accordance with [GitHub's docs](https://docs.github.com/en/copilot/how-tos/administer-copilot/manage-for-enterprise/manage-access/manage-network-access) (fixes https://github.com/github/copilot-cli/issues/76)
- Fixed a bug where `/user [list | show | switch]` did not include users signed in from all authentication modes (fixes https://github.com/github/copilot-cli/issues/58)
- Fixed a bug where switching to another user with `/user switch` did not take effect in the GitHub MCP server
- Improved the screenreader experience by disabling the scrollbar in the `@` file picker, the `--resume` session picker, and the `/` command picker
- Improved the polish of the scrollbar container (increased the width, reduced the opacity of the gutter)
- Minor visual improvements to the input area (moved the current model indicator to the right so it's not cramped with the CWD, improved the positioning of the file picker's "indexing" indicator, improved hint formatting in completion menus)
- Improved Markdown legibility by excluding `#` prefixes in headings
- Improved how we extract paths from shell commands for permission handling (might fix https://github.com/github/copilot-cli/issues/159, https://github.com/github/copilot-cli/issues/67)

## 0.0.331 - 2025-10-01

- Improved the information density of file read/edit timeline events
- Fixed an inaccuracy in the `--banner` help text; it previously implied that it would persistently change the configuration to always show the startup banner
- Improved the `/model`s list to ensure that a user only sees models they have access to use -- previously, if a user tries to use a model they do not have access to (because of their Copilot plan, their geographic region, etc), they received a `model_not_supported` error. This should prevent that by not even showing such models as options in the list (Fixes https://github.com/github/copilot-cli/issues/112, https://github.com/github/copilot-cli/issues/85, https://github.com/github/copilot-cli/issues/40)
- Fixed a bug where pressing down arrow in a multi-line prompt would wrap around to the first line (This is on the way to implementing https://github.com/github/copilot-cli/issues/14)
- Added a scrollbar to the `@` file mentioning picker and increased the size of the active buffer to 10 items
- Improved the experience of writing prompts while the agent is running -- up/down arrows will now correctly navigate between options in the `@` and `/` menus

## 0.0.330 - 2025-09-29

- Changed the default model back to Sonnet 4 since Sonnet 4.5 hasn't rolled out to all users yet. Sonnet 4.5 is still available from the `/model` slash command

## 0.0.329 - 2025-09-29

- Added support for [Claude Sonnet 4.5](https://github.blog/changelog/2025-09-29-anthropic-claude-sonnet-4-5-is-in-public-preview-for-github-copilot/) and made it the default model
- Added `/model` slash command to easily change the model (fixes https://github.com/github/copilot-cli/issues/10)
    - `/model` will open a picker to change the model
    - `/model <model>` will set the model to the parameter provided
- Added display of currently selected model above the input text box (Addresses feedback in https://github.com/github/copilot-cli/issues/120, https://github.com/github/copilot-cli/issues/108, )
- Improved error messages when users provide incorrect command-line arguments. (Addresses feedback of the discoverability of non-interactive mode from https://github.com/github/copilot-cli/issues/96)
- Changed the behavior of `Ctrl+r` to expand only recent timeline items. After running `Ctrl+r`, you can use `Ctrl+e` to expand all
- Improved word motion logic to better detect newlines: using word motion keys will now correctly move to the first word on a line
- Improved the handling of multi-line inputs in the input box: the input text box is scrollable, limited to 10 lines. Long prompts won't take up the whole screen anymore! (This is on the way to implementing https://github.com/github/copilot-cli/issues/14)
- Removed the left and right borders from the input box. This makes it easier to copy text out of it!
- Added glob matching to shell rules. When using `--allow-tool` and `--deny-tool`, you can now specify things like `shell(npm run test:*)` to match any shell commands beginning with `npm run test`
- Improved the `copilot --resume` interface with relative time display, session message count, (Fixes https://github.com/github/copilot-cli/issues/97)

## 0.0.328 - 2025-09-26

- Improved error message received when Copilot CLI is blocked by organization policy (fixes https://github.com/github/copilot-cli/issues/18 )
- Improved the error message received when using a PAT that is missing the "Copilot Requests" permission (fixes https://github.com/github/copilot-cli/issues/46 )
- Improved the output of `/user list` to make it clearer which is the current user
- Improved PowerShell parsing of `ForEach-Object` and detection of command name expressions (e.g.,`& $someCommand`)
