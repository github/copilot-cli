/**
 * UI Automation Module
 * 
 * Comprehensive Windows UI automation using semantic element discovery,
 * SendInput API for reliable input, and PowerShell for system integration.
 * 
 * @module ui-automation
 * 
 * @example
 * const ui = require('./ui-automation');
 * 
 * // Find and click a button by text
 * await ui.click({ text: 'Submit' });
 * 
 * // Type in a text field
 * await ui.click({ automationId: 'searchBox' });
 * await ui.typeText('Hello world');
 * 
 * // Wait for element and click
 * await ui.waitAndClick({ text: 'OK' }, { timeout: 5000 });
 * 
 * // Take screenshot
 * await ui.screenshot({ path: 'capture.png' });
 */

// Configuration
const { CONFIG, CONTROL_TYPES } = require('./config');

// Core utilities
const { sleep, debug, log, executePowerShellScript } = require('./core');

// Element operations
const { 
  findElements, 
  findElement, 
  waitForElement, 
  waitForElementGone 
} = require('./elements');

// Mouse operations
const {
  moveMouse,
  getMousePosition,
  clickAt,
  doubleClickAt,
  drag,
  scroll,
  scrollUp,
  scrollDown,
  scrollLeft,
  scrollRight,
} = require('./mouse');

// Keyboard operations
const {
  typeText,
  sendKeys,
  keyDown,
  keyUp,
  VK,
} = require('./keyboard');

// Window operations
const {
  getActiveWindow,
  findWindows,
  focusWindow,
  minimizeWindow,
  maximizeWindow,
  restoreWindow,
} = require('./window');

// High-level interactions
const {
  click,
  clickByText,
  clickByAutomationId,
  rightClick,
  doubleClick,
  clickElement,
  invokeElement,
  fillField,
  selectDropdownItem,
  waitForWindow,
  clickSequence,
  hover,
  waitAndClick,
  clickAndWaitFor,
  selectFromDropdown,
} = require('./interactions');

// Screenshot
const {
  screenshot,
  screenshotActiveWindow,
  screenshotElement,
} = require('./screenshot');

module.exports = {
  // Configuration
  CONFIG,
  CONTROL_TYPES,
  
  // Core utilities
  sleep,
  debug,
  log,
  executePowerShellScript,
  
  // Element operations
  findElements,
  findElement,
  waitForElement,
  waitForElementGone,
  
  // Mouse operations - low level
  moveMouse,
  getMousePosition,
  clickAt,
  doubleClickAt,
  drag,
  scroll,
  scrollUp,
  scrollDown,
  scrollLeft,
  scrollRight,
  
  // Keyboard operations
  typeText,
  sendKeys,
  keyDown,
  keyUp,
  VK,
  
  // Window operations
  getActiveWindow,
  findWindows,
  focusWindow,
  minimizeWindow,
  maximizeWindow,
  restoreWindow,
  
  // High-level interactions (element-based clicks)
  click,
  clickByText,
  clickByAutomationId,
  rightClick,
  doubleClick,
  clickElement,
  invokeElement,
  fillField,
  selectDropdownItem,
  waitForWindow,
  clickSequence,
  hover,
  waitAndClick,
  clickAndWaitFor,
  selectFromDropdown,
  
  // Screenshot
  screenshot,
  screenshotActiveWindow,
  screenshotElement,
};
