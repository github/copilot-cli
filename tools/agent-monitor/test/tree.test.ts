import assert from 'node:assert/strict';
import {test} from 'node:test';
import {CARD_H, layoutGraph, levelY} from '../src/graph.js';
import type {Placed} from '../src/graph.js';
import {AgentModel} from '../src/model.js';
import {Screen, width} from '../src/screen.js';
import {buildTree, MAIN, mainSpans, nowSeconds} from '../src/tree.js';
import {fixture, record, start} from './fixture.js';

test('display tree nests spawned agents under launchers, later turns under the first turn, and filters keep ancestors', () => {
	const model = new AgentModel();
	const events = fixture();
	for (const event of events.slice(0, 15)) model.apply(event);
	const partial = buildTree(model, 'finished');
	const child = partial.byId.get('launch:child-call')!;
	assert.equal(child.parent?.id, 'launch:parent-call');
	assert.equal(child.parent?.ctx, true);
	assert.equal(child.ctx, false);
	assert.equal(buildTree(model, 'active').byId.has('launch:control-call'), false);
	for (const event of events.slice(15)) model.apply(event);
	model.apply(record('user.message', {content: 'Second follow-up', delivery: 'idle'}, 'control'));
	model.apply(record('assistant.turn_start', {turnId: '0'}, 'control'));
	const tree = buildTree(model, 'all');
	const followups = tree.order.filter(node => node.id.startsWith('message:'));
	assert.equal(tree.byId.get('launch:parent-call')!.parent, tree.root);
	assert.equal(followups.length, 2);
	for (const followup of followups) {
		assert.equal(followup.parent?.id, 'launch:control-call');
		assert.equal(followup.edge, 'turn');
	}
	assert.deepEqual(tree.order.map(node => node.depth), [0, 1, 2, 1, 2, 2]);
});

test('cyclic launch evidence is re-homed instead of recursing forever', () => {
	const model = new AgentModel();
	model.apply(record('tool.execution_start', {toolCallId: 'call-a', toolName: 'task', arguments: {mode: 'background'}}, 'b'));
	model.apply(start('call-a', 'a'));
	model.apply(record('tool.execution_start', {toolCallId: 'call-b', toolName: 'task', arguments: {mode: 'background'}}, 'a'));
	model.apply(start('call-b', 'b'));
	const tree = buildTree(model, 'all');
	assert.equal(tree.order.length, model.runs.size + 1);
	assert.ok(tree.order.some(node => node.edge === 'orphan'));
});

test('a wide character cut off by the right edge never widens a screen row', () => {
	const scr = new Screen(10, 1);
	scr.put(0, 0, '一二三四五');
	scr.put(9, 0, '汉');
	assert.equal(scr.segments()[0]!.reduce((sum, segment) => sum + width(segment.text), 0), 10);
});

test('graph layout centres parents over their children without overlapping cards', () => {
	const model = new AgentModel();
	for (const event of fixture()) model.apply(event);
	const tree = buildTree(model, 'all');
	const layout = layoutGraph(tree.root);
	const cards = [...layout.placed.values()];
	for (const a of cards) for (const b of cards) if (a !== b && a.y === b.y) assert.ok(a.x + a.w <= b.x || b.x + b.w <= a.x);
	const center = (p: Placed): number => p.x + Math.floor(p.w / 2);
	const root = layout.placed.get(MAIN)!;
	const kids = tree.root.children.map(node => center(layout.placed.get(node.id)!));
	assert.ok(center(root) >= Math.min(...kids) && center(root) <= Math.max(...kids));
	assert.equal(layout.placed.get('launch:child-call')!.y, levelY(2));
	assert.equal(layout.height, levelY(2) + CARD_H);
	assert.ok(layout.height <= 18, 'a three-level graph fits the 120x36 content area');
});

test('main-session spans merge model rounds split by short tool gaps but keep idle periods separate', () => {
	const model = new AgentModel();
	model.apply(record('session.start', {copilotVersion: '1.0.104', sessionId: 'spans'}));
	model.apply(record('assistant.turn_start', {turnId: '0'}));
	model.apply(record('assistant.turn_end', {turnId: '0'}));
	model.apply(record('assistant.turn_start', {turnId: '1'}));
	model.apply(record('assistant.turn_end', {turnId: '1'}));
	for (let i = 0; i < 3; i++) model.apply(record('session.usage_record', {}));
	model.apply(record('assistant.turn_start', {turnId: '2'}));
	const now = nowSeconds(model, Date.parse(model.lastEventAt!) + 2000);
	const spans = mainSpans(model, now);
	assert.equal(spans.length, 2);
	assert.equal(spans[1]![1], now);
	assert.equal(model.mainStatus(), 'running');
});
