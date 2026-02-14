/**
 * Verifier Agent
 * 
 * Runs phased verification on Builder changes and returns proofs plus pass/fail verdict.
 * READ-ONLY: Does not edit files.
 * 
 * Operating Rules:
 * - Verify based on provided diffs/outputs; do not speculate
 * - Prefer smallest, most relevant checks first, then broaden
 * - Phased verification: Lint → Build → Unit → Integration → E2E
 */

const { BaseAgent, AgentRole, AgentCapabilities } = require('./base-agent');
const { PythonBridge } = require('../python-bridge');

class VerifierAgent extends BaseAgent {
  constructor(options = {}) {
    super({
      ...options,
      role: AgentRole.VERIFIER,
      name: options.name || 'verifier',
      description: 'Validates changes with phased verification pipeline',
      capabilities: [
        AgentCapabilities.SEARCH,
        AgentCapabilities.READ,
        AgentCapabilities.EXECUTE,
        AgentCapabilities.TODO,
        AgentCapabilities.HANDOFF
      ]
      // NOTE: No EDIT capability - Verifier is read-only
    });
    
    // Verifier-specific state
    this.verificationResults = [];
    this.currentPhase = null;
    this.verdict = null;

    // PythonBridge for music quality critics (lazy init via shared singleton)
    this.pythonBridge = null;
  }

  getSystemPrompt() {
    return `You are the VERIFIER agent in a multi-agent coding system.

# OPERATING CONTRACT (NON-NEGOTIABLE)
- **No guessing**: Verify based on provided changes only.
- **Preserve functionalities**: Read-only; no edits.
- **Modularity & robustness**: Phase-based verification.
- **Least privilege**: Read-only access only.
- **Recursion limits**: Depth ≤3; avoid >10 sub-calls without progress.
- **Security**: Check invariants/regressions; fail on issues.
- **Background hygiene**: PID-track long-running tests.

# YOUR RESPONSIBILITIES
1. Receive changes from Builder/Supervisor
2. Run verification pipeline sequentially
3. Provide proofs/logs for each phase
4. Issue verdict: Pass/fail + suggestions
5. Hand off back to Supervisor

# VERIFICATION PIPELINE
Phase 1: LINT - ESLint/Prettier/code style
Phase 2: BUILD - Compilation/bundling
Phase 3: UNIT TESTS - Framework-specific unit tests
Phase 4: INTEGRATION - API tests, service integration
Phase 5: E2E - Playwright/Cypress end-to-end (optional)

# OUTPUT FORMAT
Always structure your response as:
1. Phase: [current phase]
2. Command: [what was run]
3. Result: [pass/fail]
4. Output: [relevant logs]
5. Issues: [any problems found]
6. Verdict: [overall pass/fail]
7. Suggestions: [if failed, what to fix]`;
  }

  async process(task, context = {}) {
    this.log('info', 'Verifier processing task', { task: task.description || task });
    
    // Check recursion limits
    const limits = this.checkRecursionLimits();
    if (!limits.allowed) {
      return {
        success: false,
        error: limits.reason,
        phase: 'pre-check'
      };
    }

    try {
      this.enterRecursion();
      
      // Extract changes to verify
      const changes = context.diffs || context.changes || [];
      const changedFiles = changes.map(c => c.file).filter(Boolean);
      
      // Run verification pipeline
      const results = await this.runVerificationPipeline(changedFiles, context);
      
      // Compile verdict
      const verdict = this.compileVerdict(results);
      this.verdict = verdict;
      
      this.exitRecursion();
      
      return {
        success: verdict.passed,
        verdict,
        results: this.verificationResults,
        suggestedNext: verdict.passed ? 'complete' : 'supervisor',
        suggestions: verdict.suggestions
      };
      
    } catch (error) {
      this.exitRecursion();
      return {
        success: false,
        error: error.message,
        phase: this.currentPhase,
        partialResults: this.verificationResults
      };
    }
  }

  async runVerificationPipeline(changedFiles, context) {
    const phases = [
      { name: 'lint', fn: () => this.runLint(changedFiles) },
      { name: 'build', fn: () => this.runBuild() },
      { name: 'unit', fn: () => this.runUnitTests(changedFiles) },
      { name: 'integration', fn: () => this.runIntegrationTests(context) },
      // E2E is optional and expensive - only run if explicitly requested
      ...(context.includeE2E ? [{ name: 'e2e', fn: () => this.runE2ETests(context) }] : [])
    ];
    
    const results = [];
    
    for (const phase of phases) {
      this.currentPhase = phase.name;
      this.log('info', `Starting verification phase: ${phase.name}`);
      
      try {
        const result = await phase.fn();
        results.push({
          phase: phase.name,
          ...result,
          timestamp: new Date().toISOString()
        });
        
        this.verificationResults.push(result);
        
        // Stop on first failure unless told to continue
        if (!result.passed && !context.continueOnFailure) {
          this.log('warn', `Phase ${phase.name} failed, stopping pipeline`);
          break;
        }
        
      } catch (error) {
        results.push({
          phase: phase.name,
          passed: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        
        if (!context.continueOnFailure) {
          break;
        }
      }
    }
    
    return results;
  }

  async runLint(changedFiles) {
    this.log('info', 'Running lint verification');
    
    const commands = [
      'npm run lint --if-present 2>&1',
      'npx eslint --ext .js,.ts,.jsx,.tsx . 2>&1 || true',
      'npx prettier --check . 2>&1 || true'
    ];
    
    const outputs = [];
    let passed = true;
    const issues = [];
    
    for (const cmd of commands) {
      try {
        const result = await this.execute(cmd, { timeout: 60000 });
        outputs.push({
          command: cmd,
          output: result.stdout,
          error: result.stderr
        });
        
        if (result.stderr?.includes('error') || result.stdout?.includes('error')) {
          passed = false;
          issues.push(this.extractLintIssues(result.stdout || result.stderr));
        }
      } catch (error) {
        // Lint commands may exit non-zero, that's okay
        outputs.push({ command: cmd, error: error.message });
      }
    }
    
    this.addProof('lint', JSON.stringify(outputs).slice(0, 1000));
    
    return {
      phase: 'lint',
      passed,
      outputs,
      issues: issues.flat()
    };
  }

  extractLintIssues(output) {
    const issues = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (/error|warning/i.test(line) && line.includes(':')) {
        issues.push(line.trim());
      }
    }
    
    return issues.slice(0, 20); // Limit to first 20 issues
  }

  async runBuild() {
    this.log('info', 'Running build verification');
    
    const buildCommands = [
      'npm run build --if-present 2>&1',
      'npx tsc --noEmit 2>&1 || true'
    ];
    
    let passed = true;
    const outputs = [];
    const errors = [];
    
    for (const cmd of buildCommands) {
      try {
        const result = await this.execute(cmd, { timeout: 120000 });
        outputs.push({
          command: cmd,
          output: result.stdout?.slice(0, 2000),
          exitCode: result.success ? 0 : 1
        });
        
        if (!result.success || result.stderr?.includes('error')) {
          passed = false;
          errors.push(result.stderr || result.stdout);
        }
      } catch (error) {
        outputs.push({ command: cmd, error: error.message });
        passed = false;
        errors.push(error.message);
      }
    }
    
    this.addProof('build', passed ? 'Build passed' : errors.join('\n').slice(0, 500));
    
    return {
      phase: 'build',
      passed,
      outputs,
      errors
    };
  }

  async runUnitTests(changedFiles) {
    this.log('info', 'Running unit test verification');
    
    // Determine test framework
    let testCommand = 'npm test 2>&1';
    
    // If specific files changed, try to run only related tests
    if (changedFiles.length > 0 && changedFiles.length < 10) {
      const testPatterns = changedFiles
        .map(f => f.replace(/\.(js|ts|jsx|tsx)$/, ''))
        .join('|');
      testCommand = `npm test -- --testPathPattern="${testPatterns}" 2>&1 || npm test 2>&1`;
    }
    
    try {
      const result = await this.execute(testCommand, { timeout: 180000 });
      
      const passed = result.success && 
        (result.stdout?.includes('passed') || !result.stdout?.includes('failed'));
      
      const testCounts = this.parseTestOutput(result.stdout || '');
      
      this.addProof('unit-tests', 
        `${testCounts.passed} passed, ${testCounts.failed} failed`
      );
      
      return {
        phase: 'unit',
        passed,
        output: result.stdout?.slice(0, 3000),
        testCounts,
        errors: result.stderr
      };
    } catch (error) {
      return {
        phase: 'unit',
        passed: false,
        error: error.message,
        testCounts: { passed: 0, failed: 0, skipped: 0 }
      };
    }
  }

  parseTestOutput(output) {
    const counts = { passed: 0, failed: 0, skipped: 0 };
    
    // Jest format
    const jestMatch = output.match(/(\d+) passed.*?(\d+) failed/);
    if (jestMatch) {
      counts.passed = parseInt(jestMatch[1]) || 0;
      counts.failed = parseInt(jestMatch[2]) || 0;
    }
    
    // Mocha format
    const mochaMatch = output.match(/(\d+) passing.*?(\d+) failing/);
    if (mochaMatch) {
      counts.passed = parseInt(mochaMatch[1]) || 0;
      counts.failed = parseInt(mochaMatch[2]) || 0;
    }
    
    return counts;
  }

  async runIntegrationTests(context) {
    this.log('info', 'Running integration test verification');
    
    // Check if integration tests exist
    const integrationCommands = [
      'npm run test:integration --if-present 2>&1',
      'npm run test:api --if-present 2>&1'
    ];
    
    let ranAny = false;
    let passed = true;
    const outputs = [];
    
    for (const cmd of integrationCommands) {
      try {
        const result = await this.execute(cmd, { timeout: 300000 });
        
        if (!result.stdout?.includes('No integration tests')) {
          ranAny = true;
          outputs.push({
            command: cmd,
            output: result.stdout?.slice(0, 2000),
            passed: result.success
          });
          
          if (!result.success) {
            passed = false;
          }
        }
      } catch (error) {
        // Integration tests may not exist
      }
    }
    
    return {
      phase: 'integration',
      passed: ranAny ? passed : true,
      skipped: !ranAny,
      outputs
    };
  }

  async runE2ETests(context) {
    this.log('info', 'Running E2E test verification');
    
    // Playwright E2E
    try {
      // Start with critical path only
      const result = await this.execute(
        'npx playwright test --grep "critical-path" 2>&1 || npx playwright test 2>&1',
        { timeout: 600000 }
      );
      
      const passed = result.success && !result.stdout?.includes('failed');
      
      this.addProof('e2e', passed ? 'E2E passed' : 'E2E failed');
      
      return {
        phase: 'e2e',
        passed,
        output: result.stdout?.slice(0, 3000),
        traceAvailable: result.stdout?.includes('trace')
      };
    } catch (error) {
      return {
        phase: 'e2e',
        passed: false,
        error: error.message
      };
    }
  }

  compileVerdict(results) {
    const allPassed = results.every(r => r.passed || r.skipped);
    const failedPhases = results.filter(r => !r.passed && !r.skipped);
    
    const suggestions = [];
    
    for (const failed of failedPhases) {
      switch (failed.phase) {
        case 'lint':
          suggestions.push('Fix linting errors before proceeding');
          break;
        case 'build':
          suggestions.push('Resolve build/compilation errors');
          break;
        case 'unit':
          suggestions.push('Fix failing unit tests');
          break;
        case 'integration':
          suggestions.push('Address integration test failures');
          break;
        case 'e2e':
          suggestions.push('Review E2E test failures, check traces');
          break;
      }
    }
    
    return {
      passed: allPassed,
      summary: {
        total: results.length,
        passed: results.filter(r => r.passed).length,
        failed: failedPhases.length,
        skipped: results.filter(r => r.skipped).length
      },
      failedPhases: failedPhases.map(f => f.phase),
      suggestions,
      timestamp: new Date().toISOString()
    };
  }

  reset() {
    super.reset();
    this.verificationResults = [];
    this.currentPhase = null;
    this.verdict = null;
  }

  // ===== Music Quality Verification (Sprint 3 — Task 3.3) =====

  /**
   * Lazily initialise and start the shared PythonBridge.
   * @returns {Promise<PythonBridge>}
   */
  async ensurePythonBridge() {
    if (!this.pythonBridge) {
      this.pythonBridge = PythonBridge.getShared();
    }
    if (!this.pythonBridge.isRunning) {
      this.log('info', 'Starting PythonBridge for music critics');
      await this.pythonBridge.start();
    }
    return this.pythonBridge;
  }

  /**
   * Run VLC / BKAS / ADC quality-gate critics on a MIDI file.
   *
   * @param {string} midiPath       Path to the MIDI file.
   * @param {string} [genre]        Genre identifier for context-aware eval.
   * @param {object} [analysisData] Pre-extracted analysis data (voicings, bass_notes, etc.)
   * @returns {Promise<{passed: boolean, metrics: Array, report: object}>}
   */
  async runMusicCritics(midiPath, genre, analysisData = {}) {
    await this.ensurePythonBridge();
    this.log('info', 'Running music critics', { midiPath, genre });

    const report = await this.pythonBridge.call('run_critics', {
      midi_path: midiPath,
      genre,
      ...analysisData,
    });

    // Record proof entries for each metric
    if (report && Array.isArray(report.metrics)) {
      for (const metric of report.metrics) {
        this.addStructuredProof({
          type: 'music-critic',
          criticName: metric.name,
          value: metric.value,
          threshold: metric.threshold,
          passed: metric.passed,
          midiPath,
        });
      }
    }

    this.addProof(
      'music-critics-overall',
      report.overall_passed ? 'PASS' : 'FAIL',
      midiPath
    );

    return {
      passed: report.overall_passed,
      metrics: report.metrics,
      report,
    };
  }

  /**
   * Stop and release the PythonBridge.
   * @returns {Promise<void>}
   */
  async disposePythonBridge() {
    if (this.pythonBridge) {
      this.log('info', 'Disposing PythonBridge');
      await this.pythonBridge.stop();
      this.pythonBridge = null;
    }
  }
}

module.exports = { VerifierAgent };
