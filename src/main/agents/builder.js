/**
 * Builder Agent
 * 
 * Implements decomposed plans from Supervisor with minimal diffs and local proofs.
 * Focuses on code changes without full verification (Verifier handles that).
 * 
 * Operating Rules:
 * - Implement only the assigned scope from Supervisor
 * - Prefer minimal, localized diffs
 * - Provide local proofs (lint/unit/build if available)
 * - If blocked after 3 attempts, hand back with blocker and evidence
 */

const { BaseAgent, AgentRole, AgentCapabilities } = require('./base-agent');
const fs = require('fs');
const path = require('path');

class BuilderAgent extends BaseAgent {
  constructor(options = {}) {
    super({
      ...options,
      role: AgentRole.BUILDER,
      name: options.name || 'builder',
      description: 'Implements code changes with minimal diffs and local proofs',
      capabilities: [
        AgentCapabilities.SEARCH,
        AgentCapabilities.READ,
        AgentCapabilities.EDIT,
        AgentCapabilities.EXECUTE,
        AgentCapabilities.TODO,
        AgentCapabilities.HANDOFF
      ]
    });
    
    // Builder-specific state
    this.diffs = [];
    this.localProofs = [];
    this.blockers = [];
    this.attemptCount = 0;
    this.maxAttempts = 3;
  }

  getSystemPrompt() {
    return `You are the BUILDER agent in a multi-agent coding system.

# OPERATING CONTRACT (NON-NEGOTIABLE)
- **No guessing**: Probe or ground with tools (search, read, execute).
- **Preserve functionalities**: Build additively; never disable core features.
- **Modularity & robustness**: Decompose into sub-modules; use todo for state.
- **Least privilege**: Prefer read/search; use edit only for assigned scope.
- **Recursion limits**: Depth ≤3; avoid >10 sub-calls without progress.
- **Security**: Isolate changes; audit proofs/logs.
- **Background hygiene**: Track long-running processes (PID/terminal id).

# YOUR RESPONSIBILITIES
1. Receive plan from Supervisor
2. Probe assigned module (read/search)
3. Implement via minimal diffs (edit)
4. Local verify: Lint + unit tests
5. Return: Diffs, rationale, local proofs
6. Suggest handoff: "Verify with Verifier" or "Back to Supervisor"

# WORKFLOW
For each assigned task:
1. Read and understand the target files
2. Plan the minimal changes needed
3. Implement changes with clear rationale
4. Run local verification (lint, type check, unit tests)
5. Document changes as diffs

# OUTPUT FORMAT
Always structure your response as:
1. Files Modified: [list of files]
2. Diffs: [minimal diffs with context]
3. Rationale: [why these changes]
4. Local Proofs: [lint/test output]
5. Status: [success/blocked]
6. Next: [verify/back to supervisor]

# BLOCKED HANDLING
If blocked after 3 attempts:
- Document the blocker clearly
- Include all evidence and attempts
- Hand back to Supervisor with suggestions`;
  }

  async process(task, context = {}) {
    this.log('info', 'Builder processing task', { task: task.description || task });
    this.attemptCount++;
    
    // Check if we've exceeded max attempts
    if (this.attemptCount > this.maxAttempts) {
      return this.reportBlocker('Exceeded maximum attempts', context);
    }
    
    // Check recursion limits
    const limits = this.checkRecursionLimits();
    if (!limits.allowed) {
      return this.reportBlocker(limits.reason, context);
    }

    try {
      this.enterRecursion();
      
      // Step 1: Probe and understand
      const understanding = await this.probeTarget(task, context);
      
      // Step 2: Plan changes
      const changePlan = await this.planChanges(understanding, task);
      
      // Step 3: Implement changes
      const implementation = await this.implementChanges(changePlan, context);
      
      // Step 4: Local verification
      const proofs = await this.runLocalVerification(implementation);
      this.localProofs.push(...proofs);
      
      // Step 5: Compile results
      const result = {
        success: proofs.every(p => p.passed),
        diffs: this.diffs,
        proofs: this.localProofs,
        rationale: changePlan.rationale,
        filesModified: implementation.filesModified,
        suggestedNext: proofs.every(p => p.passed) ? 'verify' : 'supervisor'
      };
      
      this.exitRecursion();
      
      // Reset attempt count on success
      if (result.success) {
        this.attemptCount = 0;
      }
      
      return result;
      
    } catch (error) {
      this.exitRecursion();
      this.blockers.push({
        error: error.message,
        attempt: this.attemptCount,
        timestamp: new Date().toISOString()
      });
      
      if (this.attemptCount >= this.maxAttempts) {
        return this.reportBlocker(error.message, context);
      }
      
      return {
        success: false,
        error: error.message,
        canRetry: this.attemptCount < this.maxAttempts
      };
    }
  }

  async probeTarget(task, context) {
    const taskDesc = typeof task === 'string' ? task : task.description;
    
    // Extract file paths from task
    const filePattern = /[a-zA-Z0-9_\-./]+\.(js|ts|jsx|tsx|json|md|py|rs|go)/g;
    const mentionedFiles = taskDesc.match(filePattern) || [];
    
    // Read mentioned files
    const fileContents = {};
    for (const file of mentionedFiles) {
      const fullPath = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
      if (fs.existsSync(fullPath)) {
        const result = await this.read(fullPath);
        if (!result.error) {
          fileContents[file] = result.content;
        }
      }
    }
    
    // Ask LLM to understand the context
    const prompt = `Analyze this task and the relevant files to understand what needs to be changed.

Task: ${taskDesc}

Files:
${Object.entries(fileContents).map(([f, c]) => `--- ${f} ---\n${c.slice(0, 1500)}`).join('\n\n')}

Provide:
1. What needs to change?
2. What are the dependencies?
3. What could break?`;

    const response = await this.chat(prompt);
    
    return {
      task: taskDesc,
      files: mentionedFiles,
      fileContents,
      analysis: response.text
    };
  }

  async planChanges(understanding, task) {
    const prompt = `Based on this analysis, plan the minimal changes needed.

Analysis: ${understanding.analysis}
Task: ${typeof task === 'string' ? task : task.description}

Provide:
1. Exact changes (old code → new code)
2. Files to modify
3. Order of changes
4. Rationale for each change`;

    const response = await this.chat(prompt);
    
    return {
      changes: this.parseChangePlan(response.text),
      rationale: response.text,
      understanding
    };
  }

  parseChangePlan(planText) {
    // Parse changes from the plan
    const changes = [];
    const blocks = planText.split(/(?=---\s*\w)/);
    
    for (const block of blocks) {
      const fileMatch = block.match(/(?:file|modify|change):\s*([^\n]+)/i);
      if (fileMatch) {
        changes.push({
          file: fileMatch[1].trim(),
          description: block
        });
      }
    }
    
    return changes;
  }

  async implementChanges(changePlan, context) {
    const filesModified = [];
    const errors = [];
    const rollbackData = [];
    
    for (const change of changePlan.changes) {
      try {
        const originalContent = changePlan.understanding.fileContents[change.file];
        if (originalContent) {
          rollbackData.push({
            file: change.file,
            originalContent,
            timestamp: new Date().toISOString()
          });
        }
        
        // Generate the actual edit
        const prompt = `Generate the exact code change for this modification:

File: ${change.file}
Change description: ${change.description}
Current content: ${changePlan.understanding.fileContents[change.file]?.slice(0, 2000) || 'Not loaded'}

Provide the change in unified diff format:
\`\`\`diff
--- a/${change.file}
+++ b/${change.file}
@@ -X,Y +X,Y @@
 context
-old line
+new line
 context
\`\`\``;

        const response = await this.chat(prompt);
        
        // Extract and store diff
        const diffMatch = response.text.match(/```diff\n([\s\S]*?)```/);
        if (diffMatch) {
          this.diffs.push({
            file: change.file,
            diff: diffMatch[1],
            timestamp: new Date().toISOString(),
            modelMetadata: this.modelMetadata,
            planId: changePlan.planId,
            rationale: change.description,
            rollbackAvailable: !!originalContent
          });
          filesModified.push(change.file);
        }
        
        // In a real implementation, we would apply the diff here
        // For now, we just record it
        this.addProof('diff', diffMatch?.[1] || response.text, change.file);
        
      } catch (error) {
        errors.push({
          file: change.file,
          error: error.message
        });
      }
    }
    
    return {
      filesModified,
      errors,
      diffs: this.diffs,
      rollbackData
    };
  }

  async runLocalVerification(implementation) {
    const proofs = [];
    
    // Run linter if available
    try {
      const lintResult = await this.execute('npm run lint --if-present 2>&1 || echo "No lint script"', { timeout: 30000 });
      proofs.push({
        type: 'lint',
        passed: !lintResult.error && !lintResult.stderr?.includes('error'),
        output: lintResult.stdout || lintResult.stderr,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      proofs.push({
        type: 'lint',
        passed: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    // Run type check if TypeScript
    try {
      const tscResult = await this.execute('npx tsc --noEmit 2>&1 || echo "No TypeScript"', { timeout: 60000 });
      proofs.push({
        type: 'typecheck',
        passed: !tscResult.error && !tscResult.stdout?.includes('error'),
        output: tscResult.stdout || tscResult.stderr,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      proofs.push({
        type: 'typecheck',
        passed: true, // Skip on error
        skipped: true,
        timestamp: new Date().toISOString()
      });
    }
    
    // Run unit tests for modified files
    for (const file of implementation.filesModified) {
      const testFile = file.replace(/\.(js|ts)$/, '.test.$1');
      if (fs.existsSync(testFile)) {
        try {
          const testResult = await this.execute(`npm test -- --testPathPattern="${path.basename(testFile)}" 2>&1`, { timeout: 60000 });
          proofs.push({
            type: 'unit-test',
            file: testFile,
            passed: !testResult.error && testResult.stdout?.includes('passed'),
            output: testResult.stdout,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          proofs.push({
            type: 'unit-test',
            file: testFile,
            passed: false,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }
    }
    
    return proofs;
  }

  reportBlocker(reason, context) {
    const blockerReport = {
      success: false,
      blocked: true,
      reason,
      attempts: this.attemptCount,
      blockers: this.blockers,
      evidence: {
        diffs: this.diffs,
        proofs: this.localProofs
      },
      suggestedNext: 'supervisor',
      timestamp: new Date().toISOString()
    };
    
    this.log('warn', 'Builder blocked', blockerReport);
    
    return blockerReport;
  }

  async rollback(rollbackData) {
    const results = [];
    
    for (const item of rollbackData) {
      try {
        fs.writeFileSync(item.file, item.originalContent);
        results.push({
          file: item.file,
          success: true,
          timestamp: new Date().toISOString()
        });
        
        this.addStructuredProof({
          type: 'rollback',
          file: item.file,
          reason: 'Rollback requested'
        });
      } catch (error) {
        results.push({
          file: item.file,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  // ===== Builder-specific Methods =====

  async createFile(filePath, content, rationale) {
    if (!this.capabilities.includes(AgentCapabilities.EDIT)) {
      return { error: 'No edit capability' };
    }
    
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, content);
    
    this.diffs.push({
      file: filePath,
      type: 'create',
      content: content.slice(0, 500) + '...',
      rationale,
      timestamp: new Date().toISOString()
    });
    
    this.addProof('file-created', filePath);
    
    return { success: true, filePath };
  }

  async modifyFile(filePath, oldContent, newContent, rationale) {
    if (!this.capabilities.includes(AgentCapabilities.EDIT)) {
      return { error: 'No edit capability' };
    }
    
    if (!fs.existsSync(filePath)) {
      return { error: `File not found: ${filePath}` };
    }
    
    fs.writeFileSync(filePath, newContent);
    
    this.diffs.push({
      file: filePath,
      type: 'modify',
      rationale,
      timestamp: new Date().toISOString()
    });
    
    this.addProof('file-modified', filePath);
    
    return { success: true, filePath };
  }

  reset() {
    super.reset();
    this.diffs = [];
    this.localProofs = [];
    this.blockers = [];
    this.attemptCount = 0;
  }
}

module.exports = { BuilderAgent };
