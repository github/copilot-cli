/**
 * find command - Find UI elements matching criteria
 * @module cli/commands/find
 */

const path = require('path');
const { success, error, info, table, dim, highlight } = require('../util/output');

const UI_MODULE = path.resolve(__dirname, '../../main/ui-automation');
let ui;

function loadUI() {
  if (!ui) {
    ui = require(UI_MODULE);
  }
  return ui;
}

/**
 * Run the find command
 * 
 * Usage:
 *   liku find "Button Text"
 *   liku find "Save" --type Button
 *   liku find "*" --type Edit --window "Notepad"
 */
async function run(args, options) {
  if (args.length === 0) {
    error('Usage: liku find <text> [--type <ControlType>] [--window <title>]');
    return { success: false };
  }

  loadUI();
  const searchText = args.join(' ');
  
  if (!options.quiet) {
    info(`Searching for elements matching "${searchText}"...`);
  }
  
  const criteria = {};
  
  // Handle wildcard search (find all of a type)
  if (searchText !== '*') {
    criteria.text = searchText;
  }
  
  if (options.type) {
    criteria.controlType = options.type;
  }
  
  if (options.window) {
    criteria.windowTitle = options.window;
  }
  
  if (options.id) {
    criteria.automationId = options.id;
  }
  
  if (options.class) {
    criteria.className = options.class;
  }
  
  const result = await ui.findElements(criteria);
  
  if (!result.success) {
    error(`Search failed: ${result.error}`);
    return { success: false, error: result.error };
  }
  
  if (result.count === 0) {
    if (!options.quiet) {
      info('No elements found matching criteria');
    }
    return { success: true, elements: [], count: 0 };
  }
  
  if (!options.quiet && !options.json) {
    success(`Found ${result.count} element(s):\n`);
    
    // Display as table
    const rows = result.elements.map((el, i) => [
      i + 1,
      el.name?.substring(0, 40) || dim('(unnamed)'),
      el.controlType || '-',
      el.bounds ? `${el.bounds.x},${el.bounds.y}` : '-',
      el.bounds ? `${el.bounds.width}x${el.bounds.height}` : '-',
    ]);
    
    table(rows, ['#', 'Name', 'Type', 'Position', 'Size']);
    
    // Show automation IDs if verbose
    if (options.verbose) {
      console.log('\n' + dim('Automation IDs:'));
      result.elements.forEach((el, i) => {
        if (el.automationId) {
          console.log(`  ${i + 1}. ${highlight(el.automationId)}`);
        }
      });
    }
  }
  
  return {
    success: true,
    elements: result.elements,
    count: result.count,
  };
}

module.exports = { run };
