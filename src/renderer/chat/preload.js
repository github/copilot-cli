const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods for chat window
contextBridge.exposeInMainWorld('electronAPI', {
  // ===== MESSAGING =====
  sendMessage: (message) => ipcRenderer.send('chat-message', message),
  
  // ===== MODE CONTROL =====
  setMode: (mode) => ipcRenderer.send('set-mode', mode),
  
  // ===== WINDOW CONTROLS =====
  minimizeWindow: () => ipcRenderer.send('minimize-chat'),
  hideWindow: () => ipcRenderer.send('hide-chat'),
  
  // ===== SCREEN CAPTURE =====
  captureScreen: (options) => ipcRenderer.send('capture-screen', options),
  captureRegion: (x, y, width, height) => ipcRenderer.send('capture-region', { x, y, width, height }),
  
  // ===== AI SERVICE CONTROL =====
  setAIProvider: (provider) => ipcRenderer.send('set-ai-provider', provider),
  setApiKey: (provider, key) => ipcRenderer.send('set-api-key', { provider, key }),
  getAIStatus: () => ipcRenderer.invoke('get-ai-status'),
  
  // ===== VISUAL AWARENESS =====
  getActiveWindow: () => ipcRenderer.invoke('get-active-window'),
  findElementAt: (x, y) => ipcRenderer.invoke('find-element-at', { x, y }),
  detectUIElements: (options) => ipcRenderer.invoke('detect-ui-elements', options),
  extractText: (options) => ipcRenderer.invoke('extract-text', options),
  analyzeScreen: (options) => ipcRenderer.invoke('analyze-screen', options),
  getScreenDiffHistory: () => ipcRenderer.invoke('get-screen-diff-history'),
  
  // ===== EVENT LISTENERS =====
  onDotSelected: (callback) => ipcRenderer.on('dot-selected', (event, data) => callback(data)),
  onAgentResponse: (callback) => ipcRenderer.on('agent-response', (event, data) => callback(data)),
  onAgentTyping: (callback) => ipcRenderer.on('agent-typing', (event, data) => callback(data)),
  onScreenCaptured: (callback) => ipcRenderer.on('screen-captured', (event, data) => callback(data)),
  onVisualContextUpdate: (callback) => ipcRenderer.on('visual-context-update', (event, data) => callback(data)),
  onProviderChanged: (callback) => ipcRenderer.on('provider-changed', (event, data) => callback(data)),
  onScreenAnalysis: (callback) => ipcRenderer.on('screen-analysis', (event, data) => callback(data)),
  
  // ===== STATE =====
  getState: () => ipcRenderer.invoke('get-state')
});
