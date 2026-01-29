/**
 * wait command - Wait for element to appear
 * @module cli/commands/wait
 */

const path = require('path');
const { success, error, info, Spinner } = require('../util/output');

const UI_MODULE = path.resolve(__dirname, '../../main/ui-automation');
let ui;

function loadUI() {
  if (!ui) {
    ui = require(UI_MODULE);
  }
  return ui;
}

/**
 * Run the wait command
 * 
 * Usage:
 *   liku wait "Loading..."              # Wait up to 10s for element
 *   liku wait "Submit" 5000             # Wait up to 5s
 *   liku wait "Dialog" --gone           # Wait for element to disappear
 */
async function run(args, options) {
  loadUI();
  
  if (args.length === 0) {
    error('Usage: liku wait <text> [timeout] [--gone]');
    return { success: false };
  }
  
  const searchText = args[0];
  const timeout = args[1] ? parseInt(args[1], 10) : 10000;
  const waitGone = options.gone || false;
  
  const spinner = !options.quiet ? new Spinner(
    waitGone 
      ? `Waiting for "${searchText}" to disappear` 
      : `Waiting for "${searchText}"`
  ) : null;
  
  spinner?.start();
  
  const criteria = { text: searchText };
  
  if (options.type) {
    criteria.controlType = options.type;
  }
  
  const result = waitGone 
    ? await ui.waitForElementGone(criteria, timeout)
    : await ui.waitForElement(criteria, { timeout });
  
  spinner?.stop();
  
  if (result.success) {
    if (!options.quiet) {
      success(
        waitGone
          ? `"${searchText}" disappeared after ${result.elapsed}ms`
          : `Found "${searchText}" after ${result.elapsed}ms`
      );
    }
    return { 
      success: true, 
      elapsed: result.elapsed,
      element: result.element,
    };
  } else {
    if (!options.quiet) {
      error(
        waitGone
          ? `"${searchText}" did not disappear within ${timeout}ms`
          : `"${searchText}" not found within ${timeout}ms`
      );
    }
    return { success: false, elapsed: result.elapsed, timeout };
  }
}

module.exports = { run };
