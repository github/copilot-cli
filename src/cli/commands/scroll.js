/**
 * scroll command - Scroll up or down
 * @module cli/commands/scroll
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
 * Run the scroll command
 * 
 * Usage:
 *   liku scroll up
 *   liku scroll down 5
 *   liku scroll left 3
 */
async function run(args, options) {
  loadUI();
  
  if (args.length === 0) {
    error('Usage: liku scroll <up|down|left|right> [amount]');
    return { success: false };
  }
  
  const direction = args[0].toLowerCase();
  const amount = args[1] ? parseInt(args[1], 10) : 3;
  
  if (!['up', 'down', 'left', 'right'].includes(direction)) {
    error('Direction must be: up, down, left, or right');
    return { success: false };
  }
  
  if (!options.quiet) {
    info(`Scrolling ${direction} by ${amount}...`);
  }
  
  let result;
  switch (direction) {
    case 'up':
      result = await ui.scrollUp(amount);
      break;
    case 'down':
      result = await ui.scrollDown(amount);
      break;
    case 'left':
      result = await ui.scrollLeft(amount);
      break;
    case 'right':
      result = await ui.scrollRight(amount);
      break;
  }
  
  if (result.success) {
    if (!options.quiet) {
      success(`Scrolled ${direction} by ${amount}`);
    }
    return { success: true, direction, amount };
  } else {
    error(`Scroll failed: ${result.error || 'Unknown error'}`);
    return { success: false, error: result.error };
  }
}

module.exports = { run };
