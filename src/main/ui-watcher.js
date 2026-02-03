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
      focusedWindowOnly: options.focusedWindowOnly ?? true,  // only scan active window
      maxElements: options.maxElements || 200,        // limit results for performance
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
    
    return new Promise((resolve, reject) => {
      exec(`powershell -NoProfile -Command "${script.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, 
        { encoding: 'utf8', timeout: 2000 },
        (error, stdout, stderr) => {
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
   */
  async detectElements(activeWindow) {
    // Build scope filter based on active window
    const windowFilter = this.options.focusedWindowOnly && activeWindow
      ? `$targetWindow = "${(activeWindow.title || '').replace(/"/g, '\\"')}"`
      : '$targetWindow = ""';
    
    const script = `
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

${windowFilter}
$maxElements = ${this.options.maxElements}

$root = [System.Windows.Automation.AutomationElement]::RootElement

# If targeting specific window, find it first
if ($targetWindow -ne "") {
    $nameCondition = New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::NameProperty, $targetWindow
    )
    $targetEl = $root.FindFirst([System.Windows.Automation.TreeScope]::Children, $nameCondition)
    if ($targetEl) { $root = $targetEl }
}

$condition = [System.Windows.Automation.Condition]::TrueCondition
$elements = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condition)

$results = @()
$count = 0

foreach ($el in $elements) {
    if ($count -ge $maxElements) { break }
    try {
        $rect = $el.Current.BoundingRectangle
        if ($rect.Width -le 0 -or $rect.Height -le 0) { continue }
        if ($rect.X -lt -10000 -or $rect.Y -lt -10000) { continue }
        
        $name = $el.Current.Name
        $ctrlType = $el.Current.ControlType.ProgrammaticName -replace 'ControlType\\.', ''
        $autoId = $el.Current.AutomationId
        $className = $el.Current.ClassName
        $isEnabled = $el.Current.IsEnabled
        
        # Skip elements with no useful identifying info
        if ([string]::IsNullOrWhiteSpace($name) -and [string]::IsNullOrWhiteSpace($autoId)) { continue }
        
        # Generate a unique ID
        $id = "$ctrlType|$name|$autoId|$([int]$rect.X)|$([int]$rect.Y)"
        
        $results += @{
            id = $id
            name = $name
            type = $ctrlType
            automationId = $autoId
            className = $className
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
            isEnabled = $isEnabled
        }
        $count++
    } catch {}
}

$results | ConvertTo-Json -Depth 4 -Compress
`;

    return new Promise((resolve, reject) => {
      exec(`powershell -NoProfile -Command "${script.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`,
        { encoding: 'utf8', timeout: 5000, maxBuffer: 10 * 1024 * 1024 },
        (error, stdout, stderr) => {
          if (error) {
            resolve([]);
            return;
          }
          try {
            let elements = JSON.parse(stdout.trim() || '[]');
            if (!Array.isArray(elements)) elements = elements ? [elements] : [];
            resolve(elements);
          } catch (e) {
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
    
    // Group elements by type for cleaner context
    const byType = {};
    elements.forEach(el => {
      const type = el.type || 'Unknown';
      if (!byType[type]) byType[type] = [];
      byType[type].push(el);
    });
    
    // Build context string
    let context = `\n## Live UI State (${age}ms ago)\n`;
    
    if (activeWindow) {
      context += `**Active Window**: ${activeWindow.title || 'Unknown'} (${activeWindow.processName})\n`;
      context += `**Window Bounds**: (${activeWindow.bounds.x}, ${activeWindow.bounds.y}) ${activeWindow.bounds.width}x${activeWindow.bounds.height}\n\n`;
    }
    
    // List interactive elements (buttons, text fields, etc.)
    const interactiveTypes = ['Button', 'Edit', 'ComboBox', 'CheckBox', 'RadioButton', 'MenuItem', 'ListItem', 'TabItem', 'Hyperlink'];
    
    context += `**Interactive Elements** (${elements.length} total):\n`;
    
    let listed = 0;
    for (const type of interactiveTypes) {
      const typeElements = byType[type] || [];
      for (const el of typeElements.slice(0, 10)) { // Limit per type
        if (listed >= 30) break; // Total limit
        const name = el.name || el.automationId || '[unnamed]';
        context += `- **${type}**: "${name}" at (${el.center.x}, ${el.center.y})${el.isEnabled ? '' : ' [disabled]'}\n`;
        listed++;
      }
    }
    
    if (elements.length > listed) {
      context += `... and ${elements.length - listed} more elements\n`;
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
