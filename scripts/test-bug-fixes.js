#!/usr/bin/env node
/**
 * Test script for v0.0.5 bug fixes and integration
 * Tests: ai-service safety analysis, ui-watcher isRunning getter, chat.js action rendering
 */

const path = require('path');

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

console.log('\n========================================');
console.log('  Testing v0.0.5 Bug Fixes');
console.log('========================================\n');

// Test UIWatcher isRunning getter
test('UIWatcher has isRunning getter', () => {
  const uiWatcherPath = path.join(__dirname, '..', 'src', 'main', 'ui-watcher.js');
  const { UIWatcher } = require(uiWatcherPath);
  
  // Check that the class exists
  assert(typeof UIWatcher === 'function', 'UIWatcher should be a class/constructor');
  
  // Create instance and check isRunning property
  const watcher = new UIWatcher();
  assert('isRunning' in watcher, 'UIWatcher instance should have isRunning property');
  
  // Initial state should be false (not polling)
  assertEqual(watcher.isRunning, false, 'Initial isRunning should be false');
  assertEqual(watcher.isPolling, false, 'Initial isPolling should be false');
  
  // Verify isRunning reflects isPolling
  watcher.isPolling = true;
  assertEqual(watcher.isRunning, true, 'isRunning should reflect isPolling=true');
  
  watcher.isPolling = false;
  assertEqual(watcher.isRunning, false, 'isRunning should reflect isPolling=false');
});

// Test ai-service has run_command in system prompt
test('System prompt includes run_command documentation', () => {
  const aiServicePath = path.join(__dirname, '..', 'src', 'main', 'ai-service.js');
  const fs = require('fs');
  
  const aiServiceContent = fs.readFileSync(aiServicePath, 'utf8');
  
  assert(aiServiceContent.includes('run_command'), 'ai-service should mention run_command');
  assert(aiServiceContent.includes('PREFERRED FOR SHELL TASKS'), 'Should have run_command marked as preferred');
  assert(aiServiceContent.includes('shell.*powershell|cmd|bash') || 
         aiServiceContent.includes('"shell": "powershell|cmd|bash"') ||
         aiServiceContent.includes('shell.*powershell') ||
         aiServiceContent.includes('powershell|cmd|bash'),
    'Should document shell options');
});

// Test ai-service analyzeActionSafety handles run_command
test('analyzeActionSafety handles run_command case', () => {
  const aiServicePath = path.join(__dirname, '..', 'src', 'main', 'ai-service.js');
  const fs = require('fs');
  
  const aiServiceContent = fs.readFileSync(aiServicePath, 'utf8');
  
  assert(aiServiceContent.includes("case 'run_command':"), 'analyzeActionSafety should have run_command case');
  // Check that dangerous patterns are being analyzed (either via function or inline patterns)
  assert(
    aiServiceContent.includes('dangerousPatterns') || aiServiceContent.includes('isCommandDangerous'),
    'Should analyze command for dangerous patterns'
  );
  assert(aiServiceContent.includes('CRITICAL'), 'Should flag dangerous commands as CRITICAL risk');
});

// Test chat.js handles action.key correctly
test('chat.js uses action.key with fallback to action.keys', () => {
  const chatJsPath = path.join(__dirname, '..', 'src', 'renderer', 'chat', 'chat.js');
  const fs = require('fs');
  
  const chatContent = fs.readFileSync(chatJsPath, 'utf8');
  
  assert(chatContent.includes('action.key || action.keys'), 'Should use action.key with fallback to action.keys');
});

// Test chat.js has run_command UI rendering
test('chat.js renders run_command actions', () => {
  const chatJsPath = path.join(__dirname, '..', 'src', 'renderer', 'chat', 'chat.js');
  const fs = require('fs');
  
  const chatContent = fs.readFileSync(chatJsPath, 'utf8');
  
  assert(chatContent.includes("case 'run_command':"), 'Should have run_command case in action rendering');
  assert(chatContent.includes("'💻'") || chatContent.includes('"💻"'), 'Should have terminal emoji for run_command');
});

// Test DANGEROUS_COMMAND_PATTERNS covers critical cases
test('Dangerous command patterns are comprehensive', () => {
  const sysAutoPath = path.join(__dirname, '..', 'src', 'main', 'system-automation.js');
  const { DANGEROUS_COMMAND_PATTERNS, isCommandDangerous } = require(sysAutoPath);
  
  // Should flag these
  const mustBeDangerous = [
    'rm -rf /home/user',
    'del /q /s C:\\Windows',
    'format C:',            // Format a drive
    'format D:',            // Format another drive
    'Remove-Item -Recurse -Force folder',
    'shutdown /r',
    'reg delete HKLM\\SOFTWARE',
  ];
  
  for (const cmd of mustBeDangerous) {
    assert(isCommandDangerous(cmd), `Should flag "${cmd}" as dangerous`);
  }
  
  // Should NOT flag these (including Format-Table false positive fix)
  const mustBeSafe = [
    'Get-Process',
    'dir /b',
    'echo hello',
    'cat myfile.txt',
    'ls -la',
    'Get-ChildItem',
    'npm install',
    'node script.js',
    'Get-ChildItem | Format-Table',         // PowerShell Format-Table cmdlet (NOT dangerous!)
    'Get-Process | Format-Table Name, CPU', // Another Format-Table use case
  ];
  
  for (const cmd of mustBeSafe) {
    assert(!isCommandDangerous(cmd), `Should NOT flag "${cmd}" as dangerous`);
  }
});

// Print summary
console.log('\n========================================');
console.log('  Bug Fix Test Summary');
console.log('========================================');
console.log(`  Total:  ${results.passed + results.failed}`);
console.log(`  Passed: ${results.passed}`);
console.log(`  Failed: ${results.failed}`);
console.log('========================================\n');

// Return exit code
process.exit(results.failed > 0 ? 1 : 0);
