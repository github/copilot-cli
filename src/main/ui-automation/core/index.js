/**
 * Core utilities for UI automation
 * @module ui-automation/core
 */

const { executePowerShellScript, executePowerShell } = require('./powershell');
const { sleep, debug, log } = require('./helpers');

module.exports = {
  executePowerShellScript,
  executePowerShell,
  sleep,
  debug,
  log,
};
