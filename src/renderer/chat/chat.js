// ===== STATE =====
let currentMode = 'passive';
let messages = [];
let contextItems = [];

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
}

function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  addMessage(text, 'user');
  window.electronAPI.sendMessage(text);
  
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
  addMessage(data.text, msgType, data.timestamp, { 
    provider: data.provider,
    hasVisualContext: data.hasVisualContext 
  });
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
window.electronAPI.getState().then(state => {
  currentMode = state.overlayMode;
  updateModeDisplay();
  if (state.aiProvider) {
    console.log('Current AI provider:', state.aiProvider);
  }
});

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
`;
document.head.appendChild(style);
