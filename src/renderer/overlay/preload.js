const { contextBridge, ipcRenderer } = require('electron');

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
  getState: () => ipcRenderer.invoke('get-state')
});
