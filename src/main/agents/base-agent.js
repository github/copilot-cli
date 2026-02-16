/**
 * Base Agent Class
 * 
 * Foundation for all agent types in the multi-agent system.
 * Provides common functionality for AI interaction, tool usage, and handoffs.
 */

const EventEmitter = require('events');

// Agent roles enum
const AgentRole = {
  SUPERVISOR: 'supervisor',
  BUILDER: 'builder',
  VERIFIER: 'verifier',
  RESEARCHER: 'researcher'
};

// Agent capabilities
const AgentCapabilities = {
  // Core capabilities
  SEARCH: 'search',
  READ: 'read',
  EDIT: 'edit',
  EXECUTE: 'execute',
  
  // Advanced capabilities
  WEB_FETCH: 'web_fetch',
  TODO: 'todo',
  HANDOFF: 'handoff',
  
  // Vision capabilities
  SCREENSHOT: 'screenshot',
  VISUAL_ANALYSIS: 'visual_analysis'
};

class BaseAgent extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.id = options.id || `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.role = options.role || AgentRole.BUILDER;
    this.name = options.name || `${this.role}-agent`;
    this.description = options.description || '';
    
    // AI service for LLM calls
    this.aiService = options.aiService;
    
    // State manager for persistence
    this.stateManager = options.stateManager;
    
    // Orchestrator reference for handoffs
    this.orchestrator = options.orchestrator;
    
    // Configuration
    this.maxRecursionDepth = options.maxRecursionDepth || 3;
    this.maxSubCalls = options.maxSubCalls || 10;
    this.currentDepth = 0;
    this.subCallCount = 0;
    
    // Capabilities (subclasses override)
    this.capabilities = options.capabilities || [];
    
    // Model metadata tracking
    this.modelMetadata = options.modelMetadata || null;
    this.proofChain = [];
    this.toolHistory = [];
    this.metrics = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      avgResponseTimeMs: 0,
      tokenUsage: { prompt: 0, completion: 0 }
    };
    
    // Operating contract
    this.contract = {
      noGuessing: true,
      preserveFunctionality: true,
      modularity: true,
      leastPrivilege: true,
      recursionLimits: true,
      security: true,
      backgroundHygiene: true
    };
    
    // Conversation history for context
    this.conversationHistory = [];
    
    // Active processes (for background hygiene)
    this.activeProcesses = new Map();
  }

  // ===== Core Methods (to be overridden by subclasses) =====

  async process(task, context = {}) {
    throw new Error('process() must be implemented by subclass');
  }

  getSystemPrompt() {
    throw new Error('getSystemPrompt() must be implemented by subclass');
  }

  // ===== Common Functionality =====

  async chat(message, options = {}) {
    if (!this.aiService) {
      throw new Error('AI service not configured');
    }

    // Add to conversation history
    this.conversationHistory.push({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });

    const systemPrompt = this.getSystemPrompt();
    const CHAT_TIMEOUT_MS = 60000;

    const response = await Promise.race([
      this.aiService.chat(message, {
        systemPrompt,
        history: this.conversationHistory,
        model: options.model,
        ...options
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`AI chat timed out after ${CHAT_TIMEOUT_MS / 1000}s`)), CHAT_TIMEOUT_MS)
      )
    ]);

    // Add response to history
    this.conversationHistory.push({
      role: 'assistant',
      content: response.text,
      timestamp: new Date().toISOString()
    });

    return response;
  }

  // ===== Tool Methods =====

  async search(query, options = {}) {
    this.emit('tool:search', { query, options });
    
    // Implementation depends on available tools
    return {
      results: [],
      query,
      timestamp: new Date().toISOString()
    };
  }

  async read(filePath, options = {}) {
    const fs = require('fs');
    
    if (!fs.existsSync(filePath)) {
      return { error: `File not found: ${filePath}` };
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    this.emit('tool:read', { filePath, lines: content.split('\n').length });
    
    return {
      content,
      filePath,
      lines: content.split('\n').length
    };
  }

  async edit(filePath, changes, options = {}) {
    if (!this.capabilities.includes(AgentCapabilities.EDIT)) {
      return { error: 'Agent does not have edit capability' };
    }
    
    this.emit('tool:edit', { filePath, changes });
    
    // Actual edit implementation would go here
    return {
      success: true,
      filePath,
      changes
    };
  }

  async execute(command, options = {}) {
    const { exec, spawn } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    this.emit('tool:execute', { command, options });
    
    try {
      if (options.background) {
        // Background process with PID tracking
        const child = spawn(command, [], {
          shell: true,
          detached: true,
          stdio: ['ignore', 'pipe', 'pipe']
        });
        
        const pid = child.pid;
        this.activeProcesses.set(pid, { command, startedAt: new Date().toISOString() });
        
        return {
          pid,
          command,
          status: 'running'
        };
      }
      
      const { stdout, stderr } = await execAsync(command, {
        timeout: options.timeout || 60000,
        maxBuffer: options.maxBuffer || 10 * 1024 * 1024
      });
      
      return {
        stdout,
        stderr,
        success: true
      };
    } catch (error) {
      return {
        error: error.message,
        stdout: error.stdout,
        stderr: error.stderr,
        success: false
      };
    }
  }

  // ===== Handoff Methods =====

  async handoff(targetRole, context, message) {
    if (!this.orchestrator) {
      throw new Error('Orchestrator not configured for handoffs');
    }
    
    this.emit('handoff', {
      from: this.role,
      to: targetRole,
      context,
      message
    });
    
    // Record handoff in state
    if (this.stateManager && context.sessionId) {
      this.stateManager.recordHandoff(
        context.sessionId,
        this.role,
        targetRole,
        { message, timestamp: new Date().toISOString() }
      );
    }
    
    return this.orchestrator.executeHandoff(this, targetRole, context, message);
  }

  handoffToSupervisor(context, message) {
    return this.handoff(AgentRole.SUPERVISOR, context, message);
  }

  handoffToBuilder(context, message) {
    return this.handoff(AgentRole.BUILDER, context, message);
  }

  handoffToVerifier(context, message) {
    return this.handoff(AgentRole.VERIFIER, context, message);
  }

  // ===== Recursion Control =====

  checkRecursionLimits() {
    if (this.currentDepth >= this.maxRecursionDepth) {
      return {
        allowed: false,
        reason: `Max recursion depth (${this.maxRecursionDepth}) reached`
      };
    }
    
    if (this.subCallCount >= this.maxSubCalls) {
      return {
        allowed: false,
        reason: `Max sub-calls (${this.maxSubCalls}) reached`
      };
    }
    
    return { allowed: true };
  }

  enterRecursion() {
    this.currentDepth++;
    this.subCallCount++;
    return this.currentDepth;
  }

  exitRecursion() {
    this.currentDepth = Math.max(0, this.currentDepth - 1);
    return this.currentDepth;
  }

  // ===== Logging & Proofs =====

  log(level, message, data = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      agent: this.id,
      role: this.role,
      level,
      message,
      data
    };
    
    this.emit('log', entry);
    
    if (level === 'error') {
      console.error(`[${this.role}] ${message}`, data);
    } else {
      console.log(`[${this.role}] ${message}`, data);
    }
    
    return entry;
  }

  addProof(type, content, source = null) {
    const proof = {
      type,
      content,
      source,
      timestamp: new Date().toISOString(),
      agentId: this.id
    };
    
    this.emit('proof', proof);
    return proof;
  }

  addStructuredProof(proof) {
    const structuredProof = {
      id: `proof-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      ...proof,
      timestamp: new Date().toISOString(),
      agentId: this.id,
      agentRole: this.role,
      modelMetadata: this.modelMetadata
    };
    
    this.proofChain.push(structuredProof);
    this.emit('proof', structuredProof);
    return structuredProof;
  }

  recordToolExecution(toolName, input, output, durationMs, success) {
    this.toolHistory.push({
      id: `tool-${Date.now()}`,
      toolName,
      input,
      output: success ? output : null,
      error: success ? null : output,
      durationMs,
      success,
      timestamp: new Date().toISOString()
    });
    
    this.metrics.totalCalls++;
    if (success) {
      this.metrics.successfulCalls++;
    } else {
      this.metrics.failedCalls++;
    }
    
    // Update rolling average
    const totalTime = this.metrics.avgResponseTimeMs * (this.metrics.totalCalls - 1) + durationMs;
    this.metrics.avgResponseTimeMs = totalTime / this.metrics.totalCalls;
  }

  // ===== State Management =====

  getState() {
    return {
      id: this.id,
      role: this.role,
      name: this.name,
      currentDepth: this.currentDepth,
      subCallCount: this.subCallCount,
      activeProcesses: Array.from(this.activeProcesses.entries()),
      conversationLength: this.conversationHistory.length,
      modelMetadata: this.modelMetadata,
      proofChainLength: this.proofChain.length,
      metrics: this.metrics,
      lastActivity: new Date().toISOString()
    };
  }

  reset() {
    this.conversationHistory = [];
    this.currentDepth = 0;
    this.subCallCount = 0;
    this.activeProcesses.clear();
    this.proofChain = [];
    this.toolHistory = [];
    this.metrics = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      avgResponseTimeMs: 0,
      tokenUsage: { prompt: 0, completion: 0 }
    };
  }
}

module.exports = {
  BaseAgent,
  AgentRole,
  AgentCapabilities
};
