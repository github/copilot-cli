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

function modelOf(events = fixture()): AgentModel {
	const model = new AgentModel();
	for (const event of events) model.apply(event);
	return model;
}

function mount(model: AgentModel, width = 120, height = 36) {
	const clock = (): number => Date.parse(model.lastEventAt!) + 5000;
	return render(<App model={model} loadContent={load} source="ended" clock={clock} width={width} height={height}/>);
}

async function frame(view: ReturnType<typeof render>, pattern: RegExp): Promise<string> {
	for (let attempt = 0; attempt < 100; attempt++) {
		const output = stripVTControlCharacters(view.lastFrame() ?? '');
		if (pattern.test(output)) return output;
		await setTimeout(10);
	}
	assert.match(stripVTControlCharacters(view.lastFrame() ?? ''), pattern);
	return '';
}

test('opens on the Graph tab, shows what the selected agent did, and keeps tool calls hidden until t', async t => {
	const view = mount(modelOf());
	t.after(() => view.cleanup());
	let output = await frame(view, /Main session/);
	assert.match(output, /Graph\s+Timeline/);
	assert.match(output, /main session/);
	for (const name of ['parent', 'child', 'control']) assert.match(output, new RegExp(name));
	assert.match(output, /sync · waited/);
	view.stdin.write('j');
	output = await frame(view, /Parent result/);
	assert.match(output, /Task for parent/);
	assert.match(output, /Parent prompt/);
	assert.match(output, /Relationships/);
	assert.doesNotMatch(output, /Tools ·/);
	view.stdin.write('t');
	output = await frame(view, /Tools · 1/);
	assert.match(output, /task/);
	assert.doesNotMatch(output, /Relationships/);
});

test('Tab switches to Timeline swimlanes with an axis, lanes, recorded waits and the selected history', async t => {
	const view = mount(modelOf());
	t.after(() => view.cleanup());
	await frame(view, /Main session/);
	view.stdin.write('j');
	view.stdin.write('j');
	await frame(view, /Child result/);
	view.stdin.write('\t');
	const output = await frame(view, /waits for/);
	assert.match(output, /Agent\s+Type/);
	assert.match(output, /now/);
	assert.match(output, /▾/);
	assert.match(output, /Child result/);
	for (const name of ['main', 'parent', 'child', 'control']) assert.match(output, new RegExp(`${name}\\s`));
	view.stdin.write('+');
	await frame(view, / 2x /);
});

test('filtering keeps ancestors as context and narrow terminals show a resize message', async t => {
	const view = mount(modelOf(fixture().slice(0, 15)));
	t.after(() => view.cleanup());
	await frame(view, /status: all/);
	view.stdin.write('f');
	const output = await frame(view, /status: active/);
	assert.match(output, /parent/);
	assert.doesNotMatch(output, /control/);
	const small = mount(modelOf(), 70, 20);
	t.after(() => small.cleanup());
	await frame(small, /Terminal too small/);
});

test('recorded control sequences are inert and long results scroll inside the inspector', async t => {
	const model = modelOf([
		record('session.start', {copilotVersion: '1.0.104', sessionId: 'scroll'}),
		start('agent', 'agent'),
		record('assistant.message', {content: '\u001b[2J' + Array.from({length: 40}, (_, i) => `RESULT-LINE-${i}`).join('\n')}, 'agent'),
		record('subagent.completed', {toolCallId: 'agent'}, 'agent'),
	]);
	const view = mount(model);
	t.after(() => view.cleanup());
	await frame(view, /Main session/);
	view.stdin.write('j');
	let output = await frame(view, /RESULT-LINE-0/);
	assert.doesNotMatch(view.lastFrame() ?? '', /\u001b\[2J/);
	assert.match(output, /lines 1-/);
	view.stdin.write('\u001b[6~');
	output = await frame(view, /RESULT-LINE-6\b/);
	assert.doesNotMatch(output, /RESULT-LINE-0\b/);
});
