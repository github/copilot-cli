/**
 * Visual Awareness Module
 * Advanced screen analysis, OCR, element detection, and active window tracking
 */

const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// ===== STATE =====
let previousScreenshot = null;
let screenDiffHistory = [];
let activeWindowInfo = null;
let ocrCache = new Map();
let elementCache = new Map();

const MAX_DIFF_HISTORY = 10;
const DIFF_THRESHOLD = 0.05; // 5% change threshold

// ===== SCREEN DIFFING =====

/**
 * Compare two screenshots and detect changes
 * Returns regions that have changed significantly
 */
function compareScreenshots(current, previous) {
  if (!previous || !current) return null;

  // Both should be base64 data URLs
  // For actual pixel comparison, we'd use a canvas-based approach
  // Here we provide a simplified version that can be enhanced

  const currentData = current.dataURL;
  const previousData = previous.dataURL;

  // Simple comparison: if the base64 differs significantly
  if (currentData === previousData) {
    return { changed: false, changePercent: 0, regions: [] };
  }

  // Calculate approximate change based on string difference
  // This is a heuristic; real implementation would use pixel comparison
  const lenDiff = Math.abs(currentData.length - previousData.length);
  const avgLen = (currentData.length + previousData.length) / 2;
  const changePercent = lenDiff / avgLen;

  const changed = changePercent > DIFF_THRESHOLD;

  return {
    changed,
    changePercent: Math.min(changePercent * 100, 100),
    timestamp: Date.now(),
    regions: changed ? detectChangedRegions(current, previous) : []
  };
}

/**
 * Detect which regions of the screen changed
 * This is a simplified version - real implementation would use image processing
 */
function detectChangedRegions(current, previous) {
  // Placeholder for region detection
  // In a real implementation, this would:
  // 1. Divide screen into grid
  // 2. Compare each cell
  // 3. Return list of changed regions with coordinates

  return [{
    x: 0, y: 0,
    width: current.width,
    height: current.height,
    type: 'full-screen-change'
  }];
}

/**
 * Store current screenshot and return diff from previous
 */
function trackScreenChange(screenshot) {
  const diff = compareScreenshots(screenshot, previousScreenshot);
  
  if (diff && diff.changed) {
    screenDiffHistory.push({
      ...diff,
      from: previousScreenshot?.timestamp,
      to: screenshot.timestamp
    });

    // Trim history
    while (screenDiffHistory.length > MAX_DIFF_HISTORY) {
      screenDiffHistory.shift();
    }
  }

  previousScreenshot = screenshot;
  return diff;
}

/**
 * Get recent screen changes
 */
function getScreenDiffHistory() {
  return screenDiffHistory;
}

// ===== ACTIVE WINDOW TRACKING (Windows) =====

/**
 * Get information about the currently active window
 * Uses PowerShell on Windows
 */
function getActiveWindow() {
  return new Promise((resolve, reject) => {
    if (process.platform !== 'win32') {
      resolve({ error: 'Active window tracking only supported on Windows currently' });
      return;
    }

    const psScript = `
      Add-Type @"
        using System;
        using System.Runtime.InteropServices;
        using System.Text;
        public class Win32 {
          [DllImport("user32.dll")]
          public static extern IntPtr GetForegroundWindow();
          [DllImport("user32.dll")]
          public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
          [DllImport("user32.dll")]
          public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
          [DllImport("user32.dll")]
          public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
          [StructLayout(LayoutKind.Sequential)]
          public struct RECT { public int Left, Top, Right, Bottom; }
        }
"@
      $hwnd = [Win32]::GetForegroundWindow()
      $title = New-Object System.Text.StringBuilder 256
      [Win32]::GetWindowText($hwnd, $title, 256) | Out-Null
      $processId = 0
      [Win32]::GetWindowThreadProcessId($hwnd, [ref]$processId) | Out-Null
      $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
      $rect = New-Object Win32+RECT
      [Win32]::GetWindowRect($hwnd, [ref]$rect) | Out-Null
      @{
        Title = $title.ToString()
        ProcessName = $process.ProcessName
        ProcessId = $processId
        Bounds = @{
          X = $rect.Left
          Y = $rect.Top
          Width = $rect.Right - $rect.Left
          Height = $rect.Bottom - $rect.Top
        }
      } | ConvertTo-Json
    `;

    exec(`powershell -NoProfile -Command "${psScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, 
      { timeout: 5000 },
      (error, stdout, stderr) => {
        if (error) {
          resolve({ error: error.message });
          return;
        }
        try {
          const info = JSON.parse(stdout.trim());
          activeWindowInfo = {
            ...info,
            timestamp: Date.now()
          };
          resolve(activeWindowInfo);
        } catch (e) {
          resolve({ error: 'Failed to parse window info' });
        }
      }
    );
  });
}

/**
 * Get cached active window info
 */
function getCachedActiveWindow() {
  return activeWindowInfo;
}

// ===== OCR INTEGRATION =====

/**
 * Extract text from an image using OCR
 * Supports Tesseract (local) or cloud OCR services
 */
async function extractTextFromImage(imageData, options = {}) {
  const { provider = 'tesseract', language = 'eng' } = options;

  // Check cache
  const cacheKey = `${imageData.timestamp}-${provider}`;
  if (ocrCache.has(cacheKey)) {
    return ocrCache.get(cacheKey);
  }

  try {
    let result;

    switch (provider) {
      case 'tesseract':
        result = await extractWithTesseract(imageData, language);
        break;
      case 'windows-ocr':
        result = await extractWithWindowsOCR(imageData);
        break;
      default:
        result = { error: `Unknown OCR provider: ${provider}` };
    }

    // Cache result
    ocrCache.set(cacheKey, result);

    // Limit cache size
    if (ocrCache.size > 50) {
      const firstKey = ocrCache.keys().next().value;
      ocrCache.delete(firstKey);
    }

    return result;
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Extract text using Tesseract OCR
 */
function extractWithTesseract(imageData, language) {
  return new Promise((resolve, reject) => {
    // Save image to temp file
    const tempDir = path.join(os.tmpdir(), 'liku-ocr');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempImagePath = path.join(tempDir, `ocr-${Date.now()}.png`);
    const base64Data = imageData.dataURL.replace(/^data:image\/\w+;base64,/, '');
    
    try {
      fs.writeFileSync(tempImagePath, base64Data, 'base64');
    } catch (err) {
      resolve({ error: 'Failed to write temp image: ' + err.message });
      return;
    }

    // Call Tesseract
    exec(`tesseract "${tempImagePath}" stdout -l ${language}`, 
      { timeout: 30000 },
      (error, stdout, stderr) => {
        // Clean up temp file
        try { fs.unlinkSync(tempImagePath); } catch (e) {}

        if (error) {
          if (error.message.includes('not recognized') || error.message.includes('not found')) {
            resolve({ 
              error: 'Tesseract not installed. Install from: https://github.com/UB-Mannheim/tesseract/wiki',
              installHint: true
            });
          } else {
            resolve({ error: error.message });
          }
          return;
        }

        resolve({
          text: stdout.trim(),
          language,
          timestamp: Date.now()
        });
      }
    );
  });
}

/**
 * Extract text using Windows built-in OCR
 */
function extractWithWindowsOCR(imageData) {
  return new Promise((resolve, reject) => {
    if (process.platform !== 'win32') {
      resolve({ error: 'Windows OCR only available on Windows' });
      return;
    }

    // Save image to temp file
    const tempDir = path.join(os.tmpdir(), 'liku-ocr');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempImagePath = path.join(tempDir, `ocr-${Date.now()}.png`);
    const base64Data = imageData.dataURL.replace(/^data:image\/\w+;base64,/, '');
    
    try {
      fs.writeFileSync(tempImagePath, base64Data, 'base64');
    } catch (err) {
      resolve({ error: 'Failed to write temp image: ' + err.message });
      return;
    }

    // Use Windows OCR via PowerShell
    const psScript = `
      Add-Type -AssemblyName System.Runtime.WindowsRuntime
      $null = [Windows.Media.Ocr.OcrEngine,Windows.Foundation,ContentType=WindowsRuntime]
      $null = [Windows.Graphics.Imaging.BitmapDecoder,Windows.Foundation,ContentType=WindowsRuntime]
      $null = [Windows.Storage.StorageFile,Windows.Foundation,ContentType=WindowsRuntime]
      
      $file = [Windows.Storage.StorageFile]::GetFileFromPathAsync("${tempImagePath.replace(/\\/g, '\\\\')}").GetAwaiter().GetResult()
      $stream = $file.OpenReadAsync().GetAwaiter().GetResult()
      $decoder = [Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream).GetAwaiter().GetResult()
      $bitmap = $decoder.GetSoftwareBitmapAsync().GetAwaiter().GetResult()
      
      $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
      $result = $engine.RecognizeAsync($bitmap).GetAwaiter().GetResult()
      $result.Text
    `;

    exec(`powershell -NoProfile -Command "${psScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`,
      { timeout: 30000 },
      (error, stdout, stderr) => {
        // Clean up temp file
        try { fs.unlinkSync(tempImagePath); } catch (e) {}

        if (error) {
          resolve({ error: 'Windows OCR failed: ' + error.message });
          return;
        }

        resolve({
          text: stdout.trim(),
          provider: 'windows-ocr',
          timestamp: Date.now()
        });
      }
    );
  });
}

// ===== UI ELEMENT DETECTION =====

/**
 * Detect UI elements from accessibility tree (Windows UI Automation)
 */
function detectUIElements(options = {}) {
  return new Promise((resolve, reject) => {
    if (process.platform !== 'win32') {
      resolve({ error: 'UI Automation only available on Windows' });
      return;
    }

    const { depth = 3, includeInvisible = false } = options;

    const psScript = `
      Add-Type -AssemblyName UIAutomationClient
      Add-Type -AssemblyName UIAutomationTypes
      
      function Get-UIElements {
        param($element, $depth, $currentDepth = 0)
        
        if ($currentDepth -ge $depth) { return @() }
        
        $results = @()
        $condition = [System.Windows.Automation.Condition]::TrueCondition
        $children = $element.FindAll([System.Windows.Automation.TreeScope]::Children, $condition)
        
        foreach ($child in $children) {
          try {
            $rect = $child.Current.BoundingRectangle
            if ($rect.Width -gt 0 -and $rect.Height -gt 0) {
              $results += @{
                Name = $child.Current.Name
                ControlType = $child.Current.ControlType.ProgrammaticName
                AutomationId = $child.Current.AutomationId
                ClassName = $child.Current.ClassName
                Bounds = @{
                  X = [int]$rect.X
                  Y = [int]$rect.Y
                  Width = [int]$rect.Width
                  Height = [int]$rect.Height
                }
                IsEnabled = $child.Current.IsEnabled
              }
              $results += Get-UIElements -element $child -depth $depth -currentDepth ($currentDepth + 1)
            }
          } catch {}
        }
        return $results
      }
      
      $root = [System.Windows.Automation.AutomationElement]::FocusedElement
      if ($null -eq $root) {
        $root = [System.Windows.Automation.AutomationElement]::RootElement
      }
      
      $elements = Get-UIElements -element $root -depth ${depth}
      $elements | ConvertTo-Json -Depth 10
    `;

    exec(`powershell -NoProfile -Command "${psScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`,
      { timeout: 10000 },
      (error, stdout, stderr) => {
        if (error) {
          resolve({ error: 'UI Automation failed: ' + error.message });
          return;
        }

        try {
          let elements = JSON.parse(stdout.trim() || '[]');
          if (!Array.isArray(elements)) {
            elements = [elements];
          }

          // Cache results
          elementCache.set(Date.now(), elements);

          resolve({
            elements,
            count: elements.length,
            timestamp: Date.now()
          });
        } catch (e) {
          resolve({ elements: [], count: 0, error: 'Parse error' });
        }
      }
    );
  });
}

/**
 * Find UI element at specific coordinates
 */
function findElementAtPoint(x, y) {
  return new Promise((resolve, reject) => {
    if (process.platform !== 'win32') {
      resolve({ error: 'UI Automation only available on Windows' });
      return;
    }

    const psScript = `
      Add-Type -AssemblyName UIAutomationClient
      Add-Type -AssemblyName UIAutomationTypes
      
      $point = New-Object System.Windows.Point(${x}, ${y})
      $element = [System.Windows.Automation.AutomationElement]::FromPoint($point)
      
      if ($null -ne $element) {
        $rect = $element.Current.BoundingRectangle
        @{
          Name = $element.Current.Name
          ControlType = $element.Current.ControlType.ProgrammaticName
          AutomationId = $element.Current.AutomationId
          ClassName = $element.Current.ClassName
          Value = try { $element.GetCurrentPropertyValue([System.Windows.Automation.AutomationElement]::ValueProperty) } catch { $null }
          Bounds = @{
            X = [int]$rect.X
            Y = [int]$rect.Y
            Width = [int]$rect.Width
            Height = [int]$rect.Height
          }
          IsEnabled = $element.Current.IsEnabled
          HasKeyboardFocus = $element.Current.HasKeyboardFocus
        } | ConvertTo-Json
      } else {
        @{ error = "No element found at point" } | ConvertTo-Json
      }
    `;

    exec(`powershell -NoProfile -Command "${psScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`,
      { timeout: 5000 },
      (error, stdout, stderr) => {
        if (error) {
          resolve({ error: 'Element lookup failed: ' + error.message });
          return;
        }

        try {
          const element = JSON.parse(stdout.trim());
          resolve({
            ...element,
            queryPoint: { x, y },
            timestamp: Date.now()
          });
        } catch (e) {
          resolve({ error: 'Parse error' });
        }
      }
    );
  });
}

// ===== COMPREHENSIVE SCREEN ANALYSIS =====

/**
 * Perform full screen analysis including:
 * - Active window detection
 * - Screen diff from previous
 * - OCR text extraction
 * - UI element detection
 */
async function analyzeScreen(screenshot, options = {}) {
  const { 
    includeOCR = true, 
    includeElements = true,
    ocrProvider = 'tesseract'
  } = options;

  const results = {
    timestamp: Date.now(),
    screenshot: {
      width: screenshot.width,
      height: screenshot.height,
      timestamp: screenshot.timestamp
    }
  };

  // Parallel execution of analysis tasks
  const tasks = [];

  // Active window
  tasks.push(
    getActiveWindow().then(info => {
      results.activeWindow = info;
    })
  );

  // Screen diff
  const diff = trackScreenChange(screenshot);
  results.screenDiff = diff;

  // OCR (optional, can be slow)
  if (includeOCR) {
    tasks.push(
      extractTextFromImage(screenshot, { provider: ocrProvider }).then(ocr => {
        results.ocr = ocr;
      })
    );
  }

  // UI Elements (optional)
  if (includeElements) {
    tasks.push(
      detectUIElements({ depth: 2 }).then(elements => {
        results.uiElements = elements;
      })
    );
  }

  // Wait for all tasks
  await Promise.allSettled(tasks);

  return results;
}

// ===== EXPORTS =====
module.exports = {
  // Screen diffing
  trackScreenChange,
  getScreenDiffHistory,
  compareScreenshots,
  
  // Active window
  getActiveWindow,
  getCachedActiveWindow,
  
  // OCR
  extractTextFromImage,
  
  // UI Elements
  detectUIElements,
  findElementAtPoint,
  
  // Comprehensive analysis
  analyzeScreen
};
