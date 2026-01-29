#!/usr/bin/env node
/**
 * liku - Copilot-Liku CLI
 * 
 * A powerful command-line interface for UI automation and the Copilot-Liku agent.
 * 
 * Usage:
 *   liku                    Start the Electron agent (visual mode)
 *   liku start              Same as above
 *   liku click <text>       Click element by text
 *   liku find <text>        Find UI elements matching text
 *   liku type <text>        Type text at cursor
 *   liku keys <combo>       Send key combination (e.g., "ctrl+c")
 *   liku screenshot [path]  Take screenshot
 *   liku window <title>     Focus window by title
 *   liku mouse <x> <y>      Move mouse to coordinates
 *   liku repl               Interactive automation shell
 *   liku --help             Show help
 *   liku --version          Show version
 */

const path = require('path');
const fs = require('fs');

// Resolve paths relative to CLI location
const CLI_DIR = __dirname;
const PROJECT_ROOT = path.resolve(CLI_DIR, '../..');
const COMMANDS_DIR = path.join(CLI_DIR, 'commands');

// Import output utilities
const { log, success, error, warn, info, dim, highlight } = require('./util/output');

// Package info
const pkg = require(path.join(PROJECT_ROOT, 'package.json'));

// Command registry
const COMMANDS = {
  start: { desc: 'Start the Electron agent with overlay', file: 'start' },
  click: { desc: 'Click element by text or coordinates', file: 'click', args: '<text|x,y>' },
  find: { desc: 'Find UI elements matching criteria', file: 'find', args: '<text>' },
  type: { desc: 'Type text at current cursor position', file: 'type', args: '<text>' },
  keys: { desc: 'Send keyboard shortcut', file: 'keys', args: '<combo>' },
  screenshot: { desc: 'Capture screenshot', file: 'screenshot', args: '[path]' },
  window: { desc: 'Focus or list windows', file: 'window', args: '[title]' },
  mouse: { desc: 'Move mouse to coordinates', file: 'mouse', args: '<x> <y>' },
  drag: { desc: 'Drag from one point to another', file: 'drag', args: '<x1> <y1> <x2> <y2>' },
  scroll: { desc: 'Scroll up or down', file: 'scroll', args: '<up|down> [amount]' },
  wait: { desc: 'Wait for element to appear', file: 'wait', args: '<text> [timeout]' },
  repl: { desc: 'Interactive automation shell', file: 'repl' },
};

/**
 * Show help message
 */
function showHelp() {
  console.log(`
${highlight('liku')} - Copilot-Liku CLI v${pkg.version}
${dim('A powerful command-line interface for UI automation')}

${highlight('USAGE:')}
  liku [command] [options]

${highlight('COMMANDS:')}
`);

  // Calculate padding for alignment
  const maxLen = Math.max(...Object.keys(COMMANDS).map(k => k.length + (COMMANDS[k].args?.length || 0)));
  
  for (const [name, cmd] of Object.entries(COMMANDS)) {
    const cmdStr = cmd.args ? `${name} ${cmd.args}` : name;
    const padding = ' '.repeat(maxLen - cmdStr.length + 4);
    console.log(`  ${highlight(cmdStr)}${padding}${dim(cmd.desc)}`);
  }

  console.log(`
${highlight('OPTIONS:')}
  --help, -h       Show this help message
  --version, -v    Show version
  --json           Output results as JSON (for scripting)
  --quiet, -q      Suppress non-essential output

${highlight('EXAMPLES:')}
  ${dim('# Start the visual agent')}
  liku start

  ${dim('# Click a button by text')}
  liku click "Submit"

  ${dim('# Find all buttons with "Save" in their text')}
  liku find "Save" --type Button

  ${dim('# Type text')}
  liku type "Hello, World!"

  ${dim('# Send keyboard shortcut')}
  liku keys ctrl+shift+s

  ${dim('# Take a screenshot')}
  liku screenshot ./capture.png

  ${dim('# Focus VS Code window')}
  liku window "Visual Studio Code"

  ${dim('# Interactive mode')}
  liku repl

${highlight('ENVIRONMENT:')}
  LIKU_DEBUG=1     Enable debug output
  LIKU_JSON=1      Default to JSON output

${dim('Documentation: https://github.com/TayDa64/copilot-Liku-cli')}
`);
}

/**
 * Show version
 */
function showVersion() {
  console.log(`liku v${pkg.version}`);
}

/**
 * Parse command-line arguments
 */
function parseArgs(argv) {
  const args = argv.slice(2);
  const result = {
    command: null,
    args: [],
    flags: {
      help: false,
      version: false,
      json: false,
      quiet: false,
      debug: process.env.LIKU_DEBUG === '1',
    },
    options: {},
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      result.flags.help = true;
    } else if (arg === '--version' || arg === '-v') {
      result.flags.version = true;
    } else if (arg === '--json') {
      result.flags.json = true;
    } else if (arg === '--quiet' || arg === '-q') {
      result.flags.quiet = true;
    } else if (arg === '--debug') {
      result.flags.debug = true;
    } else if (arg.startsWith('--')) {
      // Named option (--key=value or --key value)
      const [key, val] = arg.slice(2).split('=');
      if (val !== undefined) {
        result.options[key] = val;
      } else if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        result.options[key] = args[++i];
      } else {
        result.options[key] = true;
      }
    } else if (!result.command) {
      result.command = arg;
    } else {
      result.args.push(arg);
    }
    i++;
  }

  // Default JSON from env
  if (process.env.LIKU_JSON === '1') {
    result.flags.json = true;
  }

  return result;
}

/**
 * Load and execute a command module
 */
async function executeCommand(name, cmdArgs, flags, options) {
  const cmdInfo = COMMANDS[name];
  if (!cmdInfo) {
    error(`Unknown command: ${name}`);
    console.log(`\nRun ${highlight('liku --help')} for available commands.`);
    process.exit(1);
  }

  const cmdPath = path.join(COMMANDS_DIR, `${cmdInfo.file}.js`);
  
  if (!fs.existsSync(cmdPath)) {
    error(`Command module not found: ${cmdPath}`);
    process.exit(1);
  }

  try {
    const command = require(cmdPath);
    const result = await command.run(cmdArgs, { ...flags, ...options });
    
    // Output result
    if (flags.json && result !== undefined) {
      console.log(JSON.stringify(result, null, 2));
    }
    
    // Exit with appropriate code
    if (result && result.success === false) {
      process.exit(1);
    }
  } catch (err) {
    if (flags.debug) {
      console.error(err);
    } else {
      error(err.message);
    }
    process.exit(1);
  }
}

/**
 * Main entry point
 */
async function main() {
  const { command, args, flags, options } = parseArgs(process.argv);

  // Handle global flags
  if (flags.version) {
    showVersion();
    return;
  }

  if (flags.help || (!command && args.length === 0)) {
    showHelp();
    return;
  }

  // Default command is 'start' (launch Electron)
  const cmd = command || 'start';

  // Execute the command
  await executeCommand(cmd, args, flags, options);
}

// Run
main().catch(err => {
  error(err.message);
  process.exit(1);
});
