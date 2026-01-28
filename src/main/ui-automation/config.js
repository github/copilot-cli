/**
 * UI Automation Configuration
 * 
 * Central configuration for the UI automation module.
 * @module ui-automation/config
 */

const path = require('path');
const os = require('os');
const fs = require('fs');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Default timeouts (ms)
  DEFAULT_TIMEOUT: 10000,
  ELEMENT_WAIT_INTERVAL: 100,
  CLICK_DELAY: 50,
  FOCUS_DELAY: 100,
  
  // PowerShell execution
  PS_MAX_BUFFER: 10 * 1024 * 1024,
  
  // Temp directory for scripts
  TEMP_DIR: path.join(os.tmpdir(), 'liku-automation'),
  
  // Logging
  DEBUG: process.env.LIKU_DEBUG === 'true',
};

// Ensure temp directory exists
if (!fs.existsSync(CONFIG.TEMP_DIR)) {
  fs.mkdirSync(CONFIG.TEMP_DIR, { recursive: true });
}

// ============================================================================
// CONTROL TYPES
// ============================================================================

/**
 * Windows UI Automation control type constants
 */
const CONTROL_TYPES = {
  BUTTON: 'Button',
  CHECKBOX: 'CheckBox',
  COMBOBOX: 'ComboBox',
  EDIT: 'Edit',
  HYPERLINK: 'Hyperlink',
  IMAGE: 'Image',
  LIST: 'List',
  LISTITEM: 'ListItem',
  MENU: 'Menu',
  MENUITEM: 'MenuItem',
  PANE: 'Pane',
  PROGRESSBAR: 'ProgressBar',
  RADIOBUTTON: 'RadioButton',
  SCROLLBAR: 'ScrollBar',
  SLIDER: 'Slider',
  SPINNER: 'Spinner',
  STATUSBAR: 'StatusBar',
  TAB: 'Tab',
  TABITEM: 'TabItem',
  TEXT: 'Text',
  TOOLBAR: 'Toolbar',
  TOOLTIP: 'ToolTip',
  TREE: 'Tree',
  TREEITEM: 'TreeItem',
  WINDOW: 'Window',
};

module.exports = {
  CONFIG,
  CONTROL_TYPES,
};
