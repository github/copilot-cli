/**
 * Agent State Manager
 * 
 * Manages persistent state across agent sessions.
 * State is stored in .github/agent_state.json for visibility and debugging.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { nowIso, nowFilenameSafe } = require('../utils/time');
const { PythonBridge } = require('../python-bridge');

class AgentStateManager {
  constructor(statePath = null) {
    this.statePath = statePath || path.join(process.cwd(), '.github', 'agent_state.json');
    this.state = this._loadState();
  }

  _loadState() {
    try {
      if (fs.existsSync(this.statePath)) {
        const content = fs.readFileSync(this.statePath, 'utf-8');
        const state = JSON.parse(content);
        return this._migrateState(state);
      }
    } catch (error) {
      console.warn(`[StateManager] Failed to load state: ${error.message}`);
    }
    
    return {
      version: '1.1.0',
      schemaVersion: 2,
      created: nowIso(),
      queue: [],
      inProgress: [],
      completed: [],
      failed: [],
      agents: {},
      sessions: [],
      modelMetadata: {
        modelId: 'unknown',
        provider: 'unknown',
        modelVersion: null,
        capabilities: []
      },
      sessionContext: {
        initiatedBy: null,
        purpose: null,
        parentSessionId: null
      },
      checkpoints: [],
      sessionGraph: null,
      generations: [],
      lastSync: null
    };
  }

  _migrateState(state) {
    if (!state.schemaVersion || state.schemaVersion < 2) {
      state.modelMetadata = state.modelMetadata || {
        modelId: 'unknown',
        provider: 'unknown',
        modelVersion: null,
        capabilities: []
      };
      state.sessionContext = state.sessionContext || {
        initiatedBy: null,
        purpose: null,
        parentSessionId: null
      };
      state.checkpoints = state.checkpoints || [];
      state.schemaVersion = 2;
      state.version = '1.1.0';
    }
    if (!state.schemaVersion || state.schemaVersion < 3) {
      state.sessionGraph = state.sessionGraph || null;
      state.generations = state.generations || [];
      state.lastSync = state.lastSync || null;
      state.schemaVersion = 3;
      state.version = '1.2.0';
    }
    return state;
  }

  _getStateFilePath(sessionId = null, modelId = null) {
    const timestamp = nowFilenameSafe();
    const modelSuffix = modelId ? `-${modelId}` : '';
    const sessionSuffix = sessionId ? `-${sessionId.slice(-8)}` : '';
    return path.join(
      path.dirname(this.statePath),
      `state-${timestamp}${modelSuffix}${sessionSuffix}.json`
    );
  }

  _saveState() {
    try {
      const dir = path.dirname(this.statePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      this.state.lastModified = nowIso();
      fs.writeFileSync(this.statePath, JSON.stringify(this.state, null, 2));
    } catch (error) {
      console.error(`[StateManager] Failed to save state: ${error.message}`);
    }
  }

  // ===== Queue Management =====
  
  enqueue(task) {
    const taskEntry = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...task,
      status: 'queued',
      createdAt: nowIso(),
      attempts: 0
    };
    
    this.state.queue.push(taskEntry);
    this._saveState();
    return taskEntry.id;
  }

  dequeue() {
    const task = this.state.queue.shift();
    if (task) {
      task.status = 'in-progress';
      task.startedAt = nowIso();
      this.state.inProgress.push(task);
      this._saveState();
    }
    return task;
  }

  // ===== Task Lifecycle =====

  startTask(taskId, agentId) {
    const task = this._findTask(taskId, 'queue');
    if (task) {
      this._moveTask(taskId, 'queue', 'inProgress');
      task.status = 'in-progress';
      task.agentId = agentId;
      task.startedAt = nowIso();
      this._saveState();
    }
    return task;
  }

  completeTask(taskId, result) {
    const task = this._findTask(taskId, 'inProgress');
    if (task) {
      this._moveTask(taskId, 'inProgress', 'completed');
      task.status = 'completed';
      task.completedAt = nowIso();
      task.result = result;
      this._saveState();
    }
    return task;
  }

  failTask(taskId, error) {
    const task = this._findTask(taskId, 'inProgress');
    if (task) {
      task.attempts++;
      
      if (task.attempts >= 3) {
        this._moveTask(taskId, 'inProgress', 'failed');
        task.status = 'failed';
        task.error = error;
        task.failedAt = nowIso();
      } else {
        // Return to queue for retry
        this._moveTask(taskId, 'inProgress', 'queue');
        task.status = 'queued';
        task.lastError = error;
      }
      this._saveState();
    }
    return task;
  }

  // ===== Agent Registration =====

  registerAgent(agentId, agentType, capabilities) {
    this.state.agents[agentId] = {
      type: agentType,
      capabilities,
      registeredAt: nowIso(),
      lastActive: nowIso(),
      tasksCompleted: 0,
      tasksFailed: 0
    };
    this._saveState();
  }

  updateAgentActivity(agentId) {
    if (this.state.agents[agentId]) {
      this.state.agents[agentId].lastActive = nowIso();
      this._saveState();
    }
  }

  setModelMetadata(metadata) {
    this.state.modelMetadata = {
      ...this.state.modelMetadata,
      ...metadata,
      lastUpdated: nowIso()
    };
    this._saveState();
  }

  // ===== Session Management =====

  startSession(sessionId, metadata = {}) {
    const session = {
      id: sessionId || `session-${Date.now()}`,
      startedAt: nowIso(),
      status: 'active',
      metadata,
      handoffs: [],
      tasks: []
    };
    
    this.state.sessions.push(session);
    this._saveState();
    return session;
  }

  recordHandoff(sessionId, fromAgent, toAgent, context) {
    const session = this.state.sessions.find(s => s.id === sessionId);
    if (session) {
      session.handoffs.push({
        from: fromAgent,
        to: toAgent,
        context,
        timestamp: nowIso()
      });
      this._saveState();
    }
  }

  endSession(sessionId, summary) {
    const session = this.state.sessions.find(s => s.id === sessionId);
    if (session) {
      session.status = 'completed';
      session.endedAt = nowIso();
      session.summary = summary;
      this._saveState();
    }
    return session;
  }

  // ===== Checkpoint Management =====

  createCheckpoint(sessionId, label, agentStates, handoffHistory) {
    const checkpoint = {
      id: `checkpoint-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      sessionId,
      label,
      timestamp: nowIso(),
      agentStates: agentStates || [],
      handoffHistory: handoffHistory || [],
      modelMetadata: this.state.modelMetadata
    };

    this.state.checkpoints.push(checkpoint);
    this._saveState();
    return checkpoint;
  }

  getCheckpoint(checkpointId) {
    return this.state.checkpoints.find(c => c.id === checkpointId) || null;
  }

  listCheckpoints(sessionId = null) {
    if (sessionId) {
      return this.state.checkpoints.filter(c => c.sessionId === sessionId);
    }
    return [...this.state.checkpoints];
  }

  // ===== Queries =====

  getQueuedTasks() {
    return [...this.state.queue];
  }

  getInProgressTasks() {
    return [...this.state.inProgress];
  }

  getCompletedTasks(limit = 10) {
    return this.state.completed.slice(-limit);
  }

  getAgentStats(agentId) {
    return this.state.agents[agentId] || null;
  }

  getFullState() {
    return { ...this.state };
  }

  // ===== Utilities =====

  _findTask(taskId, listName) {
    return this.state[listName]?.find(t => t.id === taskId);
  }

  _moveTask(taskId, fromList, toList) {
    const index = this.state[fromList]?.findIndex(t => t.id === taskId);
    if (index !== -1) {
      const [task] = this.state[fromList].splice(index, 1);
      this.state[toList].push(task);
      return task;
    }
    return null;
  }

  clearCompleted() {
    this.state.completed = [];
    this._saveState();
  }

  reset() {
    this.state = {
      version: '1.1.0',
      schemaVersion: 2,
      created: nowIso(),
      queue: [],
      inProgress: [],
      completed: [],
      failed: [],
      agents: {},
      sessions: [],
      modelMetadata: {
        modelId: 'unknown',
        provider: 'unknown',
        modelVersion: null,
        capabilities: []
      },
      sessionContext: {
        initiatedBy: null,
        purpose: null,
        parentSessionId: null
      },
      checkpoints: [],
      sessionGraph: null,
      generations: [],
      lastSync: null
    };
    this._saveState();
  }

  // ===== SessionGraph Integration =====

  /**
   * Fetch the current SessionGraph from the Python backend.
   * Caches locally in state for offline access.
   * @returns {Promise<object|null>} The SessionGraph dict or null
   */
  async fetchSessionGraph() {
    try {
      const bridge = PythonBridge.getShared();
      const graph = await bridge.call('session_state', {});
      this.state.sessionGraph = graph;
      this.state.lastSync = nowIso();
      this._saveState();
      return graph;
    } catch (error) {
      console.warn(`[StateManager] Failed to fetch SessionGraph: ${error.message}`);
      return this.state.sessionGraph || null;
    }
  }

  /**
   * Get the cached SessionGraph (no network call).
   * @returns {object|null}
   */
  getCachedSessionGraph() {
    return this.state.sessionGraph || null;
  }

  /**
   * Get summary of the session graph (track count, section count, etc.)
   * @returns {object} Summary stats
   */
  getSessionSummary() {
    const graph = this.state.sessionGraph;
    if (!graph) {
      return { available: false };
    }

    const tracks = graph.tracks || [];
    const sections = graph.sections || [];
    const totalBars = sections.reduce((sum, s) => sum + (s.bars || s.length_bars || 0), 0);
    const hasMidi = tracks.some(t => (t.clips || []).some(c => c.midi_path || c.midi));
    const hasAudio = tracks.some(t => (t.clips || []).some(c => c.audio_path || c.audio));

    return {
      available: true,
      session_id: graph.session_id || null,
      bpm: graph.bpm || null,
      key: graph.key || null,
      genre: graph.genre || null,
      trackCount: tracks.length,
      sectionCount: sections.length,
      totalBars,
      hasMidi,
      hasAudio
    };
  }

  /**
   * Record a generation event in state with the resulting SessionGraph.
   * @param {string} prompt - The original user prompt
   * @param {object} result - The GenerationResult from generate_sync
   * @param {object} sessionGraph - The SessionGraph from session_state
   */
  recordGeneration(prompt, result, sessionGraph) {
    if (!this.state.generations) {
      this.state.generations = [];
    }

    this.state.generations.push({
      timestamp: nowIso(),
      prompt,
      result: {
        success: result?.success ?? null,
        session_id: result?.session_id ?? null,
        tracks: result?.tracks ?? [],
        error: result?.error ?? null
      },
      sessionGraph: sessionGraph || null
    });

    // Keep only last 10 generations
    if (this.state.generations.length > 10) {
      this.state.generations = this.state.generations.slice(-10);
    }

    this._saveState();
  }

  /**
   * Get history of past generations.
   * @param {number} [limit=5]
   * @returns {Array}
   */
  getGenerationHistory(limit = 5) {
    return (this.state.generations || []).slice(-limit);
  }

  /**
   * Sync session state between Python and Electron.
   * Fetches graph, records in state, returns summary.
   * @returns {Promise<object>} { synced: true/false, summary, timestamp }
   */
  async syncSessionState() {
    const timestamp = nowIso();
    try {
      const graph = await this.fetchSessionGraph();
      if (!graph) {
        return { synced: false, summary: null, timestamp, error: 'No graph returned' };
      }
      const summary = this.getSessionSummary();
      return { synced: true, summary, timestamp };
    } catch (error) {
      return { synced: false, summary: null, timestamp, error: error.message };
    }
  }
}

module.exports = { AgentStateManager };
