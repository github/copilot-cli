/**
 * Screenshot Module
 * 
 * Capture screenshots of screen, windows, or regions.
 * @module ui-automation/screenshot
 */

const { executePowerShellScript } = require('./core/powershell');
const { log } = require('./core/helpers');
const path = require('path');
const os = require('os');

/**
 * Take a screenshot
 * 
 * @param {Object} [options] - Screenshot options
 * @param {string} [options.path] - Save path (auto-generated if omitted)
 * @param {Object} [options.region] - Region to capture {x, y, width, height}
 * @param {number} [options.windowHwnd] - Capture specific window by handle
 * @param {string} [options.format='png'] - Image format (png, jpg, bmp)
 * @returns {Promise<{success: boolean, path: string|null, base64: string|null}>}
 */
async function screenshot(options = {}) {
  const { 
    path: savePath, 
    region, 
    windowHwnd,
    format = 'png',
  } = options;
  
  // Generate path if not provided
  const outputPath = savePath || path.join(
    os.tmpdir(), 
    `screenshot_${Date.now()}.${format}`
  );
  
  // Build PowerShell script based on capture type
  let captureScript;
  
  if (windowHwnd) {
    // Capture specific window
    captureScript = `
Add-Type @'
using System;
using System.Drawing;
using System.Runtime.InteropServices;

public class WindowCapture {
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
    [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hWnd, IntPtr hDC, int flags);
    
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int Left, Top, Right, Bottom; }
    
    public static Bitmap Capture(IntPtr hwnd) {
        RECT rect;
        GetWindowRect(hwnd, out rect);
        int w = rect.Right - rect.Left;
        int h = rect.Bottom - rect.Top;
        if (w <= 0 || h <= 0) return null;
        
        var bmp = new Bitmap(w, h);
        using (var g = Graphics.FromImage(bmp)) {
            IntPtr hdc = g.GetHdc();
            PrintWindow(hwnd, hdc, 2);
            g.ReleaseHdc(hdc);
        }
        return bmp;
    }
}
'@

Add-Type -AssemblyName System.Drawing
$bmp = [WindowCapture]::Capture([IntPtr]::new(${windowHwnd}))
`;
  } else if (region) {
    // Capture region
    captureScript = `
Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap(${region.width}, ${region.height})
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen(${region.x}, ${region.y}, 0, 0, $bmp.Size)
$g.Dispose()
`;
  } else {
    // Capture full screen
    captureScript = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bmp = New-Object System.Drawing.Bitmap($screen.Width, $screen.Height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size)
$g.Dispose()
`;
  }
  
  // Add save and output
  const formatMap = { png: 'Png', jpg: 'Jpeg', bmp: 'Bmp' };
  const imageFormat = formatMap[format.toLowerCase()] || 'Png';
  
  const psScript = `
${captureScript}
if ($bmp -eq $null) {
    Write-Output "capture_failed"
    exit
}

$path = '${outputPath.replace(/\\/g, '\\\\').replace(/'/g, "''")}'
$bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::${imageFormat})
$bmp.Dispose()

# Output base64 for convenience
$bytes = [System.IO.File]::ReadAllBytes($path)
$base64 = [System.Convert]::ToBase64String($bytes)
Write-Output "SCREENSHOT_PATH:$path"
Write-Output "SCREENSHOT_BASE64:$base64"
`;

  try {
    const result = await executePowerShellScript(psScript);
    
    if (result.stdout.includes('capture_failed')) {
      log('Screenshot capture failed', 'error');
      return { success: false, path: null, base64: null };
    }
    
    const pathMatch = result.stdout.match(/SCREENSHOT_PATH:(.+)/);
    const base64Match = result.stdout.match(/SCREENSHOT_BASE64:(.+)/);
    
    const screenshotPath = pathMatch ? pathMatch[1].trim() : outputPath;
    const base64 = base64Match ? base64Match[1].trim() : null;
    
    log(`Screenshot saved to: ${screenshotPath}`);
    
    return { success: true, path: screenshotPath, base64 };
  } catch (err) {
    log(`Screenshot error: ${err.message}`, 'error');
    return { success: false, path: null, base64: null };
  }
}

/**
 * Take screenshot of active window
 * 
 * @param {Object} [options] - Screenshot options
 * @returns {Promise<{success: boolean, path: string|null}>}
 */
async function screenshotActiveWindow(options = {}) {
  const { getActiveWindow } = require('./window');
  const activeWindow = await getActiveWindow();
  
  if (!activeWindow) {
    return { success: false, path: null, base64: null };
  }
  
  return screenshot({ ...options, windowHwnd: activeWindow.hwnd });
}

/**
 * Take screenshot of element
 * 
 * @param {Object} criteria - Element search criteria
 * @param {Object} [options] - Screenshot options
 * @returns {Promise<{success: boolean, path: string|null}>}
 */
async function screenshotElement(criteria, options = {}) {
  const { findElement } = require('./elements');
  const element = await findElement(criteria);
  
  if (!element || !element.bounds) {
    return { success: false, path: null, base64: null };
  }
  
  return screenshot({ ...options, region: element.bounds });
}

module.exports = {
  screenshot,
  screenshotActiveWindow,
  screenshotElement,
};
