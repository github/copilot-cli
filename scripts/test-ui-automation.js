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

async function ensureWindowTarget(options = {}) {
  const title = options['target-title'] || options.title || '';
  const processName = options['target-process'] || options.process || '';
  const className = options['target-class'] || options.class || '';

  if (!title && !processName && !className) {
    return { success: true, window: null, reason: 'no-target-requested' };
  }

  const criteria = {
    ...(title ? { title } : {}),
    ...(processName ? { processName } : {}),
    ...(className ? { className } : {}),
  };

  const windows = await ui.findWindows(criteria);
  if (!windows.length) {
    return { success: false, window: null, reason: `No window matched ${JSON.stringify(criteria)}` };
  }

  const focusResult = await ui.focusWindow(windows[0]);
  if (!focusResult.success) {
    return { success: false, window: windows[0], reason: `Failed to focus window ${windows[0].title}` };
  }

  const active = await ui.getActiveWindow();
  if (!active) {
    return { success: false, window: windows[0], reason: 'Could not read active window after focus' };
  }

  if (processName && active.processName.toLowerCase() !== processName.toLowerCase()) {
    return {
      success: false,
      window: windows[0],
      reason: `Active window process mismatch. Expected ${processName}, got ${active.processName}`,
    };
  }

  if (title && !active.title.toLowerCase().includes(title.toLowerCase())) {
    return {
      success: false,
      window: windows[0],
      reason: `Active window title mismatch. Expected contains "${title}", got "${active.title}"`,
    };
  }

  return { success: true, window: active, reason: 'focused-and-verified' };
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command) {
    console.log(`
UI Automation Test Commands:

  find <text> [--type=ControlType]    Find elements by text
  click <text> [--type=ControlType]   Click element by text
  windows [pattern] [--process=name]  List windows (optionally filtered)
  focus <title> [--process=name]      Focus window by title/criteria
  screenshot [path]                   Take screenshot
  mouse <x> <y>                       Move mouse to coordinates
  clickat <x> <y>                     Click at coordinates
  type <text>                         Type text
  keys <combo> [--target-process=electron --target-title=Overlay]
                                      Send key combination only after target focus verification
  dropdown <name> <option>            Select from dropdown
  wait <text> [timeout]               Wait for element
  active                              Get active window info

Examples:
  node scripts/test-ui-automation.js find "File"
  node scripts/test-ui-automation.js click "Pick Model" --type=Button
  node scripts/test-ui-automation.js windows "Code" --process="Code - Insiders"
  node scripts/test-ui-automation.js keys "ctrl+shift+p"
  node scripts/test-ui-automation.js keys "ctrl+shift+o" --target-process=electron --target-title=Overlay
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

        const criteria = {
          ...(pattern ? { title: pattern } : {}),
          ...(options.process ? { processName: options.process } : {}),
          ...(options.class ? { className: options.class } : {}),
          ...(options['include-untitled'] ? { includeUntitled: true } : {}),
        };

        const windows = await ui.findWindows(criteria);
        console.log(`\nFound ${windows.length} window(s):\n`);
        windows.forEach((w, i) => {
          console.log(`  [${i}] "${w.title}"`);
          console.log(`       Process: ${w.processName}`);
          console.log(`       Handle: ${w.hwnd}\n`);
        });

        if (options['require-match'] && windows.length === 0) {
          console.error('✗ No windows matched required criteria.');
          process.exitCode = 1;
        }

        if (options['min-count']) {
          const minCount = parseInt(options['min-count'], 10);
          if (!Number.isNaN(minCount) && windows.length < minCount) {
            console.error(`✗ Window count ${windows.length} below required min-count ${minCount}.`);
            process.exitCode = 1;
          }
        }
        break;
      }
      
      case 'focus': {
        const title = positionalArgs[0];
        if (!title && !options.process && !options.class) {
          console.error('Usage: focus <window title> [--process=name] [--class=name]');
          return;
        }

        const target = {
          ...(title ? { title } : {}),
          ...(options.process ? { processName: options.process } : {}),
          ...(options.class ? { className: options.class } : {}),
        };

        console.log(`Focusing window ${JSON.stringify(target)}...`);
        const result = await ui.focusWindow(target);
        
        if (result.success) {
          console.log(`✓ Focused window: ${result.window?.title}`);
        } else {
          console.error(`✗ Focus failed: ${result.error}`);
          process.exitCode = 1;
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

        const targetResult = await ensureWindowTarget(options);
        if (!targetResult.success) {
          console.error(`✗ Target verification failed: ${targetResult.reason}`);
          process.exitCode = 1;
          return;
        }

        if (targetResult.window) {
          console.log(`Target active window: "${targetResult.window.title}" (${targetResult.window.processName})`);
        }
        
        console.log(`Sending keys: ${combo}...`);
        const result = await ui.sendKeys(combo);
        
        if (result.success) {
          console.log('✓ Keys sent');
        } else {
          console.error('✗ Send keys failed');
          process.exitCode = 1;
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
