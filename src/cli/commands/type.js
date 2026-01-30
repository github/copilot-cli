/**
 * type command - Type text at cursor position
 * @module cli/commands/type
 */

const path = require('path');
const { success, error, info } = require('../util/output');

const UI_MODULE = path.resolve(__dirname, '../../main/ui-automation');
let ui;

function loadUI() {
  if (!ui) {
    ui = require(UI_MODULE);
  }
  return ui;
}

/**
 * Run the type command
 * 
 * Usage:
 *   liku type "Hello World"
 *   liku type "slow typing" --delay 100
 */
async function run(args, options) {
  if (args.length === 0) {
    error('Usage: liku type <text> [--delay <ms>]');
    return { success: false };
  }

  loadUI();
  const text = args.join(' ');
  
  if (!options.quiet) {
    info(`Typing: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`);
  }
  
  const typeOptions = {};
  if (options.delay) {
    typeOptions.delay = parseInt(options.delay, 10);
  }
  
  const result = await ui.typeText(text, typeOptions);
  
  if (result.success) {
    if (!options.quiet) {
      success(`Typed ${text.length} characters`);
    }
    return { success: true, length: text.length };
  } else {
    error(`Type failed: ${result.error || 'Unknown error'}`);
    return { success: false, error: result.error };
  }
}

module.exports = { run };
