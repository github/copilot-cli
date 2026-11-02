import {useEffect, useMemo, useState} from 'react';
import {Box, Text, useApp, useInput, useWindowSize} from 'ink';
import {stripVTControlCharacters} from 'node:util';
import wrapAnsi from 'wrap-ansi';
import {errorMessage, JsonlReader} from './events.js';
import type {ContentRef} from './events.js';
import {AgentModel, isFinished} from './model.js';
import type {AgentRun, Filter} from './model.js';

interface AppProps {
	model: AgentModel;
	revision?: number;
	loadContent: (ref: ContentRef) => Promise<string>;
	source: string;
	diagnostic?: string;
	width?: number;
	height?: number;
}

function safeText(value: string): string {
	return stripVTControlCharacters(value).replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g, '');
}

function singleLine(value: string): string {
	return safeText(value).replace(/\s+/g, ' ');
}

function label(status: string): string {
	return ({completed: 'DONE', replied: 'REPLIED'}[status] ?? status.toUpperCase());
}

function duration(run: AgentRun): string {
	const ms = run.durationMs ?? (run.startedAt && run.endedAt
		? Date.parse(run.endedAt) - Date.parse(run.startedAt) : undefined);
	return ms === undefined ? 'not recorded' : `${(Math.max(0, ms) / 1000).toFixed(1)}s`;
}

export function App({model, revision = 0, loadContent, source, diagnostic, width, height}: AppProps) {
	const size = useWindowSize();
	const {exit} = useApp();
	const [filter, setFilter] = useState<Filter>('all');
	const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
	const [selectedId, setSelectedId] = useState<string>();
	const [mode, setMode] = useState<'result' | 'tools'>('result');
	const [toolIndex, setToolIndex] = useState(0);
	const [scroll, setScroll] = useState(0);
	const [loaded, setLoaded] = useState<{ref?: ContentRef; text: string; error?: string}>({text: ''});
	const columns = width ?? size.columns;
	const rows = height ?? size.rows;
	const treeHeight = Math.max(2, Math.floor((rows - 7) * 0.45));
	const detailHeight = Math.max(1, rows - treeHeight - 7);
	const tree = useMemo(() => model.tree(filter, collapsed), [model, revision, filter, collapsed]);
	const selectedIndex = Math.max(0, tree.findIndex(row => row.run.id === selectedId));
	const selected = tree[selectedIndex]?.run;
	const tool = selected?.tools[Math.min(toolIndex, Math.max(0, selected.tools.length - 1))];
	const ref = mode === 'tools' ? tool?.output : selected?.error ?? selected?.result;

	useEffect(() => {
		setToolIndex(0);
		setScroll(0);
	}, [selected?.id, mode]);

	useEffect(() => {
		let cancelled = false;
		if (ref) {
			void loadContent(ref).then(
				text => { if (!cancelled) setLoaded({ref, text}); },
				error => { if (!cancelled) setLoaded({ref, text: '', error: errorMessage(error)}); },
			);
		}
		return () => { cancelled = true; };
	}, [ref, loadContent]);

	let content = mode === 'tools' ? 'No textual tool output recorded.' : 'Final output unavailable in the recorded source.';
	if (ref) {
		content = loaded.ref !== ref ? 'Loading recorded text...'
			: loaded.error ? `Cannot read recorded text: ${loaded.error}` : loaded.text;
	}
	const details = selected ? [
		`Task: ${selected.task}`,
		`Agent: ${selected.agentId}`,
		`Execution: ${selected.id}`,
		`Elapsed: ${duration(selected)} | Last observed: ${selected.lastActivity}`,
		...(selected.status === 'replied' ? ['Reply recorded; lifecycle completion was not recorded.'] : []),
		...(selected.status === 'running' ? ['Last observed running; a quiet log does not prove current liveness.'] : []),
		...([...model.waits.values()].filter(edge => edge.fromRunId === selected.id).map(edge =>
			`waits-for [${edge.kind}]: ${edge.toAgentId}`)),
		'Prerequisite DAG: unavailable (not recorded by this verified format).',
		'',
		mode === 'tools' ? `Tool ${Math.min(toolIndex + 1, selected.tools.length)}/${selected.tools.length}: ${tool?.name ?? 'none'} [${tool?.status ?? 'not recorded'}]` : 'Recorded result:',
		content,
	].join('\n') : 'No agents match this filter. Waiting for recorded subagent events.';
	const lines = wrapAnsi(safeText(details), Math.max(1, columns), {hard: true, trim: false}).split('\n');
	const visibleScroll = Math.min(scroll, Math.max(0, lines.length - detailHeight));
	const treeStart = Math.max(0, selectedIndex - treeHeight + 1);
	const visibleTree = tree.slice(treeStart, treeStart + treeHeight);

	useInput((input, key) => {
		if (input === 'q' || key.escape) exit();
		else if (input === 'f') {
			setFilter(current => current === 'all' ? 'active' : current === 'active' ? 'finished' : 'all');
			setScroll(0);
		} else if (key.tab) setMode(current => current === 'result' ? 'tools' : 'result');
		else if (key.pageDown) setScroll(visibleScroll + detailHeight);
		else if (key.pageUp) setScroll(Math.max(0, visibleScroll - detailHeight));
		else if (key.home) setScroll(0);
		else if (key.end) setScroll(Math.max(0, lines.length - detailHeight));
		else if ((input === '[' || input === ']') && selected) {
			setToolIndex(current => Math.max(0, Math.min(selected.tools.length - 1, current + (input === ']' ? 1 : -1))));
			setScroll(0);
		} else if ((key.upArrow || input === 'k' || key.downArrow || input === 'j') && tree.length) {
			const index = Math.max(0, Math.min(tree.length - 1, selectedIndex + (key.upArrow || input === 'k' ? -1 : 1)));
			setSelectedId(tree[index]?.run.id);
		} else if (selected && (key.leftArrow || input === 'h' || key.rightArrow || input === 'l' || key.return)) {
			setCollapsed(current => {
				const next = new Set(current);
				const close = key.leftArrow || input === 'h' || (key.return && !current.has(selected.id));
				if (close) next.add(selected.id);
				else next.delete(selected.id);
				return next;
			});
		}
	});

	if (rows < 12 || columns < 28) {
		return <Text>Terminal too small. Resize to 28x12 or larger. q: quit</Text>;
	}

	const all = [...model.runs.values()];
	const finished = all.filter(isFinished).length;
	const warning = diagnostic ?? [...model.warnings].join('; ');
	const mainWaits = [...model.waits.values()].filter(edge => edge.fromRunId === null);
	return (
		<Box flexDirection="column" width={columns} height={rows}>
			<Text bold wrap="truncate-end">Agent monitor | {all.length - finished} active/unknown | {finished} finished/replied</Text>
			<Text wrap="truncate-end">Source: {singleLine(source)} | CLI {model.version ?? 'not recorded'}</Text>
			<Text color={warning ? 'yellow' : undefined} wrap="truncate-end">
				{warning ? singleLine(warning) : `Observed events only | filter: ${filter} | main${mainWaits.length ? ` waits-for: ${mainWaits.map(edge => edge.toAgentId).join(', ')}` : ''}`}
			</Text>
			<Box flexDirection="column" height={treeHeight} overflow="hidden">
				{visibleTree.length ? visibleTree.map(({run, depth, hasChildren, unresolvedParent}) => {
					const status = model.status(run);
					const marker = hasChildren ? collapsed.has(run.id) ? '+' : '-' : '.';
					const context = filter !== 'all' && (filter === 'finished' ? !isFinished(run) : isFinished(run)) ? ' [context]' : '';
					const waits = [...model.waits.values()].filter(edge => edge.fromRunId === run.id)
						.map(edge => edge.toAgentId).join(', ');
					return <Text key={run.id} color={run.id === selected?.id ? 'cyan' : undefined} wrap="truncate-end">
						{`${run.id === selected?.id ? '>' : ' '} ${'  '.repeat(Math.min(depth, Math.floor(columns / 8)))}${marker} [${label(status)}] ${singleLine(run.name)}${unresolvedParent ? ' [? parent]' : ''}${context}${waits ? ` -> waits-for: ${singleLine(waits)}` : ''}: ${singleLine(run.task)}`}
					</Text>;
				}) : <Text>No matching agents.</Text>}
			</Box>
			<Text bold wrap="truncate-end">{mode === 'result' ? 'Result' : 'Tool log'} | {singleLine(selected?.name ?? 'none')} | lines {visibleScroll + 1}-{Math.min(lines.length, visibleScroll + detailHeight)}/{lines.length}</Text>
			<Box flexDirection="column" height={detailHeight} overflow="hidden">
				{lines.slice(visibleScroll, visibleScroll + detailHeight).map((line, index) =>
					<Text key={index} wrap="truncate-end">{line || ' '}</Text>)}
			</Box>
			<Text dimColor wrap="truncate-end">q quit | j/k select | h/l fold | f filter | Tab result/tools | [] tool | PgUp/Dn scroll</Text>
		</Box>
	);
}

export function LiveApp({file, onError}: {file: string; onError: (message: string) => void}) {
	const reader = useMemo(() => new JsonlReader(file), [file]);
	const model = useMemo(() => new AgentModel(), [file]);
	const [revision, setRevision] = useState(0);
	const [diagnostic, setDiagnostic] = useState<string>();
	const loadContent = useMemo(() => (ref: ContentRef) => reader.readContent(ref), [reader]);
	useEffect(() => {
		let stopped = false;
		let timer: ReturnType<typeof setTimeout>;
		const poll = async (): Promise<void> => {
			try {
				const changed = await reader.poll(record => model.apply(record), () => {
					model.reset();
					if (!stopped) setDiagnostic('Session log was replaced/truncated; view rebuilt from the new source.');
				});
				if (!stopped) {
					if (changed) setRevision(current => current + 1);
					timer = setTimeout(() => { void poll(); }, 400);
				}
			} catch (error) {
				if (!stopped) {
					const message = `Source stopped: ${errorMessage(error)}`;
					setDiagnostic(message);
					onError(message);
				}
			}
		};
		void poll();
		return () => { stopped = true; clearTimeout(timer); };
	}, [reader, model, onError]);
	return <App model={model} revision={revision} loadContent={loadContent} source={file} diagnostic={diagnostic}/>;
}
