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
- Improved error messages when users provide incorrect command-line arguments. (Addresses feedback of the discoverability of non-interactive mode from  https://github.com/github/copilot-cli/issues/96)
- Changed the behavior of `Ctrl+r` to expand only recent timeline items. After running `Ctrl+r`, you can use `Ctrl+e` to expand all
- Improved word motion logic to better detect newlines: using word motion keys will now correctly move to the first word on a line
- Improved the handling of multi-line inputs in the input box: the input text box is scrollable, limited to 10 lines. Long prompts won't take up the whole screen anymore! (This is on the way to implementing https://github.com/github/copilot-cli/issues/14)
- Removed the left and right boarders from the input box. This makes it easier to copy text out of it!
- Added glob matching to shell rules. When using `--allow-tool` and `--deny-tool`, you can now specify things like `shell(npm run test:*)` to match any shell commands beginning with `npm run test`
- Improved the `copilot --resume` interface with relative time display, session message count, (Fixes https://github.com/github/copilot-cli/issues/97) 

## 0.0.328 - 2025-09-26

- Improved error message received when Copilot CLI is blocked by organization policy (fixes https://github.com/github/copilot-cli/issues/18 )
- Improved the error message received when using a PAT that is missing the "Copilot Requests" permission (fixes https://github.com/github/copilot-cli/issues/46 )
- Improved the output of `/user list` to make it clearer which is the current user
- Improved PowerShell parsing of `ForEach-Object` and detection of command name expressions (e.g.,`& $someCommand`)
