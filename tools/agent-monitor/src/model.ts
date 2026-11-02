import {capture, isObject, optionalString, requiredString} from './events.js';
import type {ContentRef, EventRecord, SessionEvent} from './events.js';

export type RunStatus = 'unknown' | 'running' | 'completed' | 'failed' | 'replied';
export type Filter = 'all' | 'active' | 'finished';

export interface ToolActivity {
	id: string;
	name: string;
	status: 'running' | 'succeeded' | 'failed';
	output?: ContentRef;
}

export interface AgentRun {
	id: string;
	agentId: string;
	name: string;
	task: string;
	parentRunId?: string | null;
	parentAgentId?: string;
	launchCallId?: string;
	status: RunStatus;
	startedAt?: string;
	endedAt?: string;
	lastActivity: string;
	durationMs?: number;
	model?: string;
	result?: ContentRef;
	error?: ContentRef;
	tools: ToolActivity[];
	hasActivity: boolean;
}

interface ToolCall {
	ownerAgentId?: string;
	ownerRunId: string | null;
	name: string;
	task?: string;
	background: boolean;
	targetAgentId?: string;
	wait: boolean;
	complete: boolean;
	activity?: ToolActivity;
}

export interface WaitEdge {
	callId: string;
	fromRunId: string | null;
	toAgentId: string;
	kind: 'sync-call' | 'wait';
}

export interface TreeRow {
	run: AgentRun;
	depth: number;
	hasChildren: boolean;
	unresolvedParent: boolean;
}

export const isFinished = (run: AgentRun): boolean =>
	run.status === 'completed' || run.status === 'failed' || run.status === 'replied';

export class AgentModel {
	readonly runs = new Map<string, AgentRun>();
	readonly warnings = new Set<string>();
	readonly waits = new Map<string, WaitEdge>();
	version?: string;
	sessionId?: string;
	private readonly latest = new Map<string, AgentRun>();
	private readonly launches = new Map<string, AgentRun>();
	private readonly calls = new Map<string, ToolCall>();
	private readonly seen = new Set<string>();

	reset(): void {
		this.runs.clear();
		this.warnings.clear();
		this.waits.clear();
		this.latest.clear();
		this.launches.clear();
		this.calls.clear();
		this.seen.clear();
		this.version = undefined;
		this.sessionId = undefined;
	}

	apply(record: EventRecord): void {
		const e = record.event;
		if (this.seen.has(e.id)) return;
		this.seen.add(e.id);
		const d = e.data;
		switch (e.type) {
			case 'session.start':
				this.version = optionalString(d, 'copilotVersion');
				this.sessionId = optionalString(d, 'sessionId');
				if (this.version !== '1.0.104') this.warnings.add(`Untested CLI event format: ${this.version ?? 'unknown'}`);
				break;
			case 'subagent.started':
				this.start(e);
				break;
			case 'subagent.completed':
			case 'subagent.failed': {
				const callId = requiredString(d, 'toolCallId');
				const run = this.forLaunch(e, callId);
				run.status = e.type === 'subagent.completed' ? 'completed' : 'failed';
				run.endedAt = e.timestamp;
				run.lastActivity = e.timestamp;
				run.model = optionalString(d, 'model') ?? run.model;
				if (typeof d.durationMs === 'number' && Number.isFinite(d.durationMs) && d.durationMs >= 0) {
					run.durationMs = d.durationMs;
				}
				if (e.type === 'subagent.failed') run.error = capture(record, 'error');
				break;
			}
			case 'user.message':
				if (e.agentId) {
					const current = this.latest.get(e.agentId);
					if (!current || isFinished(current) || (current.hasActivity && d.delivery === 'idle')) {
						const run = this.create(e, `message:${e.id}`, e.agentId);
						run.name = current?.name ?? run.name;
						run.parentRunId = current?.parentRunId;
						run.parentAgentId = current?.parentAgentId;
						run.model = current?.model;
						run.task = optionalString(d, 'content') ?? 'Follow-up input not recorded';
						run.startedAt = e.timestamp;
						run.status = 'running';
					}
				}
				break;
			case 'assistant.turn_start':
				if (e.agentId) {
					const run = this.current(e);
					run.hasActivity = true;
					run.lastActivity = e.timestamp;
					if (!isFinished(run) || run.status === 'replied') run.status = 'running';
				}
				break;
			case 'assistant.message':
				if (e.agentId) {
					const run = this.current(e);
					run.hasActivity = true;
					run.lastActivity = e.timestamp;
					const requests = d.toolRequests;
					if (d.phase !== 'thinking' && (!Array.isArray(requests) || requests.length === 0)) {
						run.result = capture(record, 'content') ?? run.result;
					}
				}
				break;
			case 'assistant.turn_end':
				if (e.agentId) {
					const run = this.current(e);
					run.lastActivity = e.timestamp;
					if (run.status === 'running' && run.result && !run.tools.some(tool => tool.status === 'running')) {
						run.status = 'replied';
						run.endedAt = e.timestamp;
					}
				}
				break;
			case 'session.task_complete':
				if (e.agentId) {
					const run = this.current(e);
					run.result = capture(record, 'summary') ?? run.result;
					run.status = 'completed';
					run.endedAt = e.timestamp;
					run.lastActivity = e.timestamp;
				}
				break;
			case 'tool.execution_start':
				this.toolStart(e);
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

	tree(filter: Filter, collapsed: ReadonlySet<string>): TreeRow[] {
		const included = new Set<string>();
		for (const run of this.runs.values()) {
			if (filter === 'all' || (filter === 'finished' ? isFinished(run) : !isFinished(run))) {
				let node: AgentRun | undefined = run;
				const ancestors = new Set<string>();
				while (node && !ancestors.has(node.id)) {
					ancestors.add(node.id);
					included.add(node.id);
					node = node.parentRunId ? this.runs.get(node.parentRunId) : undefined;
				}
			}
		}
		const children = new Map<string, AgentRun[]>();
		const roots: AgentRun[] = [];
		for (const run of this.runs.values()) {
			if (!included.has(run.id)) continue;
			if (run.parentRunId && this.runs.has(run.parentRunId)) {
				const list = children.get(run.parentRunId) ?? [];
				list.push(run);
				children.set(run.parentRunId, list);
			} else roots.push(run);
		}
		const rows: TreeRow[] = [];
		const visited = new Set<string>();
		const visit = (run: AgentRun, depth: number, unresolved = false): void => {
			if (visited.has(run.id)) return;
			visited.add(run.id);
			const descendants = children.get(run.id) ?? [];
			rows.push({
				run, depth, hasChildren: descendants.length > 0,
				unresolvedParent: unresolved || run.parentRunId === undefined
					|| Boolean(run.parentRunId && !this.runs.has(run.parentRunId)),
			});
			if (!collapsed.has(run.id)) for (const child of descendants) visit(child, depth + 1);
		};
		for (const root of roots) visit(root, 0);
		const reachable = new Set<string>();
		const mark = (id: string): void => {
			if (reachable.has(id)) return;
			reachable.add(id);
			for (const child of children.get(id) ?? []) mark(child.id);
		};
		for (const root of roots) mark(root.id);
		for (const run of this.runs.values()) {
			if (included.has(run.id) && !reachable.has(run.id) && !visited.has(run.id)) visit(run, 0, true);
		}
		return rows;
	}

	private create(e: SessionEvent, id: string, agentId: string): AgentRun {
		const run: AgentRun = {
			id, agentId, name: agentId, task: 'Task not recorded', status: 'unknown',
			lastActivity: e.timestamp, tools: [], hasActivity: false,
		};
		this.runs.set(id, run);
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
		if (synchronous && !call.complete) {
			this.waits.set(run.launchCallId!, {
				callId: run.launchCallId!, fromRunId: call.ownerRunId, toAgentId: run.agentId, kind: 'sync-call',
			});
		}
	}

	private toolStart(e: SessionEvent): void {
		const name = requiredString(e.data, 'toolName');
		const relevant = e.agentId || name === 'task' || name === 'read_agent';
		if (!relevant) return;
		const id = requiredString(e.data, 'toolCallId');
		const args = isObject(e.data.arguments) ? e.data.arguments : {};
		const owner = e.agentId ? this.current(e) : undefined;
		const call: ToolCall = {
			ownerAgentId: e.agentId, ownerRunId: owner?.id ?? null,
			name, task: optionalString(args, 'description'), background: args.mode === 'background',
			targetAgentId: optionalString(args, 'agent_id'), wait: args.wait === true, complete: false,
		};
		if (owner) {
			owner.hasActivity = true;
			owner.lastActivity = e.timestamp;
			call.activity = {id, name, status: 'running'};
			owner.tools.push(call.activity);
		}
		this.calls.set(id, call);
		const run = this.launches.get(id);
		if (run && name === 'task') this.link(run, call, !call.background);
		if (name === 'read_agent' && call.wait && call.targetAgentId) {
			this.waits.set(id, {
				callId: id, fromRunId: call.ownerRunId, toAgentId: call.targetAgentId, kind: 'wait',
			});
		}
	}

	private toolComplete(record: EventRecord): void {
		const d = record.event.data;
		const id = requiredString(d, 'toolCallId');
		const call = this.calls.get(id);
		if (!call) return;
		if (typeof d.success !== 'boolean') throw new Error('Tool completion lacks boolean success');
		call.complete = true;
		this.waits.delete(id);
		if (call.activity) {
			call.activity.status = d.success ? 'succeeded' : 'failed';
			call.activity.output = capture(record, d.success ? 'result' : 'error') ?? capture(record, 'result');
		}
	}
}

function eAsObject(e: SessionEvent): Record<string, unknown> {
	return {agentId: e.agentId};
}
