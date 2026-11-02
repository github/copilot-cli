import {isFinished} from './model.js';
import type {AgentModel, AgentRun, Filter, WaitEdge} from './model.js';
import type {Part} from './screen.js';
import type {Tone} from './theme.js';

export const MAIN = 'main';

export interface Node {
	id: string;
	run?: AgentRun;
	parent?: Node;
	children: Node[];
	edge: 'root' | 'spawn' | 'turn' | 'orphan';
	depth: number;
	ctx: boolean;
}

export interface Tree {
	root: Node;
	order: Node[];
	byId: Map<string, Node>;
}

export type Visual = 'running' | 'waiting' | 'done' | 'failed' | 'replied' | 'idle' | 'ended' | 'unknown';

export const VISUALS: Record<Visual, {glyph: string; tone: Tone; label: string}> = {
	running: {glyph: '◐', tone: 'accent', label: 'running'},
	waiting: {glyph: '◌', tone: 'attention', label: 'waiting'},
	done: {glyph: '✓', tone: 'success', label: 'done'},
	failed: {glyph: '✗', tone: 'danger', label: 'failed'},
	replied: {glyph: '↩', tone: 'done', label: 'replied'},
	idle: {glyph: '○', tone: 'muted', label: 'idle'},
	ended: {glyph: '○', tone: 'muted', label: 'ended'},
	unknown: {glyph: '?', tone: 'muted', label: 'unknown'},
};

const SPINNER = ['◐', '◓', '◑', '◒'];

export function visualOf(model: AgentModel, node: Node): Visual {
	if (!node.run) return model.mainStatus();
	const status = model.status(node.run);
	if (status === 'completed') return 'done';
	return status === 'running' || status === 'waiting' || status === 'failed' || status === 'replied' ? status : 'unknown';
}

export function glyphPart(visual: Visual, spin: number, dim = false): Part {
	const glyph = visual === 'running' ? SPINNER[spin % SPINNER.length]! : VISUALS[visual].glyph;
	return [glyph, {fg: VISUALS[visual].tone, dim}];
}

export const isActiveVisual = (visual: Visual): boolean => visual === 'running' || visual === 'waiting';

function matches(run: AgentRun, filter: Filter): boolean {
	if (filter === 'all') return true;
	return filter === 'finished' ? isFinished(run) : !isFinished(run);
}

const startOf = (run: AgentRun): number => Date.parse(run.startedAt ?? run.lastActivity);

/** Builds the display tree: spawned agents under their launcher, later turns under the previous turn. */
export function buildTree(model: AgentModel, filter: Filter): Tree {
	const root: Node = {id: MAIN, children: [], edge: 'root', depth: 0, ctx: filter !== 'all'};
	const parentOf = new Map<string, {id: string; edge: Node['edge']}>();
	for (const run of model.runs.values()) {
		if (run.previousRunId && model.runs.has(run.previousRunId)) parentOf.set(run.id, {id: run.previousRunId, edge: 'turn'});
		else if (run.parentRunId === null) parentOf.set(run.id, {id: MAIN, edge: 'spawn'});
		else if (run.parentRunId && model.runs.has(run.parentRunId)) parentOf.set(run.id, {id: run.parentRunId, edge: 'spawn'});
		else parentOf.set(run.id, {id: MAIN, edge: 'orphan'});
	}
	// Re-home any cyclic chain so rendering always terminates.
	for (const run of model.runs.values()) {
		const seen = new Set<string>([run.id]);
		let cursor = parentOf.get(run.id)!.id;
		while (cursor !== MAIN) {
			if (seen.has(cursor)) {
				parentOf.set(run.id, {id: MAIN, edge: 'orphan'});
				break;
			}
			seen.add(cursor);
			cursor = parentOf.get(cursor)?.id ?? MAIN;
		}
	}
	const included = new Set<string>();
	for (const run of model.runs.values()) {
		if (!matches(run, filter)) continue;
		for (let id: string = run.id; id !== MAIN && !included.has(id); id = parentOf.get(id)!.id) included.add(id);
	}
	const byId = new Map<string, Node>([[MAIN, root]]);
	const runs = [...model.runs.values()].filter(run => included.has(run.id)).sort((a, b) => startOf(a) - startOf(b));
	for (const run of runs) byId.set(run.id, {id: run.id, run, children: [], edge: parentOf.get(run.id)!.edge, depth: 0, ctx: !matches(run, filter)});
	for (const run of runs) {
		const node = byId.get(run.id)!;
		const parent = byId.get(parentOf.get(run.id)!.id) ?? root;
		node.parent = parent;
		parent.children.push(node);
	}
	const order: Node[] = [];
	const visit = (node: Node, depth: number): void => {
		node.depth = depth;
		order.push(node);
		for (const child of node.children) visit(child, depth + 1);
	};
	visit(root, 0);
	return {root, order, byId};
}

/* ---------- Time ---------- */

export function sessionSeconds(model: AgentModel, iso: string | undefined): number {
	if (!iso || !model.sessionStart) return 0;
	return Math.max(0, (Date.parse(iso) - Date.parse(model.sessionStart)) / 1000);
}

export function nowSeconds(model: AgentModel, nowMs: number): number {
	if (model.sessionEnded) return sessionSeconds(model, model.sessionEnded);
	const observed = sessionSeconds(model, model.lastEventAt);
	const wall = model.sessionStart ? (nowMs - Date.parse(model.sessionStart)) / 1000 : 0;
	return Math.max(observed, wall);
}

export function runSpan(model: AgentModel, run: AgentRun, now: number): [number, number] {
	const start = sessionSeconds(model, run.startedAt ?? run.lastActivity);
	const end = run.endedAt ? sessionSeconds(model, run.endedAt) : isFinished(run) ? sessionSeconds(model, run.lastActivity) : now;
	return [start, Math.max(start, end)];
}

export function elapsed(model: AgentModel, node: Node, now: number): number {
	if (!node.run) return now;
	if (node.run.durationMs !== undefined && node.run.status === 'completed') return node.run.durationMs / 1000;
	const [start, end] = runSpan(model, node.run, now);
	return end - start;
}

/** Main-session activity: consecutive model turns separated by short tool gaps form one span. */
export function mainSpans(model: AgentModel, now: number): Array<[number, number]> {
	const spans: Array<[number, number]> = [];
	for (const turn of model.mainTurns) {
		const start = sessionSeconds(model, turn.start);
		const end = turn.end ? sessionSeconds(model, turn.end) : now;
		const last = spans.at(-1);
		if (last && start - last[1] < 2) last[1] = Math.max(last[1], end);
		else spans.push([start, end]);
	}
	return spans;
}

export function waitSpan(model: AgentModel, edge: WaitEdge, now: number): [number, number] {
	const start = sessionSeconds(model, edge.start);
	return [start, edge.end ? sessionSeconds(model, edge.end) : now];
}

export function formatDuration(seconds: number): string {
	const s = Math.max(0, seconds);
	if (s < 60) return `${s.toFixed(1)}s`;
	if (s < 3600) return `${Math.floor(s / 60)}m ${String(Math.floor(s % 60)).padStart(2, '0')}s`;
	return `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}m`;
}

/* ---------- Labels ---------- */

export function nodeType(node: Node): string {
	if (!node.run) return 'session';
	if (node.edge === 'turn') return `${node.run.agentType ?? 'agent'} · turn`;
	return node.run.agentType ?? 'agent';
}

export function waitLabel(model: AgentModel, edge: WaitEdge): string {
	const target = edge.toRunId ? model.runs.get(edge.toRunId)?.name : undefined;
	return target ?? edge.toAgentId;
}

export function runLabel(model: AgentModel, runId: string | null): string {
	return runId === null ? 'main' : model.runs.get(runId)?.name ?? runId;
}
