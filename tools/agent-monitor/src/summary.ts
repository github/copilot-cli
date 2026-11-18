import {join} from 'node:path';
import {JsonlReader} from './events.js';
import {AgentModel} from './model.js';
import {clean} from './screen.js';
import {buildTree, elapsed, formatDuration, nodeType, nowSeconds, VISUALS, visualOf, waitLabel, waitSpan} from './tree.js';
import type {Node, Visual} from './tree.js';

const COUNT_ORDER: Visual[] = ['running', 'waiting', 'done', 'replied', 'failed', 'cancelled', 'unknown'];

/** Plain-text snapshot of the agent tree, for one-off output such as the Copilot CLI extension's `/agents` command. */
export function summarize(model: AgentModel, nowMs: number): string {
	const tree = buildTree(model, 'all');
	const now = nowSeconds(model, nowMs);
	const runs = tree.order.slice(1);
	const counts = COUNT_ORDER
		.map(visual => [visual, runs.filter(node => visualOf(model, node) === visual).length] as const)
		.filter(([, count]) => count > 0)
		.map(([visual, count]) => `${count} ${VISUALS[visual].label}`);
	const lines = [runs.length
		? `Agents · ${runs.length} execution${runs.length === 1 ? '' : 's'}: ${counts.join(', ')}`
		: 'Agents · no agent executions recorded yet'];
	const describe = (node: Node): string => {
		const visual = visualOf(model, node);
		const {glyph, label} = VISUALS[visual];
		if (!node.run) return `${glyph} main session · ${label} · ${formatDuration(now)}`;
		const parts = [`${glyph} ${clean(node.run.name)}`, nodeType(node)];
		const wait = visual === 'waiting' ? [...model.waits.values()].find(edge => edge.fromRunId === node.run!.id) : undefined;
		if (wait) {
			const [start, end] = waitSpan(model, wait, now);
			parts.push(`waiting on ${clean(waitLabel(model, wait))} ${formatDuration(end - start)}`);
		} else parts.push(formatDuration(elapsed(model, node, now)), label);
		return parts.join(' · ');
	};
	const visit = (node: Node, prefix: string, last: boolean): void => {
		lines.push(node.run ? `${prefix}${last ? '└─ ' : '├─ '}${describe(node)}` : describe(node));
		const inner = node.run ? prefix + (last ? '   ' : '│  ') : '';
		node.children.forEach((child, i) => visit(child, inner, i === node.children.length - 1));
	};
	visit(tree.root, '', true);
	for (const warning of model.warnings) lines.push(`! ${clean(warning)}`);
	return lines.join('\n');
}

/** Reads a session directory's events.jsonl once and summarizes it. */
export async function summarizeSession(directory: string, nowMs = Date.now()): Promise<string> {
	const model = new AgentModel();
	await new JsonlReader(join(directory, 'events.jsonl')).poll(record => model.apply(record), () => model.reset());
	return summarize(model, nowMs);
}
