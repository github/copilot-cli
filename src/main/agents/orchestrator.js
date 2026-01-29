/**
 * Agent Orchestrator
 * 
 * Coordinates the multi-agent system, managing handoffs between 
 * Supervisor, Builder, Verifier, and Researcher agents.
 * 
 * Responsibilities:
 * - Create and manage agent instances
 * - Route handoffs between agents
 * - Manage session state and history
 * - Provide unified API for external consumers
 */

const EventEmitter = require('events');
const { SupervisorAgent } = require('./supervisor');
const { BuilderAgent } = require('./builder');
const { VerifierAgent } = require('./verifier');
const { ResearcherAgent } = require('./researcher');
const { AgentStateManager } = require('./state-manager');
const { AgentRole } = require('./base-agent');

class AgentOrchestrator extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.stateManager = options.stateManager || new AgentStateManager();
    this.aiService = options.aiService;
    
    // Configuration
    this.maxRecursionDepth = options.maxRecursionDepth || 3;
    this.maxSubCalls = options.maxSubCalls || 10;
    this.enableLongContext = options.enableLongContext !== false;
    
    // Agent instances
    this.agents = new Map();
    
    // Session tracking
    this.currentSession = null;
    this.handoffHistory = [];
    
    // Initialize default agents
    this._initializeAgents();
  }

  _initializeAgents() {
    const commonOptions = {
      aiService: this.aiService,
      stateManager: this.stateManager,
      orchestrator: this,
      maxRecursionDepth: this.maxRecursionDepth,
      maxSubCalls: this.maxSubCalls
    };
    
    // Create one instance of each agent type
    this.agents.set(AgentRole.SUPERVISOR, new SupervisorAgent(commonOptions));
    this.agents.set(AgentRole.BUILDER, new BuilderAgent(commonOptions));
    this.agents.set(AgentRole.VERIFIER, new VerifierAgent(commonOptions));
    this.agents.set(AgentRole.RESEARCHER, new ResearcherAgent(commonOptions));
    
    // Register agents with state manager
    for (const [role, agent] of this.agents) {
      this.stateManager.registerAgent(agent.id, role, agent.capabilities);
      
      // Forward agent events
      agent.on('log', (entry) => this.emit('agent:log', entry));
      agent.on('proof', (proof) => this.emit('agent:proof', proof));
      agent.on('handoff', (handoff) => this.emit('agent:handoff', handoff));
    }
  }

  // ===== Session Management =====

  startSession(metadata = {}) {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.currentSession = {
      id: sessionId,
      startedAt: new Date().toISOString(),
      metadata,
      tasks: [],
      handoffs: []
    };
    
    this.stateManager.startSession(sessionId, metadata);
    this.emit('session:start', this.currentSession);
    
    return sessionId;
  }

  endSession(summary = {}) {
    if (!this.currentSession) return null;
    
    const session = {
      ...this.currentSession,
      endedAt: new Date().toISOString(),
      summary
    };
    
    this.stateManager.endSession(session.id, summary);
    this.emit('session:end', session);
    
    // Reset all agents
    for (const agent of this.agents.values()) {
      agent.reset();
    }
    
    this.currentSession = null;
    this.handoffHistory = [];
    
    return session;
  }

  // ===== Task Execution =====

  async execute(task, options = {}) {
    // Start session if not already started
    if (!this.currentSession) {
      this.startSession({ task: task.description || task });
    }
    
    const context = {
      sessionId: this.currentSession.id,
      ...options
    };
    
    // Determine starting agent (default: Supervisor)
    const startAgent = options.startAgent || AgentRole.SUPERVISOR;
    const agent = this.agents.get(startAgent);
    
    if (!agent) {
      throw new Error(`Agent not found: ${startAgent}`);
    }
    
    this.emit('task:start', { task, agent: startAgent });
    
    try {
      const result = await agent.process(task, context);
      
      this.emit('task:complete', { task, result });
      
      return {
        success: result.success,
        result,
        session: this.currentSession.id,
        handoffs: this.handoffHistory
      };
      
    } catch (error) {
      this.emit('task:error', { task, error });
      
      return {
        success: false,
        error: error.message,
        session: this.currentSession.id,
        handoffs: this.handoffHistory
      };
    }
  }

  // ===== Handoff Management =====

  async executeHandoff(fromAgent, targetRole, context, message) {
    const targetAgent = this.agents.get(targetRole);
    
    if (!targetAgent) {
      throw new Error(`Target agent not found: ${targetRole}`);
    }
    
    // Record handoff
    const handoff = {
      from: fromAgent.role,
      to: targetRole,
      message,
      timestamp: new Date().toISOString()
    };
    
    this.handoffHistory.push(handoff);
    
    if (this.currentSession) {
      this.currentSession.handoffs.push(handoff);
    }
    
    this.emit('handoff:execute', handoff);
    
    // Update state manager
    this.stateManager.updateAgentActivity(targetAgent.id);
    
    // Execute on target agent
    const task = {
      description: message,
      fromAgent: fromAgent.role,
      context
    };
    
    return targetAgent.process(task, context);
  }

  // ===== Agent Access =====

  getAgent(role) {
    return this.agents.get(role);
  }

  getSupervisor() {
    return this.agents.get(AgentRole.SUPERVISOR);
  }

  getBuilder() {
    return this.agents.get(AgentRole.BUILDER);
  }

  getVerifier() {
    return this.agents.get(AgentRole.VERIFIER);
  }

  getResearcher() {
    return this.agents.get(AgentRole.RESEARCHER);
  }

  // ===== Convenience Methods =====

  async research(query, options = {}) {
    return this.execute(query, {
      ...options,
      startAgent: AgentRole.RESEARCHER
    });
  }

  async build(task, options = {}) {
    return this.execute(task, {
      ...options,
      startAgent: AgentRole.BUILDER
    });
  }

  async verify(changes, options = {}) {
    return this.execute({ description: 'Verify changes', changes }, {
      ...options,
      startAgent: AgentRole.VERIFIER,
      diffs: changes
    });
  }

  async orchestrate(task, options = {}) {
    // Full orchestration via Supervisor
    return this.execute(task, {
      ...options,
      startAgent: AgentRole.SUPERVISOR
    });
  }

  // ===== State & Diagnostics =====

  getState() {
    return {
      session: this.currentSession,
      agents: Array.from(this.agents.entries()).map(([role, agent]) => ({
        role,
        state: agent.getState()
      })),
      handoffHistory: this.handoffHistory,
      stateManager: this.stateManager.getFullState()
    };
  }

  getStats() {
    const state = this.stateManager.getFullState();
    
    return {
      sessions: state.sessions.length,
      tasksCompleted: state.completed.length,
      tasksFailed: state.failed.length,
      tasksInProgress: state.inProgress.length,
      tasksQueued: state.queue.length,
      agents: Object.keys(state.agents).length
    };
  }

  reset() {
    // End current session
    if (this.currentSession) {
      this.endSession({ reason: 'reset' });
    }
    
    // Reset all agents
    for (const agent of this.agents.values()) {
      agent.reset();
    }
    
    // Clear history
    this.handoffHistory = [];
    
    this.emit('orchestrator:reset');
  }

  // ===== AI Service Configuration =====

  setAIService(aiService) {
    this.aiService = aiService;
    
    // Update all agents
    for (const agent of this.agents.values()) {
      agent.aiService = aiService;
    }
  }
}

module.exports = { AgentOrchestrator };
