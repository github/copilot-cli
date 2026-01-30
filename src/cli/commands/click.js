/**
 * click command - Click element by text or coordinates
 * @module cli/commands/click
 */

const path = require('path');
const { success, error, info, Spinner } = require('../util/output');

// Load UI automation module
const UI_MODULE = path.resolve(__dirname, '../../main/ui-automation');
let ui;

function loadUI() {
  if (!ui) {
    ui = require(UI_MODULE);
  }
  return ui;
}

/**
 * Run the click command
 * 
 * Usage:
 *   liku click "Button Text"
 *   liku click 500,300
 *   liku click "Submit" --double
 *   liku click "Menu" --right
 */
async function run(args, options) {
  if (args.length === 0) {
    error('Usage: liku click <text|x,y> [--double] [--right] [--wait <ms>]');
    return { success: false };
  }

  loadUI();
  const target = args.join(' ');
  
  // Check if target is coordinates (e.g., "500,300" or "500 300")
  const coordMatch = target.match(/^(\d+)[,\s]+(\d+)$/);
  
  if (coordMatch) {
    // Click at coordinates
    const x = parseInt(coordMatch[1], 10);
    const y = parseInt(coordMatch[2], 10);
    
    if (!options.quiet) {
      info(`Clicking at (${x}, ${y})...`);
    }
    
    const button = options.right ? 'right' : 'left';
    const clickFn = options.double ? ui.doubleClickAt : ui.clickAt;
    
    const result = await clickFn(x, y, { button });
    
    if (result.success) {
      if (!options.quiet) {
        success(`Clicked at (${x}, ${y})`);
      }
      return { success: true, x, y, method: 'coordinates' };
    } else {
      error(`Click failed: ${result.error || 'Unknown error'}`);
      return { success: false, error: result.error };
    }
  } else {
    // Click by text
    const spinner = !options.quiet ? new Spinner(`Searching for "${target}"`) : null;
    spinner?.start();
    
    const criteria = { text: target };
    
    // Add control type filter if specified
    if (options.type) {
      criteria.controlType = options.type;
    }
    
    // Add window filter if specified
    if (options.window) {
      criteria.windowTitle = options.window;
    }
    
    const clickOptions = {
      button: options.right ? 'right' : 'left',
      doubleClick: options.double || false,
      waitTimeout: options.wait ? parseInt(options.wait, 10) : 0,
    };
    
    const result = await ui.click(criteria, clickOptions);
    
    spinner?.stop();
    
    if (result.success) {
      if (!options.quiet) {
        const element = result.element;
        success(`Clicked "${element?.name || target}" (${element?.controlType || 'unknown'})`);
      }
      return { 
        success: true, 
        element: result.element,
        method: 'text',
      };
    } else {
      error(`Element not found: "${target}"`);
      return { success: false, error: result.error || 'Element not found' };
    }
  }
}

module.exports = { run };
