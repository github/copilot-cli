/**
 * Element Click Interactions
 * 
 * Click on UI elements by criteria (text, automationId, etc.)
 * @module ui-automation/interactions/element-click
 */

const { findElement, waitForElement } = require('../elements');
const { clickAt, doubleClickAt } = require('../mouse');
const { executePowerShellScript } = require('../core/powershell');
const { log, sleep } = require('../core/helpers');

/**
 * Click on an element found by criteria
 * 
 * @param {Object} criteria - Element search criteria
 * @param {string} [criteria.text] - Element text/name
 * @param {string} [criteria.automationId] - Automation ID
 * @param {string} [criteria.controlType] - Control type
 * @param {string} [criteria.className] - Class name
 * @param {string} [criteria.windowTitle] - Window title to search in
 * @param {Object} [options] - Click options
 * @param {boolean} [options.doubleClick=false] - Double click instead
 * @param {string} [options.button='left'] - Mouse button
 * @param {boolean} [options.focusWindow=true] - Focus window first
 * @param {number} [options.waitTimeout=0] - Wait for element (ms, 0 = no wait)
 * @returns {Promise<{success: boolean, element: Object|null}>}
 */
async function click(criteria, options = {}) {
  const { 
    doubleClick = false, 
    button = 'left',
    focusWindow = true,
    waitTimeout = 0,
  } = options;
  
  // Find or wait for element
  let findResult;
  if (waitTimeout > 0) {
    findResult = await waitForElement(criteria, { timeout: waitTimeout });
  } else {
    findResult = await findElement(criteria);
  }
  
  // Extract element from result
  const element = findResult?.element;
  
  if (!element || !element.bounds) {
    log(`click: Element not found for criteria: ${JSON.stringify(criteria)}`, 'warn');
    return { success: false, element: null, error: findResult?.error || 'Element not found' };
  }
  
  // Calculate center point
  const bounds = element.bounds;
  const x = bounds.x + bounds.width / 2;
  const y = bounds.y + bounds.height / 2;
  
  // Focus window if needed
  if (focusWindow && element.windowHwnd) {
    const { focusWindow: doFocus } = require('../window');
    await doFocus(element.windowHwnd);
    await sleep(50);
  }
  
  // Click
  const clickFn = doubleClick ? doubleClickAt : clickAt;
  const clickResult = await clickFn(x, y, { button, focusWindow: false });
  
  log(`click on "${element.name || element.automationId}" at (${Math.round(x)}, ${Math.round(y)}) - ${clickResult.success ? 'success' : 'failed'}`);
  
  return { success: clickResult.success, element };
}

/**
 * Click element by text
 * 
 * @param {string} text - Element text to find
 * @param {Object} [options] - Click options
 * @returns {Promise<{success: boolean, element: Object|null}>}
 */
async function clickByText(text, options = {}) {
  return click({ text }, options);
}

/**
 * Click element by automation ID
 * 
 * @param {string} automationId - Automation ID
 * @param {Object} [options] - Click options
 * @returns {Promise<{success: boolean, element: Object|null}>}
 */
async function clickByAutomationId(automationId, options = {}) {
  return click({ automationId }, options);
}

/**
 * Right-click on an element
 * 
 * @param {Object} criteria - Element search criteria
 * @param {Object} [options] - Additional options
 * @returns {Promise<{success: boolean, element: Object|null}>}
 */
async function rightClick(criteria, options = {}) {
  return click(criteria, { ...options, button: 'right' });
}

/**
 * Double-click on an element
 * 
 * @param {Object} criteria - Element search criteria
 * @param {Object} [options] - Additional options
 * @returns {Promise<{success: boolean, element: Object|null}>}
 */
async function doubleClick(criteria, options = {}) {
  return click(criteria, { ...options, doubleClick: true });
}

/**
 * Click on an element object directly (low-level)
 * 
 * @param {Object} element - Element with bounds property
 * @param {Object} [options] - Click options
 * @param {string} [options.button='left'] - Mouse button
 * @param {boolean} [options.useInvoke=true] - Try Invoke pattern first
 * @returns {Promise<{success: boolean, method: string, error?: string}>}
 */
async function clickElement(element, options = {}) {
  const { button = 'left', useInvoke = true } = options;
  
  if (!element || !element.bounds) {
    return { success: false, error: 'Invalid element' };
  }
  
  const bounds = element.bounds;
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  
  // Strategy 1: Try Invoke pattern for buttons
  if (useInvoke && element.patterns?.includes('InvokePatternIdentifiers.Pattern')) {
    log(`Attempting Invoke pattern for "${element.name}"`);
    const invokeResult = await invokeElement(element);
    if (invokeResult.success) {
      return { success: true, method: 'invoke', element };
    }
  }
  
  // Strategy 2: Click
  log(`Clicking "${element.name}" at (${centerX}, ${centerY})`);
  const clickResult = await clickAt(centerX, centerY, { button, focusWindow: true });
  
  return {
    success: clickResult.success,
    method: 'sendInput',
    element,
    coordinates: clickResult.coordinates,
  };
}

/**
 * Invoke an element using UI Automation Invoke pattern
 * Works directly with buttons without simulating mouse clicks
 * 
 * @param {Object} element - Element to invoke
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function invokeElement(element) {
  const searchName = (element.name || '').replace(/"/g, '`"');
  
  const psScript = `
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$root = [System.Windows.Automation.AutomationElement]::RootElement
$condition = [System.Windows.Automation.PropertyCondition]::new(
    [System.Windows.Automation.AutomationElement]::NameProperty, 
    "${searchName}"
)
$element = $root.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condition)

if ($element -eq $null) {
    Write-Output '{"success": false, "error": "Element not found"}'
    exit
}

try {
    $invokePattern = $element.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
    $invokePattern.Invoke()
    Write-Output '{"success": true, "method": "invoke"}'
} catch {
    Write-Output "{\\"success\\": false, \\"error\\": \\"$($_.Exception.Message)\\"}"
}
`;

  const result = await executePowerShellScript(psScript);
  
  try {
    return JSON.parse(result.stdout.trim());
  } catch {
    return { success: false, error: result.error || 'Parse error' };
  }
}

module.exports = {
  click,
  clickByText,
  clickByAutomationId,
  rightClick,
  doubleClick,
  clickElement,
  invokeElement,
};
