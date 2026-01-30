/**
 * window command - Window management
 * @module cli/commands/window
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
 * Run the window command
 * 
 * Usage:
 *   liku window                     # List all windows
 *   liku window "Visual Studio"    # Focus window by title
 *   liku window --active           # Show active window info
 */
async function run(args, options) {
  loadUI();
  
  // Show active window info
  if (options.active) {
    const win = await ui.getActiveWindow();
    if (!win) {
      error('Could not get active window');
      return { success: false };
    }
    
    if (!options.quiet && !options.json) {
      const bounds = win.bounds || { x: '?', y: '?', width: '?', height: '?' };
      console.log(`
${highlight('Active Window:')}
  Title:    ${win.title || '(unknown)'}
  Process:  ${win.processName || '(unknown)'}
  Class:    ${win.className || '(unknown)'}
  Handle:   ${win.hwnd}
  Position: ${bounds.x}, ${bounds.y}
  Size:     ${bounds.width} x ${bounds.height}
`);
    }
    return { success: true, window: win };
  }
  
  // Focus window by title
  if (args.length > 0) {
    const title = args.join(' ');
    
    if (!options.quiet) {
      info(`Focusing window: "${title}"`);
    }
    
    const result = await ui.focusWindow({ title });
    
    if (result.success) {
      if (!options.quiet) {
        success(`Focused: ${result.window?.title || title}`);
      }
      return { success: true, window: result.window };
    } else {
      error(`Window not found: "${title}"`);
      return { success: false, error: 'Window not found' };
    }
  }
  
  // List all windows
  if (!options.quiet) {
    info('Listing windows...');
  }
  
  const windows = await ui.findWindows({});
  
  if (windows.length === 0) {
    if (!options.quiet) {
      info('No windows found');
    }
    return { success: true, windows: [], count: 0 };
  }
  
  if (!options.quiet && !options.json) {
    console.log(`\n${highlight(`Found ${windows.length} windows:`)}\n`);
    
    const rows = windows.map((w, i) => [
      i + 1,
      w.title?.substring(0, 50) || dim('(untitled)'),
      w.processName || '-',
      `${w.bounds.width}x${w.bounds.height}`,
    ]);
    
    table(rows, ['#', 'Title', 'Process', 'Size']);
  }
  
  return { success: true, windows, count: windows.length };
}

module.exports = { run };
