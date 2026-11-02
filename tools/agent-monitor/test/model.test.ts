import assert from 'node:assert/strict';
import {test} from 'node:test';
import {AgentModel} from '../src/model.js';
import {fixture, record, start} from './fixture.js';

test('parallel/nested agents retain their own results and same-agent follow-ups remain separate', () => {
	const model = new AgentModel();
	const records = fixture();
	for (const event of records.slice(0, 4)) model.apply(event);
	const parent = model.runs.get('launch:parent-call')!;
	assert.equal(parent.status, 'running');
	assert.equal(model.runs.get('launch:parent-call')?.result, undefined);
	for (const event of records.slice(4)) model.apply(event);
	assert.equal(model.runs.size, 4);
	assert.equal(parent.result?.inline, 'Parent result');
	assert.equal(parent.status, 'completed');
	assert.equal(model.runs.get('launch:child-call')?.parentRunId, parent.id);
	assert.equal(model.runs.get('launch:child-call')?.result?.inline, 'Child result');
	const control = model.runs.get('launch:control-call')!;
	assert.equal(control.result?.inline, 'Control result');
	assert.equal(control.status, 'completed');
	const followup = [...model.runs.values()].find(run => run.id.startsWith('message:'))!;
	assert.equal(followup.agentId, control.agentId);
	assert.equal(followup.status, 'replied');
	assert.equal(followup.result?.inline, 'Follow-up result');
	model.apply(records.at(-1)!);
	assert.equal(model.runs.size, 4);
});

test('late start and launch records hydrate a completed invocation without regressing its outcome', () => {
	const model = new AgentModel();
	model.apply(record('assistant.message', {content: 'Partial reply before lifecycle records'}, 'agent'));
	model.apply(record('subagent.failed', {toolCallId: 'late', error: 'Recorded failure'}, 'agent'));
	model.apply(start('late', 'agent'));
	model.apply(record('tool.execution_start', {toolCallId: 'late', toolName: 'task', arguments: {mode: 'background'}}));
	const run = [...model.runs.values()][0]!;
	assert.equal(model.runs.size, 1);
	assert.equal(run.status, 'failed');
	assert.equal(run.parentRunId, null);
	assert.equal(run.error?.inline, 'Recorded failure');
	assert.equal(run.result?.inline, 'Partial reply before lifecycle records');
});

test('event chain order is not dependency data; only explicit blocking waits create wait edges', () => {
	const model = new AgentModel();
	const agent = start('a', 'a');
	Object.assign(agent.event, {parentId: 'previous-event-not-an-agent'});
	model.apply(agent);
	const run = model.runs.get('launch:a')!;
	assert.equal(run.parentRunId, undefined);
	model.apply(record('tool.execution_start', {toolCallId: 'peek', toolName: 'read_agent', arguments: {agent_id: 'b', wait: false}}, 'a'));
	assert.equal(model.waits.size, 0);
	model.apply(record('tool.execution_start', {toolCallId: 'wait', toolName: 'read_agent', arguments: {agent_id: 'b', wait: true}}, 'a'));
	assert.equal(model.status(run), 'waiting');
	assert.equal(model.waits.get('wait')?.toAgentId, 'b');
	model.apply(record('tool.execution_complete', {toolCallId: 'wait', success: true, result: {content: 'Still running'}}, 'a'));
	assert.equal(model.waits.size, 0);
	assert.equal(model.status(run), 'running');
	assert.equal(model.runs.size, 1);
});

test('waits keep recorded history; launch mode, agent type, prompts, follow-up links and main turns are tracked', () => {
	const model = new AgentModel();
	for (const event of fixture()) model.apply(event);
	const parent = model.runs.get('launch:parent-call')!;
	const child = model.runs.get('launch:child-call')!;
	const followup = [...model.runs.values()].find(run => run.id.startsWith('message:'))!;
	assert.equal(parent.mode, 'background');
	assert.equal(child.mode, 'sync');
	assert.equal(child.agentType, 'general-purpose');
	assert.equal(parent.prompt?.inline, 'Parent prompt');
	assert.equal(followup.previousRunId, 'launch:control-call');
	assert.equal(followup.prompt?.inline, 'Follow-up task');
	const wait = model.waitLog.get('child-call')!;
	assert.equal(wait.fromRunId, parent.id);
	assert.equal(wait.toRunId, child.id);
	assert.ok(wait.end && Date.parse(wait.end) > Date.parse(wait.start));
	assert.equal(model.waits.size, 0);
	assert.equal(model.mainTurns.length, 1);
	assert.ok(model.mainTurns[0]!.end);
	assert.equal(model.mainStatus(), 'idle');
	assert.equal(model.sessionModel, 'synthetic-model');
});

test('unsupported agent signals are diagnosed, not fabricated as completion or cancellation', () => {
	const model = new AgentModel();
	model.apply(start('a', 'a'));
	model.apply(record('subagent.cancelled', {toolCallId: 'a'}, 'a'));
	assert.equal(model.runs.get('launch:a')?.status, 'running');
	assert.ok([...model.warnings].some(warning => warning.includes('subagent.cancelled')));
	assert.throws(() => model.apply(start('a', 'different-agent')), /Conflicting agent ID/);
	assert.throws(() => model.apply(record('subagent.started', {toolCallId: 'missing-agent'})), /agentId/);
});

test('main-session completion does not complete children; an attributed task summary completes only its own execution', () => {
	const model = new AgentModel();
	model.apply(start('a', 'a'));
	model.apply(start('b', 'b'));
	model.apply(record('session.task_complete', {summary: 'Main finished'}));
	assert.equal(model.runs.get('launch:a')?.status, 'running');
	assert.equal(model.runs.get('launch:b')?.status, 'running');
	model.apply(record('session.task_complete', {summary: 'Agent A finished'}, 'a'));
	assert.equal(model.runs.get('launch:a')?.status, 'completed');
	assert.equal(model.runs.get('launch:a')?.result?.inline, 'Agent A finished');
	assert.equal(model.runs.get('launch:b')?.status, 'running');
});
