/**
 * Mouse Drag Operations
 * 
 * Drag from one point to another.
 * @module ui-automation/mouse/drag
 */

const { executePowerShellScript } = require('../core/powershell');
const { log } = require('../core/helpers');

/**
 * Drag from one point to another
 * 
 * @param {number} fromX - Start X coordinate
 * @param {number} fromY - Start Y coordinate  
 * @param {number} toX - End X coordinate
 * @param {number} toY - End Y coordinate
 * @param {Object} [options] - Drag options
 * @param {number} [options.steps=10] - Number of intermediate steps
 * @param {number} [options.stepDelay=10] - Delay between steps in ms
 * @returns {Promise<{success: boolean}>}
 */
async function drag(fromX, fromY, toX, toY, options = {}) {
  const { steps = 10, stepDelay = 10 } = options;
  
  const psScript = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public class DragHelper {
    [StructLayout(LayoutKind.Sequential)]
    public struct INPUT { public uint type; public MOUSEINPUT mi; }
    
    [StructLayout(LayoutKind.Sequential)]
    public struct MOUSEINPUT {
        public int dx, dy; public uint mouseData, dwFlags, time; public IntPtr dwExtraInfo;
    }
    
    [DllImport("user32.dll")] 
    public static extern uint SendInput(uint n, INPUT[] inputs, int size);
    
    public static void MouseDown() {
        var inp = new INPUT { type = 0, mi = new MOUSEINPUT { dwFlags = 0x0002 } };
        SendInput(1, new[] { inp }, Marshal.SizeOf(typeof(INPUT)));
    }
    
    public static void MouseUp() {
        var inp = new INPUT { type = 0, mi = new MOUSEINPUT { dwFlags = 0x0004 } };
        SendInput(1, new[] { inp }, Marshal.SizeOf(typeof(INPUT)));
    }
}
'@

# Move to start
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${Math.round(fromX)}, ${Math.round(fromY)})
Start-Sleep -Milliseconds 50

# Press down
[DragHelper]::MouseDown()
Start-Sleep -Milliseconds 50

# Move in steps
$steps = ${steps}
for ($i = 1; $i -le $steps; $i++) {
    $progress = $i / $steps
    $x = [int](${Math.round(fromX)} + (${Math.round(toX)} - ${Math.round(fromX)}) * $progress)
    $y = [int](${Math.round(fromY)} + (${Math.round(toY)} - ${Math.round(fromY)}) * $progress)
    [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point($x, $y)
    Start-Sleep -Milliseconds ${stepDelay}
}

# Release
[DragHelper]::MouseUp()
Write-Output "dragged"
`;

  const result = await executePowerShellScript(psScript);
  const success = result.stdout.includes('dragged');
  log(`Drag from (${fromX}, ${fromY}) to (${toX}, ${toY}) - ${success ? 'success' : 'failed'}`);
  
  return { success };
}

module.exports = {
  drag,
};
