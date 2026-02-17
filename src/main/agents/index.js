/**
 * Multi-Agent System for Copilot-Liku CLI
 * 
 * Architecture: Supervisor-Builder-Verifier with Recursive Long-Context support
 * Based on RLM-inspired agent patterns for comprehensive task handling.
 * 
 * Agents:
 * - Supervisor: Orchestrates and decomposes tasks
 * - Builder: Implements code changes with minimal diffs
 * - Verifier: Validates changes with phased verification
 * - Researcher: Gathers context and information (optional)
 */

const { AgentOrchestrator } = require('./orchestrator');
const { SupervisorAgent } = require('./supervisor');
const { BuilderAgent } = require('./builder');
const { VerifierAgent } = require('./verifier');
const { ProducerAgent } = require('./producer');
const { ResearcherAgent } = require('./researcher');
const { AgentStateManager } = require('./state-manager');

module.exports = {
  AgentOrchestrator,
  SupervisorAgent,
  BuilderAgent,
  VerifierAgent,
  ProducerAgent,
  ResearcherAgent,
  AgentStateManager,
  
  // Factory function for creating configured orchestrator
  createAgentSystem: (aiService, options = {}) => {
    const stateManager = new AgentStateManager(options.statePath);
    
    const modelMetadata = aiService?.getModelMetadata?.() || null;
    
    if (modelMetadata) {
      stateManager.setModelMetadata(modelMetadata);
    }
    
    const orchestrator = new AgentOrchestrator({
      stateManager,
      aiService: aiService,
      maxRecursionDepth: options.maxRecursionDepth || 3,
      maxSubCalls: options.maxSubCalls || 10,
      enableLongContext: options.enableLongContext !== false,
      modelMetadata
    });
    
    // Return object with both orchestrator and stateManager
    return { orchestrator, stateManager };
  },
  
  // Recovery function for checkpoint restoration
  recoverFromCheckpoint: (checkpointId, options = {}) => {
    const stateManager = new AgentStateManager(options.statePath);
    const checkpoint = stateManager.getCheckpoint(checkpointId);
    
    if (!checkpoint) {
      throw new Error(`Checkpoint not found: ${checkpointId}`);
    }
    
    return checkpoint;
  }
};
