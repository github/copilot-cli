#!/usr/bin/env node
/**
 * Integration test for v0.0.5
 * Simulates end-to-end AI workflow: parse action -> execute -> return result
 */

const path = require('path');

const systemAutomation = require(path.join(__dirname, '..', 'src', 'main', 'system-automation.js'));

const results = {
  passed: 0,
  failed: 0,
  tests: []
};

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
  if (!condition) throw new Error(message || 'Assertion failed');
}

async function runIntegrationTests() {
  console.log('\n========================================');
  console.log('  v0.0.5 Integration Tests');
  console.log('========================================\n');

  // Test 1: Parse AI response with run_command action
  await testAsync('Parse AI response with run_command', async () => {
    const aiResponse = `
I'll check the current directory contents for you.

\`\`\`json
{
  "actions": [
    {"type": "run_command", "command": "Get-ChildItem | Select-Object -First 5 Name", "reason": "List directory contents"}
  ],
  "verification": "Directory listing should appear"
}
\`\`\`
`;
    
    const parsed = systemAutomation.parseAIActions(aiResponse);
    assert(parsed && parsed.actions, 'Should parse JSON with actions array');
    assert(parsed.actions.length === 1, 'Should have 1 action');
    assert(parsed.actions[0].type === 'run_command', 'Action should be run_command');
    assert(parsed.actions[0].command.includes('Get-ChildItem'), 'Should have correct command');
  });

  // Test 2: Execute action sequence with run_command
  await testAsync('Execute action sequence with run_command', async () => {
    const actions = [
      { type: 'run_command', command: 'Write-Output "Test 1"' },
      { type: 'wait', ms: 100 },
      { type: 'run_command', command: 'Write-Output "Test 2"' }
    ];
    
    const results = await systemAutomation.executeActionSequence(actions);
    assert(results.length === 3, 'Should have 3 results');
    assert(results[0].success, 'First command should succeed');
    assert(results[0].stdout.includes('Test 1'), 'First output should contain "Test 1"');
    assert(results[2].success, 'Third command should succeed');
    assert(results[2].stdout.includes('Test 2'), 'Third output should contain "Test 2"');
  });

  // Test 3: Run command in specific directory
  await testAsync('Run command in specific working directory', async () => {
    const result = await systemAutomation.executeAction({
      type: 'run_command',
      command: 'Get-Location | Select-Object -ExpandProperty Path',
      cwd: process.env.USERPROFILE
    });
    
    assert(result.success, `Command should succeed: ${result.error || result.stderr}`);
    assert(result.cwd === process.env.USERPROFILE, 'Should record cwd in result');
    assert(result.stdout.includes(process.env.USERNAME || 'Users'), 'Should be in user directory');
  });

  // Test 4: Verify key action includes key property for UI
  await testAsync('Key action has key property for UI', async () => {
    const aiResponse = `
\`\`\`json
{
  "actions": [
    {"type": "key", "key": "win+r", "reason": "Open Run dialog"}
  ]
}
\`\`\`
`;
    
    const parsed = systemAutomation.parseAIActions(aiResponse);
    assert(parsed && parsed.actions, 'Should parse JSON with actions array');
    assert(parsed.actions.length === 1, 'Should have 1 action');
    assert(parsed.actions[0].type === 'key', 'Action should be key');
    assert(parsed.actions[0].key === 'win+r', 'Should have key property (not keys)');
  });

  // Test 5: Run command with cmd shell
  await testAsync('Run command with CMD shell', async () => {
    const result = await systemAutomation.executeAction({
      type: 'run_command',
      command: 'echo CMD shell works!',
      shell: 'cmd'
    });
    
    assert(result.success, `CMD command should succeed: ${result.error || result.stderr}`);
    assert(result.stdout.includes('CMD shell works'), 'Should have expected output');
  });

  // Test 6: Run command that fails gracefully
  await testAsync('Failed command returns proper error', async () => {
    const result = await systemAutomation.executeAction({
      type: 'run_command',
      command: 'Get-NonExistentCmdlet'
    });
    
    // Should not crash, should return error info
    assert(result !== undefined, 'Should return result object');
    assert(result.success === false, 'Should report failure');
    assert(result.exitCode !== 0, 'Exit code should be non-zero');
  });

  // Test 7: Complex PowerShell pipeline
  await testAsync('Complex PowerShell pipeline works', async () => {
    const result = await systemAutomation.executeAction({
      type: 'run_command',
      command: '$env:USERNAME | ForEach-Object { "Current user: $_" }'
    });
    
    assert(result.success, `Pipeline should succeed: ${result.error || result.stderr}`);
    assert(result.stdout.includes('Current user:'), 'Should format output correctly');
  });

  // Print summary
  console.log('\n========================================');
  console.log('  Integration Test Summary');
  console.log('========================================');
  console.log(`  Total:  ${results.passed + results.failed}`);
  console.log(`  Passed: ${results.passed}`);
  console.log(`  Failed: ${results.failed}`);
  console.log('========================================\n');

  if (results.failed === 0) {
    console.log('🎉 All integration tests passed! Ready for npm publish.\n');
  }
  
  process.exit(results.failed > 0 ? 1 : 0);
}

runIntegrationTests().catch(err => {
  console.error('Integration test error:', err);
  process.exit(1);
});
