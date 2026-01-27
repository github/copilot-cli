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
  setProvider: (provider) => ipcRenderer.send('set-ai-provider', provider), // Alias
  setApiKey: (provider, key) => ipcRenderer.send('set-api-key', { provider, key }),
  getAIStatus: () => ipcRenderer.invoke('get-ai-status'),
  checkAuth: (provider) => ipcRenderer.send('check-auth', provider),
  
  // ===== AGENTIC ACTIONS =====
  executeActions: (actionData) => ipcRenderer.send('execute-actions', actionData),
  cancelActions: () => ipcRenderer.send('cancel-actions'),
  
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
  onAuthStatus: (callback) => ipcRenderer.on('auth-status', (event, data) => callback(data)),
  onTokenUsage: (callback) => ipcRenderer.on('token-usage', (event, data) => callback(data)),
  
  // ===== AGENTIC ACTION EVENTS =====
  onActionExecuting: (callback) => ipcRenderer.on('action-executing', (event, data) => callback(data)),
  onActionProgress: (callback) => ipcRenderer.on('action-progress', (event, data) => callback(data)),
  onActionComplete: (callback) => ipcRenderer.on('action-complete', (event, data) => callback(data)),
  
  // ===== SAFETY GUARDRAILS API =====
  // Safe click with pre-analysis and confirmation for risky actions
  safeClickAt: (params) => ipcRenderer.invoke('safe-click-at', params),
  
  // Label to pixel coordinate conversion
  labelToCoordinates: (label) => ipcRenderer.invoke('label-to-coordinates', label),
  
  // Analyze action safety before execution
  analyzeActionSafety: (params) => ipcRenderer.invoke('analyze-action-safety', params),
  
  // Pending action management (for user confirmation flow)
  confirmPendingAction: (actionId) => ipcRenderer.invoke('confirm-pending-action', { actionId }),
  rejectPendingAction: (actionId) => ipcRenderer.invoke('reject-pending-action', { actionId }),
  getPendingAction: () => ipcRenderer.invoke('get-pending-action'),
  
  // Safety event listeners
  onActionRequiresConfirmation: (callback) => {
    ipcRenderer.on('action-requires-confirmation', (event, data) => callback(data));
  },
  onActionRejected: (callback) => {
    ipcRenderer.on('action-rejected', (event, data) => callback(data));
  },
  onActionExecuted: (callback) => {
    ipcRenderer.on('action-executed', (event, data) => callback(data));
  },
  
  // ===== STATE =====
  getState: () => ipcRenderer.invoke('get-state')
});
