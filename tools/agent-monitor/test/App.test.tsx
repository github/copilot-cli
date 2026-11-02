import assert from 'node:assert/strict';
import {setTimeout} from 'node:timers/promises';
import {stripVTControlCharacters} from 'node:util';
import {test} from 'node:test';
import {render} from 'ink-testing-library';
import {App} from '../src/App.js';
import type {ContentRef} from '../src/events.js';
import {AgentModel} from '../src/model.js';
import {fixture, record, start} from './fixture.js';

const load = async (ref: ContentRef): Promise<string> => {
	if (ref.inline === undefined) throw new Error('Fixture text missing');
	return ref.inline;
};

async function frame(view: ReturnType<typeof render>, pattern: RegExp): Promise<string> {
	for (let attempt = 0; attempt < 100; attempt++) {
		const output = view.lastFrame() ?? '';
		if (pattern.test(output)) return output;
		await setTimeout(10);
	}
	assert.match(view.lastFrame() ?? '', pattern);
	return view.lastFrame()!;
}

test('completed results remain selectable and selected history survives new live agents', async t => {
	const model = new AgentModel();
	for (const event of fixture()) model.apply(event);
	const view = render(<App model={model} loadContent={load} source="synthetic" width={110} height={38}/>);
	t.after(() => view.cleanup());
	await frame(view, /Parent result/);
	view.stdin.write('j');
	await frame(view, /Child result/);
	view.stdin.write('\t');
	await frame(view, /Tool 0\/0: none/);
	view.stdin.write('\t');
	await frame(view, /Child result/);
	model.apply(record('tool.execution_start', {toolCallId: 'live', toolName: 'task', arguments: {mode: 'background'}}));
	model.apply(start('live', 'live'));
	view.rerender(<App model={model} revision={1} loadContent={load} source="synthetic" width={110} height={38}/>);
	const output = await frame(view, /1 active\/unknown/);
	assert.match(output, /Child result/);
	assert.match(output, />\s+\. \[DONE\] worker/);
	view.stdin.write('f');
	await frame(view, /filter: active/);
	assert.doesNotMatch(view.lastFrame()!, /\[DONE\]/);
	view.stdin.write('f');
	await frame(view, /filter: finished/);
	assert.match(view.lastFrame()!, /\[DONE\]/);
});

test('folding, tool-result inspection, and narrow resize do not lose completed work', async t => {
	const model = new AgentModel();
	for (const event of fixture()) model.apply(event);
	const view = render(<App model={model} loadContent={load} source="synthetic" width={100} height={38}/>);
	t.after(() => view.cleanup());
	await frame(view, /Parent result/);
	view.stdin.write('h');
	await frame(view, /> \+ \[DONE\]/);
	assert.doesNotMatch(view.lastFrame()!, /Task for child/);
	view.stdin.write('\t');
	await frame(view, /Tool 1\/1: task/);
	assert.match(view.lastFrame()!, /Child result/);
	view.rerender(<App model={model} loadContent={load} source="synthetic" width={40} height={18}/>);
	await setTimeout(50);
	const output = stripVTControlCharacters(view.lastFrame()!);
	assert.ok(output.split('\n').every(line => line.length <= 40));
	view.stdin.write('\t');
	await frame(view, /Result \|/);
	view.stdin.write('\u001b[F');
	await frame(view, /Parent result/);
});

test('recorded control sequences are inert and long results are scrollable', async t => {
	const model = new AgentModel();
	model.apply(start('agent', 'agent'));
	model.apply(record('assistant.message', {
		content: '\u001b[2J' + Array.from({length: 80}, (_, index) => `RESULT-LINE-${index}`).join('\n'),
	}, 'agent'));
	model.apply(record('subagent.completed', {toolCallId: 'agent'}, 'agent'));
	const view = render(<App model={model} loadContent={load} source="synthetic" width={90} height={28}/>);
	t.after(() => view.cleanup());
	await frame(view, /RESULT-LINE-0/);
	view.stdin.write('\u001b[F');
	const output = await frame(view, /RESULT-LINE-79/);
	assert.doesNotMatch(output, /\u001b\[2J/);
	assert.doesNotMatch(output, /RESULT-LINE-0\n/);
	view.stdin.write('\u001b[H');
	await frame(view, /Task for agent/);
});

test('a live synchronous wait shows its target and disappears when the call returns', async t => {
	const model = new AgentModel();
	const records = fixture();
	for (const event of records.slice(0, 10)) model.apply(event);
	const view = render(<App model={model} loadContent={load} source="synthetic" width={110} height={38}/>);
	t.after(() => view.cleanup());
	await frame(view, /\[WAITING\] worker -> waits-for: child/);
	for (const event of records.slice(10)) model.apply(event);
	view.rerender(<App model={model} revision={1} loadContent={load} source="synthetic" width={110} height={38}/>);
	await frame(view, /Parent result/);
	assert.doesNotMatch(view.lastFrame()!, /waits-for: child/);
	assert.match(view.lastFrame()!, /\[DONE\]/);
});
