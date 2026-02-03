#!/usr/bin/env node
/**
 * Debug script to test UI Watcher and AI context pipeline
 */

const path = require('path');
const { UIWatcher } = require(path.join(__dirname, '..', 'src', 'main', 'ui-watcher.js'));
const aiService = require(path.join(__dirname, '..', 'src', 'main', 'ai-service.js'));

console.log('\n========================================');
console.log('  Testing UI Watcher → AI Pipeline');
console.log('========================================\n');

async function test() {
  // Test 1: Create and start watcher
  console.log('1. Creating UIWatcher...');
  const watcher = new UIWatcher({
    pollInterval: 500,
    maxElements: 60,
    includeInvisible: false
  });
  
  console.log('2. Starting watcher...');
  watcher.start();
  
  // Wait for first poll to COMPLETE (PowerShell takes ~1-2 seconds)
  console.log('3. Waiting for first poll to complete...');
  await new Promise(resolve => {
    const timeout = setTimeout(() => {
      console.log('   (timeout reached, checking anyway)');
      resolve();
    }, 5000);
    
    watcher.once('poll-complete', (data) => {
      console.log(`   Poll complete! Found ${data.elements?.length || 0} elements in ${data.pollTime}ms`);
      clearTimeout(timeout);
      resolve();
    });
  });
  
  console.log('4. Checking watcher state:');
  console.log('   - isPolling:', watcher.isPolling);
  console.log('   - isRunning:', watcher.isRunning);
  console.log('   - cache.elements count:', watcher.cache?.elements?.length || 0);
  console.log('   - cache.activeWindow:', watcher.cache?.activeWindow?.title || 'none');
  
  // Test 2: Get context for AI
  console.log('\n5. Getting context for AI...');
  const context = watcher.getContextForAI();
  
  if (context) {
    console.log('   ✅ Context returned:', context.length, 'chars');
    console.log('   Preview (first 500 chars):');
    console.log('   ---');
    console.log(context.substring(0, 500));
    console.log('   ---');
  } else {
    console.log('   ❌ Context is NULL or empty!');
  }
  
  // Test 3: Set watcher on AI service
  console.log('\n6. Setting watcher on AI service...');
  aiService.setUIWatcher(watcher);
  
  // Test 4: Verify AI service can get watcher
  console.log('7. Verifying AI service getUIWatcher...');
  const retrievedWatcher = aiService.getUIWatcher();
  console.log('   - getUIWatcher() returned:', retrievedWatcher === watcher ? 'SAME instance ✅' : 'DIFFERENT instance ❌');
  console.log('   - retrievedWatcher.isRunning:', retrievedWatcher?.isRunning);
  
  // Test 5: Simulate buildMessages context injection
  console.log('\n8. Testing context inclusion in buildMessages...');
  const testWatcher = aiService.getUIWatcher();
  if (testWatcher && testWatcher.isRunning) {
    const uiContext = testWatcher.getContextForAI();
    if (uiContext && uiContext.trim()) {
      console.log('   ✅ Would include live UI context (', uiContext.split('\n').length, 'lines)');
    } else {
      console.log('   ❌ Context is empty/null, would NOT include');
    }
  } else {
    console.log('   ❌ Watcher not running, would NOT include');
    console.log('      testWatcher exists:', !!testWatcher);
    console.log('      testWatcher.isRunning:', testWatcher?.isRunning);
  }
  
  // Cleanup
  console.log('\n9. Stopping watcher...');
  watcher.stop();
  
  console.log('\n========================================');
  console.log('  Test Complete');
  console.log('========================================\n');
}

test().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
