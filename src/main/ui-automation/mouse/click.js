/**
 * Mouse Click Operations
 * 
 * Click and double-click with window focus handling.
 * @module ui-automation/mouse/click
 */

const { CONFIG } = require('../config');
const { executePowerShellScript } = require('../core/powershell');
const { sleep, log } = require('../core/helpers');

/**
 * Click at coordinates using SendInput (most reliable)
 * 
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {'left'|'right'|'middle'} [button='left'] - Mouse button
 * @param {Object} [options] - Click options
 * @param {boolean} [options.focusWindow=true] - Focus window before clicking
 * @returns {Promise<{success: boolean, coordinates: {x: number, y: number}}>}
 */
async function clickAt(x, y, button = 'left', options = {}) {
  x = Math.round(x);
  y = Math.round(y);
  const { focusWindow = true } = options;
  
  const buttonFlags = {
    left: { down: '0x0002', up: '0x0004' },
    right: { down: '0x0008', up: '0x0010' },
    middle: { down: '0x0020', up: '0x0040' },
  };
  
  const flags = buttonFlags[button] || buttonFlags.left;
  
  const psScript = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public class MouseHelper {
    [StructLayout(LayoutKind.Sequential)]
    public struct INPUT {
        public uint type;
        public MOUSEINPUT mi;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct MOUSEINPUT {
        public int dx;
        public int dy;
        public uint mouseData;
        public uint dwFlags;
        public uint time;
        public IntPtr dwExtraInfo;
    }

    [DllImport("user32.dll", SetLastError = true)]
    public static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

    [DllImport("user32.dll")]
    public static extern IntPtr WindowFromPoint(int x, int y);

    [DllImport("user32.dll")]
    public static extern IntPtr GetAncestor(IntPtr hwnd, uint gaFlags);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, IntPtr lpdwProcessId);

    [DllImport("kernel32.dll")]
    public static extern uint GetCurrentThreadId();

    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    public static extern int GetWindowLong(IntPtr hWnd, int nIndex);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    public const int GWL_EXSTYLE = -20;
    public const int WS_EX_LAYERED = 0x80000;
    public const uint GA_ROOT = 2;

    public static IntPtr GetRealWindow(int x, int y) {
        IntPtr hwnd = WindowFromPoint(x, y);
        if (hwnd == IntPtr.Zero) return IntPtr.Zero;

        // Skip transparent overlays
        for (int i = 0; i < 10; i++) {
            int exStyle = GetWindowLong(hwnd, GWL_EXSTYLE);
            bool isLayered = (exStyle & WS_EX_LAYERED) != 0;
            
            StringBuilder sb = new StringBuilder(256);
            GetWindowText(hwnd, sb, 256);
            string title = sb.ToString();
            
            // Skip layered windows with no title (likely overlays)
            if (!isLayered || !string.IsNullOrEmpty(title)) {
                return GetAncestor(hwnd, GA_ROOT);
            }
            
            IntPtr parent = GetAncestor(hwnd, 1);
            if (parent == IntPtr.Zero || parent == hwnd) break;
            hwnd = parent;
        }
        
        return GetAncestor(hwnd, GA_ROOT);
    }

    public static void ForceForeground(IntPtr hwnd) {
        IntPtr fg = GetForegroundWindow();
        uint fgThread = GetWindowThreadProcessId(fg, IntPtr.Zero);
        uint curThread = GetCurrentThreadId();
        
        if (fgThread != curThread) {
            AttachThreadInput(curThread, fgThread, true);
            SetForegroundWindow(hwnd);
            AttachThreadInput(curThread, fgThread, false);
        } else {
            SetForegroundWindow(hwnd);
        }
    }

    public static void Click(uint downFlag, uint upFlag) {
        var down = new INPUT { type = 0, mi = new MOUSEINPUT { dwFlags = downFlag } };
        var up = new INPUT { type = 0, mi = new MOUSEINPUT { dwFlags = upFlag } };
        SendInput(1, new[] { down }, Marshal.SizeOf(typeof(INPUT)));
        System.Threading.Thread.Sleep(30);
        SendInput(1, new[] { up }, Marshal.SizeOf(typeof(INPUT)));
    }
}
'@

# Move cursor
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})
Start-Sleep -Milliseconds ${CONFIG.CLICK_DELAY}

${focusWindow ? `
# Focus the window under cursor
$hwnd = [MouseHelper]::GetRealWindow(${x}, ${y})
if ($hwnd -ne [IntPtr]::Zero) {
    [MouseHelper]::ForceForeground($hwnd)
    Start-Sleep -Milliseconds ${CONFIG.FOCUS_DELAY}
}
` : ''}

# Click
[MouseHelper]::Click(${flags.down}, ${flags.up})
Write-Output "clicked"
`;

  const result = await executePowerShellScript(psScript);
  
  const success = result.stdout.includes('clicked');
  log(`${button} click at (${x}, ${y}) - ${success ? 'success' : 'failed'}`);
  
  return { success, coordinates: { x, y } };
}

/**
 * Double-click at coordinates
 * 
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {'left'|'right'} [button='left'] - Mouse button
 * @returns {Promise<{success: boolean, coordinates: {x: number, y: number}}>}
 */
async function doubleClickAt(x, y, button = 'left') {
  await clickAt(x, y, button);
  await sleep(50);
  return await clickAt(x, y, button);
}

module.exports = {
  clickAt,
  doubleClickAt,
};
