/**
 * Agent CLI Command
 * 
 * CLI interface for the multi-agent system.
 * Supports spawning agents, running tasks, and managing state.
 * 
 * Usage:
 *   agent spawn supervisor   - Spawn supervisor agent
 *   agent run <task>         - Run task through orchestrator
 *   agent status             - Show agent system status
 *   agent reset              - Reset all agents
 */

const path = require('path');

// Lazy load to avoid circular dependencies
let agentSystem = null;
let orchestrator = null;

/**
 * Create an AI service adapter that wraps the existing ai-service.js
 * to provide the interface expected by the agent system
 */
function createAIServiceAdapter() {
  try {
    const aiServiceModule = require('../../main/ai-service');
    
    return {
      // Adapter method: agents call chat(), we call sendMessage()
      chat: async (message, options = {}) => {
        const result = await aiServiceModule.sendMessage(message, {
          includeVisualContext: options.includeVisual || false
        });
        
        if (!result.success) {
          throw new Error(result.error || 'AI service call failed');
        }
        
        return {
          text: result.message,
          provider: result.provider,
          success: true
        };
      },
      
      // Pass through other methods
      getStatus: aiServiceModule.getStatus,
      setProvider: aiServiceModule.setProvider,
      getCurrentCopilotModel: aiServiceModule.getCurrentCopilotModel,
      addVisualContext: aiServiceModule.addVisualContext
    };
  } catch (e) {
    console.warn('AI service not available:', e.message);
    return null;
  }
}

function getOrchestrator() {
  if (!orchestrator) {
    const { createAgentSystem } = require('../../main/agents');
    
    // Create AI service adapter
    const aiService = createAIServiceAdapter();
    
    if (!aiService) {
      console.warn('AI service adapter not available, agents will have limited capability');
    }
    
    orchestrator = createAgentSystem({
      aiService,
      statePath: path.join(process.cwd(), '.github', 'agent_state.json'),
      maxRecursionDepth: 3,
      maxSubCalls: 10,
      enableLongContext: true
    });
    
    // Setup event listeners
    orchestrator.on('agent:log', (entry) => {
      console.log(`[${entry.role}] ${entry.message}`);
    });
    
    orchestrator.on('handoff:execute', (handoff) => {
      console.log(`→ Handoff: ${handoff.from} → ${handoff.to}`);
    });
    
    orchestrator.on('task:complete', ({ task, result }) => {
      console.log(`✓ Task completed: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    });
  }
  
  return orchestrator;
}

// ===== CLI Commands =====

async function handleSpawn(args) {
  const [agentType] = args;
  const validTypes = ['supervisor', 'builder', 'verifier', 'researcher'];
  
  if (!agentType || !validTypes.includes(agentType.toLowerCase())) {
    console.log('Usage: agent spawn <supervisor|builder|verifier|researcher>');
    console.log('\nAvailable agents:');
    console.log('  supervisor  - Orchestrates tasks, decomposes plans');
    console.log('  builder     - Implements code changes');
    console.log('  verifier    - Validates changes');
    console.log('  researcher  - Gathers context and information');
    return;
  }
  
  const orch = getOrchestrator();
  const agent = orch.getAgent(agentType.toLowerCase());
  
  if (agent) {
    console.log(`✓ ${agentType} agent ready`);
    console.log(`  ID: ${agent.id}`);
    console.log(`  Capabilities: ${agent.capabilities.join(', ')}`);
  } else {
    console.error(`✗ Failed to spawn ${agentType} agent`);
  }
}

async function handleRun(args) {
  const task = args.join(' ');
  
  if (!task) {
    console.log('Usage: agent run <task description>');
    console.log('\nExample:');
    console.log('  agent run "Add error handling to the login function"');
    console.log('  agent run "Research how authentication is implemented"');
    return;
  }
  
  console.log(`\n🤖 Starting multi-agent task...`);
  console.log(`Task: ${task}\n`);
  
  const orch = getOrchestrator();
  
  try {
    const result = await orch.orchestrate(task);
    
    console.log('\n' + '='.repeat(50));
    console.log('RESULT');
    console.log('='.repeat(50));
    
    if (result.success) {
      console.log('✓ Task completed successfully');
      
      if (result.result?.summary) {
        console.log('\nSummary:');
        console.log(JSON.stringify(result.result.summary, null, 2));
      }
      
      if (result.result?.diffs?.length > 0) {
        console.log(`\nChanges: ${result.result.diffs.length} files modified`);
      }
    } else {
      console.log('✗ Task failed');
      console.log(`Error: ${result.error || result.result?.error || 'Unknown error'}`);
    }
    
    console.log(`\nHandoffs: ${result.handoffs?.length || 0}`);
    console.log(`Session: ${result.session}`);
    
  } catch (error) {
    console.error(`✗ Error: ${error.message}`);
  }
}

async function handleStatus() {
  const orch = getOrchestrator();
  const state = orch.getState();
  const stats = orch.getStats();
  
  console.log('\n🤖 Multi-Agent System Status\n');
  
  console.log('Session:');
  if (state.session) {
    console.log(`  ID: ${state.session.id}`);
    console.log(`  Started: ${state.session.startedAt}`);
    console.log(`  Tasks: ${state.session.tasks?.length || 0}`);
    console.log(`  Handoffs: ${state.session.handoffs?.length || 0}`);
  } else {
    console.log('  No active session');
  }
  
  console.log('\nAgents:');
  for (const { role, state: agentState } of state.agents) {
    console.log(`  ${role}:`);
    console.log(`    Depth: ${agentState.currentDepth}/${agentState.maxRecursionDepth || 3}`);
    console.log(`    Sub-calls: ${agentState.subCallCount}`);
  }
  
  console.log('\nStatistics:');
  console.log(`  Sessions: ${stats.sessions}`);
  console.log(`  Completed: ${stats.tasksCompleted}`);
  console.log(`  Failed: ${stats.tasksFailed}`);
  console.log(`  In Progress: ${stats.tasksInProgress}`);
  console.log(`  Queued: ${stats.tasksQueued}`);
}

async function handleReset() {
  const orch = getOrchestrator();
  orch.reset();
  console.log('✓ Agent system reset');
}

async function handleResearch(args) {
  const query = args.join(' ');
  
  if (!query) {
    console.log('Usage: agent research <query>');
    return;
  }
  
  console.log(`\n🔍 Researching: ${query}\n`);
  
  const orch = getOrchestrator();
  
  try {
    const result = await orch.research(query);
    
    if (result.success && result.result?.findings) {
      console.log('\nFindings:');
      console.log(result.result.findings);
      
      if (result.result.sources?.length > 0) {
        console.log('\nSources:');
        result.result.sources.forEach(s => console.log(`  - ${s}`));
      }
    } else {
      console.log('✗ Research failed');
      console.log(result.error || 'No findings');
    }
  } catch (error) {
    console.error(`✗ Error: ${error.message}`);
  }
}

async function handleVerify(args) {
  console.log('\n✓ Running verification pipeline...\n');
  
  const orch = getOrchestrator();
  
  try {
    const result = await orch.verify([], {
      includeE2E: args.includes('--e2e'),
      continueOnFailure: args.includes('--continue')
    });
    
    if (result.success) {
      console.log('✓ All verifications passed');
    } else {
      console.log('✗ Verification failed');
      
      if (result.result?.verdict?.suggestions) {
        console.log('\nSuggestions:');
        result.result.verdict.suggestions.forEach(s => console.log(`  - ${s}`));
      }
    }
    
    if (result.result?.results) {
      console.log('\nPhase Results:');
      result.result.results.forEach(r => {
        const status = r.passed ? '✓' : (r.skipped ? '-' : '✗');
        console.log(`  ${status} ${r.phase}`);
      });
    }
  } catch (error) {
    console.error(`✗ Error: ${error.message}`);
  }
}

// ===== Main Entry Point =====

async function main(args = []) {
  const [command, ...rest] = args;
  
  if (!command) {
    console.log('Copilot-Liku Multi-Agent System');
    console.log('================================\n');
    console.log('Commands:');
    console.log('  spawn <type>     - Spawn an agent (supervisor/builder/verifier/researcher)');
    console.log('  run <task>       - Run a task through the orchestrator');
    console.log('  research <query> - Research a topic');
    console.log('  verify           - Run verification pipeline');
    console.log('  status           - Show system status');
    console.log('  reset            - Reset all agents');
    console.log('\nExamples:');
    console.log('  agent spawn supervisor');
    console.log('  agent run "Add input validation to user form"');
    console.log('  agent research "How is authentication handled?"');
    console.log('  agent verify --e2e');
    return;
  }
  
  switch (command.toLowerCase()) {
    case 'spawn':
      await handleSpawn(rest);
      break;
    case 'run':
      await handleRun(rest);
      break;
    case 'research':
      await handleResearch(rest);
      break;
    case 'verify':
      await handleVerify(rest);
      break;
    case 'status':
      await handleStatus();
      break;
    case 'reset':
      await handleReset();
      break;
    default:
      console.log(`Unknown command: ${command}`);
      console.log('Run "agent" without arguments for help');
  }
}

// Export for use as module
module.exports = { main, getOrchestrator };

// Run if called directly
if (require.main === module) {
  main(process.argv.slice(2));
}
