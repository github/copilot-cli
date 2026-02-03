#!/usr/bin/env node
/**
 * Test script for v0.0.5 run_command functionality
 * Tests: command execution, safety analysis, output truncation
 */

const path = require('path');

// Import the system-automation module
const systemAutomationPath = path.join(__dirname, '..', 'src', 'main', 'system-automation.js');
const systemAutomation = require(systemAutomationPath);

const {
  ACTION_TYPES,
  executeAction,
  DANGEROUS_COMMAND_PATTERNS,
  isCommandDangerous,
  truncateOutput
} = systemAutomation;

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function test(name, fn) {
  try {
    fn();
    results.passed++;
    results.tests.push({ name, status: 'PASS' });
    console.log(`✅ PASS: ${name}`);
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: 'FAIL', error: error.message });
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${error.message}`);
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    results.passed++;
    results.tests.push({ name, status: 'PASS' });
    console.log(`✅ PASS: ${name}`);
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: 'FAIL', error: error.message });
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || 'Assertion failed'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertContains(str, substring, message) {
  if (!str || !str.includes(substring)) {
    throw new Error(`${message || 'Assertion failed'}: expected "${str}" to contain "${substring}"`);
  }
}

function assertMatches(str, regex, message) {
  if (!str || !regex.test(str)) {
    throw new Error(`${message || 'Assertion failed'}: expected "${str}" to match ${regex}`);
  }
}

async function runTests() {
  console.log('\n========================================');
  console.log('  Testing v0.0.5 run_command Feature');
  console.log('========================================\n');

  // Test 1: ACTION_TYPES includes RUN_COMMAND
  test('ACTION_TYPES.RUN_COMMAND exists', () => {
    assert(ACTION_TYPES.RUN_COMMAND !== undefined, 'RUN_COMMAND should be defined');
    assertEqual(ACTION_TYPES.RUN_COMMAND, 'run_command', 'RUN_COMMAND should equal "run_command"');
  });

  // Test 2: isCommandDangerous function exists
  test('isCommandDangerous function exists', () => {
    assert(typeof isCommandDangerous === 'function', 'isCommandDangerous should be a function');
  });

  // Test 3: DANGEROUS_COMMAND_PATTERNS is defined
  test('DANGEROUS_COMMAND_PATTERNS is defined', () => {
    assert(Array.isArray(DANGEROUS_COMMAND_PATTERNS), 'DANGEROUS_COMMAND_PATTERNS should be an array');
    assert(DANGEROUS_COMMAND_PATTERNS.length > 0, 'Should have dangerous patterns defined');
  });

  // Test 4: Safe command detection
  test('Safe commands are not flagged as dangerous', () => {
    const safeCommands = ['dir', 'echo hello', 'Get-Process', 'pwd', 'ls -la'];
    for (const cmd of safeCommands) {
      const result = isCommandDangerous(cmd);
      assert(!result, `"${cmd}" should not be dangerous`);
    }
  });

  // Test 5: Dangerous command detection
  test('Dangerous commands ARE flagged', () => {
    const dangerousCommands = [
      'rm -rf /tmp',           // Has -rf flag followed by path
      'del /s /q C:\\temp',    // Windows delete with flags
      'format C:',             // Format drive
      'Remove-Item -Recurse -Force C:\\temp',  // PowerShell destructive
      'shutdown /s',           // Shutdown
    ];
    for (const cmd of dangerousCommands) {
      const result = isCommandDangerous(cmd);
      assert(result === true, `"${cmd}" SHOULD be flagged as dangerous (got: ${result})`);
    }
  });

  // Test 6: truncateOutput function
  test('truncateOutput function works correctly', () => {
    const shortText = 'Hello World';
    assertEqual(truncateOutput(shortText, 100), shortText, 'Short text should not be truncated');
    
    const longText = 'A'.repeat(5000);
    const truncated = truncateOutput(longText, 100);
    assert(truncated.length < longText.length, 'Long text should be truncated');
    assertMatches(truncated, /characters truncated/, 'Should contain truncation notice');
  });

  // Test 7: Execute simple command (PowerShell)
  await testAsync('Execute simple PowerShell command', async () => {
    const action = {
      type: 'run_command',
      command: 'Write-Output "Hello from Liku v0.0.5"'
    };
    const result = await executeAction(action);
    assert(result.success, `Command should succeed: ${result.error || result.stderr || ''}`);
    assertContains(result.stdout || '', 'Hello from Liku', 'Output should contain expected text');
  });

  // Test 8: Execute command with cwd
  await testAsync('Execute command with custom cwd', async () => {
    const action = {
      type: 'run_command',
      command: 'Get-Location | Select-Object -ExpandProperty Path',
      cwd: process.env.USERPROFILE || 'C:\\Users'
    };
    const result = await executeAction(action);
    assert(result.success, `Command should succeed: ${result.error || ''}`);
  });

  // Test 9: Execute command that produces output
  await testAsync('Execute command that lists files', async () => {
    const action = {
      type: 'run_command',
      command: 'Get-ChildItem | Select-Object -First 3 | ForEach-Object { $_.Name }'
    };
    const result = await executeAction(action);
    assert(result.success, `Command should succeed: ${result.error || ''}`);
    assert(result.stdout && result.stdout.length > 0, `Should have output, got: "${result.stdout}"`);
  });

  // Test 10: Execute command with cmd shell
  await testAsync('Execute command with cmd shell', async () => {
    const action = {
      type: 'run_command',
      command: 'echo Liku CMD Test',
      shell: 'cmd'
    };
    const result = await executeAction(action);
    assert(result.success, `Command should succeed: ${result.error || ''}`);
    assertContains(result.stdout || '', 'Liku CMD Test', 'Output should contain expected text');
  });

  // Test 11: Invalid command fails gracefully
  await testAsync('Invalid command fails gracefully', async () => {
    const action = {
      type: 'run_command',
      command: 'this-command-definitely-does-not-exist-12345'
    };
    const result = await executeAction(action);
    // Should not crash, should return error info
    assert(result !== undefined, 'Should return a result object');
    // It's ok if success is false, we just want no crash
  });

  // Print summary
  console.log('\n========================================');
  console.log('  Test Summary');
  console.log('========================================');
  console.log(`  Total:  ${results.passed + results.failed}`);
  console.log(`  Passed: ${results.passed}`);
  console.log(`  Failed: ${results.failed}`);
  console.log('========================================\n');

  // Return exit code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
