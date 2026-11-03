import {open} from 'node:fs/promises';
import type {FileHandle} from 'node:fs/promises';

export interface SessionEvent {
	id: string;
	type: string;
	timestamp: string;
	agentId?: string;
	data: Record<string, unknown>;
}

export interface RecordLocation {
	offset: number;
	length: number;
	generation: number;
}

export interface EventRecord {
	event: SessionEvent;
	location?: RecordLocation;
}

type TextField = 'content' | 'summary' | 'result' | 'error' | 'prompt';

export interface ContentRef {
	eventId: string;
	field: TextField;
	location?: RecordLocation;
	inline?: string;
}

export function isObject(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function optionalString(data: Record<string, unknown>, key: string): string | undefined {
	const value = data[key];
	if (value === undefined || value === null) return undefined;
	if (typeof value !== 'string') throw new Error(`Expected string field "${key}"`);
	return value;
}

export function requiredString(data: Record<string, unknown>, key: string): string {
	const value = optionalString(data, key);
	if (!value) throw new Error(`Missing string field "${key}"`);
	return value;
}

function decode(line: Buffer): SessionEvent {
	const parsed: unknown = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(line));
	if (!isObject(parsed) || !isObject(parsed.data)) throw new Error('Invalid event envelope');
	const timestamp = requiredString(parsed, 'timestamp');
	if (Number.isNaN(Date.parse(timestamp))) throw new Error('Invalid event timestamp');
	return {
		id: requiredString(parsed, 'id'),
		type: requiredString(parsed, 'type'),
		timestamp,
		agentId: optionalString(parsed, 'agentId'),
		data: parsed.data,
	};
}

function textAt(event: SessionEvent, field: TextField): string | undefined {
	if (field === 'prompt') {
		const args = event.data.arguments;
		return isObject(args) && typeof args.prompt === 'string' ? args.prompt : undefined;
	}
	if (field === 'result') {
		if (!isObject(event.data.result)) return undefined;
		return optionalString(event.data.result, 'detailedContent')
			?? optionalString(event.data.result, 'content');
	}
	if (field === 'error' && isObject(event.data.error)) {
		return optionalString(event.data.error, 'message');
	}
	return optionalString(event.data, field);
}

export function capture(record: EventRecord, field: TextField): ContentRef | undefined {
	const text = textAt(record.event, field);
	if (!text) return undefined;
	return {
		eventId: record.event.id,
		field,
		location: record.location,
		inline: record.location ? undefined : text,
	};
}

export class JsonlReader {
	private identity?: string;
	private offset = 0;
	private pending: Buffer = Buffer.alloc(0);
	private pendingOffset = 0;
	private line = 0;
	private anchor: Buffer = Buffer.alloc(0);
	private generation = 0;

	constructor(readonly file: string) {}

	async poll(accept: (record: EventRecord) => void, reset: () => void): Promise<boolean> {
		const handle = await open(this.file, 'r');
		try {
			const stat = await handle.stat();
			if (!stat.isFile()) throw new Error('Session log is not a regular file');
			const identity = `${stat.dev}:${stat.ino}`;
			let replaced = this.identity !== undefined && this.identity !== identity;
			if (stat.size < this.offset) replaced = true;
			if (!replaced && this.anchor.length) {
				const previous = await this.readBytes(handle, this.offset - this.anchor.length, this.anchor.length);
				replaced = !previous.equals(this.anchor);
			}
			if (replaced) {
				this.offset = 0;
				this.pending = Buffer.alloc(0);
				this.pendingOffset = 0;
				this.line = 0;
				this.anchor = Buffer.alloc(0);
				this.generation++;
				reset();
			}
			this.identity = identity;
			const changed = replaced || stat.size > this.offset;
			while (this.offset < stat.size) {
				const chunk = await this.readBytes(handle, this.offset, Math.min(64 * 1024, stat.size - this.offset));
				if (!chunk.length) throw new Error('Session log changed during reading; reopen the viewer');
				const buffer = Buffer.concat([this.pending, chunk]);
				let cursor = 0;
				let end: number;
				while ((end = buffer.indexOf(10, cursor)) !== -1) {
					const line = buffer.subarray(cursor, end);
					this.line++;
					if (line.toString('utf8').trim()) {
						try {
							accept({
								event: decode(line),
								location: {
									offset: this.pendingOffset + cursor,
									length: line.length,
									generation: this.generation,
								},
							});
						} catch (error) {
							throw new Error(`Session log line ${this.line}: ${errorMessage(error)}`, {cause: error});
						}
					}
					cursor = end + 1;
				}
				this.pending = buffer.subarray(cursor);
				this.pendingOffset += cursor;
				this.offset += chunk.length;
			}
			this.anchor = await this.readBytes(handle, Math.max(0, this.offset - 64), Math.min(64, this.offset));
			return changed;
		} finally {
			await handle.close();
		}
	}

	async readContent(ref: ContentRef): Promise<string> {
		if (ref.inline !== undefined) return ref.inline;
		if (!ref.location || ref.location.generation !== this.generation) {
			throw new Error('Result belongs to an outdated session-log generation');
		}
		const handle = await open(this.file, 'r');
		try {
			const bytes = await this.readBytes(handle, ref.location.offset, ref.location.length);
			const event = decode(bytes);
			if (event.id !== ref.eventId) throw new Error('Session log changed; result is no longer at this location');
			const text = textAt(event, ref.field);
			if (text === undefined) throw new Error('Recorded text is unavailable');
			return text;
		} finally {
			await handle.close();
		}
	}

	private async readBytes(handle: FileHandle, position: number, length: number): Promise<Buffer> {
		const buffer = Buffer.alloc(length);
		let total = 0;
		while (total < length) {
			const {bytesRead} = await handle.read(buffer, total, length - total, position + total);
			if (!bytesRead) break;
			total += bytesRead;
		}
		return buffer.subarray(0, total);
	}
}

export function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
