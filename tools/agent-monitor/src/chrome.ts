import type {ContentRef} from './events.js';
import type {AgentModel, Filter} from './model.js';
import {fit, Screen, width, wrap} from './screen.js';
import type {Part, Style} from './screen.js';
import {
	elapsed, formatDuration, glyphPart, isActiveVisual, nodeType, runLabel, sessionSeconds,
	VISUALS, visualOf, waitLabel, waitSpan,
} from './tree.js';
import type {Node, Tree} from './tree.js';

export type ViewName = 'graph' | 'timeline';
export const VIEWS: ViewName[] = ['graph', 'timeline'];
const TITLES: Record<ViewName, string> = {graph: 'Graph', timeline: 'Timeline'};

export interface ViewState {
	view: ViewName;
	filter: Filter;
	selectedId: string;
	showTools: boolean;
	zoom: number;
	pan: number;
	detailScroll: number;
	graphX: number;
	graphY: number;
	laneTop: number;
	span: number;
}

export interface DetailTexts {
	prompt?: string;
	promptError?: string;
	result?: string;
	pending: boolean;
	error?: string;
}

export interface Frame {
	model: AgentModel;
	state: ViewState;
	tree: Tree;
	now: number;
	spin: number;
	cols: number;
	rows: number;
	source: 'following' | 'ended' | 'stopped';
	diagnostic?: string;
	texts: DetailTexts;
}

export interface Rect {
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface Layout {
	content: Rect;
	legendY: number;
	box: Rect;
	footerY: number;
}

const MUTED: Style = {fg: 'muted'};

export function frameLayout(cols: number, rows: number): Layout {
	const boxH = rows >= 34 ? 10 : rows >= 28 ? 9 : 7;
	const box = {x: 1, y: rows - 2 - boxH, w: cols - 2, h: boxH};
	const legendY = box.y - 2;
	return {content: {x: 1, y: 4, w: cols - 2, h: legendY - 4}, legendY, box, footerY: rows - 1};
}

export function selectedNode(frame: Frame): Node {
	return frame.tree.byId.get(frame.state.selectedId) ?? frame.tree.root;
}

export function resultRef(model: AgentModel, node: Node): ContentRef | undefined {
	const run = node.run;
	if (!run) return model.mainLatest;
	if (run.status === 'failed') return run.error ?? run.result;
	return run.status === 'completed' || run.status === 'replied' ? run.result : run.latest;
}

export function promptRef(model: AgentModel, node: Node): ContentRef | undefined {
	return node.run ? node.run.prompt : model.mainPrompt;
}

/** The inspector shows relationships or tools beside the message once the dialog interior is this wide (100 columns). */
const SPLIT_INNER = 94;

export const isSplit = (box: Rect): boolean => box.w - 4 >= SPLIT_INNER;

export function drawChrome(scr: Screen, frame: Frame, layout: Layout): void {
	let x = 1;
	for (const view of VIEWS) {
		const on = view === frame.state.view;
		x = scr.put(x, 0, ` ${TITLES[view]} `, on ? {fg: 'onEm', bg: 'accentEm', bold: true} : {fg: 'muted', bg: 'tab'}) + 1;
	}
	const zoom = frame.state.zoom;
	const windowLabel = zoom === 1 && Math.abs(frame.state.pan) < 0.5 ? 'agent activity' : zoom >= 1 ? `${zoom}x` : `1/${Math.round(1 / zoom)}x`;
	const chips: Array<[string, string]> = [
		['status:', frame.state.filter],
		frame.state.view === 'graph' ? ['edges:', 'spawn,wait'] : ['window:', windowLabel],
		['session:', (frame.model.sessionId ?? 'unknown').slice(0, 8)],
	];
	const index = frame.tree.order.findIndex(node => node.id === frame.state.selectedId);
	const indicator: Part = frame.source === 'following' ? ['●', {fg: 'success'}] : frame.source === 'ended' ? ['○', MUTED] : ['✗', {fg: 'danger'}];
	const position: Part = [`    ${index + 1} / ${frame.tree.order.length}`, MUTED];
	const clock: Part = [`  ${formatDuration(frame.now)}`, MUTED];
	const source: Part = [` ${frame.source}`, {fg: 'fg'}];
	// Narrow terminals keep the chips readable: drop the position, then the clock, then trailing chips.
	const chipsEnd = (list: typeof chips): number => list.reduce((end, [key, value]) => end + width(key) + width(value) + 4, 1);
	const rightOptions: Part[][] = [[indicator, source, clock, position], [indicator, source, clock], [indicator, source]];
	const partsWidth = (parts: Part[]): number => parts.reduce((sum, [text]) => sum + width(text), 0);
	const right = rightOptions.find(parts => frame.cols - 1 - partsWidth(parts) >= chipsEnd(chips)) ?? rightOptions.at(-1)!;
	while (chips.length > 1 && chipsEnd(chips) > frame.cols - 1 - partsWidth(right)) chips.pop();
	x = 1;
	for (const [key, value] of chips) {
		x = scr.put(x, 2, key, {fg: 'fg'});
		x = scr.put(x, 2, ` ${value} `, {fg: 'accent', bg: 'chip'}) + 2;
	}
	scr.seq(frame.cols - 1 - partsWidth(right), 2, right);
	if (frame.diagnostic) scr.put(1, 3, fit(frame.diagnostic, frame.cols - 2), {fg: 'attention'});
	const toolsHint = frame.state.showTools ? isSplit(layout.box) ? 'relationships' : 'message' : 'tools';
	const hints: Array<[string, string]> = frame.state.view === 'graph'
		? [['j/k', 'node'], ['tab', 'timeline'], ['f', 'filter'], ['t', toolsHint], ['pgup/pgdn', 'detail'], ['q', 'quit']]
		: [['j/k', 'lane'], ['+/-', 'zoom'], ['←/→', 'pan'], ['tab', 'graph'], ['f', 'filter'], ['t', toolsHint], ['q', 'quit']];
	const parts: Part[] = [];
	hints.forEach(([key, label], i) => {
		if (i) parts.push([' · ', MUTED]);
		parts.push([key, {fg: 'fg', bold: true}], [` ${label}`, MUTED]);
	});
	scr.seqFit(1, layout.footerY, parts, frame.cols - 2);
}

function metaLine(frame: Frame, node: Node): string {
	const {model, now} = frame;
	if (!node.run) {
		const agents = frame.model.runs.size;
		return [model.sessionModel, 'interactive session', formatDuration(now), `${agents} agent run${agents === 1 ? '' : 's'}`].filter(Boolean).join(' · ');
	}
	const run = node.run;
	return [run.name, nodeType(node), run.model, run.mode, formatDuration(elapsed(model, node, now))].filter(Boolean).join(' · ');
}

/** Heading, note, style and empty-state text for the inspector's message section. */
function resultHeading(frame: Frame, node: Node): [string, string, Style, string] {
	const visual = visualOf(frame.model, node);
	const style: Style = {fg: 'fg', bold: true};
	if (visual === 'failed') return ['Error', 'from subagent.failed', {fg: 'danger', bold: true}, 'No error message recorded.'];
	if (visual === 'replied') return ['Reply', 'turn ended · no completion event', style, 'No final message recorded.'];
	if (visual === 'done') return ['Result', 'final message', style, 'No final message recorded.'];
	if (isActiveVisual(visual)) return ['Latest message', 'last observed · still running', style, 'No message recorded yet.'];
	if (visual === 'cancelled') return ['Latest message', 'cancelled · no final reply', style, 'No message recorded.'];
	if (visual === 'unknown') return ['Latest message', 'status not recorded', style, 'No message recorded.'];
	return ['Latest message', '', style, 'No message recorded.'];
}

function relationships(frame: Frame, node: Node): Part[][] {
	const {model, now} = frame;
	const lines: Part[][] = [];
	const key = node.run ? node.run.id : null;
	if (!node.run) {
		const launched = [...model.runs.values()].filter(run => run.parentRunId === null && !run.previousRunId);
		const sync = launched.filter(run => run.mode === 'sync').length;
		lines.push([['↳ ', MUTED], [`launched ${launched.length} agent${launched.length === 1 ? '' : 's'} · ${launched.length - sync} background, ${sync} sync`, {fg: 'fg'}]]);
	} else if (node.edge === 'turn') lines.push([['┆ ', MUTED], [`later turn of ${node.parent?.run?.name ?? 'the same agent'}`, {fg: 'fg'}]]);
	else if (node.edge === 'orphan') lines.push([['? ', MUTED], ['launcher not recorded', MUTED]]);
	else lines.push([['↳ ', MUTED], [`spawned by ${runLabel(model, node.run.parentRunId ?? null)} · ${node.run.mode ?? 'unknown mode'} task`, {fg: 'fg'}]]);
	const edges = [...model.waitLog.values()].sort((a, b) => Number(Boolean(a.end)) - Number(Boolean(b.end)));
	for (const edge of edges) {
		const [start, end] = waitSpan(model, edge, now);
		const active = !edge.end;
		const kind = edge.kind === 'sync-call' ? 'sync task' : 'read_agent';
		const tone: Style = {fg: 'attention', dim: !active};
		if (edge.fromRunId === key) lines.push([[active ? '◌ ' : '⇢ ', tone], [`${active ? 'waiting on' : 'waited on'} ${waitLabel(model, edge)} · ${kind} · ${formatDuration(end - start)}`, {fg: 'fg'}]]);
		if (node.run && edge.toRunId === node.run.id) lines.push([[active ? '◌ ' : '⇠ ', tone], [`${active ? 'blocking' : 'waited on by'} ${runLabel(model, edge.fromRunId)} · ${kind} · ${formatDuration(end - start)}`, {fg: 'fg'}]]);
	}
	return lines;
}

function toolLines(frame: Frame, node: Node, rows: number, w: number, scr: Screen, x: number, y: number): void {
	const tools = node.run ? node.run.tools : frame.model.mainTools;
	const shown = tools.slice(-rows);
	if (!shown.length) scr.put(x, y, 'No tool calls recorded.', MUTED);
	shown.forEach((tool, i) => {
		const visual = tool.status === 'running' ? 'running' : tool.status === 'failed' ? 'failed' : 'done';
		const end = tool.endedAt ? sessionSeconds(frame.model, tool.endedAt) : frame.now;
		const duration = formatDuration(end - sessionSeconds(frame.model, tool.startedAt));
		scr.seq(x, y + i, [glyphPart(visual, frame.spin)]);
		scr.put(x + 2, y + i, fit(tool.name, 12), {fg: 'fg'});
		scr.rput(x + w - 1, y + i, duration, tool.status === 'running' ? {fg: 'fg'} : MUTED);
		scr.put(x + 15, y + i, fit(tool.detail ?? '', w - 17 - width(duration)), MUTED);
	});
}

function toolsHeader(frame: Frame, node: Node, scr: Screen, x: number, y: number, w: number, rows: number): void {
	const shown = node.run ? node.run.tools.length : frame.model.mainTools.length;
	const total = node.run ? shown : frame.model.mainToolCount;
	scr.put(x, y, `Tools · ${total}`, {fg: 'fg', bold: true});
	scr.rput(x + w - 1, y, shown > rows ? `latest ${rows}` : 't to hide', MUTED);
}

let wrapped: {text: string; w: number; lines: string[]} | undefined;

/** Recorded messages can be long; the inspector redraws on every spinner tick, so keep the last wrap. */
function wrapCached(text: string, w: number): string[] {
	if (wrapped?.text !== text || wrapped.w !== w) wrapped = {text, w, lines: wrap(text, w)};
	return wrapped.lines;
}

/** Bottom dialog: what the selected execution was asked, what it produced, and how it relates to others. */
export function drawInspector(scr: Screen, frame: Frame, box: Layout['box']): void {
	const node = selectedNode(frame);
	const visual = visualOf(frame.model, node);
	scr.box(box.x, box.y, box.w, box.h, {fg: 'border'});
	const x = box.x + 2;
	const top = box.y + 1;
	const rows = box.h - 2;
	const inner = box.w - 4;
	const split = isSplit(box);
	const rightW = split ? Math.min(52, Math.floor(inner * 0.42)) : 0;
	const leftW = split ? inner - rightW - 3 : inner;
	const title = node.run ? node.run.task : 'Main session';
	scr.seq(x, top, [glyphPart(visual, frame.spin)]);
	scr.rput(x + leftW - 1, top, VISUALS[visual].label, {fg: VISUALS[visual].tone});
	scr.put(x + 2, top, fit(title, leftW - 4 - width(VISUALS[visual].label)), {fg: 'fg', bold: true});
	scr.put(x, top + 1, fit(metaLine(frame, node), leftW), MUTED);
	const {promptError} = frame.texts;
	const prompt = promptError ? `Cannot read recorded prompt: ${promptError}` : frame.texts.prompt ?? (node.run ? node.run.task : undefined) ?? 'Not recorded';
	scr.seqFit(x, top + 2, [['Task  ', {fg: 'fg', bold: true}], [prompt.replace(/\s+/g, ' '), promptError ? {fg: 'danger'} : MUTED]], leftW);
	const bodyTop = top + 4;
	const bodyRows = Math.max(0, rows - 4);
	if (!split && frame.state.showTools) {
		if (rows > 3) toolsHeader(frame, node, scr, x, top + 3, leftW, bodyRows);
		toolLines(frame, node, bodyRows, leftW, scr, x, bodyTop);
		return;
	}
	const [heading, note, headingStyle, empty] = resultHeading(frame, node);
	let body: string[];
	if (frame.texts.pending) body = ['Loading recorded text…'];
	else if (frame.texts.error) body = wrap(`Cannot read recorded text: ${frame.texts.error}`, leftW);
	else body = frame.texts.result ? wrapCached(frame.texts.result, leftW) : [empty];
	const maxScroll = Math.max(0, body.length - bodyRows);
	frame.state.detailScroll = Math.min(frame.state.detailScroll, maxScroll);
	const scroll = frame.state.detailScroll;
	const position = body.length > bodyRows ? `lines ${scroll + 1}-${Math.min(body.length, scroll + bodyRows)} of ${body.length}` : note;
	if (rows > 3) {
		scr.put(x, top + 3, heading, headingStyle);
		if (position) scr.rput(x + leftW - 1, top + 3, fit(position, leftW - width(heading) - 2), MUTED);
	}
	body.slice(scroll, scroll + bodyRows).forEach((line, i) => scr.put(x, bodyTop + i, line, visual === 'failed' ? {fg: 'danger'} : {fg: 'fg'}));
	if (!split) return;
	const rx = x + leftW + 3;
	scr.vline(x + leftW + 1, top, rows, '│', {fg: 'border'});
	if (frame.state.showTools) {
		toolsHeader(frame, node, scr, rx, top, rightW, rows - 1);
		toolLines(frame, node, rows - 1, rightW, scr, rx, top + 1);
		return;
	}
	scr.put(rx, top, 'Relationships', {fg: 'fg', bold: true});
	scr.rput(rx + rightW - 1, top, 'other deps: not recorded', MUTED);
	const lines = relationships(frame, node);
	const room = rows - 1;
	const shown = lines.length > room ? lines.slice(0, room - 1) : lines;
	shown.forEach((parts, i) => scr.seqFit(rx, top + 1 + i, parts, rightW));
	if (shown.length < lines.length) scr.put(rx, top + 1 + shown.length, fit(`+${lines.length - shown.length} more · see Timeline`, rightW), MUTED);
}
