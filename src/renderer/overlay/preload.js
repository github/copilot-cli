const { contextBridge, ipcRenderer } = require('electron');

// BLOCKER-1 FIX: Inline grid-math since sandboxed preload can't access 'path' module
// or require external files. These are small utilities needed for coordinate conversion.

const COARSE_SPACING = 100;
const FINE_SPACING = 25;
const START_OFFSET = COARSE_SPACING / 2;
const FINE_START = FINE_SPACING / 2;

function colLettersToIndex(letters) {
  if (!letters || letters.length === 0) return null;
  if (letters.length === 1) {
    return letters.charCodeAt(0) - 65;
  }
  const first = letters.charCodeAt(0) - 65 + 1;
  const second = letters.charCodeAt(1) - 65;
  return (first * 26) + second;
}

function labelToScreenCoordinates(label) {
  if (!label) return null;
  const match = label.match(/^([A-Z]+)(\d+)(\.(\d)(\d))?$/);
  if (!match) return null;

  const [, letters, rowStr, , subColStr, subRowStr] = match;
  const colIndex = colLettersToIndex(letters);
  const rowIndex = parseInt(rowStr, 10);
  if (colIndex === null || Number.isNaN(rowIndex)) return null;

  if (subColStr && subRowStr) {
    const subCol = parseInt(subColStr, 10);
    const subRow = parseInt(subRowStr, 10);
    if (Number.isNaN(subCol) || Number.isNaN(subRow)) return null;
    const fineCol = (colIndex * 4) + subCol;
    const fineRow = (rowIndex * 4) + subRow;
    const x = FINE_START + fineCol * FINE_SPACING;
    const y = FINE_START + fineRow * FINE_SPACING;
    return { x, y, screenX: x, screenY: y, colIndex, rowIndex, fineCol, fineRow, subCol, subRow, isFine: true };
  }

  const x = START_OFFSET + colIndex * COARSE_SPACING;
  const y = START_OFFSET + rowIndex * COARSE_SPACING;
  return { x, y, screenX: x, screenY: y, colIndex, rowIndex, isFine: false };
}

const gridConstants = {
  coarseSpacing: COARSE_SPACING,
  fineSpacing: FINE_SPACING,
  startOffset: START_OFFSET,
  fineStart: FINE_START,
  localFineRadius: 3
};

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Send dot selection to main process
  selectDot: (data) => ipcRenderer.send('dot-selected', data),
  
  // Listen for mode changes
  onModeChanged: (callback) => ipcRenderer.on('mode-changed', (event, mode) => callback(mode)),
  
  // Listen for overlay commands (keyboard shortcuts routed via main process)
  onOverlayCommand: (callback) => ipcRenderer.on('overlay-command', (event, data) => callback(data)),
  
  // Get current state
  getState: () => ipcRenderer.invoke('get-state'),

  // Grid math helpers (inlined above)
  getGridConstants: () => gridConstants,
  labelToScreenCoordinates: (label) => labelToScreenCoordinates(label),
  
  // ===== INSPECT MODE API =====
  
  // Select an inspect region (sends targetId + bounds to main)
  selectInspectRegion: (data) => ipcRenderer.send('inspect-region-selected', data),
  
  // Listen for inspect regions updates
  onInspectRegionsUpdate: (callback) => ipcRenderer.on('inspect-regions-update', (event, regions) => callback(regions)),
  
  // Listen for inspect mode toggle
  onInspectModeChanged: (callback) => ipcRenderer.on('inspect-mode-changed', (event, enabled) => callback(enabled)),
  
  // Request inspect region detection
  requestInspectRegions: () => ipcRenderer.send('request-inspect-regions'),
  
  // Toggle inspect mode
  toggleInspectMode: () => ipcRenderer.send('toggle-inspect-mode')
});
