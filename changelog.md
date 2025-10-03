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
