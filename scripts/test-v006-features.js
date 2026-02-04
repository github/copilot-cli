#!/usr/bin/env node
/**
 * v0.0.6 Feature Tests
 * Tests new capabilities: Live UI Awareness, Agent Routing, Response Continuation, Chat History
 */

const path = require('path');
const fs = require('fs');

// Test counters
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (e) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${e.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

console.log('\n========================================');
console.log('  Testing v0.0.6 New Features');
console.log('========================================\n');

// ===== PHASE 1: LIVE UI AWARENESS =====
console.log('--- Phase 1: Live UI Awareness ---\n');

test('System prompt includes LIVE UI AWARENESS section', () => {
  const aiService = require(path.join(__dirname, '..', 'src', 'main', 'ai-service.js'));
  const status = aiService.getStatus();
  // Read the file to check system prompt
  const aiServiceCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'ai-service.js'), 'utf8');
  assert(aiServiceCode.includes('LIVE UI AWARENESS'), 'System prompt should include LIVE UI AWARENESS section');
  assert(aiServiceCode.includes('TRUST THIS DATA'), 'System prompt should tell AI to trust live data');
});

test('Live UI context is framed with trust indicator', () => {
  const aiServiceCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'ai-service.js'), 'utf8');
  assert(aiServiceCode.includes('🔴 **LIVE UI STATE**'), 'Live UI context should have red indicator');
  assert(aiServiceCode.includes('auto-refreshed every 400ms'), 'Should mention auto-refresh interval');
});

// ===== PHASE 2: AGENT ROUTING =====
console.log('\n--- Phase 2: Agent Routing ---\n');

test('Chat.js has agent trigger detection', () => {
  const chatCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'chat', 'chat.js'), 'utf8');
  assert(chatCode.includes('AGENT_TRIGGERS'), 'Should have AGENT_TRIGGERS constant');
  assert(chatCode.includes('detectAgentIntent'), 'Should have detectAgentIntent function');
});

test('Agent triggers include research, verify, build, orchestrate', () => {
  const chatCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'chat', 'chat.js'), 'utf8');
  assert(chatCode.includes("research:"), 'Should have research trigger');
  assert(chatCode.includes("verify:"), 'Should have verify trigger');
  assert(chatCode.includes("build:"), 'Should have build trigger');
  assert(chatCode.includes("orchestrate:"), 'Should have orchestrate trigger');
});

test('routeToAgent function exists and handles all agent types', () => {
  const chatCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'chat', 'chat.js'), 'utf8');
  assert(chatCode.includes('async function routeToAgent'), 'Should have routeToAgent function');
  assert(chatCode.includes('agentResearch'), 'Should call agentResearch');
  assert(chatCode.includes('agentVerify'), 'Should call agentVerify');
  assert(chatCode.includes('agentBuild'), 'Should call agentBuild');
  assert(chatCode.includes('agentRun'), 'Should call agentRun');
});

test('Agent event listener is registered', () => {
  const chatCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'chat', 'chat.js'), 'utf8');
  assert(chatCode.includes('onAgentEvent'), 'Should listen for agent events');
  assert(chatCode.includes('session-started'), 'Should handle session-started event');
  assert(chatCode.includes('execution-complete'), 'Should handle execution-complete event');
  assert(chatCode.includes('handoff'), 'Should handle handoff event');
});

// ===== PHASE 3: RESPONSE CONTINUATION =====
console.log('\n--- Phase 3: Response Continuation ---\n');

test('detectTruncation function exists', () => {
  const aiServiceCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'ai-service.js'), 'utf8');
  assert(aiServiceCode.includes('function detectTruncation'), 'Should have detectTruncation function');
});

test('detectTruncation checks for common truncation signals', () => {
  const aiServiceCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'ai-service.js'), 'utf8');
  assert(aiServiceCode.includes('```json'), 'Should detect mid-JSON truncation');
  assert(aiServiceCode.includes('unclosed code block'), 'Should detect unclosed code blocks');
  assert(aiServiceCode.includes('mid-sentence'), 'Should detect mid-sentence truncation');
});

test('sendMessage has maxContinuations option', () => {
  const aiServiceCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'ai-service.js'), 'utf8');
  assert(aiServiceCode.includes('maxContinuations'), 'Should have maxContinuations parameter');
});

test('Auto-continuation logic is implemented', () => {
  const aiServiceCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'ai-service.js'), 'utf8');
  assert(aiServiceCode.includes('while (detectTruncation'), 'Should have continuation loop');
  assert(aiServiceCode.includes('Continue from where you left off'), 'Should send continuation prompt');
});

// ===== PHASE 5: CHAT HISTORY PERSISTENCE =====
console.log('\n--- Phase 5: Chat History Persistence ---\n');

test('Chat history persistence constants defined', () => {
  const chatCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'chat', 'chat.js'), 'utf8');
  assert(chatCode.includes('HISTORY_KEY'), 'Should have HISTORY_KEY constant');
  assert(chatCode.includes('MAX_PERSISTED_MESSAGES'), 'Should have MAX_PERSISTED_MESSAGES constant');
});

test('saveHistory function exists', () => {
  const chatCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'chat', 'chat.js'), 'utf8');
  assert(chatCode.includes('function saveHistory'), 'Should have saveHistory function');
  assert(chatCode.includes('localStorage.setItem'), 'Should use localStorage');
});

test('loadHistory function exists', () => {
  const chatCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'chat', 'chat.js'), 'utf8');
  assert(chatCode.includes('function loadHistory'), 'Should have loadHistory function');
  assert(chatCode.includes('localStorage.getItem'), 'Should read from localStorage');
});

test('clearHistory function exists', () => {
  const chatCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'chat', 'chat.js'), 'utf8');
  assert(chatCode.includes('function clearHistory'), 'Should have clearHistory function');
  assert(chatCode.includes('localStorage.removeItem'), 'Should remove from localStorage');
});

test('History auto-saves on addMessage', () => {
  const chatCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'chat', 'chat.js'), 'utf8');
  // Find addMessage function and check it calls saveHistory
  const addMessageIndex = chatCode.indexOf('function addMessage');
  const nextFunctionIndex = chatCode.indexOf('// ===== AGENT ROUTING', addMessageIndex);
  const addMessageBody = chatCode.substring(addMessageIndex, nextFunctionIndex);
  assert(addMessageBody.includes('saveHistory()'), 'addMessage should call saveHistory');
});

test('History loads on initialization', () => {
  const chatCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'chat', 'chat.js'), 'utf8');
  // Check that loadHistory is called in initialization section
  const initIndex = chatCode.indexOf('// ===== INITIALIZATION');
  const afterInit = chatCode.substring(initIndex, initIndex + 500);
  assert(afterInit.includes('loadHistory()'), 'Should call loadHistory on init');
});

// ===== SUMMARY =====
console.log('\n========================================');
console.log('  v0.0.6 Feature Test Summary');
console.log('========================================');
console.log(`  Total:  ${passed + failed}`);
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log('========================================\n');

if (failed > 0) {
  console.log('❌ Some tests failed!');
  process.exit(1);
} else {
  console.log('🎉 All v0.0.6 feature tests passed!');
}
