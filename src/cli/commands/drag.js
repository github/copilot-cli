/**
 * drag command - Drag from one point to another
 * @module cli/commands/drag
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
 * Run the drag command
 * 
 * Usage:
 *   liku drag 100 100 500 300
 *   liku drag 100,100 to 500,300
 */
async function run(args, options) {
  loadUI();
  
  // Parse coordinates
  let fromX, fromY, toX, toY;
  
  // Remove "to" keyword if present
  const cleanArgs = args.filter(a => a.toLowerCase() !== 'to');
  
  if (cleanArgs.length === 2) {
    // Format: "100,100" "500,300"
    const from = cleanArgs[0].split(',');
    const to = cleanArgs[1].split(',');
    fromX = parseInt(from[0], 10);
    fromY = parseInt(from[1], 10);
    toX = parseInt(to[0], 10);
    toY = parseInt(to[1], 10);
  } else if (cleanArgs.length >= 4) {
    // Format: "100 100 500 300"
    fromX = parseInt(cleanArgs[0], 10);
    fromY = parseInt(cleanArgs[1], 10);
    toX = parseInt(cleanArgs[2], 10);
    toY = parseInt(cleanArgs[3], 10);
  } else {
    error('Usage: liku drag <fromX> <fromY> <toX> <toY>');
    info('Example: liku drag 100 100 500 300');
    return { success: false };
  }
  
  if ([fromX, fromY, toX, toY].some(isNaN)) {
    error('Invalid coordinates. Use numbers.');
    return { success: false };
  }
  
  if (!options.quiet) {
    info(`Dragging from (${fromX}, ${fromY}) to (${toX}, ${toY})...`);
  }
  
  const dragOptions = {};
  if (options.steps) {
    dragOptions.steps = parseInt(options.steps, 10);
  }
  if (options.delay) {
    dragOptions.stepDelay = parseInt(options.delay, 10);
  }
  
  const result = await ui.drag(fromX, fromY, toX, toY, dragOptions);
  
  if (result.success) {
    if (!options.quiet) {
      success(`Dragged from (${fromX}, ${fromY}) to (${toX}, ${toY})`);
    }
    return { success: true, from: { x: fromX, y: fromY }, to: { x: toX, y: toY } };
  } else {
    error(`Drag failed: ${result.error || 'Unknown error'}`);
    return { success: false, error: result.error };
  }
}

module.exports = { run };
