/**
 * System Automation Module for Agentic AI
 * Provides mouse, keyboard, and system control capabilities
 * 
 * Uses native platform APIs via child_process for zero dependencies
 */

const { exec, spawn } = require('child_process');
const path = require('path');

// Action types the AI can request
const ACTION_TYPES = {
  CLICK: 'click',           // Click at coordinates
  DOUBLE_CLICK: 'double_click',
  RIGHT_CLICK: 'right_click',
  MOVE_MOUSE: 'move_mouse', // Move mouse without clicking
  TYPE: 'type',             // Type text
  KEY: 'key',               // Press a single key or combo (e.g., "ctrl+c")
  SCROLL: 'scroll',         // Scroll up/down
  WAIT: 'wait',             // Wait for milliseconds
  SCREENSHOT: 'screenshot', // Take a screenshot for verification
  DRAG: 'drag',             // Drag from one point to another
};

// Key mappings for special keys
const SPECIAL_KEYS = {
  'enter': '{ENTER}',
  'return': '{ENTER}',
  'tab': '{TAB}',
  'escape': '{ESC}',
  'esc': '{ESC}',
  'backspace': '{BACKSPACE}',
  'delete': '{DELETE}',
  'del': '{DELETE}',
  'home': '{HOME}',
  'end': '{END}',
  'pageup': '{PGUP}',
  'pagedown': '{PGDN}',
  'up': '{UP}',
  'down': '{DOWN}',
  'left': '{LEFT}',
  'right': '{RIGHT}',
  'f1': '{F1}',
  'f2': '{F2}',
  'f3': '{F3}',
  'f4': '{F4}',
  'f5': '{F5}',
  'f6': '{F6}',
  'f7': '{F7}',
  'f8': '{F8}',
  'f9': '{F9}',
  'f10': '{F10}',
  'f11': '{F11}',
  'f12': '{F12}',
  'space': ' ',
  'ctrl': '^',
  'control': '^',
  'alt': '%',
  'shift': '+',
  'win': '^{ESC}', // Windows key approximation
};

/**
 * Execute a PowerShell command and return result
 */
function executePowerShell(command) {
  return new Promise((resolve, reject) => {
    // Escape for PowerShell
    const psCommand = command.replace(/"/g, '`"');
    
    exec(`powershell -NoProfile -Command "${psCommand}"`, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024
    }, (error, stdout, stderr) => {
      if (error) {
        console.error('[AUTOMATION] PowerShell error:', stderr);
        reject(new Error(stderr || error.message));
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

/**
 * Move mouse to coordinates (Windows)
 */
async function moveMouse(x, y) {
  const script = `
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${Math.round(x)}, ${Math.round(y)})
`;
  await executePowerShell(script);
  console.log(`[AUTOMATION] Mouse moved to (${x}, ${y})`);
}

/**
 * Click at coordinates (Windows)
 */
async function click(x, y, button = 'left') {
  // Move mouse first
  await moveMouse(x, y);
  
  // Small delay for position to register
  await sleep(50);
  
  // Click using SendInput via Add-Type
  const buttonCode = button === 'right' ? 'RIGHTDOWN,RIGHTUP' : 'LEFTDOWN,LEFTUP';
  const script = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class MouseClick {
    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);
    
    public const uint MOUSEEVENTF_LEFTDOWN = 0x02;
    public const uint MOUSEEVENTF_LEFTUP = 0x04;
    public const uint MOUSEEVENTF_RIGHTDOWN = 0x08;
    public const uint MOUSEEVENTF_RIGHTUP = 0x10;
    public const uint MOUSEEVENTF_MIDDLEDOWN = 0x20;
    public const uint MOUSEEVENTF_MIDDLEUP = 0x40;
    
    public static void LeftClick() {
        mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
    }
    
    public static void RightClick() {
        mouse_event(MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, 0);
        mouse_event(MOUSEEVENTF_RIGHTUP, 0, 0, 0, 0);
    }
    
    public static void DoubleClick() {
        mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
        System.Threading.Thread.Sleep(50);
        mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
    }
}
"@
[MouseClick]::${button === 'right' ? 'RightClick' : 'LeftClick'}()
`;
  await executePowerShell(script);
  console.log(`[AUTOMATION] ${button} click at (${x}, ${y})`);
}

/**
 * Double click at coordinates
 */
async function doubleClick(x, y) {
  await moveMouse(x, y);
  await sleep(50);
  
  const script = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class MouseDblClick {
    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);
    public const uint MOUSEEVENTF_LEFTDOWN = 0x02;
    public const uint MOUSEEVENTF_LEFTUP = 0x04;
    public static void DoubleClick() {
        mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
        System.Threading.Thread.Sleep(50);
        mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
    }
}
"@
[MouseDblClick]::DoubleClick()
`;
  await executePowerShell(script);
  console.log(`[AUTOMATION] Double click at (${x}, ${y})`);
}

/**
 * Type text using SendKeys
 */
async function typeText(text) {
  // Escape special characters for SendKeys
  const escaped = text
    .replace(/\+/g, '{+}')
    .replace(/\^/g, '{^}')
    .replace(/%/g, '{%}')
    .replace(/~/g, '{~}')
    .replace(/\(/g, '{(}')
    .replace(/\)/g, '{)}')
    .replace(/\[/g, '{[}')
    .replace(/\]/g, '{]}')
    .replace(/\{/g, '{{}')
    .replace(/\}/g, '{}}');
  
  const script = `
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.SendKeys]::SendWait("${escaped.replace(/"/g, '`"')}")
`;
  await executePowerShell(script);
  console.log(`[AUTOMATION] Typed: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
}

/**
 * Press a key or key combination (e.g., "ctrl+c", "enter", "alt+tab")
 */
async function pressKey(keyCombo) {
  let sendKeysStr = '';
  
  // Parse key combo
  const parts = keyCombo.toLowerCase().split('+').map(k => k.trim());
  
  // Build SendKeys string
  let modifiers = '';
  let mainKey = '';
  
  for (const part of parts) {
    if (part === 'ctrl' || part === 'control') {
      modifiers += '^';
    } else if (part === 'alt') {
      modifiers += '%';
    } else if (part === 'shift') {
      modifiers += '+';
    } else if (SPECIAL_KEYS[part]) {
      mainKey = SPECIAL_KEYS[part];
    } else {
      // Regular character
      mainKey = part;
    }
  }
  
  sendKeysStr = modifiers + (mainKey ? `(${mainKey})` : '');
  
  if (!sendKeysStr) {
    throw new Error(`Invalid key combo: ${keyCombo}`);
  }
  
  const script = `
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.SendKeys]::SendWait("${sendKeysStr}")
`;
  await executePowerShell(script);
  console.log(`[AUTOMATION] Pressed key: ${keyCombo} (SendKeys: ${sendKeysStr})`);
}

/**
 * Scroll at current position
 */
async function scroll(direction, amount = 3) {
  const scrollAmount = direction === 'up' ? amount * 120 : -amount * 120;
  
  const script = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class MouseScroll {
    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);
    public const uint MOUSEEVENTF_WHEEL = 0x0800;
    public static void Scroll(int amount) {
        mouse_event(MOUSEEVENTF_WHEEL, 0, 0, (uint)amount, 0);
    }
}
"@
[MouseScroll]::Scroll(${scrollAmount})
`;
  await executePowerShell(script);
  console.log(`[AUTOMATION] Scrolled ${direction} by ${amount} units`);
}

/**
 * Drag from one point to another
 */
async function drag(fromX, fromY, toX, toY) {
  await moveMouse(fromX, fromY);
  await sleep(100);
  
  // Mouse down
  const downScript = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class MouseDrag {
    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);
    public const uint MOUSEEVENTF_LEFTDOWN = 0x02;
    public const uint MOUSEEVENTF_LEFTUP = 0x04;
}
"@
[MouseDrag]::mouse_event([MouseDrag]::MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
`;
  await executePowerShell(downScript);
  
  // Move to destination
  await sleep(100);
  await moveMouse(toX, toY);
  await sleep(100);
  
  // Mouse up
  const upScript = `
[MouseDrag]::mouse_event([MouseDrag]::MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
`;
  await executePowerShell(upScript);
  
  console.log(`[AUTOMATION] Dragged from (${fromX}, ${fromY}) to (${toX}, ${toY})`);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get active window title
 */
async function getActiveWindowTitle() {
  const script = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class WindowInfo {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
    public static string GetActiveWindowTitle() {
        IntPtr handle = GetForegroundWindow();
        StringBuilder sb = new StringBuilder(256);
        GetWindowText(handle, sb, 256);
        return sb.ToString();
    }
}
"@
[WindowInfo]::GetActiveWindowTitle()
`;
  return await executePowerShell(script);
}

/**
 * Execute an action from AI
 * @param {Object} action - Action object from AI
 * @returns {Object} Result of the action
 */
async function executeAction(action) {
  console.log(`[AUTOMATION] Executing action:`, JSON.stringify(action));
  
  const startTime = Date.now();
  let result = { success: true, action: action.type };
  
  try {
    switch (action.type) {
      case ACTION_TYPES.CLICK:
        await click(action.x, action.y, action.button || 'left');
        result.message = `Clicked at (${action.x}, ${action.y})`;
        break;
        
      case ACTION_TYPES.DOUBLE_CLICK:
        await doubleClick(action.x, action.y);
        result.message = `Double-clicked at (${action.x}, ${action.y})`;
        break;
        
      case ACTION_TYPES.RIGHT_CLICK:
        await click(action.x, action.y, 'right');
        result.message = `Right-clicked at (${action.x}, ${action.y})`;
        break;
        
      case ACTION_TYPES.MOVE_MOUSE:
        await moveMouse(action.x, action.y);
        result.message = `Mouse moved to (${action.x}, ${action.y})`;
        break;
        
      case ACTION_TYPES.TYPE:
        await typeText(action.text);
        result.message = `Typed "${action.text.substring(0, 30)}${action.text.length > 30 ? '...' : ''}"`;
        break;
        
      case ACTION_TYPES.KEY:
        await pressKey(action.key);
        result.message = `Pressed ${action.key}`;
        break;
        
      case ACTION_TYPES.SCROLL:
        await scroll(action.direction, action.amount || 3);
        result.message = `Scrolled ${action.direction}`;
        break;
        
      case ACTION_TYPES.WAIT:
        await sleep(action.ms || 1000);
        result.message = `Waited ${action.ms || 1000}ms`;
        break;
        
      case ACTION_TYPES.DRAG:
        await drag(action.fromX, action.fromY, action.toX, action.toY);
        result.message = `Dragged from (${action.fromX}, ${action.fromY}) to (${action.toX}, ${action.toY})`;
        break;
        
      case ACTION_TYPES.SCREENSHOT:
        // This will be handled by the caller (main process)
        result.needsScreenshot = true;
        result.message = 'Screenshot requested';
        break;
        
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  } catch (error) {
    result.success = false;
    result.error = error.message;
    console.error(`[AUTOMATION] Action failed:`, error);
  }
  
  result.duration = Date.now() - startTime;
  return result;
}

/**
 * Execute a sequence of actions
 * @param {Array} actions - Array of action objects
 * @param {Function} onAction - Callback after each action (for UI updates)
 * @returns {Array} Results of all actions
 */
async function executeActionSequence(actions, onAction = null) {
  const results = [];
  
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    
    // Execute action
    const result = await executeAction(action);
    result.index = i;
    results.push(result);
    
    // Callback for UI updates
    if (onAction) {
      onAction(result, i, actions.length);
    }
    
    // Stop on failure unless action specifies continue_on_error
    if (!result.success && !action.continue_on_error) {
      console.log(`[AUTOMATION] Sequence stopped at action ${i} due to error`);
      break;
    }
    
    // Default delay between actions
    if (i < actions.length - 1 && action.type !== ACTION_TYPES.WAIT) {
      await sleep(action.delay || 100);
    }
  }
  
  return results;
}

/**
 * Parse AI response to extract actions
 * AI should return JSON with actions array
 */
function parseAIActions(aiResponse) {
  // Try to find JSON in the response
  const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch (e) {
      console.error('[AUTOMATION] Failed to parse JSON from code block:', e);
    }
  }
  
  // Try parsing the whole response as JSON
  try {
    return JSON.parse(aiResponse);
  } catch (e) {
    // Not JSON - return null
  }
  
  // Try to find inline JSON object
  const inlineMatch = aiResponse.match(/\{[\s\S]*"actions"[\s\S]*\}/);
  if (inlineMatch) {
    try {
      return JSON.parse(inlineMatch[0]);
    } catch (e) {
      console.error('[AUTOMATION] Failed to parse inline JSON:', e);
    }
  }
  
  return null;
}

/**
 * Convert grid coordinate (like "C3") to screen pixels
 * @param {string} coord - Grid coordinate like "C3", "AB12"
 * @param {Object} screenSize - {width, height} of the screen
 * @param {number} coarseSpacing - Spacing of coarse grid (default 100)
 */
function gridToPixels(coord, screenSize, coarseSpacing = 100) {
  // Parse coordinate: letters for column, numbers for row
  const match = coord.match(/^([A-Za-z]+)(\d+)$/);
  if (!match) {
    throw new Error(`Invalid coordinate format: ${coord}`);
  }
  
  const colStr = match[1].toUpperCase();
  const row = parseInt(match[2], 10);
  
  // Convert column letters to number (A=0, B=1, ..., Z=25, AA=26, etc.)
  let col = 0;
  for (let i = 0; i < colStr.length; i++) {
    col = col * 26 + (colStr.charCodeAt(i) - 64);
  }
  col--; // Make 0-indexed
  
  // Calculate pixel position - grid starts at startOffset (50px) to cover full screen
  // This MUST match overlay.js: startOffset = coarseSpacing / 2
  const startOffset = coarseSpacing / 2; // 50px for default 100px spacing
  const x = startOffset + col * coarseSpacing;
  const y = startOffset + row * coarseSpacing;
  
  console.log(`[AUTOMATION] gridToPixels: ${coord} -> col=${col}, row=${row} -> (${x}, ${y})`);
  
  return { x, y, col, row };
}

module.exports = {
  ACTION_TYPES,
  executeAction,
  executeActionSequence,
  parseAIActions,
  gridToPixels,
  moveMouse,
  click,
  doubleClick,
  typeText,
  pressKey,
  scroll,
  drag,
  sleep,
  getActiveWindowTitle,
};
