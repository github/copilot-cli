/**
 * keys command - Send keyboard shortcuts
 * @module cli/commands/keys
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
 * Convert human-readable key combo to SendKeys format
 * 
 * Examples:
 *   ctrl+c → ^c
 *   ctrl+shift+s → ^+s
 *   alt+f4 → %{F4}
 *   enter → {ENTER}
 */
function toSendKeys(combo) {
  // Already in SendKeys format
  if (combo.includes('{') || combo.includes('^') || combo.includes('%') || combo.includes('+')) {
    return combo;
  }
  
  const parts = combo.toLowerCase().split(/[+\-]/);
  let modifiers = '';
  let key = '';
  
  for (const part of parts) {
    const trimmed = part.trim();
    switch (trimmed) {
      case 'ctrl':
      case 'control':
        modifiers += '^';
        break;
      case 'alt':
        modifiers += '%';
        break;
      case 'shift':
        modifiers += '+';
        break;
      case 'win':
      case 'windows':
      case 'meta':
        // Windows key - use PowerShell workaround
        modifiers += '#';
        break;
      default:
        key = trimmed;
    }
  }
  
  // Special keys
  const specialKeys = {
    'enter': '{ENTER}',
    'return': '{ENTER}',
    'tab': '{TAB}',
    'esc': '{ESC}',
    'escape': '{ESC}',
    'space': ' ',
    'backspace': '{BACKSPACE}',
    'delete': '{DELETE}',
    'del': '{DELETE}',
    'insert': '{INSERT}',
    'ins': '{INSERT}',
    'home': '{HOME}',
    'end': '{END}',
    'pageup': '{PGUP}',
    'pgup': '{PGUP}',
    'pagedown': '{PGDN}',
    'pgdn': '{PGDN}',
    'up': '{UP}',
    'down': '{DOWN}',
    'left': '{LEFT}',
    'right': '{RIGHT}',
    'f1': '{F1}', 'f2': '{F2}', 'f3': '{F3}', 'f4': '{F4}',
    'f5': '{F5}', 'f6': '{F6}', 'f7': '{F7}', 'f8': '{F8}',
    'f9': '{F9}', 'f10': '{F10}', 'f11': '{F11}', 'f12': '{F12}',
  };
  
  const finalKey = specialKeys[key] || key;
  
  return modifiers + finalKey;
}

/**
 * Run the keys command
 * 
 * Usage:
 *   liku keys ctrl+c
 *   liku keys ctrl+shift+s
 *   liku keys enter
 *   liku keys "^c" (raw SendKeys format)
 */
async function run(args, options) {
  if (args.length === 0) {
    error('Usage: liku keys <combo>');
    info('Examples: ctrl+c, ctrl+shift+s, alt+f4, enter, tab');
    return { success: false };
  }

  loadUI();
  const combo = args.join(' ');
  const sendKeysFormat = toSendKeys(combo);
  
  if (!options.quiet) {
    info(`Sending keys: ${combo} (${sendKeysFormat})`);
  }
  
  const result = await ui.sendKeys(sendKeysFormat);
  
  if (result.success) {
    if (!options.quiet) {
      success(`Sent: ${combo}`);
    }
    return { success: true, keys: sendKeysFormat };
  } else {
    error(`Keys failed: ${result.error || 'Unknown error'}`);
    return { success: false, error: result.error };
  }
}

module.exports = { run };
