/**
 * UI Watcher Service - Live UI Mirror for AI Awareness
 * 
 * Provides continuous background monitoring of the Windows UI tree,
 * enabling the AI to have real-time awareness without manual screenshots.
 * 
 * Architecture:
 * - Polls Windows UI Automation every 300-500ms
 * - Maintains an element cache with bounds, text, and roles
 * - Sends incremental diffs to the overlay
 * - Provides instant context to AI for every message
 */

const { exec, spawn } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');
const EventEmitter = require('events');

class UIWatcher extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      pollInterval: options.pollInterval || 400,      // ms between polls
      focusedWindowOnly: options.focusedWindowOnly ?? false, // scan all visible windows by default
      maxElements: options.maxElements || 300,        // increased limit for desktop scan
      minConfidence: options.minConfidence || 0.3,    // filter low-confidence elements
      enabled: false,
      ...options
    };
    
    // Element cache
    this.cache = {
      elements: [],
      activeWindow: null,
      lastUpdate: 0,
      updateCount: 0
    };
    
    // Polling state
    this.pollTimer = null;
    this.isPolling = false;
    this.pollInProgress = false;
    
    // Performance tracking
    this.metrics = {
      avgPollTime: 0,
      pollCount: 0,
      lastPollTime: 0,
      errorCount: 0
    };
    
    // Persistent PowerShell process for performance
    this.psProcess = null;
    this.psQueue = [];
    this.psReady = false;
  }
  
  /**
   * Start continuous UI monitoring
   */
  start() {
    if (this.isPolling) return;
    
    console.log('[UI-WATCHER] Starting continuous monitoring (interval:', this.options.pollInterval, 'ms)');
    this.isPolling = true;
    this.options.enabled = true;
    
    // Initial poll
    this.poll();
    
    // Start polling loop
    this.pollTimer = setInterval(() => {
      if (!this.pollInProgress) {
        this.poll();
      }
    }, this.options.pollInterval);
    
    this.emit('started');
  }
  
  /**
   * Stop monitoring
   */
  stop() {
    if (!this.isPolling) return;
    
    console.log('[UI-WATCHER] Stopping monitoring');
    this.isPolling = false;
    this.options.enabled = false;
    
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    
    this.killPsProcess();
    this.emit('stopped');
  }
  
  /**
   * Perform a single poll of the UI tree
   */
  async poll() {
    if (this.pollInProgress) return;
    this.pollInProgress = true;
    
    const startTime = Date.now();
    
    try {
      // Get active window info
      const activeWindow = await this.getActiveWindow();
      
      // Get UI elements (focused window only for performance)
      const elements = await this.detectElements(activeWindow);
      
      // Calculate diff
      const diff = this.calculateDiff(elements);
      
      // Update cache
      const oldCache = { ...this.cache };
      this.cache = {
        elements,
        activeWindow,
        lastUpdate: Date.now(),
        updateCount: this.cache.updateCount + 1
      };
      
      // Track metrics
      const pollTime = Date.now() - startTime;
      this.metrics.pollCount++;
      this.metrics.lastPollTime = pollTime;
      this.metrics.avgPollTime = (this.metrics.avgPollTime * (this.metrics.pollCount - 1) + pollTime) / this.metrics.pollCount;
      
      // Emit events
      if (diff.hasChanges) {
        this.emit('ui-changed', {
          added: diff.added,
          removed: diff.removed,
          changed: diff.changed,
          activeWindow,
          elementCount: elements.length
        });
      }
      
      this.emit('poll-complete', {
        elements,
        activeWindow,
        pollTime,
        hasChanges: diff.hasChanges
      });
      
    } catch (error) {
      this.metrics.errorCount++;
      console.error('[UI-WATCHER] Poll error:', error.message);
      this.emit('error', error);
    } finally {
      this.pollInProgress = false;
    }
  }
  
  /**
   * Get the currently active/focused window
   * Uses file-based script execution for reliable parsing
   */
  async getActiveWindow() {
    const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class ActiveWindow {
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
    [DllImport("user32.dll")] public static extern int GetWindowThreadProcessId(IntPtr hWnd, out int processId);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
"@
$hwnd = [ActiveWindow]::GetForegroundWindow()
$sb = New-Object System.Text.StringBuilder 256
[ActiveWindow]::GetWindowText($hwnd, $sb, 256) | Out-Null
$processId = 0
[ActiveWindow]::GetWindowThreadProcessId($hwnd, [ref]$processId) | Out-Null
$rect = New-Object ActiveWindow+RECT
[ActiveWindow]::GetWindowRect($hwnd, [ref]$rect) | Out-Null
$proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
@{
    hwnd = [long]$hwnd
    title = $sb.ToString()
    processId = $processId
    processName = if($proc){$proc.ProcessName}else{""}
    bounds = @{ x = $rect.Left; y = $rect.Top; width = $rect.Right - $rect.Left; height = $rect.Bottom - $rect.Top }
} | ConvertTo-Json -Compress
`;
    
    // Use file-based execution for reliable parsing
    const tempFile = path.join(os.tmpdir(), `liku-activewin-${Date.now()}.ps1`);
    
    return new Promise((resolve, reject) => {
      // Write script to temp file
      try {
        fs.writeFileSync(tempFile, script, 'utf8');
      } catch (e) {
        resolve(null);
        return;
      }
      
      exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tempFile}"`, 
        { encoding: 'utf8', timeout: 3000 },
        (error, stdout, stderr) => {
          // Clean up temp file
          try { fs.unlinkSync(tempFile); } catch {}
          
          if (error) {
            resolve(null);
            return;
          }
          try {
            resolve(JSON.parse(stdout.trim()));
          } catch (e) {
            resolve(null);
          }
        }
      );
    });
  }
  
  /**
   * Detect UI elements using Windows UI Automation
   * Uses file-based script execution for reliable parsing
   */
  async detectElements(activeWindow) {
    // Build scope filter based on active window
    const windowFilter = this.options.focusedWindowOnly && activeWindow
      ? `$targetWindow = "${(activeWindow.title || '').replace(/"/g, '`"')}"`
      : '$targetWindow = ""';
    
    const script = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

${windowFilter}
$maxElements = ${this.options.maxElements}

$root = [System.Windows.Automation.AutomationElement]::RootElement
$condition = [System.Windows.Automation.Condition]::TrueCondition
$results = @()
$count = 0

function Add-Element($el, $rootHwnd) {
    try {
        $rect = $el.Current.BoundingRectangle
        if ($rect.Width -le 0 -or $rect.Height -le 0) { return $null }
        if ($rect.X -lt -10000 -or $rect.Y -lt -10000) { return $null }
        
        $name = $el.Current.Name
        if ($name) { $name = $name -replace '[\\r\\n\\t]', ' ' }
        
        $ctrlType = $el.Current.ControlType.ProgrammaticName -replace 'ControlType\\.',''
        $autoId = $el.Current.AutomationId
        if ($autoId) { $autoId = $autoId -replace '[\\r\\n\\t]', ' ' }
        
        # Skip elements with no useful identifying info
        if ([string]::IsNullOrWhiteSpace($name) -and [string]::IsNullOrWhiteSpace($autoId)) { return $null }
        
        return @{
            id = "$ctrlType|$name|$autoId|$([int]$rect.X)|$([int]$rect.Y)"
            name = $name
            type = $ctrlType
            automationId = $autoId
            className = $el.Current.ClassName
            windowHandle = $rootHwnd
            bounds = @{
                x = [int]$rect.X
                y = [int]$rect.Y
                width = [int]$rect.Width
                height = [int]$rect.Height
            }
            center = @{
                x = [int]($rect.X + $rect.Width / 2)
                y = [int]($rect.Y + $rect.Height / 2)
            }
            isEnabled = $el.Current.IsEnabled
        }
    } catch { return $null }
}

if ($targetWindow -ne "") {
    # FOCUSED WINDOW MODE
    $nameCondition = New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::NameProperty, $targetWindow
    )
    $targetEl = $root.FindFirst([System.Windows.Automation.TreeScope]::Children, $nameCondition)
    
    if ($targetEl) {
        $targetHwnd = 0
        try { $targetHwnd = $targetEl.Current.NativeWindowHandle } catch {}
        
        $elements = $targetEl.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condition)
        foreach ($el in $elements) {
            if ($count -ge $maxElements) { break }
            $data = Add-Element $el $targetHwnd
            if ($data) { $results += $data; $count++ }
        }
    }
} else {
    # GLOBAL DESKTOP MODE (Iterate Windows)
    # Get all top-level windows first
    $windows = $root.FindAll([System.Windows.Automation.TreeScope]::Children, $condition)
    
    foreach ($win in $windows) {
        if ($count -ge $maxElements) { break }
        
        $winHwnd = 0
        try { $winHwnd = $win.Current.NativeWindowHandle } catch {}
        
        # Add window itself
        $winData = Add-Element $win $winHwnd
        if ($winData) { $results += $winData; $count++ }
        
        # Only process descendants for visible windows that have size
        if ($winData) {
            # Limit descendants per window to avoid starving other windows
            $winElements = $win.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condition)
            $winCount = 0
            foreach ($el in $winElements) {
                if ($count -ge $maxElements) { break }
                # Limit per window (e.g. 50% of remaining budget or fixed 50)
                if ($winCount -ge 50) { break } 
                
                $data = Add-Element $el $winHwnd
                if ($data) { 
                    $results += $data
                    $count++
                    $winCount++
                }
            }
        }
    }
}

$results | ConvertTo-Json -Depth 4 -Compress
`;

    // Use file-based execution for reliable parsing (inline -Command breaks on complex scripts)
    const tempFile = path.join(os.tmpdir(), `liku-detect-${Date.now()}.ps1`);
    
    return new Promise((resolve, reject) => {
      // Write script to temp file
      try {
        fs.writeFileSync(tempFile, script, 'utf8');
      } catch (e) {
        resolve([]);
        return;
      }
      
      exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tempFile}"`,
        { encoding: 'utf8', timeout: 8000, maxBuffer: 10 * 1024 * 1024 },
        (error, stdout, stderr) => {
          // Clean up temp file
          try { fs.unlinkSync(tempFile); } catch {}
          
          if (error) {
            console.error('[UI-WATCHER] PowerShell detection error:', error.message);
            resolve([]);
            return;
          }
          
          try {
            let elements = JSON.parse(stdout.trim() || '[]');
            if (!Array.isArray(elements)) elements = elements ? [elements] : [];
            resolve(elements);
          } catch (e) {
            console.error('[UI-WATCHER] JSON Parse failed:', e.message);
            console.error('[UI-WATCHER] STDOUT preview:', stdout.trim().substring(0, 200));
            resolve([]);
          }
        }
      );
    });
  }
  
  /**
   * Calculate diff between old and new element sets
   */
  calculateDiff(newElements) {
    const oldElements = this.cache.elements || [];
    const oldMap = new Map(oldElements.map(e => [e.id, e]));
    const newMap = new Map(newElements.map(e => [e.id, e]));
    
    const added = newElements.filter(e => !oldMap.has(e.id));
    const removed = oldElements.filter(e => !newMap.has(e.id));
    const changed = newElements.filter(e => {
      const old = oldMap.get(e.id);
      if (!old) return false;
      // Check if bounds or enabled state changed
      return old.bounds.x !== e.bounds.x || 
             old.bounds.y !== e.bounds.y ||
             old.isEnabled !== e.isEnabled;
    });
    
    return {
      added,
      removed,
      changed,
      hasChanges: added.length > 0 || removed.length > 0 || changed.length > 0
    };
  }
  
  /**
   * Get current UI state for AI context
   * This is called by ai-service before every API call
   */
  getContextForAI() {
    if (!this.cache.elements || this.cache.elements.length === 0) {
      return null;
    }
    
    const { elements, activeWindow, lastUpdate } = this.cache;
    const age = Date.now() - lastUpdate;
    
    // Build context string with window hierarchy
    let context = `\n## Live UI State (${age}ms ago)\n`;
    
    if (activeWindow) {
      context += `**Focused Window**: ${activeWindow.title || 'Unknown'} (${activeWindow.processName})\n`;
      context += `**Cursor**: (${activeWindow.bounds.x}, ${activeWindow.bounds.y}) ${activeWindow.bounds.width}x${activeWindow.bounds.height}\n\n`;
    }
    
    context += `**Visible Context** (${elements.length} elements detected):\n`;
    
    let listed = 0;
    const limit = 300; 
    
    // Important interactive types to highlight
    const importantTypes = ['Button', 'Edit', 'ComboBox', 'CheckBox', 'RadioButton', 'MenuItem', 'ListItem', 'TabItem', 'Hyperlink', 'Window'];
    
    for (let i = 0; i < elements.length; i++) {
      if (listed >= limit) break;
      
      const el = elements[i];
      const name = el.name || el.automationId || '[unnamed]';
      
      // Handle Window headers
      if (el.type === 'Window') {
        context += `\n[WIN] **Window**: "${name}" (Handle: ${el.windowHandle || 0})\n`;
        listed++;
        continue;
      }
      
      // Skip boring layout elements unless they have a name
      if (!importantTypes.includes(el.type) && !name && name !== '[unnamed]') continue;
      
      // Format element line with index for robust referencing
      const status = el.isEnabled ? '' : ' (disabled)';
      context += `- [${i+1}] ${el.type}: "${name}" at (${el.center.x}, ${el.center.y})${status}\n`;
      listed++;
    }
    
    if (elements.length > listed) {
      context += `\n... and ${elements.length - listed} more elements (showing first ${limit})\n`;
    }
    
    return context;
  }
  
  /**
   * Find element by text (for semantic actions)
   */
  findElementByText(searchText, options = {}) {
    const { exact = false, type = null } = options;
    const { elements } = this.cache;
    
    if (!elements) return null;
    
    const matches = elements.filter(el => {
      const name = el.name || '';
      const textMatch = exact 
        ? name.toLowerCase() === searchText.toLowerCase()
        : name.toLowerCase().includes(searchText.toLowerCase());
      
      if (!textMatch) return false;
      if (type && el.type !== type) return false;
      
      return true;
    });
    
    return matches.length > 0 ? matches[0] : null;
  }
  
  /**
   * Find all elements matching criteria
   */
  findElements(criteria = {}) {
    const { elements } = this.cache;
    if (!elements) return [];
    
    return elements.filter(el => {
      if (criteria.text && !el.name?.toLowerCase().includes(criteria.text.toLowerCase())) return false;
      if (criteria.type && el.type !== criteria.type) return false;
      if (criteria.automationId && el.automationId !== criteria.automationId) return false;
      if (criteria.enabledOnly && !el.isEnabled) return false;
      return true;
    });
  }
  
  /**
   * Get element at specific coordinates
   */
  getElementAtPoint(x, y) {
    const { elements } = this.cache;
    if (!elements) return null;
    
    // Find elements that contain the point, prefer smaller (more specific) elements
    const containing = elements.filter(el => {
      const { bounds } = el;
      return x >= bounds.x && x <= bounds.x + bounds.width &&
             y >= bounds.y && y <= bounds.y + bounds.height;
    });
    
    if (containing.length === 0) return null;
    
    // Sort by area (smallest first - most specific element)
    containing.sort((a, b) => {
      const areaA = a.bounds.width * a.bounds.height;
      const areaB = b.bounds.width * b.bounds.height;
      return areaA - areaB;
    });
    
    return containing[0];
  }
  
  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.cache.elements?.length || 0,
      lastUpdate: this.cache.lastUpdate,
      isPolling: this.isPolling
    };
  }
  
  /**
   * Check if watcher is running (alias for isPolling)
   */
  get isRunning() {
    return this.isPolling;
  }
  
  /**
   * Clean up
   */
  killPsProcess() {
    if (this.psProcess) {
      try {
        this.psProcess.kill();
      } catch (e) {}
      this.psProcess = null;
      this.psReady = false;
    }
  }
  
  /**
   * Destroy watcher
   */
  destroy() {
    this.stop();
    this.removeAllListeners();
  }
}

// Singleton instance
let instance = null;

function getUIWatcher(options) {
  if (!instance) {
    instance = new UIWatcher(options);
  }
  return instance;
}

module.exports = {
  UIWatcher,
  getUIWatcher
};
