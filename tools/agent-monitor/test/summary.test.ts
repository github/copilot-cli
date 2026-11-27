import assert from 'node:assert/strict';
import {test} from 'node:test';
import {AgentModel} from '../src/model.js';
import {summarize} from '../src/summary.js';
import {fixture} from './fixture.js';

test('the text summary nests executions under their launcher with status, duration and the wait in progress', () => {
	const model = new AgentModel();
	const events = fixture();
	for (const event of events.slice(0, 11)) model.apply(event);
	const now = Date.parse(model.lastEventAt!);
	let lines = summarize(model, now).split('\n');
	assert.equal(lines[0], 'Agents · 3 executions: 1 running, 1 waiting, 1 done');
	assert.match(lines[1]!, /^◐ main session · running · /);
	assert.match(lines[2]!, /^├─ ◌ parent · general-purpose · waiting on child \d/);
	assert.match(lines[3]!, /^│  └─ ◐ child · general-purpose · [\d.]+s · running$/);
	assert.match(lines[4]!, /^└─ ✓ control · general-purpose · [\d.]+s · done$/);
	for (const event of events.slice(11)) model.apply(event);
	lines = summarize(model, Date.parse(model.lastEventAt!)).split('\n');
	assert.match(lines.at(-1)!, /^   └─ ↩ control · general-purpose · turn · [\d.]+s · replied$/);
});

test('the text summary says when no agent has run yet', () => {
	assert.equal(summarize(new AgentModel(), Date.now()).split('\n')[0], 'Agents · no agent executions recorded yet');
});
