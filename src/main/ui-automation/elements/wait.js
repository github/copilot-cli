/**
 * Element Wait Utilities
 * 
 * Wait for elements to appear or disappear.
 * @module ui-automation/elements/wait
 */

const { CONFIG } = require('../config');
const { sleep } = require('../core/helpers');
const { findElement } = require('./finder');

/**
 * Wait for an element to appear
 * 
 * @param {Object} options - Search criteria (same as findElement)
 * @param {number} [timeout=10000] - Maximum wait time in ms
 * @returns {Promise<{success: boolean, element: Object|null, elapsed: number, error?: string}>}
 */
async function waitForElement(options = {}, timeout = CONFIG.DEFAULT_TIMEOUT) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const result = await findElement(options);
    if (result.success && result.element) {
      return {
        success: true,
        element: result.element,
        elapsed: Date.now() - startTime,
      };
    }
    await sleep(CONFIG.ELEMENT_WAIT_INTERVAL);
  }
  
  return {
    success: false,
    element: null,
    elapsed: Date.now() - startTime,
    error: `Element not found within ${timeout}ms`,
  };
}

/**
 * Wait for an element to disappear
 * 
 * @param {Object} options - Search criteria (same as findElement)
 * @param {number} [timeout=10000] - Maximum wait time in ms
 * @returns {Promise<{success: boolean, elapsed: number}>}
 */
async function waitForElementGone(options = {}, timeout = CONFIG.DEFAULT_TIMEOUT) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const result = await findElement(options);
    if (!result.success || !result.element) {
      return { success: true, elapsed: Date.now() - startTime };
    }
    await sleep(CONFIG.ELEMENT_WAIT_INTERVAL);
  }
  
  return { success: false, elapsed: Date.now() - startTime };
}

module.exports = {
  waitForElement,
  waitForElementGone,
};
