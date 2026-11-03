import assert from 'node:assert/strict';
import {appendFile, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import {capture, JsonlReader} from '../src/events.js';
import type {EventRecord} from '../src/events.js';
import {record} from './fixture.js';

test('incremental replay buffers partial UTF-8/JSONL and reads full results lazily', async t => {
	const directory = await mkdtemp(join(tmpdir(), 'agent-monitor-reader-'));
	t.after(() => rm(directory, {recursive: true}));
	const file = join(directory, 'events.jsonl');
	const text = '\u5df2\u5b8c\u6210'.repeat(200);
	const bytes = Buffer.from(JSON.stringify(record('assistant.message', {content: text}, 'agent').event) + '\n');
	const split = bytes.indexOf(Buffer.from('\u5df2')) + 1;
	await writeFile(file, bytes.subarray(0, split));
	const reader = new JsonlReader(file);
	const records: EventRecord[] = [];
	const accept = (event: EventRecord): void => { records.push(event); };
	const unexpectedReset = (): never => { throw new Error('Unexpected reset'); };
	await reader.poll(accept, unexpectedReset);
	assert.equal(records.length, 0);
	await appendFile(file, bytes.subarray(split));
	await reader.poll(accept, unexpectedReset);
	assert.equal(records.length, 1);
	const ref = capture(records[0]!, 'content')!;
	assert.equal(ref.inline, undefined);
	assert.equal(await reader.readContent(ref), text);
	assert.equal(await reader.poll(accept, unexpectedReset), false);
	assert.equal(records.length, 1);
	assert.deepEqual(await readFile(file), bytes);
});

test('recorded text is read back from later records, across polls and 64 KB read chunks', async t => {
	const directory = await mkdtemp(join(tmpdir(), 'agent-monitor-offsets-'));
	t.after(() => rm(directory, {recursive: true}));
	const file = join(directory, 'events.jsonl');
	const line = (content: string): Buffer => Buffer.from(JSON.stringify(record('assistant.message', {content}, 'agent').event) + '\n');
	const big = 'x'.repeat(100 * 1024);
	const head = Buffer.concat([line('first'), line(big)]);
	const split = head.length - 10;
	await writeFile(file, head.subarray(0, split));
	const reader = new JsonlReader(file);
	const records: EventRecord[] = [];
	const accept = (event: EventRecord): void => { records.push(event); };
	await reader.poll(accept, () => {});
	await appendFile(file, Buffer.concat([head.subarray(split), line('last')]));
	await reader.poll(accept, () => {});
	const texts = await Promise.all(records.map(item => reader.readContent(capture(item, 'content')!)));
	assert.deepEqual(texts, ['first', big, 'last']);
});

test('rewriting a log past its old size resets state and invalidates old result references', async t => {
	const directory = await mkdtemp(join(tmpdir(), 'agent-monitor-reset-'));
	t.after(() => rm(directory, {recursive: true}));
	const file = join(directory, 'events.jsonl');
	await writeFile(file, JSON.stringify(record('assistant.message', {content: 'old'}, 'agent').event) + '\n');
	const reader = new JsonlReader(file);
	let records: EventRecord[] = [];
	let resets = 0;
	const accept = (event: EventRecord): void => { records.push(event); };
	const reset = (): void => { records = []; resets++; };
	await reader.poll(accept, reset);
	const old = capture(records[0]!, 'content')!;
	await writeFile(file, JSON.stringify(record('assistant.message', {content: 'new'.repeat(500)}, 'agent').event) + '\n');
	await reader.poll(accept, reset);
	assert.equal(resets, 1);
	assert.equal(records.length, 1);
	assert.equal(await reader.readContent(capture(records[0]!, 'content')!), 'new'.repeat(500));
	await assert.rejects(reader.readContent(old), /outdated.*generation/);
});

test('an unfinished record waits, but a malformed completed record is a visible error', async t => {
	const directory = await mkdtemp(join(tmpdir(), 'agent-monitor-invalid-'));
	t.after(() => rm(directory, {recursive: true}));
	const file = join(directory, 'events.jsonl');
	await writeFile(file, '{"id":');
	const reader = new JsonlReader(file);
	let count = 0;
	await reader.poll(() => { count++; }, () => {});
	assert.equal(count, 0);
	await appendFile(file, '\n');
	await assert.rejects(reader.poll(() => { count++; }, () => {}), /Session log line 1/);
	assert.equal(count, 0);
});
