#!/usr/bin/env node
import {join, resolve} from 'node:path';
import {parseArgs} from 'node:util';
import {render} from 'ink';
import {LiveApp} from './App.js';
import {VIEWS} from './chrome.js';
import {errorMessage} from './events.js';
import {clean} from './screen.js';
import {COLOR_MODES, isColorMode} from './theme.js';

async function main(): Promise<void> {
	const {values} = parseArgs({
		options: {
			session: {type: 'string'},
			theme: {type: 'string', default: 'default'},
			view: {type: 'string', default: 'graph'},
			help: {type: 'boolean', short: 'h'},
		},
		strict: true,
		allowPositionals: false,
	});
	if (values.help) {
		console.log('Usage: agent-monitor --session <absolute-session-directory> [--theme <mode>] [--view graph|timeline]\n'
			+ 'Read-only terminal viewer for that directory\'s events.jsonl.\n'
			+ `Themes: ${COLOR_MODES.join(', ')} (default: default).\n`
			+ 'Views: Graph (default) and Timeline; Tab or v switches.\n'
			+ 'Keys: j/k select, f filter, t tools, PgUp/PgDn detail, +/- zoom and ←/→ pan (Timeline), q quit.\n'
			+ 'No CLI configuration changes, network calls, or session writes.');
		return;
	}
	if (!values.session) throw new Error('--session <directory> is required (see --help)');
	if (!isColorMode(values.theme)) throw new Error(`--theme must be one of: ${COLOR_MODES.join(', ')}`);
	const view = VIEWS.find(name => name === values.view);
	if (!view) throw new Error(`--view must be one of: ${VIEWS.join(', ')}`);
	if (!process.stdin.isTTY || !process.stdout.isTTY) {
		throw new Error('An interactive terminal is required. Run this command in a separate terminal tab.');
	}
	let sourceError: string | undefined;
	const onError = (message: string): void => { sourceError = message; };
	const instance = render(
		<LiveApp file={join(resolve(values.session), 'events.jsonl')} mode={values.theme} view={view} onError={onError}/>,
		{alternateScreen: true, patchConsole: false},
	);
	const terminate = (): void => { instance.unmount(); };
	process.once('SIGTERM', terminate);
	try {
		await instance.waitUntilExit();
	} finally {
		process.off('SIGTERM', terminate);
		instance.cleanup();
	}
	if (sourceError) throw new Error(sourceError);
}

void main().catch(error => {
	// Source errors can quote log content; strip control sequences before they reach the restored terminal.
	console.error(`agent-monitor: ${clean(errorMessage(error))}`);
	process.exitCode = 1;
});
