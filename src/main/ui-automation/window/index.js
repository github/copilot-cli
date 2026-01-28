/**
 * Window Management Module
 * 
 * @module ui-automation/window
 */

const {
  getActiveWindow,
  findWindows,
  focusWindow,
  minimizeWindow,
  maximizeWindow,
  restoreWindow,
} = require('./manager');

module.exports = {
  getActiveWindow,
  findWindows,
  focusWindow,
  minimizeWindow,
  maximizeWindow,
  restoreWindow,
};
