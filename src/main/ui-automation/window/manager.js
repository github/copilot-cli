/**
 * Window Management Module
 * 
 * Find, focus, and interact with windows.
 * @module ui-automation/window
 */

const { executePowerShellScript } = require('../core/powershell');
const { log, sleep } = require('../core/helpers');

/**
 * Get the active (foreground) window info
 * 
 * @returns {Promise<{hwnd: number, title: string, processName: string, className: string, bounds: Object} | null>}
 */
async function getActiveWindow() {
  const psScript = `
Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public class WinAPI {
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
    [DllImport("user32.dll")] public static extern int GetClassName(IntPtr hWnd, StringBuilder name, int count);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
    
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int Left, Top, Right, Bottom; }
}
'@

$hwnd = [WinAPI]::GetForegroundWindow()
if ($hwnd -eq [IntPtr]::Zero) { Write-Output "null"; exit }

$titleSB = New-Object System.Text.StringBuilder 256
$classSB = New-Object System.Text.StringBuilder 256
[void][WinAPI]::GetWindowText($hwnd, $titleSB, 256)
[void][WinAPI]::GetClassName($hwnd, $classSB, 256)

$procId = 0
[void][WinAPI]::GetWindowThreadProcessId($hwnd, [ref]$procId)
$proc = Get-Process -Id $procId -ErrorAction SilentlyContinue

$rect = New-Object WinAPI+RECT
[void][WinAPI]::GetWindowRect($hwnd, [ref]$rect)

@{
    hwnd = $hwnd.ToInt64()
    title = $titleSB.ToString()
    className = $classSB.ToString()
    processName = if ($proc) { $proc.ProcessName } else { "" }
    bounds = @{ x = $rect.Left; y = $rect.Top; width = $rect.Right - $rect.Left; height = $rect.Bottom - $rect.Top }
} | ConvertTo-Json -Compress
`;

  try {
    const result = await executePowerShellScript(psScript);
    if (result.stdout.trim() === 'null') return null;
    const data = JSON.parse(result.stdout.trim());
    log(`Active window: "${data.title}" (${data.processName})`);
    return data;
  } catch (err) {
    log(`getActiveWindow error: ${err.message}`, 'error');
    return null;
  }
}

/**
 * Find windows matching criteria
 * 
 * @param {Object} [criteria] - Search criteria
 * @param {string} [criteria.title] - Window title contains
 * @param {string} [criteria.processName] - Process name equals
 * @param {string} [criteria.className] - Window class contains
 * @returns {Promise<Array<{hwnd: number, title: string, processName: string, className: string, bounds: Object}>>}
 */
async function findWindows(criteria = {}) {
  const { title, processName, className } = criteria;
  
  const psScript = `
Add-Type @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;

public class WindowFinder {
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc cb, IntPtr lParam);
    [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
    [DllImport("user32.dll")] public static extern int GetClassName(IntPtr hWnd, StringBuilder name, int count);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
    
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int Left, Top, Right, Bottom; }
    
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    
    public static List<IntPtr> windows = new List<IntPtr>();
    
    public static void Find() {
        windows.Clear();
        EnumWindows((h, l) => { if (IsWindowVisible(h)) windows.Add(h); return true; }, IntPtr.Zero);
    }
}
'@

[WindowFinder]::Find()
$results = @()

foreach ($hwnd in [WindowFinder]::windows) {
    $titleSB = New-Object System.Text.StringBuilder 256
    $classSB = New-Object System.Text.StringBuilder 256
    [void][WindowFinder]::GetWindowText($hwnd, $titleSB, 256)
    [void][WindowFinder]::GetClassName($hwnd, $classSB, 256)
    
    $t = $titleSB.ToString()
    $c = $classSB.ToString()
    if ([string]::IsNullOrEmpty($t)) { continue }
    
    ${title ? `if (-not $t.ToLower().Contains('${title.toLowerCase().replace(/'/g, "''")}')) { continue }` : ''}
    ${className ? `if (-not $c.ToLower().Contains('${className.toLowerCase().replace(/'/g, "''")}')) { continue }` : ''}
    
    $procId = 0
    [void][WindowFinder]::GetWindowThreadProcessId($hwnd, [ref]$procId)
    $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
    $pn = if ($proc) { $proc.ProcessName } else { "" }
    
    ${processName ? `if ($pn -ne '${processName.replace(/'/g, "''")}') { continue }` : ''}
    
    $rect = New-Object WindowFinder+RECT
    [void][WindowFinder]::GetWindowRect($hwnd, [ref]$rect)
    
    $results += @{
        hwnd = $hwnd.ToInt64()
        title = $t
        className = $c
        processName = $pn
        bounds = @{ x = $rect.Left; y = $rect.Top; width = $rect.Right - $rect.Left; height = $rect.Bottom - $rect.Top }
    }
}

$results | ConvertTo-Json -Compress
`;

  try {
    const result = await executePowerShellScript(psScript);
    const output = result.stdout.trim();
    if (!output || output === 'null') return [];
    const data = JSON.parse(output);
    const windows = Array.isArray(data) ? data : [data];
    log(`Found ${windows.length} windows matching criteria`);
    return windows;
  } catch (err) {
    log(`findWindows error: ${err.message}`, 'error');
    return [];
  }
}

/**
 * Focus a window (bring to foreground)
 * 
 * @param {number|string|Object} target - Window handle, title substring, or criteria object
 * @returns {Promise<{success: boolean, window: Object|null}>}
 */
async function focusWindow(target) {
  let hwnd = null;
  let windowInfo = null;
  
  if (typeof target === 'number') {
    hwnd = target;
  } else if (typeof target === 'string') {
    const windows = await findWindows({ title: target });
    if (windows.length > 0) {
      hwnd = windows[0].hwnd;
      windowInfo = windows[0];
    }
  } else if (typeof target === 'object' && target.hwnd) {
    hwnd = target.hwnd;
    windowInfo = target;
  } else if (typeof target === 'object') {
    const windows = await findWindows(target);
    if (windows.length > 0) {
      hwnd = windows[0].hwnd;
      windowInfo = windows[0];
    }
  }
  
  if (!hwnd) {
    log(`focusWindow: No window found for target`, 'warn');
    return { success: false, window: null };
  }
  
  const psScript = `
Add-Type @'
using System;
using System.Runtime.InteropServices;

public class FocusHelper {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int cmd);
    [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
}
'@

$hwnd = [IntPtr]::new(${hwnd})
[FocusHelper]::ShowWindow($hwnd, 9)  # SW_RESTORE
Start-Sleep -Milliseconds 50
[FocusHelper]::BringWindowToTop($hwnd)
[FocusHelper]::SetForegroundWindow($hwnd)
Start-Sleep -Milliseconds 100

$fg = [FocusHelper]::GetForegroundWindow()
if ($fg -eq $hwnd) { "focused" } else { "failed" }
`;

  const result = await executePowerShellScript(psScript);
  const success = result.stdout.includes('focused');
  log(`focusWindow hwnd=${hwnd} - ${success ? 'success' : 'failed'}`);
  
  return { success, window: windowInfo };
}

/**
 * Minimize a window
 * 
 * @param {number} hwnd - Window handle
 * @returns {Promise<{success: boolean}>}
 */
async function minimizeWindow(hwnd) {
  const psScript = `
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class MinHelper {
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int cmd);
}
'@
[MinHelper]::ShowWindow([IntPtr]::new(${hwnd}), 6)  # SW_MINIMIZE
'minimized'
`;

  const result = await executePowerShellScript(psScript);
  return { success: result.stdout.includes('minimized') };
}

/**
 * Maximize a window
 * 
 * @param {number} hwnd - Window handle
 * @returns {Promise<{success: boolean}>}
 */
async function maximizeWindow(hwnd) {
  const psScript = `
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class MaxHelper {
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int cmd);
}
'@
[MaxHelper]::ShowWindow([IntPtr]::new(${hwnd}), 3)  # SW_MAXIMIZE
'maximized'
`;

  const result = await executePowerShellScript(psScript);
  return { success: result.stdout.includes('maximized') };
}

/**
 * Restore a window to normal state
 * 
 * @param {number} hwnd - Window handle
 * @returns {Promise<{success: boolean}>}
 */
async function restoreWindow(hwnd) {
  const psScript = `
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class RestoreHelper {
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int cmd);
}
'@
[RestoreHelper]::ShowWindow([IntPtr]::new(${hwnd}), 9)  # SW_RESTORE
'restored'
`;

  const result = await executePowerShellScript(psScript);
  return { success: result.stdout.includes('restored') };
}

module.exports = {
  getActiveWindow,
  findWindows,
  focusWindow,
  minimizeWindow,
  maximizeWindow,
  restoreWindow,
};
