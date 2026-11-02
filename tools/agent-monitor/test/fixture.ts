import type {EventRecord} from '../src/events.js';

let sequence = 0;

export function record(type: string, data: Record<string, unknown>, agentId?: string): EventRecord {
	sequence++;
	return {event: {
		id: `event-${sequence}`, type, data, agentId,
		timestamp: new Date(Date.UTC(2026, 0, 1, 0, 0, sequence)).toISOString(),
	}};
}

export function start(callId: string, agentId: string, parentId?: string): EventRecord {
	return record('subagent.started', {
		toolCallId: callId, agentName: 'general-purpose', agentDisplayName: agentId,
		agentDescription: `Task for ${agentId}`, parentId,
		executionMode: parentId ? 'sync' : 'background',
	}, agentId);
}

export function fixture(): EventRecord[] {
	return [
		record('session.start', {copilotVersion: '1.0.104', sessionId: 'synthetic-session', selectedModel: 'synthetic-model'}),
		record('assistant.turn_start', {turnId: '0'}),
		record('tool.execution_start', {toolCallId: 'parent-call', toolName: 'task', arguments: {mode: 'background', prompt: 'Parent prompt'}}),
		start('parent-call', 'parent'),
		record('tool.execution_complete', {toolCallId: 'parent-call', success: true, result: {content: 'Started in background'}}),
		record('tool.execution_start', {toolCallId: 'control-call', toolName: 'task', arguments: {mode: 'background'}}),
		start('control-call', 'control'),
		record('assistant.message', {content: 'Control result', toolRequests: []}, 'control'),
		record('subagent.completed', {toolCallId: 'control-call'}, 'control'),
		record('tool.execution_start', {toolCallId: 'child-call', toolName: 'task', arguments: {mode: 'sync'}}, 'parent'),
		start('child-call', 'child', 'parent'),
		record('assistant.message', {content: 'Child result', toolRequests: []}, 'child'),
		record('assistant.turn_end', {turnId: '0'}, 'child'),
		record('subagent.completed', {toolCallId: 'child-call'}, 'child'),
		record('tool.execution_complete', {toolCallId: 'child-call', success: true, result: {content: 'Child result'}}, 'parent'),
		record('assistant.message', {content: 'Parent result', toolRequests: []}, 'parent'),
		record('subagent.completed', {toolCallId: 'parent-call'}, 'parent'),
		record('assistant.turn_end', {turnId: '0'}),
		record('user.message', {content: 'Follow-up task', delivery: 'idle'}, 'control'),
		record('assistant.turn_start', {turnId: '0'}, 'control'),
		record('assistant.message', {content: 'Follow-up result', toolRequests: []}, 'control'),
		record('assistant.turn_end', {turnId: '0'}, 'control'),
	];
}
