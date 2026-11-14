import {capture, isObject, optionalString, requiredString} from './events.js';
import type {ContentRef, EventRecord, SessionEvent} from './events.js';

export type RunStatus = 'unknown' | 'running' | 'completed' | 'failed' | 'cancelled' | 'replied';
export type Filter = 'all' | 'active' | 'finished';

export interface ToolActivity {
	id: string;
	name: string;
	status: 'running' | 'succeeded' | 'failed';
	startedAt: string;
	endedAt?: string;
	detail?: string;
}

export interface AgentRun {
	id: string;
	agentId: string;
	name: string;
	task: string;
	agentType?: string;
	mode?: 'sync' | 'background';
	parentRunId?: string | null;
	parentAgentId?: string;
	previousRunId?: string;
	launchCallId?: string;
	status: RunStatus;
	startedAt?: string;
	endedAt?: string;
	lastActivity: string;
	model?: string;
	prompt?: ContentRef;
	result?: ContentRef;
	latest?: ContentRef;
	error?: ContentRef;
	tools: ToolActivity[];
	hasActivity: boolean;
}

interface ToolCall {
	ownerAgentId?: string;
	ownerRunId: string | null;
	name: string;
	background: boolean;
	targetAgentId?: string;
	wait: boolean;
	complete: boolean;
	startedAt: string;
	completedAt?: string;
	prompt?: ContentRef;
	activity?: ToolActivity;
}

export interface WaitEdge {
	callId: string;
	fromRunId: string | null;
	toAgentId: string;
	toRunId?: string;
	kind: 'sync-call' | 'wait';
	start: string;
	end?: string;
}

export interface MainTurn {
	start: string;
	end?: string;
}

const MAIN_TOOL_LIMIT = 200;
/** CLI versions whose session logs this model was checked against. */
const TESTED_VERSIONS = ['1.0.104', '1.0.105'];
const DETAIL_KEYS = ['path', 'pattern', 'command', 'query', 'url', 'name', 'agent_id', 'description'];

export const isFinished = (run: AgentRun): boolean =>
	run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled' || run.status === 'replied';

const isOpen = (run: AgentRun): boolean => !isFinished(run) || run.status === 'replied';

/** Phased models also emit progress ("commentary") messages; only phase-less or final-answer replies count as results. */
const isFinalAnswer = (d: Record<string, unknown>): boolean =>
	(d.phase === undefined || d.phase === 'final_answer') && (!Array.isArray(d.toolRequests) || d.toolRequests.length === 0);

export class AgentModel {
	readonly runs = new Map<string, AgentRun>();
	readonly warnings = new Set<string>();
	readonly waits = new Map<string, WaitEdge>();
	readonly waitLog = new Map<string, WaitEdge>();
	readonly mainTurns: MainTurn[] = [];
	readonly mainTools: ToolActivity[] = [];
	mainToolCount = 0;
	/** Counts `reset()` calls, so views can tell a rebuilt source from the one they last displayed. */
	epoch = 0;
	version?: string;
	sessionId?: string;
	sessionModel?: string;
	sessionStart?: string;
	sessionEnded?: string;
	lastEventAt?: string;
	mainPrompt?: ContentRef;
	mainLatest?: ContentRef;
	private readonly latest = new Map<string, AgentRun>();
	private readonly launches = new Map<string, AgentRun>();
	private readonly calls = new Map<string, ToolCall>();
	private readonly seen = new Set<string>();
	private readonly repliedThisTurn = new Set<string>();

	reset(): void {
		this.epoch++;
		this.runs.clear();
		this.warnings.clear();
		this.waits.clear();
		this.waitLog.clear();
		this.mainTurns.length = 0;
		this.mainTools.length = 0;
		this.mainToolCount = 0;
		this.latest.clear();
		this.launches.clear();
		this.calls.clear();
		this.seen.clear();
		this.repliedThisTurn.clear();
		this.version = undefined;
		this.sessionId = undefined;
		this.sessionModel = undefined;
		this.sessionStart = undefined;
		this.sessionEnded = undefined;
		this.lastEventAt = undefined;
		this.mainPrompt = undefined;
		this.mainLatest = undefined;
	}

	apply(record: EventRecord): void {
		const e = record.event;
		if (this.seen.has(e.id)) return;
		this.seen.add(e.id);
		if (!this.lastEventAt || Date.parse(e.timestamp) > Date.parse(this.lastEventAt)) this.lastEventAt = e.timestamp;
		this.sessionStart ??= e.timestamp;
		const d = e.data;
		switch (e.type) {
			case 'session.start':
				this.version = optionalString(d, 'copilotVersion');
				this.sessionId = optionalString(d, 'sessionId');
				this.sessionModel = optionalString(d, 'selectedModel');
				this.sessionStart = e.timestamp;
				if (!TESTED_VERSIONS.includes(this.version ?? '')) this.warnings.add(`Untested CLI event format: ${this.version ?? 'unknown'}`);
				break;
			case 'session.shutdown': {
				this.sessionEnded = e.timestamp;
				// Work after a later resume starts a new span instead of painting the offline gap as activity.
				const last = this.mainTurns.at(-1);
				if (last && !last.end) last.end = e.timestamp;
				break;
			}
			case 'session.resume':
				this.sessionEnded = undefined;
				break;
			case 'subagent.started':
				this.start(e);
				break;
			case 'subagent.completed':
			case 'subagent.failed': {
				const launch = this.forLaunch(e, requiredString(d, 'toolCallId'));
				// Lifecycle events name the original launch call even when a later turn of the same agent is the one
				// still open. Recorded outcomes are kept; only the inferred 'replied' state can still be settled.
				const run = [this.latest.get(launch.agentId), launch].find(candidate => candidate && isOpen(candidate));
				if (!run) break;
				run.status = e.type === 'subagent.failed' ? 'failed' : d.cancelled === true ? 'cancelled' : 'completed';
				run.endedAt = e.timestamp;
				run.lastActivity = e.timestamp;
				run.model = optionalString(d, 'model') ?? run.model;
				if (e.type === 'subagent.failed') run.error = capture(record, 'error');
				break;
			}
			case 'user.message':
				if (e.agentId) {
					const current = this.latest.get(e.agentId);
					if (!current || isFinished(current) || (current.hasActivity && d.delivery === 'idle')) {
						// An idle delivery means the previous execution's turn is over; its outcome was not recorded.
						if (current && !isFinished(current)) current.status = 'unknown';
						const run = this.create(e, `message:${e.id}`, e.agentId);
						run.name = current?.name ?? run.name;
						run.agentType = current?.agentType;
						run.parentRunId = current?.parentRunId;
						run.parentAgentId = current?.parentAgentId;
						run.previousRunId = current?.id;
						run.model = current?.model;
						run.task = firstLine(optionalString(d, 'content')) ?? 'Follow-up input not recorded';
						run.prompt = capture(record, 'content');
						run.startedAt = e.timestamp;
						run.status = 'running';
					}
				} else this.mainPrompt = capture(record, 'content') ?? this.mainPrompt;
				break;
			case 'assistant.turn_start':
				if (e.agentId) {
					const run = this.current(e);
					run.hasActivity = true;
					run.lastActivity = e.timestamp;
					this.repliedThisTurn.delete(run.id);
					if (run.status === 'replied') run.endedAt = undefined;
					if (isOpen(run)) run.status = 'running';
				} else {
					const last = this.mainTurns.at(-1);
					if (!last || last.end) this.mainTurns.push({start: e.timestamp});
				}
				break;
			case 'assistant.message': {
				const content = capture(record, 'content');
				if (e.agentId) {
					const run = this.current(e);
					run.hasActivity = true;
					run.lastActivity = e.timestamp;
					run.latest = content ?? run.latest;
					if (content && isFinalAnswer(d)) {
						run.result = content;
						this.repliedThisTurn.add(run.id);
					}
				} else {
					this.mainLatest = content ?? this.mainLatest;
					this.sessionModel = optionalString(d, 'model') ?? this.sessionModel;
				}
				break;
			}
			case 'assistant.turn_end':
				if (e.agentId) {
					const run = this.current(e);
					run.lastActivity = e.timestamp;
					if (run.status === 'running' && this.repliedThisTurn.has(run.id) && !run.tools.some(tool => tool.status === 'running')) {
						run.status = 'replied';
						run.endedAt = e.timestamp;
					}
				} else {
					const last = this.mainTurns.at(-1);
					if (last && !last.end) last.end = e.timestamp;
				}
				break;
			case 'session.task_complete':
				if (e.agentId) {
					const run = this.current(e);
					run.lastActivity = e.timestamp;
					// Rejected ("continue") or blocked completion requests leave the agent's work open.
					if (d.outcome === 'completed' || (d.outcome === undefined && d.success !== false)) {
						run.result = capture(record, 'summary') ?? run.result;
						run.status = 'completed';
						run.endedAt = e.timestamp;
					}
				}
				break;
			case 'tool.execution_start':
				this.toolStart(record);
				break;
			case 'tool.execution_complete':
				this.toolComplete(record);
				break;
			case 'subagent.configured':
			case 'subagent.selected':
			case 'subagent.deselected':
				break;
			default:
				if (e.type.startsWith('subagent.')) this.warnings.add(`Unsupported agent event: ${e.type}`);
		}
	}

	status(run: AgentRun): string {
		if (run.status === 'running' && [...this.waits.values()].some(edge => edge.fromRunId === run.id)) return 'waiting';
		return run.status;
	}

	mainStatus(): 'running' | 'waiting' | 'idle' | 'ended' {
		if (this.sessionEnded) return 'ended';
		if ([...this.waits.values()].some(edge => edge.fromRunId === null)) return 'waiting';
		const last = this.mainTurns.at(-1);
		return !last || last.end ? 'idle' : 'running';
	}

	private create(e: SessionEvent, id: string, agentId: string): AgentRun {
		const run: AgentRun = {
			id, agentId, name: agentId, task: 'Task not recorded', status: 'unknown',
			lastActivity: e.timestamp, tools: [], hasActivity: false,
		};
		this.runs.set(id, run);
		// Blocking reads recorded before any execution of this agent was known waited on its first execution.
		if (!this.latest.has(agentId)) {
			for (const edge of this.waitLog.values()) if (edge.toAgentId === agentId && !edge.toRunId) edge.toRunId = id;
		}
		this.latest.set(agentId, run);
		return run;
	}

	private current(e: SessionEvent): AgentRun {
		const agentId = requiredString(eAsObject(e), 'agentId');
		return this.latest.get(agentId) ?? this.create(e, `unattributed:${agentId}`, agentId);
	}

	private forLaunch(e: SessionEvent, callId: string): AgentRun {
		let run = this.launches.get(callId);
		if (run && e.agentId && run.agentId !== e.agentId) {
			throw new Error(`Conflicting agent ID for launch call "${callId}"`);
		}
		if (!run) {
			const agentId = requiredString(eAsObject(e), 'agentId');
			const orphan = this.latest.get(agentId);
			run = orphan && !orphan.launchCallId && orphan.id.startsWith('unattributed:')
				? orphan : this.create(e, `launch:${callId}`, agentId);
			this.launches.set(callId, run);
		}
		run.launchCallId = callId;
		return run;
	}

	private start(e: SessionEvent): void {
		const callId = requiredString(e.data, 'toolCallId');
		requiredString(eAsObject(e), 'agentId');
		const run = this.forLaunch(e, callId);
		run.name = requiredString(e.data, 'agentDisplayName');
		run.task = optionalString(e.data, 'agentDescription') ?? 'Task not recorded';
		run.agentType = optionalString(e.data, 'agentName') ?? run.agentType;
		if (e.data.executionMode === 'sync' || e.data.executionMode === 'background') run.mode = e.data.executionMode;
		run.model = optionalString(e.data, 'model') ?? run.model;
		run.startedAt = e.timestamp;
		if (run.status === 'unknown') run.status = 'running';
		run.parentAgentId = optionalString(e.data, 'parentId');
		const call = this.calls.get(callId);
		if (call) this.link(run, call, e.data.executionMode === 'sync');
		else if (run.parentAgentId) run.parentRunId = this.latest.get(run.parentAgentId)?.id;
	}

	private link(run: AgentRun, call: ToolCall, synchronous: boolean): void {
		if (run.parentAgentId && run.parentAgentId !== call.ownerAgentId) {
			run.parentRunId = undefined;
			this.warnings.add(`Conflicting parent evidence for agent ${run.agentId}`);
			return;
		}
		run.parentRunId = call.ownerRunId;
		run.parentAgentId = call.ownerAgentId;
		run.mode ??= synchronous ? 'sync' : 'background';
		run.prompt ??= call.prompt;
		if (synchronous) {
			const edge: WaitEdge = {
				callId: run.launchCallId!, fromRunId: call.ownerRunId, toAgentId: run.agentId, toRunId: run.id,
				kind: 'sync-call', start: call.startedAt, end: call.completedAt,
			};
			this.waitLog.set(edge.callId, edge);
			if (!call.complete) this.waits.set(edge.callId, edge);
		}
	}

	private toolStart(record: EventRecord): void {
		const e = record.event;
		const name = requiredString(e.data, 'toolName');
		const id = requiredString(e.data, 'toolCallId');
		const args = isObject(e.data.arguments) ? e.data.arguments : {};
		const owner = e.agentId ? this.current(e) : undefined;
		const call: ToolCall = {
			ownerAgentId: e.agentId, ownerRunId: owner?.id ?? null,
			name, background: args.mode === 'background',
			targetAgentId: name === 'read_agent' && typeof args.agent_id === 'string' ? args.agent_id : undefined,
			wait: args.wait === true, complete: false,
			startedAt: e.timestamp, prompt: name === 'task' ? capture(record, 'prompt') : undefined,
		};
		call.activity = {id, name, status: 'running', startedAt: e.timestamp, detail: toolDetail(args)};
		if (owner) {
			owner.hasActivity = true;
			owner.lastActivity = e.timestamp;
			owner.tools.push(call.activity);
		} else {
			this.mainToolCount++;
			this.mainTools.push(call.activity);
			if (this.mainTools.length > MAIN_TOOL_LIMIT) this.mainTools.shift();
		}
		this.calls.set(id, call);
		const run = this.launches.get(id);
		if (run && name === 'task') this.link(run, call, !call.background);
		if (name === 'read_agent' && call.wait && call.targetAgentId) {
			const edge: WaitEdge = {
				callId: id, fromRunId: call.ownerRunId, toAgentId: call.targetAgentId,
				toRunId: this.latest.get(call.targetAgentId)?.id, kind: 'wait', start: e.timestamp,
			};
			this.waits.set(id, edge);
			this.waitLog.set(id, edge);
		}
	}

	private toolComplete(record: EventRecord): void {
		const d = record.event.data;
		const id = requiredString(d, 'toolCallId');
		const call = this.calls.get(id);
		if (!call) return;
		if (typeof d.success !== 'boolean') throw new Error('Tool completion lacks boolean success');
		call.complete = true;
		call.completedAt = record.event.timestamp;
		this.waits.delete(id);
		const edge = this.waitLog.get(id);
		if (edge) edge.end = record.event.timestamp;
		if (call.activity) {
			call.activity.status = d.success ? 'succeeded' : 'failed';
			call.activity.endedAt = record.event.timestamp;
		}
		// Only task calls are looked up again (by a late subagent.started); drop the rest.
		if (call.name !== 'task') this.calls.delete(id);
	}
}

function eAsObject(e: SessionEvent): Record<string, unknown> {
	return {agentId: e.agentId};
}

function firstLine(text: string | undefined): string | undefined {
	const line = text?.split(/\r?\n/).find(part => part.trim());
	return line?.trim();
}

function toolDetail(args: Record<string, unknown>): string | undefined {
	for (const key of DETAIL_KEYS) {
		const value = args[key];
		if (typeof value === 'string' && value.trim()) return firstLine(value);
	}
	return undefined;
}
