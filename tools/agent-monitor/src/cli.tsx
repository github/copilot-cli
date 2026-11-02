#!/usr/bin/env node
import {join, resolve} from 'node:path';
import {parseArgs} from 'node:util';
import {render} from 'ink';
import {LiveApp} from './App.js';
import {errorMessage} from './events.js';

async function main(): Promise<void> {
	const {values} = parseArgs({
		options: {
			session: {type: 'string'},
			help: {type: 'boolean', short: 'h'},
		},
		strict: true,
		allowPositionals: false,
	});
	if (values.help) {
		console.log('Usage: agent-monitor --session <absolute-session-directory>\n'
			+ 'Read-only terminal viewer for that directory\'s events.jsonl.\n'
			+ 'Keys: q quit, j/k select, h/l fold, f filter, Tab result/tools,\n'
			+ '      [/] tool selection, PgUp/PgDn or Home/End scroll details.\n'
			+ 'No CLI configuration changes, network calls, or session writes.');
		return;
	}
	if (!values.session) throw new Error('--session <directory> is required (see --help)');
	if (!process.stdin.isTTY || !process.stdout.isTTY) {
		throw new Error('An interactive terminal is required. Run this command in a separate terminal tab.');
	}
	let sourceError: string | undefined;
	const onError = (message: string): void => { sourceError = message; };
	const instance = render(
		<LiveApp file={join(resolve(values.session), 'events.jsonl')} onError={onError}/>,
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
	console.error(`agent-monitor: ${errorMessage(error)}`);
	process.exitCode = 1;
});
