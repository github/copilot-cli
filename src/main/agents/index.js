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
const { ResearcherAgent } = require('./researcher');
const { AgentStateManager } = require('./state-manager');

module.exports = {
  AgentOrchestrator,
  SupervisorAgent,
  BuilderAgent,
  VerifierAgent,
  ResearcherAgent,
  AgentStateManager,
  
  // Factory function for creating configured orchestrator
  createAgentSystem: (options = {}) => {
    const stateManager = new AgentStateManager(options.statePath);
    const orchestrator = new AgentOrchestrator({
      stateManager,
      aiService: options.aiService,
      maxRecursionDepth: options.maxRecursionDepth || 3,
      maxSubCalls: options.maxSubCalls || 10,
      enableLongContext: options.enableLongContext !== false
    });
    
    return orchestrator;
  }
};
