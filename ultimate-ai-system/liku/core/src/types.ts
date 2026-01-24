export type StreamEvent = 'analysis' | 'hypothesis' | 'file_change' | 'checkpoint' | 'verify';

export interface FileChangePayload { path: string; content: string; }
export interface AnalysisPayload { type: string; content: string; }
export interface HypothesisPayload { confidence?: number; content: string; }
export interface CheckpointState {
  timestamp: string;
  context: string;
  pendingTasks: string[];
  modifiedFiles: string[];
  metadata?: Record<string, unknown>;
}
export interface ProvenanceEntry {
  timestamp: string;
  action: 'create' | 'modify' | 'delete' | 'verify';
  path: string;
  agent: string;
  checksum?: string;
  parentChecksum?: string;
  reason?: string;
}
