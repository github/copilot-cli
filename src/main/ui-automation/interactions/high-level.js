/**
 * High-Level UI Interactions
 * 
 * Complex automation workflows and convenience functions.
 * @module ui-automation/interactions/high-level
 */

const { findElement, findElements, waitForElement } = require('../elements');
const { click, clickByText } = require('./element-click');
const { typeText, sendKeys } = require('../keyboard');
const { focusWindow, findWindows } = require('../window');
const { log, sleep } = require('../core/helpers');

/**
 * Fill a text field by clicking it then typing
 * 
 * @param {Object} criteria - Element search criteria
 * @param {string} text - Text to type
 * @param {Object} [options] - Options
 * @param {boolean} [options.clear=true] - Clear field first (Ctrl+A)
 * @returns {Promise<{success: boolean}>}
 */
async function fillField(criteria, text, options = {}) {
  const { clear = true } = options;
  
  // Click the field
  const clickResult = await click(criteria);
  if (!clickResult.success) {
    return { success: false };
  }
  
  await sleep(50);
  
  // Clear if requested
  if (clear) {
    await sendKeys('^a');
    await sleep(20);
  }
  
  // Type text
  const typeResult = await typeText(text);
  return { success: typeResult.success };
}

/**
 * Select an item from a dropdown/combobox
 * 
 * @param {Object} dropdownCriteria - Criteria to find the dropdown
 * @param {string|Object} itemCriteria - Item text or criteria
 * @param {Object} [options] - Options
 * @param {number} [options.itemWait=1000] - Time to wait for dropdown items to appear
 * @returns {Promise<{success: boolean}>}
 */
async function selectDropdownItem(dropdownCriteria, itemCriteria, options = {}) {
  const { itemWait = 1000 } = options;
  
  // Click dropdown to open
  const openResult = await click(dropdownCriteria);
  if (!openResult.success) {
    log('selectDropdownItem: Failed to open dropdown', 'warn');
    return { success: false };
  }
  
  await sleep(itemWait);
  
  // Click item
  const itemQuery = typeof itemCriteria === 'string' 
    ? { text: itemCriteria } 
    : itemCriteria;
    
  const itemResult = await click(itemQuery);
  return { success: itemResult.success };
}

/**
 * Wait for a window and focus it
 * 
 * @param {string|Object} criteria - Window title or search criteria
 * @param {Object} [options] - Options
 * @param {number} [options.timeout=10000] - Timeout in ms
 * @param {number} [options.pollInterval=500] - Poll interval in ms
 * @returns {Promise<{success: boolean, window: Object|null}>}
 */
async function waitForWindow(criteria, options = {}) {
  const { timeout = 10000, pollInterval = 500 } = options;
  const searchCriteria = typeof criteria === 'string' ? { title: criteria } : criteria;
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const windows = await findWindows(searchCriteria);
    if (windows.length > 0) {
      const result = await focusWindow(windows[0].hwnd);
      return { success: result.success, window: windows[0] };
    }
    await sleep(pollInterval);
  }
  
  log(`waitForWindow: Timeout waiting for window`, 'warn');
  return { success: false, window: null };
}

/**
 * Click a sequence of elements in order
 * 
 * @param {Array<Object>} steps - Array of {criteria, options?, delay?}
 * @returns {Promise<{success: boolean, completedSteps: number}>}
 */
async function clickSequence(steps) {
  let completedSteps = 0;
  
  for (const step of steps) {
    const { criteria, options = {}, delay = 200 } = step;
    
    const result = await click(criteria, options);
    if (!result.success) {
      log(`clickSequence: Failed at step ${completedSteps + 1}`, 'warn');
      return { success: false, completedSteps };
    }
    
    completedSteps++;
    await sleep(delay);
  }
  
  return { success: true, completedSteps };
}

/**
 * Perform hover over an element
 * 
 * @param {Object} criteria - Element search criteria
 * @param {Object} [options] - Options
 * @param {number} [options.duration=500] - How long to hover in ms
 * @returns {Promise<{success: boolean, element: Object|null}>}
 */
async function hover(criteria, options = {}) {
  const { duration = 500 } = options;
  const { moveMouse } = require('../mouse');
  
  const element = await findElement(criteria);
  if (!element) {
    return { success: false, element: null };
  }
  
  const bounds = element.bounds;
  const x = bounds.x + bounds.width / 2;
  const y = bounds.y + bounds.height / 2;
  
  await moveMouse(x, y);
  await sleep(duration);
  
  return { success: true, element };
}

/**
 * Wait for element and click
 * Convenience wrapper combining wait + click
 * 
 * @param {Object} criteria - Element search criteria  
 * @param {Object} [options] - Options
 * @param {number} [options.timeout=5000] - Wait timeout
 * @returns {Promise<{success: boolean, element: Object|null}>}
 */
async function waitAndClick(criteria, options = {}) {
  const { timeout = 5000, ...clickOptions } = options;
  return click(criteria, { ...clickOptions, waitTimeout: timeout });
}

/**
 * Click an element then wait for another element to appear
 * 
 * @param {Object} clickCriteria - Element to click
 * @param {Object} waitCriteria - Element to wait for
 * @param {number} [timeout=10000] - Wait timeout
 * @returns {Promise<{success: boolean, clickedElement?: Object, resultElement?: Object, error?: string}>}
 */
async function clickAndWaitFor(clickCriteria, waitCriteria, timeout = 10000) {
  const clickResult = await click(clickCriteria);
  if (!clickResult.success) {
    return { success: false, error: `Click failed: ${clickResult.error || 'Element not found'}` };
  }
  
  const waitResult = await waitForElement(waitCriteria, { timeout });
  return {
    success: !!waitResult,
    clickedElement: clickResult.element,
    resultElement: waitResult,
    error: waitResult ? undefined : 'Wait timeout',
  };
}

/**
 * Select from a dropdown/combobox (alias for selectDropdownItem)
 * 
 * @param {Object} dropdownCriteria - Dropdown element criteria
 * @param {string} optionText - Text of option to select
 * @param {number} [timeout=5000] - Wait timeout for options
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function selectFromDropdown(dropdownCriteria, optionText, timeout = 5000) {
  // Click the dropdown to open it
  const openResult = await click(dropdownCriteria);
  if (!openResult.success) {
    return { success: false, error: `Failed to open dropdown` };
  }
  
  await sleep(200);
  
  // Find and click the option
  const optionResult = await waitAndClick({ text: optionText }, { timeout });
  if (!optionResult.success) {
    // Try to close dropdown if option not found
    const { sendKeys } = require('../keyboard');
    await sendKeys('{ESC}');
    return { success: false, error: `Option "${optionText}" not found` };
  }
  
  return { success: true, selectedOption: optionText };
}

module.exports = {
  fillField,
  selectDropdownItem,
  waitForWindow,
  clickSequence,
  hover,
  waitAndClick,
  clickAndWaitFor,
  selectFromDropdown,
};
