// Copilot CLI extension (experimental): `/agent-monitor` prints the current session's agent tree in the conversation and
// opens the interactive Graph or Timeline view beside the CLI. Run `npm run build` in tools/agent-monitor first.
import {spawn} from 'node:child_process';
import {realpathSync} from 'node:fs';
import {homedir} from 'node:os';
import {basename, dirname, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {joinSession} from '@github/copilot-sdk/extension';

// Resolve the package through a linked extension directory, so the build next to this file is used.
const root = dirname(dirname(realpathSync(fileURLToPath(import.meta.url))));
const cli = join(root, 'dist', 'cli.js');
const {summarizeSession} = await import(pathToFileURL(join(root, 'dist', 'summary.js')).href);
const node = /^node(\.exe)?$/i.test(basename(process.execPath)) ? process.execPath : 'node';
const CHOICES = ['graph', 'timeline', 'text'];

const session = await joinSession({
	commands: [{
		name: 'agent-monitor',
		description: 'Show this session\'s agents here and open the Graph or Timeline view beside the CLI: /agent-monitor [graph|timeline|text]',
		handler: async ctx => {
			const choice = ctx.args.trim().toLowerCase() || 'graph';
			if (!CHOICES.includes(choice)) {
				await session.log('Usage: /agent-monitor [graph|timeline|text]', {level: 'warning', ephemeral: true});
				return;
			}
			const sessionDir = session.workspacePath ?? join(process.env.COPILOT_HOME ?? join(homedir(), '.copilot'), 'session-state', ctx.sessionId);
			try {
				await session.log(await summarizeSession(sessionDir), {ephemeral: true});
			} catch (error) {
				await session.log(`agent-monitor: ${error instanceof Error ? error.message : String(error)}`, {level: 'error', ephemeral: true});
				return;
			}
			if (choice !== 'text') openBeside(sessionDir, choice);
		},
	}],
});

/** Opens the viewer in a split pane where the terminal supports one; otherwise prints the command to run. */
function openBeside(sessionDir, view) {
	const args = [cli, '--session', sessionDir, '--view', view];
	const manual = () => session.log(
		`Run this in another terminal tab for the interactive view:\n${[node, ...args].map(arg => JSON.stringify(arg)).join(' ')}`,
		{ephemeral: true},
	);
	const pane = process.env.WT_SESSION
		? ['wt.exe', ['-w', '0', 'split-pane', '--vertical', '--title', 'Agent monitor', '--', node, ...args]]
		: process.env.TMUX ? ['tmux', ['split-window', '-h', node, ...args]] : undefined;
	if (!pane) {
		void manual();
		return;
	}
	const child = spawn(pane[0], pane[1], {detached: true, stdio: 'ignore', windowsHide: true});
	child.on('error', () => void manual());
	child.unref();
}
