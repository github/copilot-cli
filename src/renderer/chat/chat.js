// ===== STATE =====
let currentMode = 'passive';
let currentProvider = 'copilot';
let currentModel = 'gpt-4o';
let totalTokens = 0;
let messages = [];
let contextItems = [];
let pendingActions = null;

// ===== CHAT HISTORY PERSISTENCE =====
const HISTORY_KEY = 'liku-chat-history';
const MAX_PERSISTED_MESSAGES = 100;

function saveHistory() {
  try {
    const toSave = messages.slice(-MAX_PERSISTED_MESSAGES).map(m => ({
      text: m.text,
      type: m.type,
      timestamp: m.timestamp
    }));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.warn('[CHAT] Failed to save history:', e);
  }
}

function loadHistory() {
  try {
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) {
      const loaded = JSON.parse(saved);
      if (Array.isArray(loaded) && loaded.length > 0) {
        // Remove empty state if present
        const emptyState = chatHistory.querySelector('.empty-state');
        if (emptyState) emptyState.remove();
        
        loaded.forEach(msg => {
          // Recreate message elements without re-saving
          const messageEl = document.createElement('div');
          messageEl.className = `message ${msg.type}`;
          
          const textEl = document.createElement('div');
          textEl.textContent = msg.text;
          messageEl.appendChild(textEl);
          
          const timestampEl = document.createElement('div');
          timestampEl.className = 'timestamp';
          timestampEl.textContent = new Date(msg.timestamp).toLocaleTimeString();
          messageEl.appendChild(timestampEl);
          
          chatHistory.appendChild(messageEl);
          messages.push(msg);
        });
        
        chatHistory.scrollTop = chatHistory.scrollHeight;
        console.log(`[CHAT] Loaded ${loaded.length} messages from history`);
      }
    }
  } catch (e) {
    console.warn('[CHAT] Failed to load history:', e);
  }
}

function clearHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY);
    messages = [];
    chatHistory.innerHTML = '';
    console.log('[CHAT] History cleared');
  } catch (e) {
    console.warn('[CHAT] Failed to clear history:', e);
  }
}

// ===== ELEMENTS =====
const chatHistory = document.getElementById('chat-history');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const passiveBtn = document.getElementById('passive-btn');
const selectionBtn = document.getElementById('selection-btn');
const minimizeBtn = document.getElementById('minimize-btn');
const closeBtn = document.getElementById('close-btn');
const captureBtn = document.getElementById('capture-btn');
const contextPanel = document.getElementById('context-panel');
const contextHeader = document.getElementById('context-header');
const contextContent = document.getElementById('context-content');
const contextCount = document.getElementById('context-count');
const providerSelect = document.getElementById('provider-select');
const modelSelect = document.getElementById('model-select');
const authStatus = document.getElementById('auth-status');
const tokenCount = document.getElementById('token-count');

// ===== TOKEN ESTIMATION =====
// Rough estimate: ~4 chars per token for English text
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

function updateTokenCount(additionalTokens = 0) {
  totalTokens += additionalTokens;
  if (tokenCount) {
    tokenCount.textContent = `${totalTokens.toLocaleString()} tokens`;
  }
}

function resetTokenCount() {
  totalTokens = 0;
  updateTokenCount();
}

// ===== AUTH STATUS =====
function updateAuthStatus(status, provider) {
  if (!authStatus) return;
  
  authStatus.className = 'status-badge';
  
  switch (status) {
    case 'connected':
      authStatus.classList.add('connected');
      authStatus.textContent = `${getProviderName(provider)} Connected`;
      break;
    case 'pending':
      authStatus.classList.add('pending');
      authStatus.textContent = 'Authenticating...';
      break;
    case 'error':
      authStatus.classList.add('disconnected');
      authStatus.textContent = 'Auth Error';
      break;
    default:
      authStatus.classList.add('disconnected');
      authStatus.textContent = 'Not Connected';
  }
}

function getProviderName(provider) {
  const names = {
    copilot: 'Copilot',
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    ollama: 'Ollama'
  };
  return names[provider] || provider;
}

// ===== PROVIDER FUNCTIONS =====
function setProvider(provider) {
  currentProvider = provider;
  if (window.electronAPI.setProvider) {
    window.electronAPI.setProvider(provider);
  }
  // Also send as a command for backward compatibility
  window.electronAPI.sendMessage(`/provider ${provider}`);
  addMessage(`Switched to ${getProviderName(provider)}`, 'system');
  
  // Show/hide model selector based on provider
  updateModelSelector(provider);
  
  // Check auth status for new provider
  checkProviderAuth(provider);
}

// ===== MODEL FUNCTIONS =====
function setModel(model) {
  currentModel = model;
  // Send model change command
  window.electronAPI.sendMessage(`/model ${model}`);
}

function updateModelSelector(provider) {
  if (!modelSelect) return;
  
  // Only show model selector for Copilot
  modelSelect.style.display = provider === 'copilot' ? 'block' : 'none';
}

// ===== MESSAGE FUNCTIONS =====
function addMessage(text, type = 'agent', timestamp = Date.now(), extra = {}) {
  const emptyState = chatHistory.querySelector('.empty-state');
  if (emptyState) emptyState.remove();

  const messageEl = document.createElement('div');
  messageEl.className = `message ${type}`;
  if (extra.subtype) messageEl.classList.add(extra.subtype);
  
  const textEl = document.createElement('div');
  textEl.textContent = text;
  messageEl.appendChild(textEl);

  const timestampEl = document.createElement('div');
  timestampEl.className = 'timestamp';
  timestampEl.textContent = new Date(timestamp).toLocaleTimeString();
  messageEl.appendChild(timestampEl);

  chatHistory.appendChild(messageEl);
  chatHistory.scrollTop = chatHistory.scrollHeight;

  messages.push({ text, type, timestamp, ...extra });
  
  // Track tokens for user and agent messages
  if (type === 'user' || type === 'agent') {
    updateTokenCount(estimateTokens(text));
  }
  
  // Auto-save chat history
  saveHistory();
}

// ===== AGENT ROUTING =====
const AGENT_TRIGGERS = {
  research: /\b(research|investigate|find out about|look up|ground|gather info|search for)\b/i,
  verify: /\b(verify|validate|check|confirm|test|ensure)\b/i,
  build: /\b(build|create|implement|code|develop|make|write code)\b/i,
  orchestrate: /\b(spawn|agent|subagent|orchestrate|coordinate|multi-step|complex task)\b/i
};

function detectAgentIntent(text) {
  // Check for explicit agent invocation first
  if (AGENT_TRIGGERS.orchestrate.test(text)) return 'orchestrate';
  if (AGENT_TRIGGERS.research.test(text)) return 'research';
  if (AGENT_TRIGGERS.verify.test(text)) return 'verify';
  if (AGENT_TRIGGERS.build.test(text)) return 'build';
  return null;
}

async function routeToAgent(text, agentType) {
  addMessage(`🤖 Routing to ${agentType} agent...`, 'system');
  showTypingIndicator();
  
  try {
    let result;
    switch (agentType) {
      case 'research':
        result = await window.electronAPI.agentResearch({ query: text });
        break;
      case 'verify':
        result = await window.electronAPI.agentVerify({ target: text });
        break;
      case 'build':
        result = await window.electronAPI.agentBuild({ specification: text });
        break;
      case 'orchestrate':
      default:
        result = await window.electronAPI.agentRun({ task: text });
    }
    
    removeTypingIndicator();
    
    if (result.success) {
      const responseText = result.result?.result?.response || 
                          result.result?.response || 
                          JSON.stringify(result.result, null, 2);
      addMessage(`✅ Agent completed:\n${responseText}`, 'agent');
    } else {
      addMessage(`❌ Agent error: ${result.error}`, 'system');
      // Fallback to regular AI
      addMessage('Falling back to regular AI...', 'system');
      window.electronAPI.sendMessage(text);
    }
  } catch (err) {
    removeTypingIndicator();
    console.error('[CHAT] Agent routing failed:', err);
    addMessage(`⚠️ Agent unavailable: ${err.message}. Using regular AI.`, 'system');
    // Fallback to regular AI
    window.electronAPI.sendMessage(text);
  }
}

function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  addMessage(text, 'user');
  
  // Check for agent-level tasks
  const agentType = detectAgentIntent(text);
  
  if (agentType) {
    routeToAgent(text, agentType);
  } else {
    // Regular AI message
    window.electronAPI.sendMessage(text);
  }
  
  messageInput.value = '';
  messageInput.style.height = 'auto';
}

// ===== MODE FUNCTIONS =====
function updateModeDisplay() {
  passiveBtn.classList.toggle('active', currentMode === 'passive');
  selectionBtn.classList.toggle('active', currentMode === 'selection');
}

function setMode(mode) {
  currentMode = mode;
  window.electronAPI.setMode(mode);
  updateModeDisplay();
  
  if (mode === 'selection') {
    addMessage('Selection mode active. Click dots on overlay or scroll to zoom.', 'system');
  } else {
    addMessage('Passive mode. Overlay is click-through.', 'system');
  }
}

// ===== CONTEXT PANEL FUNCTIONS =====
function addContextItem(data) {
  contextItems.push(data);
  updateContextPanel();
}

function updateContextPanel() {
  contextCount.textContent = contextItems.length;
  contextContent.innerHTML = '';
  
  contextItems.forEach((item) => {
    const itemEl = document.createElement('div');
    itemEl.className = 'context-item';
    itemEl.innerHTML = `
      <span class="dot-marker"></span>
      <span>${item.label}</span>
      <span class="coords">(${item.x}, ${item.y})</span>
    `;
    contextContent.appendChild(itemEl);
  });

  if (contextItems.length > 0) {
    contextPanel.classList.add('expanded');
  }
}

function toggleContextPanel() {
  contextPanel.classList.toggle('expanded');
}

// ===== WINDOW CONTROLS =====
minimizeBtn.addEventListener('click', () => {
  window.electronAPI.minimizeWindow();
});

closeBtn.addEventListener('click', () => {
  window.electronAPI.hideWindow();
});

// ===== CAPTURE FUNCTION =====
captureBtn.addEventListener('click', () => {
  addMessage('Initiating screen capture...', 'system', Date.now(), { subtype: 'capture' });
  window.electronAPI.captureScreen();
});

// ===== EVENT LISTENERS =====
sendButton.addEventListener('click', sendMessage);

messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Auto-resize textarea
messageInput.addEventListener('input', () => {
  messageInput.style.height = 'auto';
  messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
});

passiveBtn.addEventListener('click', () => setMode('passive'));
selectionBtn.addEventListener('click', () => setMode('selection'));
contextHeader.addEventListener('click', toggleContextPanel);

// Provider selection
if (providerSelect) {
  providerSelect.addEventListener('change', (e) => {
    setProvider(e.target.value);
  });
}

// Model selection
if (modelSelect) {
  modelSelect.addEventListener('change', (e) => {
    setModel(e.target.value);
  });
}

// Check provider auth status
function checkProviderAuth(provider) {
  if (window.electronAPI.checkAuth) {
    window.electronAPI.checkAuth(provider);
  } else {
    // Fallback: use /status command
    window.electronAPI.sendMessage('/status');
  }
}

// ===== IPC LISTENERS =====
window.electronAPI.onDotSelected((data) => {
  if (data.cancelled) {
    addMessage('Selection cancelled', 'system');
    setMode('passive');
    return;
  }
  
  addMessage(`Selected: ${data.label} at (${data.x}, ${data.y})`, 'system');
  addContextItem(data);
  
  window.electronAPI.getState().then(state => {
    currentMode = state.overlayMode;
    updateModeDisplay();
  });
});

window.electronAPI.onAgentResponse((data) => {
  removeTypingIndicator();
  const msgType = data.type === 'error' ? 'system' : 'agent';
  
  // Check if response contains actions
  if (data.hasActions && data.actionData && data.actionData.actions) {
    console.log('[CHAT] Received agent response with actions:', data.actionData.actions.length);
    
    // Show the AI's thought/explanation first (without the JSON)
    const cleanText = data.text.replace(/```json[\s\S]*?```/g, '').trim();
    if (cleanText) {
      addMessage(cleanText, msgType, data.timestamp, { 
        provider: data.provider,
        hasVisualContext: data.hasVisualContext 
      });
    }
    
    // Show action confirmation UI
    showActionConfirmation(data.actionData);
  } else {
    // Normal response without actions
    addMessage(data.text, msgType, data.timestamp, { 
      provider: data.provider,
      hasVisualContext: data.hasVisualContext 
    });
  }
});

if (window.electronAPI.onAgentTyping) {
  window.electronAPI.onAgentTyping((data) => {
    if (data.isTyping) {
      showTypingIndicator();
    } else {
      removeTypingIndicator();
    }
  });
}

if (window.electronAPI.onScreenCaptured) {
  window.electronAPI.onScreenCaptured((data) => {
    if (data.error) {
      addMessage(`Capture failed: ${data.error}`, 'system');
    } else {
      addMessage(`Screen captured: ${data.width}x${data.height}. AI can now see your screen.`, 'system', Date.now(), { subtype: 'capture' });
    }
  });
}

if (window.electronAPI.onVisualContextUpdate) {
  window.electronAPI.onVisualContextUpdate((data) => {
    updateVisualContextIndicator(data.count);
  });
}

// Auth status updates
if (window.electronAPI.onAuthStatus) {
  window.electronAPI.onAuthStatus((data) => {
    updateAuthStatus(data.status, data.provider);
    if (data.provider && providerSelect) {
      providerSelect.value = data.provider;
      currentProvider = data.provider;
    }
  });
}

// Token usage updates from API responses
if (window.electronAPI.onTokenUsage) {
  window.electronAPI.onTokenUsage((data) => {
    if (data.inputTokens) {
      totalTokens = data.totalTokens || totalTokens + data.inputTokens + (data.outputTokens || 0);
      updateTokenCount();
    }
  });
}

// ===== TYPING INDICATOR =====
function showTypingIndicator() {
  if (document.getElementById('typing-indicator')) return;
  
  const typingEl = document.createElement('div');
  typingEl.id = 'typing-indicator';
  typingEl.className = 'message agent typing';
  typingEl.innerHTML = `
    <div class="typing-dots">
      <span></span><span></span><span></span>
    </div>
  `;
  chatHistory.appendChild(typingEl);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

function removeTypingIndicator() {
  const indicator = document.getElementById('typing-indicator');
  if (indicator) indicator.remove();
}

// ===== VISUAL CONTEXT INDICATOR =====
function updateVisualContextIndicator(count) {
  let indicator = document.getElementById('visual-context-indicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'visual-context-indicator';
    indicator.style.cssText = 'position:absolute;top:8px;right:8px;background:var(--accent-green);color:white;padding:2px 8px;border-radius:10px;font-size:10px;';
    document.getElementById('toolbar').appendChild(indicator);
  }
  indicator.textContent = count > 0 ? `📸 ${count}` : '';
  indicator.style.display = count > 0 ? 'block' : 'none';
}

// ===== INITIALIZATION =====
// Load persisted chat history first
loadHistory();

window.electronAPI.getState().then(state => {
  currentMode = state.overlayMode;
  updateModeDisplay();
  
  // Load current provider
  if (state.aiProvider) {
    currentProvider = state.aiProvider;
    if (providerSelect) {
      providerSelect.value = state.aiProvider;
    }
    console.log('Current AI provider:', state.aiProvider);
    updateModelSelector(state.aiProvider);
  }
  
  // Load current model
  if (state.model && modelSelect) {
    currentModel = state.model;
    modelSelect.value = state.model;
  }
  
  // Check auth status for current provider (async - response comes via onAuthStatus)
  checkProviderAuth(currentProvider);
});

// Initialize auth status display as pending until check completes
updateAuthStatus('pending', currentProvider);
updateModelSelector(currentProvider);

// ===== AGENTIC ACTION UI =====
function showActionConfirmation(actionData) {
  pendingActions = actionData;
  
  const emptyState = chatHistory.querySelector('.empty-state');
  if (emptyState) emptyState.remove();
  
  const actionEl = document.createElement('div');
  actionEl.id = 'action-confirmation';
  actionEl.className = 'message agent action-card';
  
  const actionsHtml = actionData.actions.map((action, idx) => {
    let icon = '🖱️';
    let desc = '';
    
    switch (action.type) {
      case 'click':
        icon = '🖱️';
        desc = `Click at (${action.x}, ${action.y})`;
        if (action.coordinate) desc = `Click ${action.coordinate}`;
        break;
      case 'double_click':
        icon = '🖱️🖱️';
        desc = `Double-click at (${action.x}, ${action.y})`;
        break;
      case 'right_click':
        icon = '🖱️';
        desc = `Right-click at (${action.x}, ${action.y})`;
        break;
      case 'type':
        icon = '⌨️';
        desc = `Type: "${action.text.substring(0, 30)}${action.text.length > 30 ? '...' : ''}"`;
        break;
      case 'key':
        icon = '⌨️';
        desc = `Press: ${action.key || action.keys || 'unknown'}`;
        break;
      case 'scroll':
        icon = '📜';
        desc = `Scroll ${action.direction || 'down'} ${action.amount || 3} lines`;
        break;
      case 'wait':
        icon = '⏳';
        desc = `Wait ${action.ms}ms`;
        break;
      case 'move_mouse':
        icon = '➡️';
        desc = `Move to (${action.x}, ${action.y})`;
        break;
      case 'drag':
        icon = '✋';
        desc = `Drag from (${action.fromX}, ${action.fromY}) to (${action.toX}, ${action.toY})`;
        break;
      case 'run_command':
        icon = '💻';
        const cmdDisplay = action.command.length > 40 
          ? action.command.substring(0, 40) + '...' 
          : action.command;
        desc = `Run: <code>${cmdDisplay}</code>`;
        if (action.cwd) desc += ` in ${action.cwd}`;
        break;
      default:
        desc = JSON.stringify(action);
    }
    
    return `<div class="action-item"><span class="action-icon">${icon}</span><span class="action-desc">${idx + 1}. ${desc}</span></div>`;
  }).join('');
  
  actionEl.innerHTML = `
    <div class="action-header">
      <span class="action-title">🤖 AI wants to perform ${actionData.actions.length} action${actionData.actions.length > 1 ? 's' : ''}:</span>
    </div>
    ${actionData.thought ? `<div class="action-thought">${actionData.thought}</div>` : ''}
    <div class="action-list">${actionsHtml}</div>
    <div class="action-buttons">
      <button id="execute-actions-btn" class="action-btn execute">▶ Execute</button>
      <button id="cancel-actions-btn" class="action-btn cancel">✕ Cancel</button>
    </div>
  `;
  
  chatHistory.appendChild(actionEl);
  chatHistory.scrollTop = chatHistory.scrollHeight;
  
  // Attach event listeners
  document.getElementById('execute-actions-btn').addEventListener('click', executeActions);
  document.getElementById('cancel-actions-btn').addEventListener('click', cancelActions);
}

function executeActions() {
  if (!pendingActions) return;
  
  const confirmEl = document.getElementById('action-confirmation');
  if (confirmEl) {
    const buttons = confirmEl.querySelector('.action-buttons');
    if (buttons) {
      buttons.innerHTML = '<span class="executing">⏳ Executing...</span>';
    }
  }
  
  window.electronAPI.executeActions(pendingActions);
  pendingActions = null;
}

function cancelActions() {
  const confirmEl = document.getElementById('action-confirmation');
  if (confirmEl) {
    confirmEl.remove();
  }
  
  window.electronAPI.cancelActions();
  pendingActions = null;
  addMessage('Actions cancelled', 'system');
}

function showActionProgress(data) {
  let progressEl = document.getElementById('action-progress');
  if (!progressEl) {
    progressEl = document.createElement('div');
    progressEl.id = 'action-progress';
    progressEl.className = 'message system action-progress';
    chatHistory.appendChild(progressEl);
  }
  
  progressEl.textContent = `⏳ ${data.message || `Executing action ${data.current} of ${data.total}...`}`;
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

function showActionComplete(data) {
  const confirmEl = document.getElementById('action-confirmation');
  if (confirmEl) confirmEl.remove();
  
  const progressEl = document.getElementById('action-progress');
  if (progressEl) progressEl.remove();
  
  if (data.success) {
    addMessage(`✅ ${data.actionsCount} action${data.actionsCount > 1 ? 's' : ''} completed successfully`, 'system');
  } else {
    addMessage(`❌ Action failed: ${data.error}`, 'system');
  }
}

// Agentic action IPC listeners
if (window.electronAPI.onActionExecuting) {
  window.electronAPI.onActionExecuting((data) => {
    showActionConfirmation(data);
  });
}

if (window.electronAPI.onActionProgress) {
  window.electronAPI.onActionProgress((data) => {
    showActionProgress(data);
  });
}

if (window.electronAPI.onActionComplete) {
  window.electronAPI.onActionComplete((data) => {
    showActionComplete(data);
  });
}

// ===== AGENT EVENT HANDLING =====
if (window.electronAPI.onAgentEvent) {
  window.electronAPI.onAgentEvent((data) => {
    console.log('[CHAT] Agent event:', data.type, data);
    switch (data.type) {
      case 'session-started':
        addMessage(`🚀 Agent session started: ${data.sessionId}`, 'system');
        break;
      case 'execution-started':
        showTypingIndicator();
        addMessage(`⚙️ Agent working on: ${typeof data.task === 'string' ? data.task : data.task?.description || 'task'}`, 'system');
        break;
      case 'execution-complete':
        removeTypingIndicator();
        if (data.result?.success) {
          const response = data.result.result?.response || 
                          data.result.response || 
                          'Task completed successfully';
          addMessage(`✅ ${response}`, 'agent');
        } else {
          addMessage(`❌ Agent failed: ${data.result?.error || 'Unknown error'}`, 'system');
        }
        break;
      case 'execution-error':
        removeTypingIndicator();
        addMessage(`❌ Agent error: ${data.error}`, 'system');
        break;
      case 'handoff':
        addMessage(`🔄 Agent handoff: ${data.from} → ${data.to}`, 'system');
        break;
      case 'agent:log':
        console.log('[AGENT LOG]', data);
        break;
    }
  });
}

// Add typing indicator styles
const style = document.createElement('style');
style.textContent = `
  .message.typing {
    padding: 12px 16px;
  }
  .typing-dots {
    display: flex;
    gap: 4px;
    align-items: center;
  }
  .typing-dots span {
    width: 8px;
    height: 8px;
    background: var(--text-secondary);
    border-radius: 50%;
    animation: typing-bounce 1.4s ease-in-out infinite;
  }
  .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
  .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes typing-bounce {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
    30% { transform: translateY(-8px); opacity: 1; }
  }
  
  /* Action card styles */
  .action-card {
    background: linear-gradient(135deg, #1a1a2e, #16213e);
    border: 1px solid var(--accent-blue);
    border-radius: 12px;
    padding: 16px;
  }
  .action-header {
    margin-bottom: 8px;
  }
  .action-title {
    font-weight: 600;
    color: var(--accent-blue);
  }
  .action-thought {
    font-style: italic;
    color: var(--text-secondary);
    margin-bottom: 12px;
    padding: 8px;
    background: rgba(255,255,255,0.05);
    border-radius: 6px;
  }
  .action-list {
    margin-bottom: 12px;
  }
  .action-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    background: rgba(255,255,255,0.05);
    border-radius: 4px;
    margin-bottom: 4px;
  }
  .action-icon {
    font-size: 16px;
  }
  .action-desc {
    font-family: 'Consolas', monospace;
    font-size: 12px;
  }
  .action-buttons {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }
  .action-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    font-size: 13px;
    transition: all 0.2s;
  }
  .action-btn.execute {
    background: var(--accent-green);
    color: white;
  }
  .action-btn.execute:hover {
    background: #00c853;
    transform: scale(1.02);
  }
  .action-btn.cancel {
    background: rgba(255,255,255,0.1);
    color: var(--text-secondary);
  }
  .action-btn.cancel:hover {
    background: rgba(255,100,100,0.2);
    color: #ff6b6b;
  }
  .executing {
    color: var(--accent-blue);
    font-style: italic;
  }
  .action-progress {
    background: rgba(0,150,255,0.1);
    border-left: 3px solid var(--accent-blue);
  }
`;
document.head.appendChild(style);
