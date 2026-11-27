import assert from 'node:assert/strict';
import {setTimeout} from 'node:timers/promises';
import {stripVTControlCharacters} from 'node:util';
import {test} from 'node:test';
import {render} from 'ink-testing-library';
import {App} from '../src/App.js';
import type {ContentRef, EventRecord} from '../src/events.js';
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

test('Tab switches to Timeline swimlanes: a wait sits on the waiting lane and points at the awaited lane', async t => {
	const view = mount(modelOf());
	t.after(() => view.cleanup());
	await frame(view, /Main session/);
	view.stdin.write('j');
	view.stdin.write('j');
	await frame(view, /Child result/);
	view.stdin.write('\t');
	const output = await frame(view, /waits for/);
	const lines = output.split('\n');
	const lane = (pattern: RegExp): number => lines.findIndex(line => pattern.test(line));
	const parent = lane(/ parent\s+general/);
	assert.match(lines[parent]!, /╍/);
	assert.match(lines[parent + 1]!, /▾/);
	assert.equal(lane(/ child\s+general/), parent + 2);
	assert.match(lines[lane(/ main\s+session/)]!, /━/);
	assert.match(output, /Child result/);
	const axis = (text: string): string => text.split('\n').find(line => /Agent\s+Type/.test(line))!;
	const scale = (text: string): number => Number(/([\d.]+)s \/ col/.exec(text)![1]);
	assert.doesNotMatch(axis(output), /\Snow/);
	view.stdin.write('+');
	const zoomed = await frame(view, / 2x /);
	assert.ok(scale(zoomed) < scale(output));
	assert.doesNotMatch(axis(zoomed), /\Snow/);
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

test('recorded control sequences are inert in every field and long results scroll inside the inspector', async t => {
	const model = modelOf([
		record('session.start', {copilotVersion: '1.0.104', sessionId: 'scroll'}),
		record('subagent.started', {
			toolCallId: 'agent', agentName: 'general-purpose', agentDisplayName: '\u001b[31mred-agent\u001b[0m',
			agentDescription: 'Task \u001b[1mbold\u001b[0m', executionMode: 'background',
		}, 'agent'),
		record('assistant.message', {content: '\u001b[2J' + Array.from({length: 40}, (_, i) => `RESULT-LINE-${i}`).join('\n')}, 'agent'),
		record('subagent.completed', {toolCallId: 'agent'}, 'agent'),
	]);
	const view = mount(model);
	t.after(() => view.cleanup());
	await frame(view, /Main session/);
	view.stdin.write('j');
	let output = await frame(view, /RESULT-LINE-0/);
	assert.match(output, /red-agent/);
	assert.match(output, /Task bold/);
	assert.doesNotMatch(output, /\[(2J|31m|1m|0m)/);
	assert.match(output, /lines 1-/);
	view.stdin.write('\u001b[6~');
	output = await frame(view, /RESULT-LINE-6\b/);
	assert.doesNotMatch(output, /RESULT-LINE-0\b/);
});

test('a main session blocked on a sync agent shows the agent by display name, never by agent ID', async t => {
	const agentId = '0f8e2c1a-7b3d-4e5f-9a6b-1c2d3e4f5a6b';
	const model = modelOf([
		record('session.start', {copilotVersion: '1.0.104', sessionId: 'sync-wait'}),
		record('assistant.turn_start', {turnId: '0'}),
		record('tool.execution_start', {toolCallId: 'review-call', toolName: 'task', arguments: {mode: 'sync'}}),
		record('subagent.started', {
			toolCallId: 'review-call', agentName: 'code-review', agentDisplayName: 'Code Review',
			agentDescription: 'Review the diff', executionMode: 'sync',
		}, agentId),
	]);
	const view = mount(model);
	t.after(() => view.cleanup());
	const output = await frame(view, /waiting on Code Review/);
	assert.match(output, /main session\s+waiting/);
	assert.doesNotMatch(output, new RegExp(agentId));
});

test('the graph narrows cards to fit a wide fan-out and scrolls to the selected card beyond that', async t => {
	const fanOut = (count: number): AgentModel => modelOf([
		record('session.start', {copilotVersion: '1.0.104', sessionId: 'fan-out'}),
		...Array.from({length: count}, (_, i) => start(`call-${i + 1}`, `agent-${i + 1}`)),
	]);
	const five = mount(fanOut(5));
	t.after(() => five.cleanup());
	assert.doesNotMatch(await frame(five, /agent-5/), /[◂▸]/);
	const eight = mount(fanOut(8));
	t.after(() => eight.cleanup());
	await frame(eight, /▸/);
	eight.stdin.write('G');
	assert.match(await frame(eight, /agent-8/), /◂/);
});

test('at 80 columns the header keeps its chips and t shows tool calls in the single-column inspector', async t => {
	const view = mount(modelOf(), 80, 30);
	t.after(() => view.cleanup());
	await frame(view, /Main session/);
	view.stdin.write('\t');
	const output = await frame(view, /window:/);
	assert.match(output, /session: syntheti /);
	assert.match(output, /○ ended/);
	view.stdin.write('j');
	view.stdin.write('t');
	await frame(view, /Tools · 1/);
});

test('keys that arrive in one input chunk are each applied', async t => {
	const view = mount(modelOf());
	t.after(() => view.cleanup());
	await frame(view, /Main session/);
	view.stdin.write('jj');
	await frame(view, /Child result/);
});

test('read failures for the prompt and the result are reported inside the message column', async t => {
	const failing = async (): Promise<string> => { throw new Error(`disk read failed ${'x'.repeat(120)}`); };
	const model = modelOf();
	const clock = (): number => Date.parse(model.lastEventAt!) + 5000;
	const view = render(<App model={model} loadContent={failing} source="ended" clock={clock} width={120} height={36}/>);
	t.after(() => view.cleanup());
	await frame(view, /Main session/);
	view.stdin.write('j');
	const output = await frame(view, /Task  Cannot read recorded prompt: disk read failed/);
	const error = output.split('\n').find(line => line.includes('Cannot read recorded text'));
	assert.match(error ?? '', /Cannot read recorded text: disk read failed\s+│.*│/);
});

test('current warnings outrank an informational source notice', async t => {
	const model = modelOf([record('session.start', {copilotVersion: '9.9.9', sessionId: 'notice'})]);
	const clock = (): number => Date.parse(model.lastEventAt!) + 5000;
	const notice = 'Session log was replaced/truncated; view rebuilt from the new source.';
	const view = render(<App model={model} loadContent={load} source="following" diagnostic={notice} clock={clock} width={120} height={36}/>);
	t.after(() => view.cleanup());
	await frame(view, /Untested CLI event format: 9\.9\.9/);
});

test('text read from a replaced source is not shown for the rebuilt view', async t => {
	const rebuilt = (): EventRecord[] => fixture().map(item => item.event.data.content === 'Parent result'
		? {event: {...item.event, data: {...item.event.data, content: 'Rebuilt result'}}} : item);
	const loadContent = (ref: ContentRef): Promise<string> => ref.inline === 'Rebuilt result' ? new Promise<string>(() => {}) : load(ref);
	const model = modelOf();
	const clock = (): number => Date.parse(model.lastEventAt!) + 5000;
	const app = (revision: number) => <App model={model} revision={revision} loadContent={loadContent} source="following" clock={clock} width={120} height={36}/>;
	const view = render(app(0));
	t.after(() => view.cleanup());
	await frame(view, /Main session/);
	view.stdin.write('j');
	await frame(view, /Parent result/);
	model.reset();
	for (const event of rebuilt()) model.apply(event);
	view.rerender(app(1));
	assert.doesNotMatch(await frame(view, /Loading recorded text/), /Parent result/);
});

test('a slow text load for an earlier selection does not replace the current one', async t => {
	let release!: () => void;
	const gate = new Promise<void>(resolve => { release = resolve; });
	const slowLoad = async (ref: ContentRef): Promise<string> => {
		if (ref.inline === 'Parent result') await gate;
		return load(ref);
	};
	const model = modelOf();
	const clock = (): number => Date.parse(model.lastEventAt!) + 5000;
	const view = render(<App model={model} loadContent={slowLoad} source="ended" clock={clock} width={120} height={36}/>);
	t.after(() => view.cleanup());
	await frame(view, /Main session/);
	view.stdin.write('j');
	await frame(view, /Loading recorded text/);
	view.stdin.write('j');
	await frame(view, /Child result/);
	release();
	await setTimeout(50);
	assert.match(stripVTControlCharacters(view.lastFrame() ?? ''), /Child result/);
});
