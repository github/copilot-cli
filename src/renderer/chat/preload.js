const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods for chat window
contextBridge.exposeInMainWorld('electronAPI', {
  // Send chat message to main process
  sendMessage: (message) => ipcRenderer.send('chat-message', message),
  
  // Request mode change
  setMode: (mode) => ipcRenderer.send('set-mode', mode),
  
  // Listen for dot selections
  onDotSelected: (callback) => ipcRenderer.on('dot-selected', (event, data) => callback(data)),
  
  // Listen for agent responses
  onAgentResponse: (callback) => ipcRenderer.on('agent-response', (event, data) => callback(data)),
  
  // Get current state
  getState: () => ipcRenderer.invoke('get-state')
});
