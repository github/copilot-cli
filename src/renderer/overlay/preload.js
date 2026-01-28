const { contextBridge, ipcRenderer } = require('electron');
const gridMath = require('../../shared/grid-math');

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

  // Grid math helpers (shared with main)
  getGridConstants: () => gridMath.constants,
  labelToScreenCoordinates: (label) => gridMath.labelToScreenCoordinates(label),
  
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
