/**
 * Keyboard Input Module
 * 
 * Type text and send key combinations.
 * @module ui-automation/keyboard
 */

const { executePowerShellScript } = require('../core/powershell');
const { log, sleep } = require('../core/helpers');

/**
 * Type text character by character
 * 
 * @param {string} text - Text to type
 * @param {Object} [options] - Type options
 * @param {number} [options.delay=50] - Delay between characters in ms
 * @returns {Promise<{success: boolean}>}
 */
async function typeText(text, options = {}) {
  const { delay = 50 } = options;
  
  // Escape special chars for PowerShell
  const escapedText = text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "''")
    .replace(/`/g, '``');
  
  const psScript = `
Add-Type -AssemblyName System.Windows.Forms
$text = '${escapedText}'
foreach ($char in $text.ToCharArray()) {
    [System.Windows.Forms.SendKeys]::SendWait($char)
    Start-Sleep -Milliseconds ${delay}
}
Write-Output "typed"
`;

  const result = await executePowerShellScript(psScript);
  const success = result.stdout.includes('typed');
  log(`TypeText "${text.substring(0, 20)}${text.length > 20 ? '...' : ''}" - ${success ? 'success' : 'failed'}`);
  
  return { success };
}

/**
 * Send keyboard shortcut or key combination
 * 
 * Uses SendKeys format:
 * - ^ = Ctrl
 * - % = Alt
 * - + = Shift
 * - {ENTER}, {TAB}, {ESC}, {DELETE}, {BACKSPACE}
 * - {F1}-{F12}
 * - {UP}, {DOWN}, {LEFT}, {RIGHT}
 * - {HOME}, {END}, {PGUP}, {PGDN}
 * 
 * @param {string} keys - Key combination in SendKeys format
 * @returns {Promise<{success: boolean}>}
 */
async function sendKeys(keys) {
  const psScript = `
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.SendKeys]::SendWait('${keys.replace(/'/g, "''")}')
Write-Output "sent"
`;

  const result = await executePowerShellScript(psScript);
  const success = result.stdout.includes('sent');
  log(`SendKeys "${keys}" - ${success ? 'success' : 'failed'}`);
  
  return { success };
}

/**
 * Press a key down (for holding modifiers)
 * 
 * @param {number} vkCode - Virtual key code
 * @returns {Promise<{success: boolean}>}
 */
async function keyDown(vkCode) {
  const psScript = `
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public class KeyboardHelper {
    [StructLayout(LayoutKind.Sequential)]
    public struct INPUT { public uint type; public KEYBDINPUT ki; ulong padding; }
    
    [StructLayout(LayoutKind.Sequential)]
    public struct KEYBDINPUT {
        public ushort wVk, wScan; public uint dwFlags, time; public IntPtr dwExtraInfo;
    }
    
    [DllImport("user32.dll")] 
    public static extern uint SendInput(uint n, INPUT[] inputs, int size);
    
    public static void KeyDown(ushort vk) {
        var inp = new INPUT { type = 1, ki = new KEYBDINPUT { wVk = vk } };
        SendInput(1, new[] { inp }, Marshal.SizeOf(typeof(INPUT)));
    }
}
'@
[KeyboardHelper]::KeyDown(${vkCode})
Write-Output "down"
`;

  const result = await executePowerShellScript(psScript);
  return { success: result.stdout.includes('down') };
}

/**
 * Release a key
 * 
 * @param {number} vkCode - Virtual key code
 * @returns {Promise<{success: boolean}>}
 */
async function keyUp(vkCode) {
  const psScript = `
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public class KeyboardHelper {
    [StructLayout(LayoutKind.Sequential)]
    public struct INPUT { public uint type; public KEYBDINPUT ki; ulong padding; }
    
    [StructLayout(LayoutKind.Sequential)]
    public struct KEYBDINPUT {
        public ushort wVk, wScan; public uint dwFlags, time; public IntPtr dwExtraInfo;
    }
    
    [DllImport("user32.dll")] 
    public static extern uint SendInput(uint n, INPUT[] inputs, int size);
    
    public static void KeyUp(ushort vk) {
        var inp = new INPUT { type = 1, ki = new KEYBDINPUT { wVk = vk, dwFlags = 0x0002 } };
        SendInput(1, new[] { inp }, Marshal.SizeOf(typeof(INPUT)));
    }
}
'@
[KeyboardHelper]::KeyUp(${vkCode})
Write-Output "up"
`;

  const result = await executePowerShellScript(psScript);
  return { success: result.stdout.includes('up') };
}

/**
 * Common virtual key codes
 */
const VK = {
  SHIFT: 0x10,
  CTRL: 0x11,
  ALT: 0x12,
  ENTER: 0x0D,
  TAB: 0x09,
  ESC: 0x1B,
  SPACE: 0x20,
  BACKSPACE: 0x08,
  DELETE: 0x2E,
  LEFT: 0x25,
  UP: 0x26,
  RIGHT: 0x27,
  DOWN: 0x28,
  HOME: 0x24,
  END: 0x23,
  PAGEUP: 0x21,
  PAGEDOWN: 0x22,
};

module.exports = {
  typeText,
  sendKeys,
  keyDown,
  keyUp,
  VK,
};
