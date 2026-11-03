import type {Frame, Rect} from './chrome.js';
import {fit, junction, Screen, width} from './screen.js';
import type {Part, Style} from './screen.js';
import {elapsed, formatDuration, glyphPart, MAIN, nodeType, runLabel, VISUALS, visualOf, waitSpan} from './tree.js';
import type {Node, Visual} from './tree.js';

export const CARD_W = 26;
export const MIN_CARD_W = 18;
export const ROOT_W = 32;
export const CARD_H = 5;
export const ROOT_H = 4;
export const GAP = 2;
export const LEVEL = CARD_H + 2;

export interface Placed {
	node: Node;
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface GraphLayout {
	placed: Map<string, Placed>;
	width: number;
	height: number;
}

const MUTED: Style = {fg: 'muted'};
const centerOf = (p: Placed): number => p.x + Math.floor(p.w / 2);
const clamp = (value: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, value));

/** Row of a tree level: the root card is shorter, then each level adds a card plus a bus row and an arrow row. */
export const levelY = (depth: number): number => depth === 0 ? 0 : ROOT_H + 2 + (depth - 1) * LEVEL;

/** Top-down tidy layout: each subtree gets its own column span and parents sit centred over their children. */
export function layoutGraph(root: Node, cardW = CARD_W): GraphLayout {
	const cardWidth = (node: Node): number => node.id === MAIN ? ROOT_W : cardW;
	const spans = new Map<string, number>();
	const childSpan = (node: Node): number =>
		node.children.reduce((sum, child) => sum + spans.get(child.id)!, 0) + GAP * Math.max(0, node.children.length - 1);
	const measure = (node: Node): void => {
		node.children.forEach(measure);
		spans.set(node.id, Math.max(cardWidth(node), childSpan(node)));
	};
	measure(root);
	const placed = new Map<string, Placed>();
	let deepest = 0;
	const place = (node: Node, left: number, depth: number): void => {
		const total = spans.get(node.id)!;
		const w = cardWidth(node);
		deepest = Math.max(deepest, depth);
		let cursor = left + Math.floor((total - childSpan(node)) / 2);
		for (const child of node.children) {
			place(child, cursor, depth + 1);
			cursor += spans.get(child.id)! + GAP;
		}
		let x = left + Math.floor((total - w) / 2);
		if (node.children.length) {
			const mid = Math.floor((centerOf(placed.get(node.children[0]!.id)!) + centerOf(placed.get(node.children.at(-1)!.id)!)) / 2);
			x = clamp(mid - Math.floor(w / 2), left, left + total - w);
		}
		placed.set(node.id, {node, x, y: levelY(depth), w, h: node.id === MAIN ? ROOT_H : CARD_H});
	};
	place(root, 0, 0);
	return {placed, width: spans.get(root.id)!, height: deepest === 0 ? ROOT_H : levelY(deepest) + CARD_H};
}

/** Narrows the agent cards (down to MIN_CARD_W) before falling back to horizontal scrolling. */
export function fitGraph(root: Node, areaW: number): GraphLayout {
	let layout = layoutGraph(root);
	for (let w = CARD_W - 2; layout.width > areaW && w >= MIN_CARD_W; w -= 2) layout = layoutGraph(root, w);
	return layout;
}

function edgeLabel(frame: Frame, parent: Node, child: Node): [Style, Part[]] {
	const {model, now} = frame;
	const parentKey = parent.run ? parent.run.id : null;
	const waits = [...model.waitLog.values()].filter(edge => edge.toRunId === child.id);
	const active = waits.some(edge => !edge.end);
	const parts: Part[] = [];
	if (child.edge === 'turn') parts.push(['later turn', MUTED]);
	else if (child.edge === 'orphan') parts.push(['? launcher', MUTED]);
	else parts.push([child.run?.mode === 'sync' ? 'sync' : child.run?.mode === 'background' ? 'bg' : '?', MUTED]);
	for (const edge of waits) {
		const [start, end] = waitSpan(model, edge, now);
		const who = edge.fromRunId !== parentKey ? `${runLabel(model, edge.fromRunId)} ` : '';
		parts.push([' · ', MUTED], [`${who}${edge.end ? 'waited' : 'waiting'} ${formatDuration(end - start)}`, {fg: 'attention', dim: Boolean(edge.end)}]);
	}
	const tone: Style = waits.length ? {fg: 'attention', dim: !active} : {fg: child.edge === 'turn' ? 'muted' : 'border'};
	return [tone, parts];
}

function statusLine(frame: Frame, node: Node, visual: Visual): Part[] {
	const duration = formatDuration(elapsed(frame.model, node, frame.now));
	if (visual === 'waiting') {
		const edge = [...frame.model.waits.values()].find(wait => wait.fromRunId === node.run?.id);
		const [start, end] = edge ? waitSpan(frame.model, edge, frame.now) : [0, 0];
		return [[`waiting · ${formatDuration(end - start)}`, {fg: 'attention'}]];
	}
	if (visual === 'unknown') return [['status not recorded', MUTED]];
	return [[duration, visual === 'running' ? {fg: 'fg'} : MUTED], [' · ', MUTED], [VISUALS[visual].label, {fg: VISUALS[visual].tone}]];
}

function drawCard(view: Screen, frame: Frame, p: Placed, ox: number, oy: number): void {
	const {node} = p;
	const visual = visualOf(frame.model, node);
	const selected = node.id === frame.state.selectedId;
	const dim = node.ctx && !selected;
	const x = p.x - ox;
	const y = p.y - oy;
	const inner = p.w - 6;
	view.box(x, y, p.w, p.h, {fg: selected ? 'accent' : 'border', dim});
	if (selected) view.fill(x + 1, y + 1, p.w - 2, p.h - 2, 'sel');
	view.seq(x + 2, y + 1, [glyphPart(visual, frame.spin, dim)]);
	const nameStyle: Style = {fg: selected ? 'accent' : 'fg', bold: true, dim};
	if (!node.run) {
		const label = VISUALS[visual].label;
		view.rput(x + p.w - 3, y + 1, label, {fg: VISUALS[visual].tone, dim});
		view.put(x + 4, y + 1, fit('main session', inner - width(label) - 1), nameStyle);
		const model = frame.model.sessionModel ?? 'model not recorded';
		view.put(x + 4, y + 2, fit(`${model} · ${formatDuration(frame.now)}`, inner), {...MUTED, dim});
		return;
	}
	view.put(x + 4, y + 1, fit(node.run.name, inner), nameStyle);
	view.put(x + 4, y + 2, fit(nodeType(node), inner), {...MUTED, dim});
	view.seqFit(x + 4, y + 3, statusLine(frame, node, visual), inner, dim ? {dim: true} : {});
}

export function drawGraph(scr: Screen, frame: Frame, area: Rect, legendY: number): void {
	const layout = fitGraph(frame.tree.root, area.w);
	const selected = layout.placed.get(frame.state.selectedId) ?? layout.placed.get(MAIN)!;
	let ox: number;
	if (layout.width <= area.w) ox = -Math.floor((area.w - layout.width) / 2);
	else {
		ox = clamp(frame.state.graphX, 0, layout.width - area.w);
		if (selected.x < ox) ox = selected.x;
		if (selected.x + selected.w > ox + area.w) ox = selected.x + selected.w - area.w;
		frame.state.graphX = ox;
	}
	let oy = 0;
	if (layout.height > area.h) {
		oy = clamp(frame.state.graphY, 0, layout.height - area.h);
		if (selected.y < oy) oy = selected.y;
		if (selected.y + selected.h > oy + area.h) oy = selected.y + selected.h - area.h;
		frame.state.graphY = oy;
	}
	const view = new Screen(area.w, area.h);
	const border: Style = {fg: 'border'};
	// Edge labels may run right until the next arrow on the same row (children of every parent at one depth share it).
	const arrows = new Map<number, number[]>();
	for (const p of layout.placed.values()) {
		if (p.node.id === MAIN) continue;
		const row = arrows.get(p.y - 1) ?? [];
		row.push(centerOf(p));
		arrows.set(p.y - 1, row);
	}
	for (const row of arrows.values()) row.sort((a, b) => a - b);
	const right = Math.max(layout.width, ox + area.w);
	for (const p of layout.placed.values()) {
		const busY = p.y + p.h;
		if (!p.node.children.length || busY + 1 < oy || busY >= oy + area.h) continue;
		const pc = centerOf(p);
		const centers = p.node.children.map(child => centerOf(layout.placed.get(child.id)!));
		const drops = new Set(centers);
		const lo = Math.min(pc, ...centers);
		const hi = Math.max(pc, ...centers);
		for (let c = Math.max(lo, ox); c <= Math.min(hi, ox + area.w - 1); c++) {
			view.put(c - ox, busY - oy, junction(c === pc, drops.has(c), c > lo, c < hi), border);
		}
		const row = arrows.get(busY + 1) ?? [];
		p.node.children.forEach((child, i) => {
			const cc = centers[i]!;
			const next = row.find(x => x > cc);
			const room = next === undefined ? right - cc - 2 : next - cc - 3;
			const [tone, label] = edgeLabel(frame, p.node, child);
			view.put(cc - ox, busY + 1 - oy, '▾', tone);
			view.seqFit(cc + 2 - ox, busY + 1 - oy, label, Math.max(0, room));
		});
	}
	const visible = (p: Placed): boolean => p.x + p.w > ox && p.x < ox + area.w && p.y + p.h > oy && p.y < oy + area.h;
	for (const p of layout.placed.values()) {
		if (!visible(p)) continue;
		drawCard(view, frame, p, ox, oy);
		if (p.node.children.length) view.put(centerOf(p) - ox, p.y + p.h - 1 - oy, '┬', {fg: p.node.id === frame.state.selectedId ? 'accent' : 'border'});
	}
	scr.blit(view, area.x, area.y);
	if (ox > 0) scr.put(area.x, area.y + Math.floor(area.h / 2), '◂', {fg: 'accent'});
	if (layout.width - ox > area.w) scr.put(area.x + area.w - 1, area.y + Math.floor(area.h / 2), '▸', {fg: 'accent'});
	const legend: Part[] = [
		['─▾', border], [' spawned (bg / sync)   ', MUTED], ['▾', {fg: 'attention'}], [' waiting now   ', MUTED],
		['▾', {fg: 'attention', dim: true}], [' waited (recorded)   ', MUTED], ['▾', MUTED], [' later turn', MUTED],
	];
	const note = 'other deps: not recorded';
	scr.seqFit(3, legendY, legend, frame.cols - width(note) - 8);
	scr.rput(frame.cols - 2, legendY, note, MUTED);
}
