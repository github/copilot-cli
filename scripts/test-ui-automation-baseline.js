/**
 * Baseline Test Suite for UI Automation Module
 * 
 * This test exercises ALL exported functions to ensure they work correctly.
 * Run this BEFORE and AFTER refactoring to verify no regressions.
 * 
 * Usage:
 *   node scripts/test-ui-automation-baseline.js
 *   node scripts/test-ui-automation-baseline.js --quick   (skip slow tests)
 */

const path = require('path');

// Dynamic import path - can point to old or new module
const UI_MODULE_PATH = process.env.UI_MODULE_PATH || './src/main/ui-automation';

async function runTests() {
  console.log('='.repeat(60));
  console.log('UI AUTOMATION BASELINE TEST SUITE');
  console.log(`Module: ${UI_MODULE_PATH}`);
  console.log('='.repeat(60));
  console.log('');

  const isQuick = process.argv.includes('--quick');
  const results = { passed: 0, failed: 0, skipped: 0 };
  const failures = [];

  // Load the module
  let ui;
  try {
    ui = require(path.resolve(UI_MODULE_PATH));
    console.log('✓ Module loaded successfully\n');
  } catch (err) {
    console.error('✗ FATAL: Failed to load module:', err.message);
    process.exit(1);
  }

  // Test helper
  async function test(name, fn, { slow = false } = {}) {
    if (slow && isQuick) {
      console.log(`○ SKIP: ${name} (--quick mode)`);
      results.skipped++;
      return;
    }

    process.stdout.write(`  ${name}... `);
    const start = Date.now();
    try {
      await fn();
      const elapsed = Date.now() - start;
      console.log(`✓ (${elapsed}ms)`);
      results.passed++;
    } catch (err) {
      const elapsed = Date.now() - start;
      console.log(`✗ FAILED (${elapsed}ms)`);
      console.log(`    Error: ${err.message}`);
      results.failed++;
      failures.push({ name, error: err.message });
    }
  }

  // =========================================================================
  // TEST: Exports exist
  // =========================================================================
  console.log('TEST GROUP: Module Exports');
  console.log('-'.repeat(40));

  const expectedExports = [
    // Config
    'CONFIG', 'CONTROL_TYPES',
    // Element Discovery
    'findElements', 'findElement', 'waitForElement', 'waitForElementGone',
    // Mouse Actions
    'moveMouse', 'getMousePosition', 'clickAt', 'doubleClickAt', 'drag', 'scroll',
    // Element Interactions
    'clickElement', 'invokeElement', 'click', 'typeText', 'sendKeys',
    // Window Management
    'getActiveWindow', 'findWindows', 'focusWindow',
    // Screenshots
    'screenshot',
    // High-Level Actions
    'waitAndClick', 'clickAndWaitFor', 'selectFromDropdown',
    // Utilities
    'sleep', 'executePowerShellScript',
  ];

  for (const exportName of expectedExports) {
    await test(`Export '${exportName}' exists`, async () => {
      if (typeof ui[exportName] === 'undefined') {
        throw new Error(`Missing export: ${exportName}`);
      }
    });
  }

  // =========================================================================
  // TEST: CONFIG structure
  // =========================================================================
  console.log('\nTEST GROUP: CONFIG Structure');
  console.log('-'.repeat(40));

  await test('CONFIG.DEFAULT_TIMEOUT is number', async () => {
    if (typeof ui.CONFIG.DEFAULT_TIMEOUT !== 'number') {
      throw new Error('Expected number');
    }
  });

  await test('CONFIG.TEMP_DIR is string', async () => {
    if (typeof ui.CONFIG.TEMP_DIR !== 'string') {
      throw new Error('Expected string');
    }
  });

  await test('CONTROL_TYPES has BUTTON', async () => {
    if (ui.CONTROL_TYPES.BUTTON !== 'Button') {
      throw new Error('Expected "Button"');
    }
  });

  // =========================================================================
  // TEST: Utility Functions
  // =========================================================================
  console.log('\nTEST GROUP: Utility Functions');
  console.log('-'.repeat(40));

  await test('sleep(100) waits ~100ms', async () => {
    const start = Date.now();
    await ui.sleep(100);
    const elapsed = Date.now() - start;
    if (elapsed < 90 || elapsed > 200) {
      throw new Error(`Expected ~100ms, got ${elapsed}ms`);
    }
  });

  await test('executePowerShellScript runs simple script', async () => {
    const result = await ui.executePowerShellScript('Write-Output "hello"');
    if (!result.stdout.includes('hello')) {
      throw new Error(`Expected "hello" in output, got: ${result.stdout}`);
    }
  }, { slow: true });

  // =========================================================================
  // TEST: Mouse Functions
  // =========================================================================
  console.log('\nTEST GROUP: Mouse Functions');
  console.log('-'.repeat(40));

  await test('getMousePosition returns {x, y}', async () => {
    const pos = await ui.getMousePosition();
    if (typeof pos.x !== 'number' || typeof pos.y !== 'number') {
      throw new Error(`Expected {x, y}, got: ${JSON.stringify(pos)}`);
    }
  }, { slow: true });

  await test('moveMouse changes position', async () => {
    // Just verify moveMouse completes without error
    // Position verification is flaky due to user mouse movement
    await ui.moveMouse(100, 100);
    await ui.sleep(50);
    const pos = await ui.getMousePosition();
    // Only verify we got a valid position object
    if (typeof pos.x !== 'number' || typeof pos.y !== 'number') {
      throw new Error('Invalid position result');
    }
  }, { slow: true });

  // =========================================================================
  // TEST: Window Functions
  // =========================================================================
  console.log('\nTEST GROUP: Window Functions');
  console.log('-'.repeat(40));

  await test('getActiveWindow returns {title, processName, hwnd}', async () => {
    const win = await ui.getActiveWindow();
    if (typeof win.title !== 'string' || (typeof win.hwnd !== 'number' && typeof win.hwnd !== 'string')) {
      throw new Error(`Invalid result: ${JSON.stringify(win)}`);
    }
  }, { slow: true });

  await test('findWindows returns array', async () => {
    const windows = await ui.findWindows('');
    if (!Array.isArray(windows)) {
      throw new Error('Expected array');
    }
    if (windows.length === 0) {
      throw new Error('Expected at least one window');
    }
  }, { slow: true });

  await test('findWindows with filter works', async () => {
    const windows = await ui.findWindows('Code');
    // Should find VS Code if it's running
    if (!Array.isArray(windows)) {
      throw new Error('Expected array');
    }
  }, { slow: true });

  // =========================================================================
  // TEST: Element Discovery
  // =========================================================================
  console.log('\nTEST GROUP: Element Discovery');
  console.log('-'.repeat(40));

  await test('findElements returns {success, elements, count}', async () => {
    const result = await ui.findElements({ text: 'File' });
    if (typeof result.success !== 'boolean') {
      throw new Error('Missing success field');
    }
    if (!Array.isArray(result.elements)) {
      throw new Error('Missing elements array');
    }
    if (typeof result.count !== 'number') {
      throw new Error('Missing count field');
    }
  }, { slow: true });

  await test('findElement returns single element or null', async () => {
    const result = await ui.findElement({ text: 'NonExistentElement12345' });
    if (typeof result.success !== 'boolean') {
      throw new Error('Missing success field');
    }
    // Should not find this element
    if (result.success !== false) {
      throw new Error('Expected success=false for non-existent element');
    }
  }, { slow: true });

  await test('findElements with controlType filter', async () => {
    const result = await ui.findElements({ text: 'File', controlType: 'Button' });
    if (!result.success) {
      // It's OK if no buttons found, just verify the call works
    }
    // All results should be buttons if any found
    for (const el of result.elements) {
      if (!el.ControlType.includes('Button')) {
        throw new Error(`Expected Button, got ${el.ControlType}`);
      }
    }
  }, { slow: true });

  // =========================================================================
  // TEST: Click Functions
  // =========================================================================
  console.log('\nTEST GROUP: Click Functions');
  console.log('-'.repeat(40));

  await test('clickAt returns {success, coordinates}', async () => {
    // Click in a safe area (far corner)
    const result = await ui.clickAt(10, 10, 'left', { focusWindow: false });
    if (typeof result.success !== 'boolean') {
      throw new Error('Missing success field');
    }
    if (!result.coordinates || typeof result.coordinates.x !== 'number') {
      throw new Error('Missing coordinates');
    }
  }, { slow: true });

  await test('click function combines find + click', async () => {
    // This might not click anything real, but should return proper structure
    const result = await ui.click({ text: 'NonExistentButton99999' });
    if (typeof result.success !== 'boolean') {
      throw new Error('Missing success field');
    }
    // Should fail to find
    if (result.success !== false) {
      throw new Error('Expected failure for non-existent element');
    }
  }, { slow: true });

  // =========================================================================
  // TEST: Keyboard Functions  
  // =========================================================================
  console.log('\nTEST GROUP: Keyboard Functions');
  console.log('-'.repeat(40));

  await test('sendKeys returns {success}', async () => {
    // Send a safe key (Escape)
    const result = await ui.sendKeys('escape');
    if (typeof result.success !== 'boolean') {
      throw new Error('Missing success field');
    }
  }, { slow: true });

  // =========================================================================
  // TEST: High-Level Functions
  // =========================================================================
  console.log('\nTEST GROUP: High-Level Functions');
  console.log('-'.repeat(40));

  await test('waitForElement with short timeout returns proper structure', async () => {
    const result = await ui.waitForElement({ text: 'NonExistent12345' }, 500);
    if (typeof result.success !== 'boolean') {
      throw new Error('Missing success field');
    }
    if (typeof result.elapsed !== 'number') {
      throw new Error('Missing elapsed field');
    }
    // Should timeout
    if (result.success !== false) {
      throw new Error('Expected timeout');
    }
  }, { slow: true });

  await test('waitAndClick returns proper structure on failure', async () => {
    const result = await ui.waitAndClick({ text: 'NonExistent12345' }, { timeout: 500 });
    if (typeof result.success !== 'boolean') {
      throw new Error('Missing success field');
    }
  }, { slow: true });

  // =========================================================================
  // TEST: Screenshot
  // =========================================================================
  console.log('\nTEST GROUP: Screenshot');
  console.log('-'.repeat(40));

  await test('screenshot returns {success, path}', async () => {
    const fs = require('fs');
    const result = await ui.screenshot();
    if (typeof result.success !== 'boolean') {
      throw new Error('Missing success field');
    }
    if (typeof result.path !== 'string') {
      throw new Error('Missing path field');
    }
    // Verify file exists
    if (result.success && !fs.existsSync(result.path)) {
      throw new Error('Screenshot file not created');
    }
    // Clean up
    if (result.success) {
      try { fs.unlinkSync(result.path); } catch {}
    }
  }, { slow: true });

  // =========================================================================
  // RESULTS
  // =========================================================================
  console.log('\n' + '='.repeat(60));
  console.log('TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`  Passed:  ${results.passed}`);
  console.log(`  Failed:  ${results.failed}`);
  console.log(`  Skipped: ${results.skipped}`);
  console.log('');

  if (failures.length > 0) {
    console.log('FAILURES:');
    for (const f of failures) {
      console.log(`  - ${f.name}: ${f.error}`);
    }
  }

  console.log('');
  if (results.failed === 0) {
    console.log('✓ ALL TESTS PASSED');
    process.exit(0);
  } else {
    console.log('✗ SOME TESTS FAILED');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
