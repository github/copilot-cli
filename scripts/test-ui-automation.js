/**
 * Test script for UI Automation module
 * 
 * Usage:
 *   node scripts/test-ui-automation.js find "Search Text"
 *   node scripts/test-ui-automation.js click "Button Name"
 *   node scripts/test-ui-automation.js click "Button Name" --type=Button
 *   node scripts/test-ui-automation.js windows "Visual Studio"
 *   node scripts/test-ui-automation.js focus "Visual Studio Code"
 *   node scripts/test-ui-automation.js screenshot
 *   node scripts/test-ui-automation.js mouse 500 300
 *   node scripts/test-ui-automation.js type "Hello World"
 *   node scripts/test-ui-automation.js keys "ctrl+s"
 *   node scripts/test-ui-automation.js dropdown "Model Picker" "GPT-4"
 */

const ui = require('../src/main/ui-automation');

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command) {
    console.log(`
UI Automation Test Commands:

  find <text> [--type=ControlType]    Find elements by text
  click <text> [--type=ControlType]   Click element by text
  windows [pattern]                   List windows (optionally filtered)
  focus <title>                       Focus window by title
  screenshot [path]                   Take screenshot
  mouse <x> <y>                       Move mouse to coordinates
  clickat <x> <y>                     Click at coordinates
  type <text>                         Type text
  keys <combo>                        Send key combination (e.g., ctrl+s)
  dropdown <name> <option>            Select from dropdown
  wait <text> [timeout]               Wait for element
  active                              Get active window info

Examples:
  node scripts/test-ui-automation.js find "File"
  node scripts/test-ui-automation.js click "Pick Model" --type=Button
  node scripts/test-ui-automation.js windows "Code"
  node scripts/test-ui-automation.js keys "ctrl+shift+p"
  node scripts/test-ui-automation.js dropdown "Pick Model" "GPT-4"
`);
    return;
  }

  // Parse options
  const options = {};
  const positionalArgs = [];
  for (const arg of args.slice(1)) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      options[key] = value || true;
    } else {
      positionalArgs.push(arg);
    }
  }

  try {
    switch (command.toLowerCase()) {
      case 'find': {
        const text = positionalArgs[0];
        if (!text) {
          console.error('Usage: find <text> [--type=ControlType]');
          return;
        }
        
        console.log(`Searching for elements containing "${text}"...`);
        const result = await ui.findElements({
          text,
          controlType: options.type || '',
        });
        
        console.log(`Found ${result.count} element(s):\n`);
        result.elements.forEach((el, i) => {
          console.log(`  [${i}] "${el.Name}"`);
          console.log(`       Type: ${el.ControlType}`);
          console.log(`       Center: (${el.Bounds.CenterX}, ${el.Bounds.CenterY})`);
          console.log(`       Size: ${el.Bounds.Width}x${el.Bounds.Height}`);
          console.log(`       Enabled: ${el.IsEnabled}`);
          if (el.AutomationId) console.log(`       AutomationId: ${el.AutomationId}`);
          if (el.Patterns?.length) console.log(`       Patterns: ${el.Patterns.join(', ')}`);
          console.log('');
        });
        break;
      }
      
      case 'click': {
        const text = positionalArgs[0];
        if (!text) {
          console.error('Usage: click <text> [--type=ControlType]');
          return;
        }
        
        console.log(`Clicking element containing "${text}"...`);
        const result = await ui.click({
          text,
          controlType: options.type || '',
        });
        
        if (result.success) {
          console.log(`✓ Clicked "${result.element?.Name}" using ${result.method}`);
          if (result.coordinates) {
            console.log(`  at (${result.coordinates.x}, ${result.coordinates.y})`);
          }
        } else {
          console.error(`✗ Click failed: ${result.error}`);
        }
        break;
      }
      
      case 'windows': {
        const pattern = positionalArgs[0] || '';
        console.log(`Finding windows${pattern ? ` matching "${pattern}"` : ''}...`);
        
        const windows = await ui.findWindows(pattern);
        console.log(`\nFound ${windows.length} window(s):\n`);
        windows.forEach((w, i) => {
          console.log(`  [${i}] "${w.title}"`);
          console.log(`       Process: ${w.processName}`);
          console.log(`       Handle: ${w.hwnd}\n`);
        });
        break;
      }
      
      case 'focus': {
        const title = positionalArgs[0];
        if (!title) {
          console.error('Usage: focus <window title>');
          return;
        }
        
        console.log(`Focusing window "${title}"...`);
        const result = await ui.focusWindow(title);
        
        if (result.success) {
          console.log(`✓ Focused window: ${result.window?.title}`);
        } else {
          console.error(`✗ Focus failed: ${result.error}`);
        }
        break;
      }
      
      case 'screenshot': {
        const savePath = positionalArgs[0];
        console.log('Taking screenshot...');
        
        const result = await ui.screenshot({ path: savePath });
        
        if (result.success) {
          console.log(`✓ Screenshot saved to: ${result.path}`);
        } else {
          console.error('✗ Screenshot failed');
        }
        break;
      }
      
      case 'mouse': {
        const x = parseInt(positionalArgs[0]);
        const y = parseInt(positionalArgs[1]);
        
        if (isNaN(x) || isNaN(y)) {
          console.error('Usage: mouse <x> <y>');
          return;
        }
        
        console.log(`Moving mouse to (${x}, ${y})...`);
        await ui.moveMouse(x, y);
        console.log('✓ Done');
        break;
      }
      
      case 'clickat': {
        const x = parseInt(positionalArgs[0]);
        const y = parseInt(positionalArgs[1]);
        
        if (isNaN(x) || isNaN(y)) {
          console.error('Usage: clickat <x> <y>');
          return;
        }
        
        console.log(`Clicking at (${x}, ${y})...`);
        const result = await ui.clickAt(x, y);
        
        if (result.success) {
          console.log('✓ Clicked');
        } else {
          console.error('✗ Click failed');
        }
        break;
      }
      
      case 'type': {
        const text = positionalArgs.join(' ');
        if (!text) {
          console.error('Usage: type <text>');
          return;
        }
        
        console.log(`Typing "${text}"...`);
        const result = await ui.typeText(text);
        
        if (result.success) {
          console.log('✓ Typed');
        } else {
          console.error('✗ Type failed');
        }
        break;
      }
      
      case 'keys': {
        const combo = positionalArgs[0];
        if (!combo) {
          console.error('Usage: keys <combo> (e.g., ctrl+s, alt+f4, enter)');
          return;
        }
        
        console.log(`Sending keys: ${combo}...`);
        const result = await ui.sendKeys(combo);
        
        if (result.success) {
          console.log('✓ Keys sent');
        } else {
          console.error('✗ Send keys failed');
        }
        break;
      }
      
      case 'dropdown': {
        const dropdownName = positionalArgs[0];
        const optionText = positionalArgs[1];
        
        if (!dropdownName || !optionText) {
          console.error('Usage: dropdown <dropdown name> <option text>');
          return;
        }
        
        console.log(`Selecting "${optionText}" from "${dropdownName}"...`);
        const result = await ui.selectFromDropdown({ text: dropdownName }, optionText);
        
        if (result.success) {
          console.log(`✓ Selected: ${result.selectedOption}`);
        } else {
          console.error(`✗ Selection failed: ${result.error}`);
        }
        break;
      }
      
      case 'wait': {
        const text = positionalArgs[0];
        const timeout = parseInt(positionalArgs[1]) || 10000;
        
        if (!text) {
          console.error('Usage: wait <text> [timeout_ms]');
          return;
        }
        
        console.log(`Waiting for element "${text}" (timeout: ${timeout}ms)...`);
        const result = await ui.waitForElement({ text }, timeout);
        
        if (result.success) {
          console.log(`✓ Found after ${result.elapsed}ms: "${result.element?.Name}"`);
        } else {
          console.error(`✗ Timed out: ${result.error}`);
        }
        break;
      }
      
      case 'active': {
        console.log('Getting active window info...');
        const info = await ui.getActiveWindow();
        
        console.log(`\nActive Window:`);
        console.log(`  Title: ${info.title}`);
        console.log(`  Process: ${info.processName}`);
        console.log(`  Handle: ${info.hwnd}`);
        break;
      }
      
      default:
        console.error(`Unknown command: ${command}`);
        console.log('Run without arguments to see available commands.');
    }
  } catch (err) {
    console.error('Error:', err.message);
    if (process.env.DEBUG) {
      console.error(err.stack);
    }
  }
}

main();
