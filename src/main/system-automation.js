/**
 * System Automation Module for Agentic AI
 * Provides mouse, keyboard, and system control capabilities
 * 
 * Uses native platform APIs via child_process for zero dependencies
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const gridMath = require('../shared/grid-math');

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
  // Semantic element-based actions (preferred - more reliable)
  CLICK_ELEMENT: 'click_element',   // Click element found by text/name
  FIND_ELEMENT: 'find_element',     // Find element and return its info
  // Direct command execution (most reliable for terminal operations)
  RUN_COMMAND: 'run_command',       // Run shell command directly
};

// Dangerous command patterns that require confirmation
const DANGEROUS_COMMAND_PATTERNS = [
  // Destructive file operations
  /\b(rm|del|erase|rmdir|rd)\s+(-[rf]+|\/[sq]+|\*)/i,
  /Remove-Item.*-Recurse.*-Force/i,
  /\bformat\b/i,
  // System modification
  /\b(shutdown|restart|reboot)\b/i,
  /\breg\s+(delete|add)\b/i,
  /\bnet\s+(user|localgroup)\b/i,
  // Elevated operations
  /\b(sudo|runas)\b/i,
  /Start-Process.*-Verb\s+RunAs/i,
  /Set-ExecutionPolicy/i,
  /Stop-Process.*-Force/i,
  // Dangerous downloads
  /\b(curl|wget|Invoke-WebRequest|iwr|irm)\b.*\|\s*(bash|sh|iex|Invoke-Expression)/i,
];

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
 * Focus the desktop / unfocus Electron windows before sending keyboard input
 * This is critical for SendKeys/SendInput to reach the correct target
 */
async function focusDesktop() {
  const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class FocusHelper {
    [DllImport("user32.dll")]
    public static extern IntPtr GetDesktopWindow();
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern IntPtr GetShellWindow();
}
"@
# Focus shell window (explorer desktop) 
$shell = [FocusHelper]::GetShellWindow()
[FocusHelper]::SetForegroundWindow($shell)
Start-Sleep -Milliseconds 50
`;
  await executePowerShell(script);
  console.log('[AUTOMATION] Focused desktop before input');
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
 * Click at coordinates (Windows) - FIXED for transparent overlay click-through
 * 
 * Uses SendInput (modern replacement for deprecated mouse_event) and
 * activates the target window before clicking to ensure synthetic clicks
 * reach background applications behind the Electron overlay.
 * 
 * Key fixes:
 * 1. Use SendInput instead of mouse_event (better UIPI handling)
 * 2. Find real window under cursor (skip transparent windows)
 * 3. SetForegroundWindow to activate target before clicking
 */
async function click(x, y, button = 'left') {
  // Move mouse first
  await moveMouse(x, y);
  
  // Small delay for position to register
  await sleep(50);
  
  // Click using SendInput + SetForegroundWindow for reliable click-through
  const script = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class ClickThrough {
    // SendInput structures and constants
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

    public const uint INPUT_MOUSE = 0;
    public const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
    public const uint MOUSEEVENTF_LEFTUP = 0x0004;
    public const uint MOUSEEVENTF_RIGHTDOWN = 0x0008;
    public const uint MOUSEEVENTF_RIGHTUP = 0x0010;
    public const uint MOUSEEVENTF_ABSOLUTE = 0x8000;
    public const uint MOUSEEVENTF_MOVE = 0x0001;

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

    public const int GWL_EXSTYLE = -20;
    public const int WS_EX_TRANSPARENT = 0x20;
    public const int WS_EX_LAYERED = 0x80000;
    public const int WS_EX_TOOLWINDOW = 0x80;
    public const uint GA_ROOT = 2;

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    public static void ForceForeground(IntPtr hwnd) {
        // Get the currently active window
        IntPtr foreground = GetForegroundWindow();
        uint foregroundThread = GetWindowThreadProcessId(foreground, IntPtr.Zero);
        uint currentThread = GetCurrentThreadId();

        // Attach our thread to the currently active window thread
        // This allows SetForegroundWindow to work
        if (foregroundThread != currentThread) {
            AttachThreadInput(currentThread, foregroundThread, true);
            SetForegroundWindow(hwnd);
            AttachThreadInput(currentThread, foregroundThread, false);
        } else {
            SetForegroundWindow(hwnd);
        }
    }

    public static IntPtr GetRealWindowFromPoint(int x, int y) {
        IntPtr hwnd = WindowFromPoint(x, y);
        if (hwnd == IntPtr.Zero) return IntPtr.Zero;

        // Walk up to find a non-overlay parent window
        // Skip our Electron overlay (has WS_EX_LAYERED, class "Chrome_WidgetWin_1", and no title)
        int maxIterations = 10;
        while (maxIterations-- > 0) {
            int exStyle = GetWindowLong(hwnd, GWL_EXSTYLE);
            bool isTransparent = (exStyle & WS_EX_TRANSPARENT) != 0;
            bool isLayered = (exStyle & WS_EX_LAYERED) != 0;
            
            // Check class name
            StringBuilder className = new StringBuilder(256);
            GetClassName(hwnd, className, 256);
            string cls = className.ToString();
            
            // Check window title (our overlay has no title, VS Code has a title)
            StringBuilder windowTitle = new StringBuilder(256);
            GetWindowText(hwnd, windowTitle, 256);
            string title = windowTitle.ToString();
            
            // Our overlay: Chrome_WidgetWin_1, WS_EX_LAYERED, empty title
            // VS Code: Chrome_WidgetWin_1, but has a title like "index.js - project - Visual Studio Code"
            bool isOurOverlay = cls.Contains("Chrome_WidgetWin") && isLayered && string.IsNullOrEmpty(title);
            
            // Skip if WS_EX_TRANSPARENT OR if it's our transparent overlay
            if (!isTransparent && !isOurOverlay) {
                return GetAncestor(hwnd, GA_ROOT);
            }
            
            IntPtr parent = GetAncestor(hwnd, 1); // GA_PARENT
            if (parent == IntPtr.Zero || parent == hwnd) break;
            hwnd = parent;
        }
        
        return GetAncestor(hwnd, GA_ROOT);
    }

    public static void ClickAt(int x, int y, bool rightButton) {
        // Find the real window under the cursor (skip transparent overlay)
        IntPtr targetWindow = GetRealWindowFromPoint(x, y);
        
        if (targetWindow != IntPtr.Zero) {
            // Activate the target window so it receives the click
            ForceForeground(targetWindow);
            System.Threading.Thread.Sleep(30);
        }

        // Prepare SendInput for mouse click
        INPUT[] inputs = new INPUT[2];
        
        uint downFlag = rightButton ? MOUSEEVENTF_RIGHTDOWN : MOUSEEVENTF_LEFTDOWN;
        uint upFlag = rightButton ? MOUSEEVENTF_RIGHTUP : MOUSEEVENTF_LEFTUP;

        // Mouse down
        inputs[0].type = INPUT_MOUSE;
        inputs[0].mi.dwFlags = downFlag;
        inputs[0].mi.dx = 0;
        inputs[0].mi.dy = 0;
        inputs[0].mi.mouseData = 0;
        inputs[0].mi.time = 0;
        inputs[0].mi.dwExtraInfo = IntPtr.Zero;

        // Mouse up
        inputs[1].type = INPUT_MOUSE;
        inputs[1].mi.dwFlags = upFlag;
        inputs[1].mi.dx = 0;
        inputs[1].mi.dy = 0;
        inputs[1].mi.mouseData = 0;
        inputs[1].mi.time = 0;
        inputs[1].mi.dwExtraInfo = IntPtr.Zero;

        // Send the click
        SendInput(2, inputs, Marshal.SizeOf(typeof(INPUT)));
    }
}
"@
[ClickThrough]::ClickAt(${Math.round(x)}, ${Math.round(y)}, ${button === 'right' ? '$true' : '$false'})
`;
  await executePowerShell(script);
  console.log(`[AUTOMATION] ${button} click at (${x}, ${y}) (click-through enabled)`);
}

/**
 * Double click at coordinates - FIXED for transparent overlay click-through
 */
async function doubleClick(x, y) {
  await moveMouse(x, y);
  await sleep(50);
  
  const script = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class DblClickThrough {
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

    public const uint INPUT_MOUSE = 0;
    public const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
    public const uint MOUSEEVENTF_LEFTUP = 0x0004;

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

    public const int GWL_EXSTYLE = -20;
    public const int WS_EX_TRANSPARENT = 0x20;
    public const uint GA_ROOT = 2;

    public static void ForceForeground(IntPtr hwnd) {
        IntPtr foreground = GetForegroundWindow();
        uint foregroundThread = GetWindowThreadProcessId(foreground, IntPtr.Zero);
        uint currentThread = GetCurrentThreadId();
        if (foregroundThread != currentThread) {
            AttachThreadInput(currentThread, foregroundThread, true);
            SetForegroundWindow(hwnd);
            AttachThreadInput(currentThread, foregroundThread, false);
        } else {
            SetForegroundWindow(hwnd);
        }
    }

    public static IntPtr GetRealWindowFromPoint(int x, int y) {
        IntPtr hwnd = WindowFromPoint(x, y);
        if (hwnd == IntPtr.Zero) return IntPtr.Zero;
        int maxIterations = 10;
        while (maxIterations-- > 0) {
            int exStyle = GetWindowLong(hwnd, GWL_EXSTYLE);
            bool isTransparent = (exStyle & WS_EX_TRANSPARENT) != 0;
            if (!isTransparent) return GetAncestor(hwnd, GA_ROOT);
            IntPtr parent = GetAncestor(hwnd, 1);
            if (parent == IntPtr.Zero || parent == hwnd) break;
            hwnd = parent;
        }
        return GetAncestor(hwnd, GA_ROOT);
    }

    public static void DoubleClickAt(int x, int y) {
        IntPtr targetWindow = GetRealWindowFromPoint(x, y);
        if (targetWindow != IntPtr.Zero) {
            ForceForeground(targetWindow);
            System.Threading.Thread.Sleep(30);
        }

        INPUT[] inputs = new INPUT[4];
        
        // First click
        inputs[0].type = INPUT_MOUSE;
        inputs[0].mi.dwFlags = MOUSEEVENTF_LEFTDOWN;
        inputs[1].type = INPUT_MOUSE;
        inputs[1].mi.dwFlags = MOUSEEVENTF_LEFTUP;

        SendInput(2, inputs, Marshal.SizeOf(typeof(INPUT)));
        System.Threading.Thread.Sleep(50);

        // Second click
        inputs[2].type = INPUT_MOUSE;
        inputs[2].mi.dwFlags = MOUSEEVENTF_LEFTDOWN;
        inputs[3].type = INPUT_MOUSE;
        inputs[3].mi.dwFlags = MOUSEEVENTF_LEFTUP;

        SendInput(2, new INPUT[] { inputs[2], inputs[3] }, Marshal.SizeOf(typeof(INPUT)));
    }
}
"@
[DblClickThrough]::DoubleClickAt(${Math.round(x)}, ${Math.round(y)})
`;
  await executePowerShell(script);
  console.log(`[AUTOMATION] Double click at (${x}, ${y}) (click-through enabled)`);
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
 * Press a key or key combination (e.g., "ctrl+c", "enter", "alt+tab", "win+r")
 * Now supports Windows key using SendInput with virtual key codes
 */
async function pressKey(keyCombo) {
  const parts = keyCombo.toLowerCase().split('+').map(k => k.trim());
  
  // Check if Windows key is involved - requires special handling
  const hasWinKey = parts.includes('win') || parts.includes('windows') || parts.includes('super');
  
  if (hasWinKey) {
    // Use SendInput for Windows key combos
    const otherKeys = parts.filter(p => p !== 'win' && p !== 'windows' && p !== 'super');
    const hasCtrl = otherKeys.includes('ctrl') || otherKeys.includes('control');
    const hasAlt = otherKeys.includes('alt');
    const hasShift = otherKeys.includes('shift');
    const mainKey = otherKeys.find(p => !['ctrl', 'control', 'alt', 'shift'].includes(p)) || '';
    
    // Virtual key codes for common keys
    const vkCodes = {
      'a': 0x41, 'b': 0x42, 'c': 0x43, 'd': 0x44, 'e': 0x45, 'f': 0x46, 'g': 0x47, 'h': 0x48,
      'i': 0x49, 'j': 0x4A, 'k': 0x4B, 'l': 0x4C, 'm': 0x4D, 'n': 0x4E, 'o': 0x4F, 'p': 0x50,
      'q': 0x51, 'r': 0x52, 's': 0x53, 't': 0x54, 'u': 0x55, 'v': 0x56, 'w': 0x57, 'x': 0x58,
      'y': 0x59, 'z': 0x5A,
      '0': 0x30, '1': 0x31, '2': 0x32, '3': 0x33, '4': 0x34, '5': 0x35, '6': 0x36, '7': 0x37, '8': 0x38, '9': 0x39,
      'enter': 0x0D, 'return': 0x0D, 'tab': 0x09, 'escape': 0x1B, 'esc': 0x1B,
      'space': 0x20, 'backspace': 0x08, 'delete': 0x2E, 'del': 0x2E,
      'up': 0x26, 'down': 0x28, 'left': 0x25, 'right': 0x27,
      'home': 0x24, 'end': 0x23, 'pageup': 0x21, 'pagedown': 0x22,
      'f1': 0x70, 'f2': 0x71, 'f3': 0x72, 'f4': 0x73, 'f5': 0x74, 'f6': 0x75,
      'f7': 0x76, 'f8': 0x77, 'f9': 0x78, 'f10': 0x79, 'f11': 0x7A, 'f12': 0x7B,
    };
    
    const mainKeyCode = mainKey ? (vkCodes[mainKey] || mainKey.charCodeAt(0)) : 0;
    
    const script = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class WinKeyPress {
    [StructLayout(LayoutKind.Sequential)]
    public struct INPUT {
        public uint type;
        public InputUnion U;
    }

    [StructLayout(LayoutKind.Explicit)]
    public struct InputUnion {
        [FieldOffset(0)] public MOUSEINPUT mi;
        [FieldOffset(0)] public KEYBDINPUT ki;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct MOUSEINPUT {
        public int dx, dy;
        public uint mouseData, dwFlags, time;
        public IntPtr dwExtraInfo;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct KEYBDINPUT {
        public ushort wVk;
        public ushort wScan;
        public uint dwFlags;
        public uint time;
        public IntPtr dwExtraInfo;
    }

    public const uint INPUT_KEYBOARD = 1;
    public const uint KEYEVENTF_KEYUP = 0x0002;
    public const ushort VK_LWIN = 0x5B;
    public const ushort VK_CONTROL = 0x11;
    public const ushort VK_SHIFT = 0x10;
    public const ushort VK_MENU = 0x12; // Alt

    [DllImport("user32.dll", SetLastError = true)]
    public static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

    public static void KeyDown(ushort vk) {
        INPUT[] inputs = new INPUT[1];
        inputs[0].type = INPUT_KEYBOARD;
        inputs[0].U.ki.wVk = vk;
        inputs[0].U.ki.dwFlags = 0;
        SendInput(1, inputs, Marshal.SizeOf(typeof(INPUT)));
    }

    public static void KeyUp(ushort vk) {
        INPUT[] inputs = new INPUT[1];
        inputs[0].type = INPUT_KEYBOARD;
        inputs[0].U.ki.wVk = vk;
        inputs[0].U.ki.dwFlags = KEYEVENTF_KEYUP;
        SendInput(1, inputs, Marshal.SizeOf(typeof(INPUT)));
    }
}
"@

# Press modifiers
[WinKeyPress]::KeyDown([WinKeyPress]::VK_LWIN)
${hasCtrl ? '[WinKeyPress]::KeyDown([WinKeyPress]::VK_CONTROL)' : ''}
${hasAlt ? '[WinKeyPress]::KeyDown([WinKeyPress]::VK_MENU)' : ''}
${hasShift ? '[WinKeyPress]::KeyDown([WinKeyPress]::VK_SHIFT)' : ''}

# Press main key if any
${mainKeyCode ? `[WinKeyPress]::KeyDown(${mainKeyCode})
Start-Sleep -Milliseconds 50
[WinKeyPress]::KeyUp(${mainKeyCode})` : 'Start-Sleep -Milliseconds 100'}

# Release modifiers in reverse order
${hasShift ? '[WinKeyPress]::KeyUp([WinKeyPress]::VK_SHIFT)' : ''}
${hasAlt ? '[WinKeyPress]::KeyUp([WinKeyPress]::VK_MENU)' : ''}
${hasCtrl ? '[WinKeyPress]::KeyUp([WinKeyPress]::VK_CONTROL)' : ''}
[WinKeyPress]::KeyUp([WinKeyPress]::VK_LWIN)
`;
    await executePowerShell(script);
    console.log(`[AUTOMATION] Pressed Windows key combo: ${keyCombo} (using SendInput)`);
    return;
  }
  
  // Non-Windows key combos use SendKeys
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
  
  const sendKeysStr = modifiers + (mainKey ? `(${mainKey})` : '');
  
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
 * Drag from one point to another - FIXED for transparent overlay click-through
 */
async function drag(fromX, fromY, toX, toY) {
  await moveMouse(fromX, fromY);
  await sleep(100);
  
  // Mouse down + drag + mouse up using SendInput
  const script = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class DragThrough {
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

    public const uint INPUT_MOUSE = 0;
    public const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
    public const uint MOUSEEVENTF_LEFTUP = 0x0004;

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

    public const int GWL_EXSTYLE = -20;
    public const int WS_EX_TRANSPARENT = 0x20;
    public const uint GA_ROOT = 2;

    public static void ForceForeground(IntPtr hwnd) {
        IntPtr foreground = GetForegroundWindow();
        uint foregroundThread = GetWindowThreadProcessId(foreground, IntPtr.Zero);
        uint currentThread = GetCurrentThreadId();
        if (foregroundThread != currentThread) {
            AttachThreadInput(currentThread, foregroundThread, true);
            SetForegroundWindow(hwnd);
            AttachThreadInput(currentThread, foregroundThread, false);
        } else {
            SetForegroundWindow(hwnd);
        }
    }

    public static IntPtr GetRealWindowFromPoint(int x, int y) {
        IntPtr hwnd = WindowFromPoint(x, y);
        if (hwnd == IntPtr.Zero) return IntPtr.Zero;
        int maxIterations = 10;
        while (maxIterations-- > 0) {
            int exStyle = GetWindowLong(hwnd, GWL_EXSTYLE);
            bool isTransparent = (exStyle & WS_EX_TRANSPARENT) != 0;
            if (!isTransparent) return GetAncestor(hwnd, GA_ROOT);
            IntPtr parent = GetAncestor(hwnd, 1);
            if (parent == IntPtr.Zero || parent == hwnd) break;
            hwnd = parent;
        }
        return GetAncestor(hwnd, GA_ROOT);
    }

    public static void MouseDown() {
        INPUT[] inputs = new INPUT[1];
        inputs[0].type = INPUT_MOUSE;
        inputs[0].mi.dwFlags = MOUSEEVENTF_LEFTDOWN;
        SendInput(1, inputs, Marshal.SizeOf(typeof(INPUT)));
    }

    public static void MouseUp() {
        INPUT[] inputs = new INPUT[1];
        inputs[0].type = INPUT_MOUSE;
        inputs[0].mi.dwFlags = MOUSEEVENTF_LEFTUP;
        SendInput(1, inputs, Marshal.SizeOf(typeof(INPUT)));
    }
}
"@

# Activate window at start point
$targetWindow = [DragThrough]::GetRealWindowFromPoint(${Math.round(fromX)}, ${Math.round(fromY)})
if ($targetWindow -ne [IntPtr]::Zero) {
    [DragThrough]::ForceForeground($targetWindow)
    Start-Sleep -Milliseconds 30
}

# Mouse down at start position
[DragThrough]::MouseDown()
`;
  await executePowerShell(script);
  
  // Move to destination
  await sleep(100);
  await moveMouse(toX, toY);
  await sleep(100);
  
  // Mouse up
  const upScript = `
[DragThrough]::MouseUp()
`;
  await executePowerShell(upScript);
  
  console.log(`[AUTOMATION] Dragged from (${fromX}, ${fromY}) to (${toX}, ${toY}) (click-through enabled)`);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== DIRECT COMMAND EXECUTION =====
// Most reliable for terminal operations - runs shell commands directly

/**
 * Truncate output for token efficiency while preserving useful info
 */
function truncateOutput(output, maxLen = 4000) {
  if (!output || output.length <= maxLen) return output;
  
  const headLen = Math.floor(maxLen * 0.4);
  const tailLen = Math.floor(maxLen * 0.4);
  
  return output.slice(0, headLen) + 
    `\n\n... [${output.length - headLen - tailLen} characters truncated] ...\n\n` +
    output.slice(-tailLen);
}

/**
 * Check if a command is dangerous and requires confirmation
 */
function isCommandDangerous(command) {
  return DANGEROUS_COMMAND_PATTERNS.some(pattern => pattern.test(command));
}

/**
 * Execute a shell command directly
 * This is the MOST RELIABLE way to run terminal commands!
 */
async function executeCommand(command, options = {}) {
  const { 
    cwd = os.homedir(), 
    shell = 'powershell', 
    timeout = 30000,
    maxOutput = 50000 
  } = options;
  
  console.log(`[AUTOMATION] Executing command: ${command}`);
  console.log(`[AUTOMATION] Working directory: ${cwd}, Shell: ${shell}`);
  
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    // Determine shell executable
    let shellExe;
    let shellArgs;
    if (shell === 'cmd') {
      shellExe = 'cmd.exe';
      shellArgs = ['/c', command];
    } else if (shell === 'bash') {
      shellExe = 'bash';
      shellArgs = ['-c', command];
    } else {
      // Default: PowerShell
      shellExe = 'powershell.exe';
      shellArgs = ['-NoProfile', '-Command', command];
    }
    
    const { spawn } = require('child_process');
    const child = spawn(shellExe, shellArgs, {
      cwd: cwd || os.homedir(),
      timeout: Math.min(timeout, 120000),
      shell: false,
      windowsHide: true
    });
    
    let stdout = '';
    let stderr = '';
    let killed = false;
    
    // Set timeout
    const timer = setTimeout(() => {
      killed = true;
      child.kill('SIGTERM');
    }, Math.min(timeout, 120000));
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
      // Prevent memory issues
      if (stdout.length > maxOutput * 2) {
        stdout = stdout.slice(-maxOutput);
      }
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
      if (stderr.length > maxOutput) {
        stderr = stderr.slice(-maxOutput);
      }
    });
    
    child.on('close', (code) => {
      clearTimeout(timer);
      const duration = Date.now() - startTime;
      
      const result = {
        success: code === 0 && !killed,
        stdout: truncateOutput(stdout.trim(), 4000),
        stderr: stderr.trim().slice(0, 1000),
        exitCode: killed ? -1 : (code || 0),
        duration,
        truncated: stdout.length > 4000,
        originalLength: stdout.length,
        timedOut: killed
      };
      
      console.log(`[AUTOMATION] Command completed: exit=${result.exitCode}, duration=${duration}ms, output=${result.stdout.length} chars`);
      resolve(result);
    });
    
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        success: false,
        stdout: '',
        stderr: err.message,
        exitCode: -1,
        duration: Date.now() - startTime,
        error: err.message
      });
    });
  });
}

// ===== SEMANTIC ELEMENT-BASED AUTOMATION =====
// More reliable than coordinate-based - finds elements by their properties

/**
 * Execute PowerShell script from a temp file (better for complex scripts)
 */
function executePowerShellScript(scriptContent, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const tempDir = path.join(os.tmpdir(), 'liku-automation');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const scriptFile = path.join(tempDir, `script-${Date.now()}.ps1`);
    fs.writeFileSync(scriptFile, scriptContent, 'utf8');
    
    exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptFile}"`, {
      encoding: 'utf8',
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024
    }, (error, stdout, stderr) => {
      // Clean up
      try { fs.unlinkSync(scriptFile); } catch (e) {}
      
      if (error) {
        resolve({ error: error.message, stderr });
      } else {
        resolve({ stdout: stdout.trim(), stderr });
      }
    });
  });
}

/**
 * Find UI element by text content using Windows UI Automation
 * Searches the entire UI tree for elements containing the specified text
 * 
 * @param {string} searchText - Text to search for (partial match)
 * @param {Object} options - Search options
 * @param {string} options.controlType - Filter by control type (Button, Text, ComboBox, etc.)
 * @param {boolean} options.exact - Require exact text match (default: false)
 * @returns {Object} Element info with bounds, or error
 */
async function findElementByText(searchText, options = {}) {
  const { controlType = '', exact = false } = options;
  
  const psScript = `
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

function Find-ElementByText {
    param(
        [string]$SearchText,
        [string]$ControlType = "",
        [bool]$ExactMatch = $false
    )
    
    $root = [System.Windows.Automation.AutomationElement]::RootElement
    $condition = [System.Windows.Automation.Condition]::TrueCondition
    
    # Find all elements
    $elements = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condition)
    
    $results = @()
    foreach ($el in $elements) {
        try {
            $name = $el.Current.Name
            $ctrlType = $el.Current.ControlType.ProgrammaticName
            
            # Check text match
            $textMatch = $false
            if ($ExactMatch) {
                $textMatch = ($name -eq $SearchText)
            } else {
                $textMatch = ($name -like "*$SearchText*")
            }
            
            if (-not $textMatch) { continue }
            
            # Check control type filter
            if ($ControlType -ne "" -and $ctrlType -notlike "*$ControlType*") { continue }
            
            $rect = $el.Current.BoundingRectangle
            if ($rect.Width -le 0 -or $rect.Height -le 0) { continue }
            
            $results += @{
                Name = $name
                ControlType = $ctrlType
                AutomationId = $el.Current.AutomationId
                ClassName = $el.Current.ClassName
                Bounds = @{
                    X = [int]$rect.X
                    Y = [int]$rect.Y
                    Width = [int]$rect.Width
                    Height = [int]$rect.Height
                    CenterX = [int]($rect.X + $rect.Width / 2)
                    CenterY = [int]($rect.Y + $rect.Height / 2)
                }
                IsEnabled = $el.Current.IsEnabled
            }
        } catch {}
    }
    
    return $results
}

$results = Find-ElementByText -SearchText "${searchText.replace(/"/g, '`"')}" -ControlType "${controlType}" -ExactMatch $${exact}
$results | ConvertTo-Json -Depth 5
`;

  const result = await executePowerShellScript(psScript, 15000);
  
  if (result.error) {
    return { error: result.error, elements: [] };
  }
  
  try {
    let elements = JSON.parse(result.stdout || '[]');
    if (!Array.isArray(elements)) {
      elements = elements ? [elements] : [];
    }
    
    console.log(`[AUTOMATION] Found ${elements.length} elements matching "${searchText}"`);
    
    return {
      success: true,
      elements,
      count: elements.length,
      // Return first match for convenience
      element: elements.length > 0 ? elements[0] : null
    };
  } catch (e) {
    return { error: 'Failed to parse element results', raw: result.stdout, elements: [] };
  }
}

/**
 * Click on a UI element found by its text content
 * This is MORE RELIABLE than coordinate-based clicking
 * 
 * @param {string} searchText - Text to search for
 * @param {Object} options - Search options (same as findElementByText)
 * @returns {Object} Click result
 */
async function clickElementByText(searchText, options = {}) {
  console.log(`[AUTOMATION] Searching for element: "${searchText}"`);
  
  const findResult = await findElementByText(searchText, options);
  
  if (findResult.error) {
    return { success: false, error: findResult.error };
  }
  
  if (!findResult.element) {
    return { 
      success: false, 
      error: `No element found containing "${searchText}"`,
      searched: searchText
    };
  }
  
  const el = findResult.element;
  const { CenterX, CenterY } = el.Bounds;
  
  console.log(`[AUTOMATION] Found "${el.Name}" at center (${CenterX}, ${CenterY})`);
  
  // Use UI Automation Invoke pattern for buttons (more reliable than mouse simulation)
  if (options.useInvoke !== false && el.ControlType && el.ControlType.includes('Button')) {
    console.log(`[AUTOMATION] Using Invoke pattern for button`);
    const invokeResult = await invokeElementByText(searchText, options);
    if (invokeResult.success) {
      return invokeResult;
    }
    console.log(`[AUTOMATION] Invoke failed, falling back to mouse click`);
  }
  
  // Click the center of the element
  await click(CenterX, CenterY, 'left');
  
  return {
    success: true,
    message: `Clicked "${el.Name}" at (${CenterX}, ${CenterY})`,
    element: el,
    coordinates: { x: CenterX, y: CenterY }
  };
}

/**
 * Invoke a UI element using UI Automation's Invoke pattern
 * More reliable than simulating mouse clicks for buttons
 */
async function invokeElementByText(searchText, options = {}) {
  const controlType = options.controlType || '';
  const exact = options.exact === true;
  
  const psScript = `
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$searchText = "${searchText.replace(/"/g, '`"')}"
$controlType = "${controlType}"
$exactMatch = $${exact}

$root = [System.Windows.Automation.AutomationElement]::RootElement
$condition = [System.Windows.Automation.Condition]::TrueCondition
$elements = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condition)

$found = $null
foreach ($el in $elements) {
    try {
        $name = $el.Current.Name
        $ctrlType = $el.Current.ControlType.ProgrammaticName
        
        $textMatch = $false
        if ($exactMatch) {
            $textMatch = ($name -eq $searchText)
        } else {
            $textMatch = ($name -like "*$searchText*")
        }
        
        if (-not $textMatch) { continue }
        if ($controlType -ne "" -and $ctrlType -notlike "*$controlType*") { continue }
        
        $rect = $el.Current.BoundingRectangle
        if ($rect.Width -le 0 -or $rect.Height -le 0) { continue }
        
        $found = $el
        break
    } catch {}
}

if ($found -eq $null) {
    Write-Output '{"success": false, "error": "Element not found"}'
    exit
}

# Try Invoke pattern first
try {
    $invokePattern = $found.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
    $invokePattern.Invoke()
    $name = $found.Current.Name
    $rect = $found.Current.BoundingRectangle
    Write-Output "{\\"success\\": true, \\"method\\": \\"Invoke\\", \\"name\\": \\"$name\\", \\"x\\": $([int]($rect.X + $rect.Width/2)), \\"y\\": $([int]($rect.Y + $rect.Height/2))}"
} catch {
    # Try Toggle pattern for toggle buttons
    try {
        $togglePattern = $found.GetCurrentPattern([System.Windows.Automation.TogglePattern]::Pattern)
        $togglePattern.Toggle()
        $name = $found.Current.Name
        Write-Output "{\\"success\\": true, \\"method\\": \\"Toggle\\", \\"name\\": \\"$name\\"}"
    } catch {
        # Try SetFocus and send click
        try {
            $found.SetFocus()
            Start-Sleep -Milliseconds 100
            $rect = $found.Current.BoundingRectangle
            $x = [int]($rect.X + $rect.Width / 2)
            $y = [int]($rect.Y + $rect.Height / 2)
            
            Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class ClickHelper {
    [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
    [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, int dx, int dy, uint dwData, int dwExtraInfo);
    public const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
    public const uint MOUSEEVENTF_LEFTUP = 0x0004;
    public static void Click(int x, int y) {
        SetCursorPos(x, y);
        mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
    }
}
'@
            [ClickHelper]::Click($x, $y)
            $name = $found.Current.Name
            Write-Output "{\\"success\\": true, \\"method\\": \\"FocusClick\\", \\"name\\": \\"$name\\", \\"x\\": $x, \\"y\\": $y}"
        } catch {
            Write-Output "{\\"success\\": false, \\"error\\": \\"$($_.Exception.Message)\\"}"
        }
    }
}
`;

  const result = await executePowerShellScript(psScript, 15000);
  
  if (result.error) {
    return { success: false, error: result.error };
  }
  
  try {
    const parsed = JSON.parse(result.stdout.trim());
    if (parsed.success) {
      console.log(`[AUTOMATION] Invoked element using ${parsed.method} pattern`);
    }
    return parsed;
  } catch (e) {
    return { success: false, error: 'Failed to parse invoke result', raw: result.stdout };
  }
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
      
      // Semantic element-based actions (MORE RELIABLE than coordinates)
      case ACTION_TYPES.CLICK_ELEMENT:
        const clickResult = await clickElementByText(action.text, {
          controlType: action.controlType || '',
          exact: action.exact || false
        });
        result = { ...result, ...clickResult };
        break;
        
      case ACTION_TYPES.FIND_ELEMENT:
        const findResult = await findElementByText(action.text, {
          controlType: action.controlType || '',
          exact: action.exact || false
        });
        result = { ...result, ...findResult };
        break;
      
      case ACTION_TYPES.RUN_COMMAND:
        const cmdResult = await executeCommand(action.command, {
          cwd: action.cwd,
          shell: action.shell || 'powershell',
          timeout: action.timeout || 30000
        });
        result = { 
          ...result, 
          ...cmdResult,
          command: action.command,
          cwd: action.cwd || os.homedir()
        };
        result.message = cmdResult.success 
          ? `Command completed (exit ${cmdResult.exitCode})`
          : `Command failed: ${cmdResult.stderr || cmdResult.error}`;
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
function gridToPixels(coord) {
  const coords = gridMath.labelToScreenCoordinates(coord);
  if (!coords) {
    throw new Error(`Invalid coordinate format: ${coord}`);
  }

  const labelInfo = coords.isFine
    ? `fineCol=${coords.fineCol}, fineRow=${coords.fineRow}`
    : `col=${coords.colIndex}, row=${coords.rowIndex}`;
  console.log(`[AUTOMATION] gridToPixels: ${coord} -> ${labelInfo} -> (${coords.x}, ${coords.y})`);

  return coords;
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
  // Semantic element-based automation (preferred approach)
  findElementByText,
  clickElementByText,
};
