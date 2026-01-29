/**
 * Agent State Manager
 * 
 * Manages persistent state across agent sessions.
 * State is stored in .github/agent_state.json for visibility and debugging.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class AgentStateManager {
  constructor(statePath = null) {
    this.statePath = statePath || path.join(process.cwd(), '.github', 'agent_state.json');
    this.state = this._loadState();
  }

  _loadState() {
    try {
      if (fs.existsSync(this.statePath)) {
        const content = fs.readFileSync(this.statePath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn(`[StateManager] Failed to load state: ${error.message}`);
    }
    
    return {
      version: '1.0.0',
      created: new Date().toISOString(),
      queue: [],
      inProgress: [],
      completed: [],
      failed: [],
      agents: {},
      sessions: []
    };
  }

  _saveState() {
    try {
      const dir = path.dirname(this.statePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      this.state.lastModified = new Date().toISOString();
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
      createdAt: new Date().toISOString(),
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
      task.startedAt = new Date().toISOString();
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
      task.startedAt = new Date().toISOString();
      this._saveState();
    }
    return task;
  }

  completeTask(taskId, result) {
    const task = this._findTask(taskId, 'inProgress');
    if (task) {
      this._moveTask(taskId, 'inProgress', 'completed');
      task.status = 'completed';
      task.completedAt = new Date().toISOString();
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
        task.failedAt = new Date().toISOString();
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
      registeredAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      tasksCompleted: 0,
      tasksFailed: 0
    };
    this._saveState();
  }

  updateAgentActivity(agentId) {
    if (this.state.agents[agentId]) {
      this.state.agents[agentId].lastActive = new Date().toISOString();
      this._saveState();
    }
  }

  // ===== Session Management =====

  startSession(sessionId, metadata = {}) {
    const session = {
      id: sessionId || `session-${Date.now()}`,
      startedAt: new Date().toISOString(),
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
        timestamp: new Date().toISOString()
      });
      this._saveState();
    }
  }

  endSession(sessionId, summary) {
    const session = this.state.sessions.find(s => s.id === sessionId);
    if (session) {
      session.status = 'completed';
      session.endedAt = new Date().toISOString();
      session.summary = summary;
      this._saveState();
    }
    return session;
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
      version: '1.0.0',
      created: new Date().toISOString(),
      queue: [],
      inProgress: [],
      completed: [],
      failed: [],
      agents: {},
      sessions: []
    };
    this._saveState();
  }
}

module.exports = { AgentStateManager };
