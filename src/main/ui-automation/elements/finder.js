/**
 * Element Discovery
 * 
 * Find UI elements using Windows UI Automation.
 * @module ui-automation/elements/finder
 */

const { CONFIG } = require('../config');
const { executePowerShellScript } = require('../core/powershell');
const { debug, log } = require('../core/helpers');

/**
 * @typedef {Object} ElementSearchOptions
 * @property {string} [text] - Text/name to search for (partial match)
 * @property {string} [exactText] - Exact text match
 * @property {string} [automationId] - UI Automation AutomationId
 * @property {string} [className] - Element class name
 * @property {string} [controlType] - Control type (Button, Edit, ComboBox, etc.)
 * @property {Object} [bounds] - Bounding constraints {minX, maxX, minY, maxY}
 * @property {boolean} [isEnabled] - Filter by enabled state
 * @property {string} [windowTitle] - Limit search to specific window
 * @property {number} [index] - Select Nth matching element (0-based)
 */

/**
 * @typedef {Object} UIElement
 * @property {string} Name - Element accessible name
 * @property {string} ControlType - UI Automation control type
 * @property {string} AutomationId - Unique automation identifier
 * @property {string} ClassName - Win32 class name
 * @property {boolean} IsEnabled - Whether element accepts input
 * @property {Object} Bounds - Bounding rectangle {X, Y, Width, Height, CenterX, CenterY}
 * @property {string[]} Patterns - Supported UI Automation patterns
 */

/**
 * Find UI elements matching search criteria
 * Uses Windows UI Automation for semantic element discovery
 * 
 * @param {ElementSearchOptions} options - Search criteria
 * @returns {Promise<{success: boolean, elements: UIElement[], count: number, error?: string}>}
 */
async function findElements(options = {}) {
  const {
    text = '',
    exactText = '',
    automationId = '',
    className = '',
    controlType = '',
    bounds = {},
    isEnabled,
    windowTitle = '',
    index,
  } = options;

  const searchText = exactText || text;
  const isExactMatch = !!exactText;

  const psScript = `
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

function Find-UIElements {
    param(
        [string]$SearchText = "",
        [bool]$ExactMatch = $false,
        [string]$AutomationId = "",
        [string]$ClassName = "",
        [string]$ControlType = "",
        [string]$WindowTitle = "",
        [int]$MinX = [int]::MinValue,
        [int]$MaxX = [int]::MaxValue,
        [int]$MinY = [int]::MinValue,
        [int]$MaxY = [int]::MaxValue,
        [bool]$RequireEnabled = $false
    )
    
    # Get root element or specific window
    $root = $null
    if ($WindowTitle -ne "") {
        $condition = [System.Windows.Automation.PropertyCondition]::new(
            [System.Windows.Automation.AutomationElement]::NameProperty, 
            $WindowTitle,
            [System.Windows.Automation.PropertyConditionFlags]::IgnoreCase
        )
        $windows = [System.Windows.Automation.AutomationElement]::RootElement.FindAll(
            [System.Windows.Automation.TreeScope]::Children, 
            $condition
        )
        if ($windows.Count -gt 0) {
            $root = $windows[0]
        }
    }
    
    if ($root -eq $null) {
        $root = [System.Windows.Automation.AutomationElement]::RootElement
    }
    
    # Always search all elements, filter by ControlType in the loop
    $searchCondition = [System.Windows.Automation.Condition]::TrueCondition
    
    $elements = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $searchCondition)
    
    $results = @()
    foreach ($el in $elements) {
        try {
            $name = $el.Current.Name
            $ctrlType = $el.Current.ControlType.ProgrammaticName
            $autoId = $el.Current.AutomationId
            $cls = $el.Current.ClassName
            $enabled = $el.Current.IsEnabled
            $rect = $el.Current.BoundingRectangle
            
            # Skip invisible elements
            if ($rect.Width -le 0 -or $rect.Height -le 0) { continue }
            if ([double]::IsInfinity($rect.X) -or [double]::IsInfinity($rect.Y)) { continue }
            
            # Apply filters
            if ($SearchText -ne "") {
                $textMatch = $false
                if ($ExactMatch) {
                    $textMatch = ($name -eq $SearchText)
                } else {
                    $textMatch = ($name -like "*$SearchText*")
                }
                if (-not $textMatch) { continue }
            }
            
            if ($AutomationId -ne "" -and $autoId -notlike "*$AutomationId*") { continue }
            if ($ClassName -ne "" -and $cls -notlike "*$ClassName*") { continue }
            if ($ControlType -ne "" -and $ctrlType -notlike "*$ControlType*") { continue }
            if ($RequireEnabled -and -not $enabled) { continue }
            
            # Bounds filter
            $centerX = [int]($rect.X + $rect.Width / 2)
            $centerY = [int]($rect.Y + $rect.Height / 2)
            if ($centerX -lt $MinX -or $centerX -gt $MaxX) { continue }
            if ($centerY -lt $MinY -or $centerY -gt $MaxY) { continue }
            
            # Get supported patterns
            $patterns = @()
            try {
                $supportedPatterns = $el.GetSupportedPatterns()
                foreach ($p in $supportedPatterns) {
                    $patterns += $p.ProgrammaticName
                }
            } catch {}
            
            $results += @{
                Name = $name
                ControlType = $ctrlType.Replace("ControlType.", "")
                AutomationId = $autoId
                ClassName = $cls
                IsEnabled = $enabled
                Bounds = @{
                    X = [int]$rect.X
                    Y = [int]$rect.Y
                    Width = [int]$rect.Width
                    Height = [int]$rect.Height
                    CenterX = $centerX
                    CenterY = $centerY
                }
                Patterns = $patterns
            }
        } catch {}
    }
    
    return $results
}

$results = Find-UIElements \`
    -SearchText "${searchText.replace(/"/g, '`"')}" \`
    -ExactMatch $${isExactMatch} \`
    -AutomationId "${automationId}" \`
    -ClassName "${className}" \`
    -ControlType "${controlType}" \`
    -WindowTitle "${windowTitle.replace(/"/g, '`"')}" \`
    ${bounds.minX !== undefined ? `-MinX ${bounds.minX}` : ''} \`
    ${bounds.maxX !== undefined ? `-MaxX ${bounds.maxX}` : ''} \`
    ${bounds.minY !== undefined ? `-MinY ${bounds.minY}` : ''} \`
    ${bounds.maxY !== undefined ? `-MaxY ${bounds.maxY}` : ''} \`
    -RequireEnabled $${isEnabled === true}

$results | ConvertTo-Json -Depth 5 -Compress
`;

  const result = await executePowerShellScript(psScript, 30000);
  
  debug('PowerShell stdout:', result.stdout?.substring(0, 500));
  debug('PowerShell stderr:', result.stderr);
  debug('PowerShell error:', result.error);
  
  if (result.error) {
    return { success: false, elements: [], count: 0, error: result.error };
  }
  
  try {
    // Handle empty results
    const output = (result.stdout || '').trim();
    if (!output) {
      return { success: true, elements: [], count: 0, element: null };
    }
    
    let rawElements = JSON.parse(output);
    if (!Array.isArray(rawElements)) {
      rawElements = rawElements ? [rawElements] : [];
    }
    
    // Normalize element structure to camelCase
    let elements = rawElements.map(e => ({
      name: e.Name,
      controlType: e.ControlType,
      automationId: e.AutomationId,
      className: e.ClassName,
      isEnabled: e.IsEnabled,
      patterns: e.Patterns,
      bounds: e.Bounds ? {
        x: e.Bounds.X,
        y: e.Bounds.Y,
        width: e.Bounds.Width,
        height: e.Bounds.Height,
        centerX: e.Bounds.CenterX,
        centerY: e.Bounds.CenterY,
      } : null,
      // Keep original PascalCase for backward compatibility
      Name: e.Name,
      ControlType: e.ControlType,
      AutomationId: e.AutomationId,
      ClassName: e.ClassName,
      IsEnabled: e.IsEnabled,
      Patterns: e.Patterns,
      Bounds: e.Bounds,
    }));
    
    // Apply index filter if specified
    if (typeof index === 'number' && index >= 0 && index < elements.length) {
      elements = [elements[index]];
    }
    
    log(`Found ${elements.length} element(s) matching criteria`);
    debug('Search options:', options);
    debug('Results:', elements.map(e => `${e.name} (${e.controlType})`));
    
    return {
      success: true,
      elements,
      count: elements.length,
      element: elements[0] || null,
    };
  } catch (e) {
    return { success: false, elements: [], count: 0, error: `Parse error: ${e.message}`, raw: result.stdout };
  }
}

/**
 * Find a single element matching criteria
 * Convenience wrapper around findElements
 * 
 * @param {ElementSearchOptions} options - Search criteria
 * @returns {Promise<{success: boolean, element: UIElement|null, error?: string}>}
 */
async function findElement(options = {}) {
  const result = await findElements({ ...options, index: 0 });
  return {
    success: result.success && result.element !== null,
    element: result.element,
    error: result.element ? undefined : result.error || 'Element not found',
  };
}

module.exports = {
  findElements,
  findElement,
};
