/**
 * mouse command - Move mouse to coordinates
 * @module cli/commands/mouse
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
 * Run the mouse command
 * 
 * Usage:
 *   liku mouse 500 300         # Move to coordinates
 *   liku mouse --pos           # Show current position
 */
async function run(args, options) {
  loadUI();
  
  // Show current position
  if (options.pos || options.position || args.length === 0) {
    const pos = await ui.getMousePosition();
    
    if (!options.quiet && !options.json) {
      console.log(`Mouse position: (${pos.x}, ${pos.y})`);
    }
    
    return { success: true, x: pos.x, y: pos.y };
  }
  
  // Parse coordinates
  let x, y;
  
  if (args.length === 1 && args[0].includes(',')) {
    // Format: "500,300"
    const parts = args[0].split(',');
    x = parseInt(parts[0], 10);
    y = parseInt(parts[1], 10);
  } else if (args.length >= 2) {
    // Format: "500 300"
    x = parseInt(args[0], 10);
    y = parseInt(args[1], 10);
  } else {
    error('Usage: liku mouse <x> <y>');
    return { success: false };
  }
  
  if (isNaN(x) || isNaN(y)) {
    error('Invalid coordinates. Use numbers like: liku mouse 500 300');
    return { success: false };
  }
  
  if (!options.quiet) {
    info(`Moving mouse to (${x}, ${y})...`);
  }
  
  const result = await ui.moveMouse(x, y);
  
  if (result.success) {
    if (!options.quiet) {
      success(`Mouse moved to (${x}, ${y})`);
    }
    return { success: true, x, y };
  } else {
    error(`Move failed: ${result.error || 'Unknown error'}`);
    return { success: false, error: result.error };
  }
}

module.exports = { run };
