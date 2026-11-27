import type {Frame, Rect} from './chrome.js';
import {isFinished} from './model.js';
import {fit, Screen, width} from './screen.js';
import type {Part, Style} from './screen.js';
import {elapsed, formatDuration, glyphPart, isActiveVisual, mainSpans, MAIN, runSpan, VISUALS, visualOf, waitSpan} from './tree.js';
import type {Node, Visual} from './tree.js';
import type {Tone} from './theme.js';

const MUTED: Style = {fg: 'muted'};
const DAY = 86400;
const STEPS = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 14400, 21600, 43200, DAY];
const BAR: Record<Visual, Tone> = {
	running: 'accent', waiting: 'accent', done: 'success', failed: 'danger', cancelled: 'muted', replied: 'done',
	idle: 'muted', ended: 'muted', unknown: 'muted',
};
const END_MARKS: Visual[] = ['failed', 'cancelled', 'replied'];
const clamp = (value: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, value));

/** Tick spacing of at least `raw` seconds; beyond a day it grows in whole days so long windows keep few ticks. */
export function niceStep(raw: number): number {
	return STEPS.find(step => step >= raw) ?? Math.ceil(raw / DAY) * DAY;
}

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Session-relative tick label whose precision follows the tick spacing. */
export function tickLabel(seconds: number, step = 60): string {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = Math.floor(seconds % 60);
	if (step < 60) {
		if (seconds < 60) return `${s}s`;
		return h ? `${h}:${pad2(m)}:${pad2(s)}` : `${m}:${pad2(s)}`;
	}
	if (step < 3600) return h ? `${h}h${pad2(m)}` : `${m}m`;
	return step < DAY ? `${h}h` : `${Math.floor(seconds / DAY)}d`;
}

const TYPE_SHORT: Record<string, string> = {'general-purpose': 'general'};

/** Default window: the span where agents actually ran, padded slightly; falls back to the whole session. */
function activityWindow(frame: Frame, total: number): [number, number] {
	const runs = frame.tree.order.flatMap(node => node.run ? [runSpan(frame.model, node.run, frame.now)] : []);
	if (!runs.length) return [0, total];
	let lo = Math.min(...runs.map(([a]) => a));
	let hi = Math.max(...runs.map(([, b]) => b));
	const pad = Math.max(2, (hi - lo) * 0.05);
	lo = Math.max(0, lo - pad);
	hi = Math.min(total, hi + pad);
	return hi - lo < 1 ? [Math.max(0, hi - 1), hi] : [lo, hi];
}

/** Draws tree connectors left of a lane; deeper levels than `cap` share the last indentation column. */
function treePrefix(scr: Screen, node: Node, y: number, span: number, base: number, cap: number): void {
	const line: Style = {fg: 'border'};
	const isLast = (n: Node): boolean => n.parent?.children.at(-1) === n;
	const chain: Node[] = [];
	for (let p = node.parent; p?.parent; p = p.parent) chain.unshift(p);
	chain.slice(0, cap - 1).forEach((ancestor, i) => {
		if (!isLast(ancestor)) for (let r = 0; r < span; r++) scr.put(base + 3 * i, y + r, '│', line);
	});
	const depth = Math.min(node.depth, cap);
	if (depth > 0) {
		const cx = base + 3 * (depth - 1);
		const turn = node.edge === 'turn';
		scr.put(cx, y, isLast(node) ? (turn ? '╰' : '└') : '├', line);
		scr.put(cx + 1, y, turn ? '┄' : '─', line);
		if (!isLast(node)) for (let r = 1; r < span; r++) scr.put(cx, y + r, '│', line);
	}
	if (node.children.length && node.depth < cap) {
		for (let r = 1; r < span; r++) scr.put(base + 3 * depth, y + r, node.children[0]!.edge === 'turn' ? '┆' : '│', line);
	}
}

export function drawTimeline(scr: Screen, frame: Frame, area: Rect, legendY: number): void {
	const {model, state, now, cols} = frame;
	const labelEnd = Math.min(43, Math.max(24, Math.floor(cols * 0.36)));
	const cx = labelEnd + 3;
	const durationRight = cols - 2;
	const cw = Math.max(10, cols - cx - 10);
	const total = Math.max(now, 1);
	const [base0, base1] = activityWindow(frame, total);
	const span = Math.min(total, Math.max(1, (base1 - base0) / state.zoom));
	const end = clamp(base1 - state.pan, Math.min(total, span), total);
	const start = Math.max(0, end - span);
	state.pan = base1 - end;
	state.span = span;
	const spc = Math.max(1e-6, (end - start) / (cw - 1));
	const col = (t: number): number => cx + clamp(Math.floor((t - start) / spc), 0, cw - 1);
	const colEnd = (t: number): number => cx + clamp(Math.ceil((t - start) / spc) - 1, 0, cw - 1);
	const axisY = area.y;
	const laneY0 = area.y + 2;
	scr.put(3, axisY, 'Agent', MUTED);
	scr.rput(labelEnd, axisY, 'Type', MUTED);
	scr.rput(durationRight, axisY, 'Time', MUTED);
	scr.hline(cx, axisY + 1, cw, '─', {fg: 'border'});
	const nowC = now >= start && now <= end + 1e-9 ? cx + clamp(Math.round((now - start) / spc), 0, cw - 1) : -1;
	const nowLabel: [number, number] | undefined = nowC >= 0 ? [nowC - 1, nowC + 1] : now > end ? [cx + cw - 5, cx + cw - 1] : undefined;
	const grid: number[] = [];
	const step = niceStep((end - start) / 6);
	for (let t = Math.ceil(start / step) * step; t <= end; t += step) {
		const c = col(t);
		const label = tickLabel(t, step);
		const lx = c === cx ? c : c - Math.floor(width(label) / 2);
		// Keep a blank column between a tick label and the "now" marker.
		if (nowLabel && lx <= nowLabel[1] + 1 && lx + width(label) - 1 >= nowLabel[0] - 1) continue;
		grid.push(c);
		scr.put(c, axisY + 1, '┬', {fg: 'border'});
		scr.put(lx, axisY, label, MUTED);
	}
	if (nowC >= 0) {
		scr.put(nowC, axisY + 1, '┬', {fg: 'accent'});
		scr.put(nowC - 1, axisY, 'now', {fg: 'accent', bold: true});
	} else if (now > end) scr.rput(cx + cw - 1, axisY, 'now ▸', {fg: 'accent', bold: true});
	const lanes = frame.tree.order;
	const capacity = Math.max(1, Math.floor((area.h - 2) / 2));
	const selectedIndex = Math.max(0, lanes.findIndex(node => node.id === state.selectedId));
	let top = clamp(state.laneTop, 0, Math.max(0, lanes.length - capacity));
	if (selectedIndex < top) top = selectedIndex;
	if (selectedIndex >= top + capacity) top = selectedIndex - capacity + 1;
	state.laneTop = top;
	const shown = lanes.slice(top, top + capacity);
	const laneY = new Map<string, number>(shown.map((node, i) => [node.id, laneY0 + 2 * i]));
	const bottom = laneY0 + 2 * shown.length - 1;
	for (const c of grid) for (let y = laneY0; y <= bottom; y++) scr.put(c, y, '┊', {fg: 'faint'});
	if (nowC >= 0) for (let y = laneY0; y <= bottom; y++) scr.put(nowC, y, '│', {fg: 'accent', dim: true});
	const cap = Math.max(1, Math.floor((labelEnd - 19) / 3));
	const mainOpen = isActiveVisual(model.mainStatus());
	for (const node of shown) {
		const y = laneY.get(node.id)!;
		const visual = visualOf(model, node);
		const selected = node.id === state.selectedId;
		if (selected) {
			scr.put(1, y, '▎', {fg: 'selbar'});
			scr.fill(2, y, cols - 3, 1, 'sel');
		}
		treePrefix(scr, node, y, 2, 3, cap);
		const gx = 3 + 3 * Math.min(node.depth, cap);
		const type = node.run ? (node.edge === 'turn' ? 'turn' : TYPE_SHORT[node.run.agentType ?? ''] ?? node.run.agentType ?? 'agent') : 'session';
		scr.seq(gx, y, [glyphPart(visual, frame.spin, node.ctx)]);
		scr.rput(labelEnd, y, type, {...MUTED, dim: node.ctx});
		scr.put(gx + 2, y, fit(node.run ? node.run.name : 'main', labelEnd - width(type) - gx - 3), {fg: selected ? 'accent' : 'fg', bold: true, dim: node.ctx});
		const spans = node.run ? [] : mainSpans(model, now);
		const segments: Array<[number, number, Tone, boolean]> = node.run
			? [[...runSpan(model, node.run, now), BAR[visual], !isFinished(node.run)]]
			: spans.map(([a, b], i) => [a, b, 'muted', mainOpen && i === spans.length - 1]);
		for (const [a, b, tone, open] of segments) {
			if (b < start || a > end) continue;
			const c0 = col(Math.max(a, start));
			const c1 = Math.max(c0, colEnd(Math.min(b, end)));
			for (let c = c0; c <= c1; c++) scr.put(c, y, c1 > c0 && c === c0 && a >= start ? '╺' : '━', {fg: tone, dim: node.ctx});
			if (c1 > c0 && b <= end && !open) scr.put(c1, y, '╸', {fg: tone, dim: node.ctx});
		}
		const key = node.run ? node.run.id : null;
		for (const edge of model.waitLog.values()) {
			if (edge.fromRunId !== key) continue;
			const [a, b] = waitSpan(model, edge, now);
			if (b < start || a > end) continue;
			const c0 = col(Math.max(a, start));
			for (let c = c0; c <= Math.max(c0, colEnd(Math.min(b, end))); c++) scr.put(c, y, '╍', {fg: 'attention', dim: node.ctx});
		}
		if (node.run) {
			const [, b] = runSpan(model, node.run, now);
			if (visual === 'running' && nowC >= 0) scr.put(nowC, y, '●', {fg: 'accent', dim: node.ctx});
			if (END_MARKS.includes(visual) && b >= start && b <= end && colEnd(b) + 1 < cx + cw) {
				scr.put(colEnd(b) + 1, y, VISUALS[visual].glyph, {fg: VISUALS[visual].tone, dim: node.ctx});
			}
		}
		scr.rput(durationRight, y, formatDuration(elapsed(model, node, now)), {fg: isActiveVisual(visual) ? 'fg' : 'muted', dim: node.ctx});
	}
	for (const edge of model.waitLog.values()) {
		const fromY = laneY.get(edge.fromRunId ?? MAIN);
		const toY = edge.toRunId ? laneY.get(edge.toRunId) : undefined;
		const [a] = waitSpan(model, edge, now);
		if (fromY === undefined || toY === undefined || fromY === toY || a < start || a > end) continue;
		const c = col(a);
		const dir = toY > fromY ? 1 : -1;
		const style: Style = {fg: 'attention', dim: Boolean(edge.end)};
		for (let y = fromY + dir; y !== toY - dir; y += dir) if ([' ', '┊'].includes(scr.charAt(c, y))) scr.put(c, y, '╎', style);
		scr.put(c, toY - dir, dir > 0 ? '▾' : '▴', style);
	}
	const legend: Part[] = [];
	const items: Array<[string, Tone, string]> = [
		['━━', 'accent', 'running'], ['━━', 'success', 'done'], ['━━', 'danger', 'failed'], ['━■', 'muted', 'cancelled'],
		['━━', 'done', 'replied'], ['━━', 'muted', 'main turn'], ['╍╍', 'attention', 'waiting'], ['▾', 'attention', 'waits for'],
	];
	for (const [glyph, tone, label] of items) legend.push([glyph, {fg: tone}], [` ${label}  `, MUTED]);
	const scale = `${spc < 10 ? spc.toFixed(1) : Math.round(spc)}s / col`;
	const range = lanes.length > capacity ? `lanes ${top + 1}-${top + shown.length} of ${lanes.length}   ` : '';
	scr.seqFit(3, legendY, legend, cols - width(range + scale) - 6);
	scr.rput(cols - 2, legendY, range + scale, MUTED);
}
