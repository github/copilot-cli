/**
 * repl command - Interactive automation shell
 * @module cli/commands/repl
 */

const readline = require('readline');
const path = require('path');
const { success, error, info, warn, highlight, dim, bold } = require('../util/output');

const UI_MODULE = path.resolve(__dirname, '../../main/ui-automation');
let ui;

function loadUI() {
  if (!ui) {
    ui = require(UI_MODULE);
  }
  return ui;
}

/**
 * Show REPL help
 */
function showHelp() {
  console.log(`
${bold('Liku Interactive Shell')}
${dim('Type commands to execute UI automation')}

${highlight('Commands:')}
  click <text|x,y>       Click element or coordinates
  find <text>            Find elements matching text
  type <text>            Type text
  keys <combo>           Send key combo (ctrl+c, enter, etc.)
  window [title]         List or focus windows
  mouse <x> <y>          Move mouse
  pos                    Show mouse position
  screenshot [path]      Take screenshot
  scroll <up|down> [n]   Scroll direction
  wait <text> [ms]       Wait for element
  sleep <ms>             Wait for milliseconds
  
${highlight('Special:')}
  help                   Show this help
  clear                  Clear screen
  exit, quit, q          Exit REPL
  
${highlight('Examples:')}
  ${dim('> click "Submit"')}
  ${dim('> find "Save" | Button')}
  ${dim('> type "Hello World"')}
  ${dim('> keys ctrl+s')}
  ${dim('> window "Notepad"')}
`);
}

/**
 * Parse and execute a REPL command
 */
async function executeCommand(line) {
  const parts = line.trim().split(/\s+/);
  const cmd = parts[0]?.toLowerCase();
  const args = parts.slice(1);
  
  if (!cmd) return;
  
  switch (cmd) {
    case 'help':
    case '?':
      showHelp();
      break;
      
    case 'clear':
    case 'cls':
      console.clear();
      break;
      
    case 'exit':
    case 'quit':
    case 'q':
      return 'exit';
      
    case 'click': {
      const target = args.join(' ');
      if (!target) {
        error('Usage: click <text|x,y>');
        break;
      }
      
      const coordMatch = target.match(/^(\d+)[,\s]+(\d+)$/);
      if (coordMatch) {
        const x = parseInt(coordMatch[1], 10);
        const y = parseInt(coordMatch[2], 10);
        const result = await ui.clickAt(x, y);
        result.success ? success(`Clicked at (${x}, ${y})`) : error('Click failed');
      } else {
        const result = await ui.click({ text: target });
        result.success 
          ? success(`Clicked "${result.element?.name || target}"`)
          : error(`Not found: "${target}"`);
      }
      break;
    }
    
    case 'find': {
      const text = args.join(' ');
      if (!text) {
        error('Usage: find <text>');
        break;
      }
      
      // Check for type filter: find "text" | Button
      const filterMatch = text.match(/^(.+?)\s*\|\s*(\w+)$/);
      const criteria = filterMatch 
        ? { text: filterMatch[1].trim(), controlType: filterMatch[2] }
        : { text };
      
      const result = await ui.findElements(criteria);
      if (result.count === 0) {
        info('No elements found');
      } else {
        console.log(`Found ${result.count} elements:`);
        result.elements.slice(0, 10).forEach((el, i) => {
          console.log(`  ${i + 1}. ${el.name || '(unnamed)'} [${el.controlType}] @ ${el.bounds?.x},${el.bounds?.y}`);
        });
        if (result.count > 10) {
          console.log(dim(`  ... and ${result.count - 10} more`));
        }
      }
      break;
    }
    
    case 'type': {
      const text = args.join(' ');
      if (!text) {
        error('Usage: type <text>');
        break;
      }
      const result = await ui.typeText(text);
      result.success ? success(`Typed ${text.length} chars`) : error('Type failed');
      break;
    }
    
    case 'keys':
    case 'key': {
      const combo = args.join(' ');
      if (!combo) {
        error('Usage: keys <combo>');
        break;
      }
      // Simple conversion
      const sendKeys = combo
        .replace(/ctrl\+/gi, '^')
        .replace(/alt\+/gi, '%')
        .replace(/shift\+/gi, '+')
        .replace(/enter/gi, '{ENTER}')
        .replace(/tab/gi, '{TAB}')
        .replace(/esc(ape)?/gi, '{ESC}');
      const result = await ui.sendKeys(sendKeys);
      result.success ? success(`Sent: ${combo}`) : error('Keys failed');
      break;
    }
    
    case 'window':
    case 'win': {
      const title = args.join(' ');
      if (title) {
        const result = await ui.focusWindow({ title });
        result.success 
          ? success(`Focused: ${result.window?.title || title}`)
          : error(`Window not found: "${title}"`);
      } else {
        const windows = await ui.findWindows({});
        console.log(`${windows.length} windows:`);
        windows.slice(0, 15).forEach((w, i) => {
          console.log(`  ${i + 1}. ${w.title?.substring(0, 50) || '(untitled)'} [${w.processName}]`);
        });
      }
      break;
    }
    
    case 'mouse':
    case 'move': {
      if (args.length < 2) {
        error('Usage: mouse <x> <y>');
        break;
      }
      const x = parseInt(args[0], 10);
      const y = parseInt(args[1], 10);
      const result = await ui.moveMouse(x, y);
      result.success ? success(`Moved to (${x}, ${y})`) : error('Move failed');
      break;
    }
    
    case 'pos':
    case 'position': {
      const pos = await ui.getMousePosition();
      console.log(`Mouse: (${pos.x}, ${pos.y})`);
      break;
    }
    
    case 'screenshot':
    case 'ss': {
      const savePath = args[0] || `screenshot_${Date.now()}.png`;
      const result = await ui.screenshot({ path: savePath });
      result.success ? success(`Saved: ${result.path}`) : error('Screenshot failed');
      break;
    }
    
    case 'scroll': {
      const dir = args[0]?.toLowerCase();
      const amount = parseInt(args[1], 10) || 3;
      if (!['up', 'down', 'left', 'right'].includes(dir)) {
        error('Usage: scroll <up|down|left|right> [amount]');
        break;
      }
      const fn = { up: 'scrollUp', down: 'scrollDown', left: 'scrollLeft', right: 'scrollRight' }[dir];
      const result = await ui[fn](amount);
      result.success ? success(`Scrolled ${dir}`) : error('Scroll failed');
      break;
    }
    
    case 'wait': {
      const text = args[0];
      const timeout = parseInt(args[1], 10) || 5000;
      if (!text) {
        error('Usage: wait <text> [timeout]');
        break;
      }
      info(`Waiting for "${text}"...`);
      const result = await ui.waitForElement({ text }, { timeout });
      result.success 
        ? success(`Found after ${result.elapsed}ms`)
        : warn(`Not found within ${timeout}ms`);
      break;
    }
    
    case 'sleep':
    case 'delay': {
      const ms = parseInt(args[0], 10) || 1000;
      await ui.sleep(ms);
      success(`Waited ${ms}ms`);
      break;
    }
    
    default:
      error(`Unknown command: ${cmd}`);
      info('Type "help" for available commands');
  }
}

/**
 * Run the REPL
 */
async function run(args, options) {
  loadUI();
  
  console.log(`
${bold('Liku Interactive Shell')} ${dim('v1.0')}
${dim('Type "help" for commands, "exit" to quit')}
`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: highlight('liku> '),
  });

  rl.prompt();

  return new Promise((resolve) => {
    rl.on('line', async (line) => {
      try {
        const result = await executeCommand(line);
        if (result === 'exit') {
          rl.close();
          return;
        }
      } catch (err) {
        error(err.message);
      }
      rl.prompt();
    });

    rl.on('close', () => {
      console.log('\nGoodbye!');
      resolve({ success: true });
    });
  });
}

module.exports = { run };
