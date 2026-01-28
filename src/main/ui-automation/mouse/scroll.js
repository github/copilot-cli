/**
 * Mouse Scroll Operations
 * 
 * Vertical and horizontal scrolling.
 * @module ui-automation/mouse/scroll
 */

const { executePowerShellScript } = require('../core/powershell');
const { log } = require('../core/helpers');

/**
 * Scroll the mouse wheel
 * 
 * @param {number} [amount=3] - Lines to scroll (positive = down, negative = up)
 * @param {Object} [options] - Scroll options
 * @param {number} [options.x] - X coordinate (current position if omitted)
 * @param {number} [options.y] - Y coordinate (current position if omitted)
 * @param {boolean} [options.horizontal=false] - Horizontal scroll instead of vertical
 * @returns {Promise<{success: boolean}>}
 */
async function scroll(amount = 3, options = {}) {
  const { x, y, horizontal = false } = options;
  
  // WHEEL_DELTA = 120 per "click"
  const wheelDelta = Math.round(amount * 120);
  
  const psScript = `
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public class ScrollHelper {
    [StructLayout(LayoutKind.Sequential)]
    public struct INPUT { public uint type; public MOUSEINPUT mi; }
    
    [StructLayout(LayoutKind.Sequential)]
    public struct MOUSEINPUT {
        public int dx, dy; public uint mouseData, dwFlags, time; public IntPtr dwExtraInfo;
    }
    
    [DllImport("user32.dll")] 
    public static extern uint SendInput(uint n, INPUT[] inputs, int size);
    
    [DllImport("user32.dll")]
    public static extern bool GetCursorPos(out System.Drawing.Point pt);
    
    public static void Scroll(int delta, bool horizontal) {
        // MOUSEEVENTF_WHEEL = 0x0800, MOUSEEVENTF_HWHEEL = 0x01000
        uint flags = horizontal ? 0x01000u : 0x0800u;
        var inp = new INPUT { 
            type = 0, 
            mi = new MOUSEINPUT { mouseData = (uint)delta, dwFlags = flags } 
        };
        SendInput(1, new[] { inp }, Marshal.SizeOf(typeof(INPUT)));
    }
}
'@

Add-Type -AssemblyName System.Windows.Forms

${x !== undefined && y !== undefined ? `[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${Math.round(x)}, ${Math.round(y)}); Start-Sleep -Milliseconds 50` : '# Use current position'}

[ScrollHelper]::Scroll(${-wheelDelta}, $${horizontal})
Write-Output "scrolled"
`;

  const result = await executePowerShellScript(psScript);
  const success = result.stdout.includes('scrolled');
  log(`Scroll ${horizontal ? 'horizontal' : 'vertical'} amount=${amount} - ${success ? 'success' : 'failed'}`);
  
  return { success };
}

/**
 * Scroll up
 * @param {number} [lines=3] - Lines to scroll
 * @returns {Promise<{success: boolean}>}
 */
async function scrollUp(lines = 3) {
  return scroll(-Math.abs(lines));
}

/**
 * Scroll down
 * @param {number} [lines=3] - Lines to scroll
 * @returns {Promise<{success: boolean}>}
 */
async function scrollDown(lines = 3) {
  return scroll(Math.abs(lines));
}

/**
 * Scroll left
 * @param {number} [amount=3] - Amount to scroll
 * @returns {Promise<{success: boolean}>}
 */
async function scrollLeft(amount = 3) {
  return scroll(-Math.abs(amount), { horizontal: true });
}

/**
 * Scroll right
 * @param {number} [amount=3] - Amount to scroll
 * @returns {Promise<{success: boolean}>}
 */
async function scrollRight(amount = 3) {
  return scroll(Math.abs(amount), { horizontal: true });
}

module.exports = {
  scroll,
  scrollUp,
  scrollDown,
  scrollLeft,
  scrollRight,
};
