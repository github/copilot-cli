/**
 * Utility Helpers
 * 
 * Common utility functions for UI automation.
 * @module ui-automation/core/helpers
 */

const { CONFIG } = require('../config');

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Log debug messages when DEBUG mode is enabled
 * @param {...any} args - Arguments to log
 */
function debug(...args) {
  if (CONFIG.DEBUG) {
    console.log('[UI-AUTO DEBUG]', ...args);
  }
}

/**
 * Log automation actions
 * @param {...any} args - Arguments to log
 */
function log(...args) {
  console.log('[UI-AUTO]', ...args);
}

module.exports = {
  sleep,
  debug,
  log,
};
