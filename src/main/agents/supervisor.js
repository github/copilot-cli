/**
 * Supervisor Agent
 * 
 * Orchestrates and decomposes tasks, manages handoffs to Builder/Verifier.
 * Does NOT edit files directly - delegates all implementation to Builder.
 * 
 * Operating Rules:
 * - Start with a short plan (2-5 steps)
 * - Decompose work into concrete file/symbol-level subtasks
 * - Delegate implementation to Builder, validation to Verifier
 * - Preserve existing behavior
 * - Never execute terminal commands or edit files
 */

const { BaseAgent, AgentRole, AgentCapabilities } = require('./base-agent');

class SupervisorAgent extends BaseAgent {
  constructor(options = {}) {
    super({
      ...options,
      role: AgentRole.SUPERVISOR,
      name: options.name || 'supervisor',
      description: 'Orchestrates tasks, decomposes plans, manages agent handoffs',
      capabilities: [
        AgentCapabilities.SEARCH,
        AgentCapabilities.READ,
        AgentCapabilities.WEB_FETCH,
        AgentCapabilities.TODO,
        AgentCapabilities.HANDOFF
      ]
    });
    
    // Supervisor-specific state
    this.currentPlan = null;
    this.decomposedTasks = [];
    this.assumptions = [];
  }

  getSystemPrompt() {
    return `You are the SUPERVISOR agent in a multi-agent coding system.

# OPERATING CONTRACT (NON-NEGOTIABLE)
- **No guessing**: Probe or ground with tools (search, read).
- **Preserve functionalities**: Never disable core features.
- **Modularity**: Decompose into sub-modules.
- **Least privilege**: READ-ONLY access. Use Builder for any writes.
- **Recursion limits**: Depth ≤3; avoid >10 sub-calls without progress.
- **Security**: Audit all changes before approval.

# YOUR RESPONSIBILITIES
1. Analyze user requests and create 2-5 step plans
2. Decompose work into concrete file/symbol-level subtasks
3. Delegate implementation to Builder agent
4. Delegate validation to Verifier agent
5. Aggregate results and provide final summary

# WORKFLOW
1. Read state from agent_state.json before planning
2. Create plan with explicit assumptions
3. For each subtask:
   - If implementation needed: Handoff to Builder
   - If validation needed: Handoff to Verifier
4. Aggregate results and verify completeness
5. Update state with completed/failed tasks

# HANDOFF FORMAT
When handing off to Builder:
"Implement: [specific task]. Files: [file paths]. Constraints: [any limits]"

When handing off to Verifier:
"Verify: [what to check]. Changes: [summary of changes]. Tests: [required tests]"

# OUTPUT FORMAT
Always structure your response as:
1. Analysis: (what you understand about the task)
2. Plan: (numbered steps)
3. Assumptions: (what you're assuming)
4. Next Action: (handoff or completion)`;
  }

  async process(task, context = {}) {
    this.log('info', 'Supervisor processing task', { task: task.description || task });
    
    // Check recursion limits
    const limits = this.checkRecursionLimits();
    if (!limits.allowed) {
      return {
        success: false,
        error: limits.reason,
        suggestedAction: 'handoff_to_human'
      };
    }

    try {
      // Step 1: Analyze the task
      const analysis = await this.analyzeTask(task, context);
      
      // Step 2: Create plan
      const plan = await this.createPlan(analysis);
      this.currentPlan = plan;
      
      // Step 3: Decompose into subtasks
      this.decomposedTasks = await this.decomposeTasks(plan);
      
      // Step 4: Execute plan (handoffs to Builder/Verifier)
      const results = await this.executePlan(this.decomposedTasks, context);
      
      // Step 5: Aggregate and return
      return this.aggregateResults(results, context);
      
    } catch (error) {
      this.log('error', 'Supervisor processing failed', { error: error.message });
      return {
        success: false,
        error: error.message,
        state: this.getState()
      };
    }
  }

  async analyzeTask(task, context) {
    const prompt = `Analyze this task and identify:
1. What files/modules are involved?
2. What changes are needed?
3. What validation is required?

Task: ${typeof task === 'string' ? task : JSON.stringify(task)}
Context: ${JSON.stringify(context)}`;

    const response = await this.chat(prompt);
    
    return {
      description: task,
      analysis: response.text,
      timestamp: new Date().toISOString()
    };
  }

  async createPlan(analysis) {
    const prompt = `Based on this analysis, create a 2-5 step execution plan.
Each step should be concrete and actionable.
Specify whether each step needs Builder (implementation) or Verifier (validation).

Analysis: ${analysis.analysis}`;

    const response = await this.chat(prompt);
    
    return {
      steps: this.parseSteps(response.text),
      rawPlan: response.text,
      assumptions: this.extractAssumptions(response.text)
    };
  }

  parseSteps(planText) {
    const steps = [];
    const lines = planText.split('\n');
    
    for (const line of lines) {
      const match = line.match(/^\d+\.\s*(.+)/);
      if (match) {
        const stepText = match[1];
        const isBuilder = /implement|create|edit|add|modify|fix/i.test(stepText);
        const isVerifier = /verify|test|validate|check|ensure/i.test(stepText);
        
        steps.push({
          description: stepText,
          agent: isBuilder ? AgentRole.BUILDER : (isVerifier ? AgentRole.VERIFIER : AgentRole.SUPERVISOR),
          status: 'pending'
        });
      }
    }
    
    return steps;
  }

  extractAssumptions(text) {
    const assumptions = [];
    const lines = text.split('\n');
    
    let inAssumptions = false;
    for (const line of lines) {
      if (/assumption|assuming/i.test(line)) {
        inAssumptions = true;
      }
      if (inAssumptions && line.trim().startsWith('-')) {
        assumptions.push(line.trim().substring(1).trim());
      }
    }
    
    this.assumptions = assumptions;
    return assumptions;
  }

  async decomposeTasks(plan) {
    const tasks = [];
    
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      tasks.push({
        id: `subtask-${i + 1}`,
        step: i + 1,
        description: step.description,
        targetAgent: step.agent,
        status: 'pending',
        dependencies: i > 0 ? [`subtask-${i}`] : []
      });
    }
    
    return tasks;
  }

  async executePlan(tasks, context) {
    const results = [];
    
    for (const task of tasks) {
      // Check if dependencies are satisfied
      const depsComplete = task.dependencies.every(depId => {
        const dep = results.find(r => r.taskId === depId);
        return dep && dep.success;
      });
      
      if (!depsComplete) {
        results.push({
          taskId: task.id,
          success: false,
          error: 'Dependencies not satisfied',
          skipped: true
        });
        continue;
      }
      
      task.status = 'in-progress';
      
      if (task.targetAgent === AgentRole.BUILDER) {
        const result = await this.handoffToBuilder(
          { ...context, taskId: task.id },
          `Implement: ${task.description}`
        );
        results.push({
          taskId: task.id,
          agent: AgentRole.BUILDER,
          ...result
        });
      } else if (task.targetAgent === AgentRole.VERIFIER) {
        const result = await this.handoffToVerifier(
          { ...context, taskId: task.id },
          `Verify: ${task.description}`
        );
        results.push({
          taskId: task.id,
          agent: AgentRole.VERIFIER,
          ...result
        });
      } else {
        // Handle internally
        results.push({
          taskId: task.id,
          agent: AgentRole.SUPERVISOR,
          success: true,
          note: 'Handled by supervisor'
        });
      }
      
      task.status = results[results.length - 1].success ? 'completed' : 'failed';
    }
    
    return results;
  }

  aggregateResults(results, context) {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success && !r.skipped);
    const skipped = results.filter(r => r.skipped);
    
    return {
      success: failed.length === 0,
      summary: {
        total: results.length,
        successful: successful.length,
        failed: failed.length,
        skipped: skipped.length
      },
      plan: this.currentPlan,
      results,
      assumptions: this.assumptions,
      timestamp: new Date().toISOString()
    };
  }

  // ===== Supervisor-specific Methods =====

  async interpretPrompt(userPrompt) {
    const prompt = `Parse this user request and extract:
1. Primary goal
2. Scope (files, modules, features)
3. Constraints (time, compatibility, etc.)
4. Success criteria

User request: "${userPrompt}"`;

    const response = await this.chat(prompt);
    return {
      originalPrompt: userPrompt,
      interpretation: response.text,
      timestamp: new Date().toISOString()
    };
  }

  async researchContext(topic, files = []) {
    const readResults = await Promise.all(
      files.map(f => this.read(f))
    );
    
    const prompt = `Based on these files, what context is relevant for: ${topic}

Files content:
${readResults.map(r => `--- ${r.filePath} ---\n${r.content?.slice(0, 2000)}`).join('\n\n')}`;

    const response = await this.chat(prompt);
    return {
      topic,
      context: response.text,
      filesRead: files
    };
  }
}

module.exports = { SupervisorAgent };
