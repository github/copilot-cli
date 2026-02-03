/**
 * AI Service Module
 * Handles integration with AI backends (GitHub Copilot, OpenAI, Claude, local models)
 * Supports visual context for AI awareness of screen content
 * Supports AGENTIC actions (mouse, keyboard, system control)
 * Supports inspect mode for precision targeting
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { shell } = require('electron');
const systemAutomation = require('./system-automation');

// ===== ENVIRONMENT DETECTION =====
const PLATFORM = process.platform; // 'win32', 'darwin', 'linux'
const OS_NAME = PLATFORM === 'win32' ? 'Windows' : PLATFORM === 'darwin' ? 'macOS' : 'Linux';
const OS_VERSION = os.release();
const ARCHITECTURE = process.arch;

// Lazy-load inspect service to avoid circular dependencies
let inspectService = null;
function getInspectService() {
  if (!inspectService) {
    inspectService = require('./inspect-service');
  }
  return inspectService;
}

// Lazy-load UI watcher for live UI context
let uiWatcher = null;
function getUIWatcher() {
  if (!uiWatcher) {
    const { UIWatcher } = require('./ui-watcher');
    uiWatcher = new UIWatcher();
  }
  return uiWatcher;
}

// ===== CONFIGURATION =====

// Available models for GitHub Copilot (based on Copilot CLI changelog)
const COPILOT_MODELS = {
  'claude-sonnet-4.5': { name: 'Claude Sonnet 4.5', id: 'claude-sonnet-4.5-20250929', vision: true },
  'claude-sonnet-4': { name: 'Claude Sonnet 4', id: 'claude-sonnet-4-20250514', vision: true },
  'claude-opus-4.5': { name: 'Claude Opus 4.5', id: 'claude-opus-4.5', vision: true },
  'claude-haiku-4.5': { name: 'Claude Haiku 4.5', id: 'claude-haiku-4.5', vision: true },
  'gpt-4o': { name: 'GPT-4o', id: 'gpt-4o', vision: true },
  'gpt-4o-mini': { name: 'GPT-4o Mini', id: 'gpt-4o-mini', vision: true },
  'gpt-4.1': { name: 'GPT-4.1', id: 'gpt-4.1', vision: true },
  'o1': { name: 'o1', id: 'o1', vision: false },
  'o1-mini': { name: 'o1 Mini', id: 'o1-mini', vision: false },
  'o3-mini': { name: 'o3 Mini', id: 'o3-mini', vision: false }
};

// Default Copilot model
let currentCopilotModel = 'gpt-4o';

const AI_PROVIDERS = {
  copilot: {
    baseUrl: 'api.githubcopilot.com',
    path: '/chat/completions',
    model: 'gpt-4o',
    visionModel: 'gpt-4o'
  },
  openai: {
    baseUrl: 'api.openai.com',
    path: '/v1/chat/completions',
    model: 'gpt-4o',
    visionModel: 'gpt-4o'
  },
  anthropic: {
    baseUrl: 'api.anthropic.com',
    path: '/v1/messages',
    model: 'claude-sonnet-4-20250514',
    visionModel: 'claude-sonnet-4-20250514'
  },
  ollama: {
    baseUrl: 'localhost',
    port: 11434,
    path: '/api/chat',
    model: 'llama3.2-vision',
    visionModel: 'llama3.2-vision'
  }
};

// GitHub Copilot OAuth Configuration
const COPILOT_CLIENT_ID = 'Iv1.b507a08c87ecfe98';

// Current configuration
let currentProvider = 'copilot'; // Default to GitHub Copilot
let apiKeys = {
  copilot: process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '',     // OAuth token
  copilotSession: '',  // Copilot session token (exchanged from OAuth)
  openai: process.env.OPENAI_API_KEY || '',
  anthropic: process.env.ANTHROPIC_API_KEY || ''
};

// Model metadata tracking
let currentModelMetadata = {
  modelId: currentCopilotModel,
  provider: currentProvider,
  modelVersion: COPILOT_MODELS[currentCopilotModel]?.id || null,
  capabilities: COPILOT_MODELS[currentCopilotModel]?.vision ? ['vision', 'text'] : ['text'],
  lastUpdated: new Date().toISOString()
};

// Token persistence path
const TOKEN_FILE = path.join(process.env.APPDATA || process.env.HOME || '.', 'copilot-agent', 'copilot-token.json');

// OAuth state
let oauthInProgress = false;
let oauthCallback = null;

// Conversation history for context
let conversationHistory = [];
const MAX_HISTORY = 20;

// Visual context for AI awareness
let visualContextBuffer = [];
const MAX_VISUAL_CONTEXT = 5;

// ===== SYSTEM PROMPT =====
// Generate platform-specific context dynamically
function getPlatformContext() {
  if (PLATFORM === 'win32') {
    return `
## Platform: Windows ${OS_VERSION}

### Windows-Specific Keyboard Shortcuts (USE THESE!)
- **Open new terminal**: \`win+x\` then \`i\` (opens Windows Terminal) OR \`win+r\` then type \`wt\` then \`enter\`
- **Open Run dialog**: \`win+r\`
- **Open Start menu/Search**: \`win\` (Windows key alone)
- **Switch windows**: \`alt+tab\`
- **Show desktop**: \`win+d\`
- **File Explorer**: \`win+e\`
- **Settings**: \`win+i\`
- **Lock screen**: \`win+l\`
- **Clipboard history**: \`win+v\`
- **Screenshot**: \`win+shift+s\`

### Windows Terminal Shortcuts
- **New tab**: \`ctrl+shift+t\`
- **Close tab**: \`ctrl+shift+w\`
- **Split pane**: \`alt+shift+d\`

### IMPORTANT: On Windows, NEVER use:
- \`cmd+space\` (that's macOS Spotlight)
- \`ctrl+alt+t\` (that's Linux terminal shortcut)`;
  } else if (PLATFORM === 'darwin') {
    return `
## Platform: macOS ${OS_VERSION}

### macOS-Specific Keyboard Shortcuts
- **Open terminal**: \`cmd+space\` then type "Terminal" then \`enter\`
- **Spotlight search**: \`cmd+space\`
- **Switch windows**: \`cmd+tab\`
- **Switch windows same app**: \`cmd+\`\`
- **Show desktop**: \`f11\` or \`cmd+mission control\`
- **Finder**: \`cmd+shift+g\`
- **Force quit**: \`cmd+option+esc\`
- **Screenshot**: \`cmd+shift+4\``;
  } else {
    return `
## Platform: Linux ${OS_VERSION}

### Linux-Specific Keyboard Shortcuts
- **Open terminal**: \`ctrl+alt+t\` (most distros)
- **Application menu**: \`super\` (Windows key)
- **Switch windows**: \`alt+tab\`
- **Show desktop**: \`super+d\`
- **File manager**: \`super+e\`
- **Screenshot**: \`print\` or \`shift+print\``;
  }
}

const SYSTEM_PROMPT = `You are Liku, an intelligent AGENTIC AI assistant integrated into a desktop overlay system with visual screen awareness AND the ability to control the user's computer.

${getPlatformContext()}

## Your Core Capabilities

1. **Screen Vision**: When the user captures their screen, you receive it as an image. ALWAYS analyze visible content immediately.

2. **SEMANTIC ELEMENT ACTIONS (PREFERRED!)**: You can interact with UI elements by their text/name - MORE RELIABLE than coordinates:
   - \`{"type": "click_element", "text": "Submit", "reason": "Click Submit button"}\` - Finds and clicks element by text
   - \`{"type": "find_element", "text": "Save", "reason": "Locate Save button"}\` - Finds element info

3. **Grid Coordinate System**: The screen has a dot grid overlay:
   - **Columns**: Letters A, B, C, D... (left to right), spacing 100px
   - **Rows**: Numbers 0, 1, 2, 3... (top to bottom), spacing 100px
   - **Start**: Grid is centered, so A0 is at (50, 50)
   - **Fine Grid**: Sub-labels like C3.12 refer to 25px subcells inside C3

4. **SYSTEM CONTROL - AGENTIC ACTIONS**: You can execute actions on the user's computer:
   - **Click**: Click at coordinates (use click_element when possible!)
   - **Type**: Type text into focused fields
   - **Press Keys**: Press keyboard shortcuts (platform-specific - see above!)
   - **Scroll**: Scroll up/down
   - **Drag**: Drag from one point to another

## ACTION FORMAT - CRITICAL

When the user asks you to DO something, respond with a JSON action block:

\`\`\`json
{
  "thought": "Brief explanation of what I'm about to do",
  "actions": [
    {"type": "key", "key": "win+x", "reason": "Open Windows power menu"},
    {"type": "wait", "ms": 300},
    {"type": "key", "key": "i", "reason": "Select Terminal option"}
  ],
  "verification": "A new Windows Terminal window should open"
}
\`\`\`

### Action Types:
- \`{"type": "click_element", "text": "<button text>"}\` - **PREFERRED**: Click element by text (uses Windows UI Automation)
- \`{"type": "find_element", "text": "<search text>"}\` - Find element and return its info
- \`{"type": "click", "x": <number>, "y": <number>}\` - Left click at pixel coordinates (use as fallback)
- \`{"type": "double_click", "x": <number>, "y": <number>}\` - Double click
- \`{"type": "right_click", "x": <number>, "y": <number>}\` - Right click
- \`{"type": "type", "text": "<string>"}\` - Type text (types into currently focused element)
- \`{"type": "key", "key": "<key combo>"}\` - Press key (e.g., "enter", "ctrl+c", "win+r", "alt+tab")
- \`{"type": "scroll", "direction": "up|down", "amount": <number>}\` - Scroll
- \`{"type": "drag", "fromX": <n>, "fromY": <n>, "toX": <n>, "toY": <n>}\` - Drag
- \`{"type": "wait", "ms": <number>}\` - Wait milliseconds (IMPORTANT: add waits between multi-step actions!)
- \`{"type": "screenshot"}\` - Take screenshot to verify result
- \`{"type": "run_command", "command": "<shell command>", "cwd": "<optional path>", "shell": "powershell|cmd|bash"}\` - **PREFERRED FOR SHELL TASKS**: Execute shell command directly and return output (timeout: 30s)

### Grid to Pixel Conversion:
- A0 → (50, 50), B0 → (150, 50), C0 → (250, 50)
- A1 → (50, 150), B1 → (150, 150), C1 → (250, 150)
- Formula: x = 50 + col_index * 100, y = 50 + row_index * 100
- Fine labels: C3.12 = x: 12.5 + (2*4+1)*25 = 237.5, y: 12.5 + (3*4+2)*25 = 362.5

## Response Guidelines

**For OBSERVATION requests** (what's at C3, describe the screen):
- Respond with natural language describing what you see
- Be specific about UI elements, text, buttons

**For ACTION requests** (click here, type this, open that):
- ALWAYS respond with the JSON action block
- Use PLATFORM-SPECIFIC shortcuts (see above!)
- Prefer \`click_element\` over coordinate clicks when targeting named UI elements
- Add \`wait\` actions between steps that need UI to update
- Add verification step to confirm success

**Common Task Patterns**:
${PLATFORM === 'win32' ? `
- **Run shell commands**: Use \`run_command\` action - e.g., \`{"type": "run_command", "command": "Get-Process | Select-Object -First 5"}\`
- **List files**: \`{"type": "run_command", "command": "dir", "cwd": "C:\\\\Users"}\` or \`{"type": "run_command", "command": "Get-ChildItem"}\`
- **Open terminal GUI**: Use \`win+x\` then \`i\` (or \`win+r\` → type "wt" → \`enter\`) - only if user wants visible terminal
- **Open application**: Use \`win\` key, type app name, press \`enter\`
- **Save file**: \`ctrl+s\`
- **Copy/Paste**: \`ctrl+c\` / \`ctrl+v\`` : PLATFORM === 'darwin' ? `
- **Run shell commands**: Use \`run_command\` action - e.g., \`{"type": "run_command", "command": "ls -la", "shell": "bash"}\`
- **Open terminal GUI**: \`cmd+space\`, type "Terminal", \`enter\` - only if user wants visible terminal
- **Open application**: \`cmd+space\`, type app name, \`enter\`
- **Save file**: \`cmd+s\`
- **Copy/Paste**: \`cmd+c\` / \`cmd+v\`` : `
- **Run shell commands**: Use \`run_command\` action - e.g., \`{"type": "run_command", "command": "ls -la", "shell": "bash"}\`
- **Open terminal GUI**: \`ctrl+alt+t\` - only if user wants visible terminal
- **Open application**: \`super\` key, type name, \`enter\`
- **Save file**: \`ctrl+s\`
- **Copy/Paste**: \`ctrl+c\` / \`ctrl+v\``}

Be precise, use platform-correct shortcuts, and execute actions confidently!`;

/**
 * Set the AI provider
 */
function setProvider(provider) {
  if (AI_PROVIDERS[provider]) {
    currentProvider = provider;
    currentModelMetadata.provider = provider;
    currentModelMetadata.lastUpdated = new Date().toISOString();
    return true;
  }
  return false;
}

/**
 * Set API key for a provider
 */
function setApiKey(provider, key) {
  if (apiKeys.hasOwnProperty(provider)) {
    apiKeys[provider] = key;
    return true;
  }
  return false;
}

/**
 * Set the Copilot model
 */
function setCopilotModel(model) {
  if (COPILOT_MODELS[model]) {
    currentCopilotModel = model;
    currentModelMetadata = {
      modelId: model,
      provider: currentProvider,
      modelVersion: COPILOT_MODELS[model].id,
      capabilities: COPILOT_MODELS[model].vision ? ['vision', 'text'] : ['text'],
      lastUpdated: new Date().toISOString()
    };
    return true;
  }
  return false;
}

/**
 * Get available Copilot models
 */
function getCopilotModels() {
  return Object.entries(COPILOT_MODELS).map(([key, value]) => ({
    id: key,
    name: value.name,
    vision: value.vision,
    current: key === currentCopilotModel
  }));
}

/**
 * Get current model metadata
 */
function getModelMetadata() {
  return {
    ...currentModelMetadata,
    sessionToken: apiKeys.copilotSession ? 'present' : 'absent'
  };
}

/**
 * Get current Copilot model
 */
function getCurrentCopilotModel() {
  return currentCopilotModel;
}

/**
 * Add visual context (screenshot data)
 */
function addVisualContext(imageData) {
  visualContextBuffer.push({
    ...imageData,
    addedAt: Date.now()
  });

  // Keep only recent visual context
  while (visualContextBuffer.length > MAX_VISUAL_CONTEXT) {
    visualContextBuffer.shift();
  }
}

/**
 * Get the latest visual context
 */
function getLatestVisualContext() {
  return visualContextBuffer.length > 0 
    ? visualContextBuffer[visualContextBuffer.length - 1] 
    : null;
}

/**
 * Clear visual context
 */
function clearVisualContext() {
  visualContextBuffer = [];
}

/**
 * Build messages array for API call
 */
function buildMessages(userMessage, includeVisual = false) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT }
  ];

  // Add conversation history
  conversationHistory.slice(-MAX_HISTORY).forEach(msg => {
    messages.push(msg);
  });

  // Build user message with optional visual and inspect context
  const latestVisual = includeVisual ? getLatestVisualContext() : null;
  
  // Get inspect context if inspect mode is active
  let inspectContextText = '';
  try {
    const inspect = getInspectService();
    if (inspect.isInspectModeActive()) {
      const inspectContext = inspect.generateAIContext();
      if (inspectContext.regions && inspectContext.regions.length > 0) {
        inspectContextText = `\n\n## Detected UI Regions (Inspect Mode)
${inspectContext.regions.slice(0, 20).map((r, i) => 
  `${i + 1}. **${r.label || 'Unknown'}** (${r.role}) at (${r.center.x}, ${r.center.y}) - confidence: ${Math.round(r.confidence * 100)}%`
).join('\n')}

**Note**: Use the coordinates provided above for precise targeting. If confidence is below 70%, verify with user before clicking.`;
        
        // Add window context if available
        if (inspectContext.windowContext) {
          inspectContextText += `\n\n## Active Window
- App: ${inspectContext.windowContext.appName || 'Unknown'}
- Title: ${inspectContext.windowContext.windowTitle || 'Unknown'}
- Scale Factor: ${inspectContext.windowContext.scaleFactor || 1}`;
        }
      }
    }
  } catch (e) {
    console.warn('[AI] Could not get inspect context:', e.message);
  }
  
  // Get live UI context from the UI watcher (always-on mirror)
  let liveUIContextText = '';
  try {
    const watcher = getUIWatcher();
    if (watcher && watcher.isRunning) {
      const uiContext = watcher.getContextForAI();
      if (uiContext && uiContext.trim()) {
        liveUIContextText = `\n\n${uiContext}`;
        console.log('[AI] Including live UI context from watcher');
      }
    }
  } catch (e) {
    console.warn('[AI] Could not get live UI context:', e.message);
  }
  
  const enhancedMessage = inspectContextText || liveUIContextText
    ? `${userMessage}${inspectContextText}${liveUIContextText}` 
    : userMessage;

  if (latestVisual && (currentProvider === 'copilot' || currentProvider === 'openai')) {
    // OpenAI/Copilot vision format (both use same API format)
    console.log('[AI] Including visual context in message (provider:', currentProvider, ')');
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: enhancedMessage },
        {
          type: 'image_url',
          image_url: {
            url: latestVisual.dataURL,
            detail: 'high'
          }
        }
      ]
    });
  } else if (latestVisual && currentProvider === 'anthropic') {
    // Anthropic vision format
    const base64Data = latestVisual.dataURL.replace(/^data:image\/\w+;base64,/, '');
    messages.push({
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/png',
            data: base64Data
          }
        },
        { type: 'text', text: enhancedMessage }
      ]
    });
  } else if (latestVisual && currentProvider === 'ollama') {
    // Ollama vision format
    const base64Data = latestVisual.dataURL.replace(/^data:image\/\w+;base64,/, '');
    messages.push({
      role: 'user',
      content: enhancedMessage,
      images: [base64Data]
    });
  } else {
    messages.push({
      role: 'user',
      content: enhancedMessage
    });
  }

  return messages;
}

// ===== GITHUB COPILOT OAUTH =====

/**
 * Load saved Copilot token from disk
 */
function loadCopilotToken() {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      const data = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
      if (data.access_token) {
        apiKeys.copilot = data.access_token;
        console.log('[COPILOT] Loaded saved token');
        return true;
      }
    }
  } catch (e) {
    console.error('[COPILOT] Failed to load token:', e.message);
  }
  return false;
}

/**
 * Save Copilot token to disk
 */
function saveCopilotToken(token) {
  try {
    const dir = path.dirname(TOKEN_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(TOKEN_FILE, JSON.stringify({ 
      access_token: token, 
      saved_at: new Date().toISOString() 
    }));
    console.log('[COPILOT] Token saved');
  } catch (e) {
    console.error('[COPILOT] Failed to save token:', e.message);
  }
}

/**
 * Start GitHub Copilot OAuth device code flow
 * Returns { user_code, verification_uri } for user to complete auth
 */
function startCopilotOAuth() {
  return new Promise((resolve, reject) => {
    if (oauthInProgress) {
      return reject(new Error('OAuth already in progress'));
    }
    
    const data = JSON.stringify({
      client_id: COPILOT_CLIENT_ID,
      scope: 'copilot'
    });

    const req = https.request({
      hostname: 'github.com',
      path: '/login/device/code',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (result.device_code && result.user_code) {
            console.log('[COPILOT] OAuth started. User code:', result.user_code);
            oauthInProgress = true;
            
            // Open browser for user to authorize
            shell.openExternal(result.verification_uri_complete || result.verification_uri);
            
            // Start polling for token
            pollForToken(result.device_code, result.interval || 5);
            
            resolve({
              user_code: result.user_code,
              verification_uri: result.verification_uri,
              expires_in: result.expires_in
            });
          } else {
            reject(new Error(result.error_description || 'Failed to get device code'));
          }
        } catch (e) {
          reject(new Error('Invalid response from GitHub'));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/**
 * Poll GitHub for access token after user authorizes
 */
function pollForToken(deviceCode, interval) {
  const poll = () => {
    const data = JSON.stringify({
      client_id: COPILOT_CLIENT_ID,
      device_code: deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
    });

    const req = https.request({
      hostname: 'github.com',
      path: '/login/oauth/access_token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          
          if (result.access_token) {
            // Success!
            console.log('[COPILOT] OAuth successful!');
            apiKeys.copilot = result.access_token;
            saveCopilotToken(result.access_token);
            oauthInProgress = false;
            
            if (oauthCallback) {
              oauthCallback({ success: true, message: 'GitHub Copilot authenticated!' });
              oauthCallback = null;
            }
          } else if (result.error === 'authorization_pending') {
            // User hasn't authorized yet, keep polling
            setTimeout(poll, interval * 1000);
          } else if (result.error === 'slow_down') {
            // Rate limited, slow down
            setTimeout(poll, (interval + 5) * 1000);
          } else if (result.error === 'expired_token') {
            oauthInProgress = false;
            if (oauthCallback) {
              oauthCallback({ success: false, message: 'Authorization expired. Try /login again.' });
              oauthCallback = null;
            }
          } else {
            oauthInProgress = false;
            if (oauthCallback) {
              oauthCallback({ success: false, message: result.error_description || 'OAuth failed' });
              oauthCallback = null;
            }
          }
        } catch (e) {
          // Parse error, retry
          setTimeout(poll, interval * 1000);
        }
      });
    });

    req.on('error', () => setTimeout(poll, interval * 1000));
    req.write(data);
    req.end();
  };

  setTimeout(poll, interval * 1000);
}

/**
 * Exchange OAuth token for Copilot session token
 * Required because the OAuth token alone can't call Copilot API directly
 */
function exchangeForCopilotSession() {
  return new Promise((resolve, reject) => {
    if (!apiKeys.copilot) {
      return reject(new Error('No OAuth token available'));
    }

    console.log('[Copilot] Exchanging OAuth token for session token...');
    console.log('[Copilot] OAuth token prefix:', apiKeys.copilot.substring(0, 10) + '...');

    // First try the Copilot internal endpoint
    const options = {
      hostname: 'api.github.com',
      path: '/copilot_internal/v2/token',
      method: 'GET',
      headers: {
        'Authorization': `token ${apiKeys.copilot}`,
        'Accept': 'application/json',
        'User-Agent': 'GithubCopilot/1.155.0',
        'Editor-Version': 'vscode/1.96.0',
        'Editor-Plugin-Version': 'copilot-chat/0.22.0'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log('[Copilot] Token exchange response:', res.statusCode);
        console.log('[Copilot] Response body preview:', body.substring(0, 200));
        
        if (res.statusCode === 401 || res.statusCode === 403) {
          console.log('[Copilot] Token exchange got', res.statusCode, '- will use OAuth token directly');
          apiKeys.copilotSession = apiKeys.copilot;
          return resolve(apiKeys.copilot);
        }
        
        try {
          const result = JSON.parse(body);
          if (result.token) {
            apiKeys.copilotSession = result.token;
            console.log('[Copilot] Session token obtained successfully, expires:', result.expires_at);
            console.log('[Copilot] Session token prefix:', result.token.substring(0, 15) + '...');
            resolve(result.token);
          } else if (result.message) {
            console.log('[Copilot] API message:', result.message);
            apiKeys.copilotSession = apiKeys.copilot;
            resolve(apiKeys.copilot);
          } else {
            console.log('[Copilot] Unexpected response format, using OAuth token');
            apiKeys.copilotSession = apiKeys.copilot;
            resolve(apiKeys.copilot);
          }
        } catch (e) {
          console.log('[Copilot] Token exchange parse error:', e.message);
          apiKeys.copilotSession = apiKeys.copilot;
          resolve(apiKeys.copilot);
        }
      });
    });

    req.on('error', (e) => {
      console.log('[Copilot] Token exchange network error:', e.message);
      apiKeys.copilotSession = apiKeys.copilot;
      resolve(apiKeys.copilot);
    });
    
    req.end();
  });
}

/**
 * Call GitHub Copilot API
 * Uses session token (not OAuth token) - exchanges if needed
 */
async function callCopilot(messages) {
  // Ensure we have OAuth token
  if (!apiKeys.copilot) {
    if (!loadCopilotToken()) {
      throw new Error('Not authenticated. Use /login to authenticate with GitHub Copilot.');
    }
  }

  // Exchange for session token if we don't have one
  if (!apiKeys.copilotSession) {
    try {
      await exchangeForCopilotSession();
    } catch (e) {
      throw new Error(`Session token exchange failed: ${e.message}`);
    }
  }

  return new Promise((resolve, reject) => {
    const hasVision = messages.some(m => Array.isArray(m.content));
    const modelInfo = COPILOT_MODELS[currentCopilotModel] || COPILOT_MODELS['gpt-4o'];
    const modelId = hasVision && !modelInfo.vision ? 'gpt-4o' : modelInfo.id;
    
    console.log(`[Copilot] Vision request: ${hasVision}, Model: ${modelId}`);
    
    const data = JSON.stringify({
      model: modelId,
      messages: messages,
      max_tokens: 4096,
      temperature: 0.7,
      stream: false
    });

    // Try multiple endpoint formats
    const tryEndpoint = (hostname, pathPrefix = '') => {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKeys.copilotSession}`,
        'Accept': 'application/json',
        'User-Agent': 'GithubCopilot/1.0.0',
        'Editor-Version': 'vscode/1.96.0',
        'Editor-Plugin-Version': 'copilot-chat/0.22.0',
        'Copilot-Integration-Id': 'vscode-chat',
        'X-Request-Id': `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        'Openai-Organization': 'github-copilot',
        'Openai-Intent': 'conversation-panel',
        'Content-Length': Buffer.byteLength(data)
      };
      
      // CRITICAL: Add vision header for image requests
      if (hasVision) {
        headers['Copilot-Vision-Request'] = 'true';
        console.log('[Copilot] Added Copilot-Vision-Request header');
      }
      
      const options = {
        hostname: hostname,
        path: pathPrefix + '/chat/completions',
        method: 'POST',
        headers: headers
      };

      console.log(`[Copilot] Calling ${hostname}${options.path} with model ${modelId}...`);

      return new Promise((resolveReq, rejectReq) => {
        const req = https.request(options, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            console.log('[Copilot] API response status:', res.statusCode);
            
            if (res.statusCode === 401) {
              // Session token expired, clear it
              apiKeys.copilotSession = '';
              return rejectReq(new Error('SESSION_EXPIRED'));
            }
            
            if (res.statusCode === 403) {
              return rejectReq(new Error('ACCESS_DENIED'));
            }
            
            if (res.statusCode >= 400) {
              console.error('[Copilot] Error response:', body.substring(0, 300));
              return rejectReq(new Error(`API_ERROR_${res.statusCode}: ${body.substring(0, 200)}`));
            }

            try {
              const result = JSON.parse(body);
              if (result.choices && result.choices[0]) {
                resolveReq(result.choices[0].message.content);
              } else if (result.error) {
                rejectReq(new Error(result.error.message || 'Copilot API error'));
              } else {
                console.error('[Copilot] Unexpected response:', JSON.stringify(result).substring(0, 300));
                rejectReq(new Error('Invalid response format'));
              }
            } catch (e) {
              console.error('[Copilot] Parse error. Body:', body.substring(0, 300));
              rejectReq(new Error(`PARSE_ERROR: ${body.substring(0, 100)}`));
            }
          });
        });

        req.on('error', (e) => {
          console.error('[Copilot] Request error:', e.message);
          rejectReq(e);
        });
        
        req.write(data);
        req.end();
      });
    };

    // Try primary endpoint first
    tryEndpoint('api.githubcopilot.com')
      .then(resolve)
      .catch(async (err) => {
        console.log('[Copilot] Primary endpoint failed:', err.message);
        
        // If session expired, re-exchange and retry once
        if (err.message === 'SESSION_EXPIRED') {
          try {
            await exchangeForCopilotSession();
            const result = await tryEndpoint('api.githubcopilot.com');
            return resolve(result);
          } catch (retryErr) {
            return reject(new Error('Session expired. Please try /login again.'));
          }
        }
        
        // Try alternate endpoint
        try {
          console.log('[Copilot] Trying alternate endpoint...');
          const result = await tryEndpoint('copilot-proxy.githubusercontent.com', '/v1');
          resolve(result);
        } catch (altErr) {
          console.log('[Copilot] Alternate endpoint also failed:', altErr.message);
          
          // Return user-friendly error messages
          if (err.message.includes('ACCESS_DENIED')) {
            reject(new Error('Access denied. Ensure you have an active GitHub Copilot subscription.'));
          } else if (err.message.includes('PARSE_ERROR')) {
            reject(new Error('API returned invalid response. You may need to re-authenticate with /login'));
          } else {
            reject(new Error(`Copilot API error: ${err.message}`));
          }
        }
      });
  });
}

/**
 * Call OpenAI API
 */
function callOpenAI(messages) {
  return new Promise((resolve, reject) => {
    const config = AI_PROVIDERS.openai;
    const hasVision = messages.some(m => Array.isArray(m.content));
    
    const data = JSON.stringify({
      model: hasVision ? config.visionModel : config.model,
      messages: messages,
      max_tokens: 2048,
      temperature: 0.7
    });

    const options = {
      hostname: config.baseUrl,
      path: config.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKeys.openai}`,
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (response.error) {
            reject(new Error(response.error.message));
          } else {
            resolve(response.choices[0].message.content);
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/**
 * Call Anthropic API
 */
function callAnthropic(messages) {
  return new Promise((resolve, reject) => {
    const config = AI_PROVIDERS.anthropic;
    
    // Convert messages format for Anthropic
    const systemMsg = messages.find(m => m.role === 'system');
    const otherMessages = messages.filter(m => m.role !== 'system');
    
    const data = JSON.stringify({
      model: config.model,
      max_tokens: 2048,
      system: systemMsg ? systemMsg.content : '',
      messages: otherMessages
    });

    const options = {
      hostname: config.baseUrl,
      path: config.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKeys.anthropic,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (response.error) {
            reject(new Error(response.error.message));
          } else {
            const textContent = response.content.find(c => c.type === 'text');
            resolve(textContent ? textContent.text : '');
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/**
 * Call Ollama API (local)
 */
function callOllama(messages) {
  return new Promise((resolve, reject) => {
    const config = AI_PROVIDERS.ollama;
    
    // Check for images in the last message
    const lastMsg = messages[messages.length - 1];
    const hasImages = lastMsg.images && lastMsg.images.length > 0;
    
    const data = JSON.stringify({
      model: hasImages ? config.visionModel : config.model,
      messages: messages.map(m => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : 
          Array.isArray(m.content) ? m.content.map(c => c.text || '').join('\n') : '',
        images: m.images || undefined
      })),
      stream: false
    });

    const options = {
      hostname: config.baseUrl,
      port: config.port,
      path: config.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response.message?.content || '');
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (err) => {
      // Provide helpful error for Ollama
      if (err.code === 'ECONNREFUSED') {
        reject(new Error('Ollama not running. Start it with: ollama serve\nOr set a different provider with /provider openai or /provider anthropic'));
      } else {
        reject(err);
      }
    });
    
    req.write(data);
    req.end();
  });
}

/**
 * Send a message and get AI response
 */
async function sendMessage(userMessage, options = {}) {
  const { includeVisualContext = false, coordinates = null } = options;

  // Enhance message with coordinate context if provided
  let enhancedMessage = userMessage;
  if (coordinates) {
    enhancedMessage = `[User selected coordinates: (${coordinates.x}, ${coordinates.y}) with label "${coordinates.label}"]\n\n${userMessage}`;
  }

  // Build messages with optional visual context
  const messages = buildMessages(enhancedMessage, includeVisualContext);

  try {
    let response;
    
    switch (currentProvider) {
      case 'copilot':
        // GitHub Copilot - uses OAuth token or env var
        if (!apiKeys.copilot) {
          // Try loading saved token
          if (!loadCopilotToken()) {
            throw new Error('Not authenticated with GitHub Copilot.\n\nTo authenticate:\n1. Type /login and authorize in browser\n2. Or set GH_TOKEN or GITHUB_TOKEN environment variable');
          }
        }
        response = await callCopilot(messages);
        break;
        
      case 'openai':
        if (!apiKeys.openai) {
          throw new Error('OpenAI API key not set. Use /setkey openai <key> or set OPENAI_API_KEY environment variable.');
        }
        response = await callOpenAI(messages);
        break;
        
      case 'anthropic':
        if (!apiKeys.anthropic) {
          throw new Error('Anthropic API key not set. Use /setkey anthropic <key> or set ANTHROPIC_API_KEY environment variable.');
        }
        response = await callAnthropic(messages);
        break;
        
      case 'ollama':
      default:
        response = await callOllama(messages);
        break;
    }

    // Add to conversation history
    conversationHistory.push({ role: 'user', content: enhancedMessage });
    conversationHistory.push({ role: 'assistant', content: response });

    // Trim history if too long
    while (conversationHistory.length > MAX_HISTORY * 2) {
      conversationHistory.shift();
    }

    return {
      success: true,
      message: response,
      provider: currentProvider,
      hasVisualContext: includeVisualContext && visualContextBuffer.length > 0
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      provider: currentProvider
    };
  }
}

/**
 * Handle slash commands
 */
function handleCommand(command) {
  const parts = command.split(' ');
  const cmd = parts[0].toLowerCase();

  switch (cmd) {
    case '/provider':
      if (parts[1]) {
        if (setProvider(parts[1])) {
          return { type: 'system', message: `Switched to ${parts[1]} provider.` };
        } else {
          return { type: 'error', message: `Unknown provider. Available: ${Object.keys(AI_PROVIDERS).join(', ')}` };
        }
      }
      return { type: 'info', message: `Current provider: ${currentProvider}\nAvailable: ${Object.keys(AI_PROVIDERS).join(', ')}` };

    case '/setkey':
      if (parts[1] && parts[2]) {
        if (setApiKey(parts[1], parts[2])) {
          return { type: 'system', message: `API key set for ${parts[1]}.` };
        }
      }
      return { type: 'error', message: 'Usage: /setkey <provider> <key>' };

    case '/clear':
      conversationHistory = [];
      clearVisualContext();
      return { type: 'system', message: 'Conversation and visual context cleared.' };

    case '/vision':
      if (parts[1] === 'on') {
        return { type: 'info', message: 'Visual context will be included in next message. Use the capture button first.' };
      } else if (parts[1] === 'off') {
        clearVisualContext();
        return { type: 'system', message: 'Visual context cleared.' };
      }
      return { type: 'info', message: `Visual context buffer: ${visualContextBuffer.length} image(s)` };

    case '/login':
      // Start GitHub Copilot OAuth device code flow
      return startCopilotOAuth()
        .then(result => ({
          type: 'login',
          message: `GitHub Copilot authentication started!\n\nYour code: ${result.user_code}\n\nA browser window has opened. Enter the code to authorize.\nWaiting for authentication...`
        }))
        .catch(err => ({
          type: 'error',
          message: `Login failed: ${err.message}`
        }));

    case '/logout':
      apiKeys.copilot = '';
      apiKeys.copilotSession = '';
      try {
        if (fs.existsSync(TOKEN_FILE)) fs.unlinkSync(TOKEN_FILE);
      } catch (e) {}
      return { type: 'system', message: 'Logged out from GitHub Copilot.' };

    case '/model':
      if (parts.length > 1) {
        const model = parts[1].toLowerCase();
        if (setCopilotModel(model)) {
          const modelInfo = COPILOT_MODELS[model];
          return { 
            type: 'system', 
            message: `Switched to ${modelInfo.name}${modelInfo.vision ? ' (supports vision)' : ''}`
          };
        } else {
          const available = Object.entries(COPILOT_MODELS)
            .map(([k, v]) => `  ${k} - ${v.name}`)
            .join('\n');
          return { 
            type: 'error', 
            message: `Unknown model. Available models:\n${available}`
          };
        }
      } else {
        const models = getCopilotModels();
        const list = models.map(m => 
          `${m.current ? '→' : ' '} ${m.id} - ${m.name}${m.vision ? ' 👁' : ''}`
        ).join('\n');
        return {
          type: 'info',
          message: `Current model: ${COPILOT_MODELS[currentCopilotModel].name}\n\nAvailable models:\n${list}\n\nUse /model <name> to switch`
        };
      }

    case '/status':
      const status = getStatus();
      return {
        type: 'info',
        message: `Provider: ${status.provider}\nModel: ${COPILOT_MODELS[currentCopilotModel]?.name || currentCopilotModel}\nCopilot: ${status.hasCopilotKey ? 'Authenticated' : 'Not authenticated'}\nOpenAI: ${status.hasOpenAIKey ? 'Key set' : 'No key'}\nAnthropic: ${status.hasAnthropicKey ? 'Key set' : 'No key'}\nHistory: ${status.historyLength} messages\nVisual: ${status.visualContextCount} captures`
      };

    case '/help':
      return {
        type: 'info',
        message: `Available commands:
/login - Authenticate with GitHub Copilot (recommended)
/logout - Remove GitHub Copilot authentication
/model [name] - List or set Copilot model
/provider [name] - Get/set AI provider (copilot, openai, anthropic, ollama)
/setkey <provider> <key> - Set API key
/status - Show authentication status
/clear - Clear conversation history
/vision [on|off] - Manage visual context
/capture - Capture screen for AI analysis
/help - Show this help`
      };

    default:
      return null; // Not a command
  }
}

/**
 * Get current status
 */
/**
 * Set callback for OAuth completion
 */
function setOAuthCallback(callback) {
  oauthCallback = callback;
}

/**
 * Get current status
 */
function getStatus() {
  return {
    provider: currentProvider,
    model: currentCopilotModel,
    modelName: COPILOT_MODELS[currentCopilotModel]?.name || currentCopilotModel,
    hasCopilotKey: !!apiKeys.copilot,
    hasApiKey: currentProvider === 'copilot' ? !!apiKeys.copilot : 
               currentProvider === 'openai' ? !!apiKeys.openai :
               currentProvider === 'anthropic' ? !!apiKeys.anthropic : true,
    hasOpenAIKey: !!apiKeys.openai,
    hasAnthropicKey: !!apiKeys.anthropic,
    historyLength: conversationHistory.length,
    visualContextCount: visualContextBuffer.length,
    availableProviders: Object.keys(AI_PROVIDERS),
    copilotModels: getCopilotModels()
  };
}

// ===== SAFETY GUARDRAILS =====

/**
 * Action risk levels for safety classification
 */
const ActionRiskLevel = {
  SAFE: 'SAFE',         // Read-only, no risk (e.g., screenshot)
  LOW: 'LOW',           // Minor risk (e.g., scroll, move mouse)
  MEDIUM: 'MEDIUM',     // Moderate risk (e.g., click, type text)
  HIGH: 'HIGH',         // Significant risk (e.g., file operations, form submit)
  CRITICAL: 'CRITICAL'  // Dangerous (e.g., delete, purchase, payment)
};

/**
 * Dangerous text patterns that require user confirmation
 */
const DANGER_PATTERNS = [
  // Destructive actions
  /\b(delete|remove|erase|destroy|clear|reset|uninstall|format)\b/i,
  // Financial actions
  /\b(buy|purchase|order|checkout|pay|payment|subscribe|donate|transfer|send money)\b/i,
  // Account actions
  /\b(logout|log out|sign out|deactivate|close account|cancel subscription)\b/i,
  // System actions
  /\b(shutdown|restart|reboot|sleep|hibernate|power off)\b/i,
  // Confirmation buttons with risk
  /\b(confirm|yes,? delete|yes,? remove|permanently|irreversible|cannot be undone)\b/i,
  // Administrative actions
  /\b(admin|administrator|root|sudo|elevated|run as)\b/i
];

/**
 * Safe/benign patterns that reduce risk level
 */
const SAFE_PATTERNS = [
  /\b(cancel|back|close|dismiss|skip|later|no thanks|maybe later)\b/i,
  /\b(search|find|view|show|display|open|read|look)\b/i,
  /\b(help|info|about|settings|preferences)\b/i
];

/**
 * Pending action awaiting user confirmation
 */
let pendingAction = null;

/**
 * Analyze the safety/risk level of an action
 * @param {Object} action - The action to analyze
 * @param {Object} targetInfo - Information about what's at the click target
 * @returns {Object} Safety analysis result
 */
function analyzeActionSafety(action, targetInfo = {}) {
  const result = {
    actionId: `action-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    action: action,
    targetInfo: targetInfo,
    riskLevel: ActionRiskLevel.SAFE,
    warnings: [],
    requiresConfirmation: false,
    description: '',
    timestamp: Date.now()
  };
  
  // Check action type base risk
  switch (action.type) {
    case 'screenshot':
    case 'wait':
      result.riskLevel = ActionRiskLevel.SAFE;
      break;
    case 'scroll':
      result.riskLevel = ActionRiskLevel.LOW;
      break;
    case 'click':
    case 'double_click':
      result.riskLevel = ActionRiskLevel.MEDIUM;
      break;
    case 'right_click':
      result.riskLevel = ActionRiskLevel.MEDIUM;
      result.warnings.push('Right-click may open context menu with destructive options');
      break;
    case 'type':
      result.riskLevel = ActionRiskLevel.MEDIUM;
      // Check what's being typed
      if (action.text && action.text.length > 100) {
        result.warnings.push('Typing large amount of text');
      }
      break;
    case 'key':
      // Analyze key combinations
      const key = (action.key || '').toLowerCase();
      if (key.includes('delete') || key.includes('backspace')) {
        result.riskLevel = ActionRiskLevel.HIGH;
        result.warnings.push('Delete/Backspace key may remove content');
      } else if (key.includes('enter') || key.includes('return')) {
        result.riskLevel = ActionRiskLevel.MEDIUM;
        result.warnings.push('Enter key may submit form or confirm action');
      } else if (key.includes('ctrl') || key.includes('cmd') || key.includes('alt')) {
        result.riskLevel = ActionRiskLevel.MEDIUM;
        result.warnings.push('Keyboard shortcut detected');
      }
      break;
    case 'drag':
      result.riskLevel = ActionRiskLevel.MEDIUM;
      break;
    case 'run_command':
      // Analyze command safety
      const cmd = (action.command || '').toLowerCase();
      const dangerousPatterns = [
        /\b(rm|del|erase|rmdir|rd)\s+(-[rf]+|\/[sq]+|\*)/i,
        /Remove-Item.*-Recurse.*-Force/i,
        /\bformat\b/i,
        /\b(shutdown|restart|reboot)\b/i,
        /\breg\s+(delete|add)\b/i,
        /\bnet\s+(user|localgroup)\b/i,
        /\b(sudo|runas)\b/i,
        /Start-Process.*-Verb\s+RunAs/i,
        /Set-ExecutionPolicy/i,
        /Stop-Process.*-Force/i,
      ];
      
      const isDangerous = dangerousPatterns.some(p => p.test(action.command || ''));
      if (isDangerous) {
        result.riskLevel = ActionRiskLevel.CRITICAL;
        result.warnings.push('Potentially destructive command');
        result.requiresConfirmation = true;
      } else if (cmd.includes('rm ') || cmd.includes('del ') || cmd.includes('remove')) {
        result.riskLevel = ActionRiskLevel.HIGH;
        result.warnings.push('Command may delete files');
        result.requiresConfirmation = true;
      } else {
        result.riskLevel = ActionRiskLevel.MEDIUM;
      }
      break;
  }
  
  // Check target info for dangerous patterns
  const textToCheck = [
    targetInfo.text || '',
    targetInfo.buttonText || '',
    targetInfo.label || '',
    action.reason || '',
    ...(targetInfo.nearbyText || [])
  ].join(' ');
  
  // Check for danger patterns
  for (const pattern of DANGER_PATTERNS) {
    if (pattern.test(textToCheck)) {
      result.riskLevel = ActionRiskLevel.HIGH;
      result.warnings.push(`Detected risky keyword: ${textToCheck.match(pattern)?.[0]}`);
      result.requiresConfirmation = true;
    }
  }
  
  // Elevate to CRITICAL if multiple danger flags
  if (result.warnings.length >= 2 && result.riskLevel === ActionRiskLevel.HIGH) {
    result.riskLevel = ActionRiskLevel.CRITICAL;
  }
  
  // Always require confirmation for HIGH or CRITICAL
  if (result.riskLevel === ActionRiskLevel.HIGH || result.riskLevel === ActionRiskLevel.CRITICAL) {
    result.requiresConfirmation = true;
  }
  
  // Check for low confidence inspect region targets
  if (targetInfo.confidence !== undefined && targetInfo.confidence < 0.7) {
    result.warnings.push(`Low confidence target (${Math.round(targetInfo.confidence * 100)}%)`);
    result.requiresConfirmation = true;
    if (result.riskLevel === ActionRiskLevel.SAFE || result.riskLevel === ActionRiskLevel.LOW) {
      result.riskLevel = ActionRiskLevel.MEDIUM;
    }
  }
  
  // Check if target is from inspect mode with very low confidence
  if (targetInfo.confidence !== undefined && targetInfo.confidence < 0.5) {
    result.riskLevel = ActionRiskLevel.HIGH;
    result.warnings.push('Very low confidence - verify target manually');
  }
  
  // Generate human-readable description
  result.description = describeAction(action, targetInfo);
  
  return result;
}

/**
 * Generate human-readable description of an action
 */
function describeAction(action, targetInfo = {}) {
  const target = targetInfo.text || targetInfo.buttonText || targetInfo.label || '';
  const location = action.x !== undefined ? `at (${action.x}, ${action.y})` : '';
  
  switch (action.type) {
    case 'click':
      return `Click ${target ? `"${target}"` : ''} ${location}`.trim();
    case 'double_click':
      return `Double-click ${target ? `"${target}"` : ''} ${location}`.trim();
    case 'right_click':
      return `Right-click ${target ? `"${target}"` : ''} ${location}`.trim();
    case 'type':
      const preview = action.text?.length > 30 ? action.text.substring(0, 30) + '...' : action.text;
      return `Type "${preview}"`;
    case 'key':
      return `Press ${action.key}`;
    case 'scroll':
      return `Scroll ${action.direction} ${action.amount || 3} times`;
    case 'drag':
      return `Drag from (${action.fromX}, ${action.fromY}) to (${action.toX}, ${action.toY})`;
    case 'wait':
      return `Wait ${action.ms}ms`;
    case 'screenshot':
      return 'Take screenshot';
    default:
      return `${action.type} action`;
  }
}

/**
 * Store pending action for user confirmation
 */
function setPendingAction(actionData) {
  pendingAction = actionData;
  return actionData.actionId;
}

/**
 * Get pending action
 */
function getPendingAction() {
  return pendingAction;
}

/**
 * Clear pending action
 */
function clearPendingAction() {
  pendingAction = null;
}

/**
 * Confirm pending action
 */
function confirmPendingAction(actionId) {
  if (pendingAction && pendingAction.actionId === actionId) {
    const action = pendingAction;
    pendingAction = null;
    return action;
  }
  return null;
}

/**
 * Reject pending action
 */
function rejectPendingAction(actionId) {
  if (pendingAction && pendingAction.actionId === actionId) {
    pendingAction = null;
    return true;
  }
  return false;
}

// ===== AGENTIC ACTION HANDLING =====

/**
 * Parse AI response to extract actions
 * @param {string} aiResponse - The AI's response text
 * @returns {Object|null} Parsed action object or null if no actions
 */
function parseActions(aiResponse) {
  return systemAutomation.parseAIActions(aiResponse);
}

/**
 * Check if AI response contains actions
 * @param {string} aiResponse - The AI's response text  
 * @returns {boolean}
 */
function hasActions(aiResponse) {
  const parsed = parseActions(aiResponse);
  return parsed && parsed.actions && parsed.actions.length > 0;
}

/**
 * Execute actions from AI response with safety checks
 * @param {Object} actionData - Parsed action data with actions array
 * @param {Function} onAction - Callback after each action
 * @param {Function} onScreenshot - Callback when screenshot is needed
 * @param {Object} options - Additional options
 * @param {Function} options.onRequireConfirmation - Callback when action needs user confirmation
 * @param {Object} options.targetAnalysis - Visual analysis of click targets
 * @returns {Object} Execution results
 */
async function executeActions(actionData, onAction = null, onScreenshot = null, options = {}) {
  if (!actionData || !actionData.actions || !Array.isArray(actionData.actions)) {
    return { success: false, error: 'No valid actions provided' };
  }

  const { onRequireConfirmation, targetAnalysis = {}, actionExecutor } = options;

  console.log('[AI-SERVICE] Executing actions:', actionData.thought || 'No thought provided');
  console.log('[AI-SERVICE] Actions:', JSON.stringify(actionData.actions, null, 2));

  const results = [];
  let screenshotRequested = false;
  let pendingConfirmation = false;

  for (let i = 0; i < actionData.actions.length; i++) {
    const action = actionData.actions[i];
    
    // Handle screenshot requests specially
    if (action.type === 'screenshot') {
      screenshotRequested = true;
      if (onScreenshot) {
        await onScreenshot();
      }
      results.push({ success: true, action: 'screenshot', message: 'Screenshot captured' });
      continue;
    }

    // ===== SAFETY CHECK =====
    // Get target info if available (from visual analysis)
    const targetInfo = targetAnalysis[`${action.x},${action.y}`] || {
      text: action.reason || '',
      buttonText: action.targetText || '',
      nearbyText: []
    };
    
    // Analyze safety
    const safety = analyzeActionSafety(action, targetInfo);
    console.log(`[AI-SERVICE] Action ${i} safety: ${safety.riskLevel}`, safety.warnings);
    
    // If HIGH or CRITICAL risk, require confirmation
    if (safety.requiresConfirmation) {
      console.log(`[AI-SERVICE] Action ${i} requires user confirmation`);
      
      // Store as pending action
      setPendingAction({
        ...safety,
        actionIndex: i,
        remainingActions: actionData.actions.slice(i),
        completedResults: [...results],
        thought: actionData.thought,
        verification: actionData.verification
      });
      
      // Notify via callback
      if (onRequireConfirmation) {
        onRequireConfirmation(safety);
      }
      
      pendingConfirmation = true;
      break; // Stop execution, wait for confirmation
    }

    // Execute the action (SAFE/LOW/MEDIUM risk)
    const result = await (actionExecutor ? actionExecutor(action) : systemAutomation.executeAction(action));
    result.reason = action.reason || '';
    result.safety = safety;
    results.push(result);

    // Callback for UI updates
    if (onAction) {
      onAction(result, i, actionData.actions.length);
    }

    // Stop on failure unless action specifies continue_on_error
    if (!result.success && !action.continue_on_error) {
      console.log(`[AI-SERVICE] Sequence stopped at action ${i} due to error`);
      break;
    }
  }

  return {
    success: !pendingConfirmation && results.every(r => r.success),
    thought: actionData.thought,
    verification: actionData.verification,
    results,
    screenshotRequested,
    pendingConfirmation,
    pendingActionId: pendingConfirmation ? getPendingAction()?.actionId : null
  };
}

/**
 * Resume execution after user confirms pending action
 * @param {Function} onAction - Callback after each action
 * @param {Function} onScreenshot - Callback when screenshot is needed
 * @returns {Object} Execution results
 */
async function resumeAfterConfirmation(onAction = null, onScreenshot = null, options = {}) {
  const pending = getPendingAction();
  if (!pending) {
    return { success: false, error: 'No pending action to resume' };
  }
  
  const { actionExecutor } = options;
  
  console.log('[AI-SERVICE] Resuming after user confirmation');
  
  const results = [...pending.completedResults];
  let screenshotRequested = false;
  
  // Execute the confirmed action and remaining actions
  for (let i = 0; i < pending.remainingActions.length; i++) {
    const action = pending.remainingActions[i];
    
    if (action.type === 'screenshot') {
      screenshotRequested = true;
      if (onScreenshot) {
        await onScreenshot();
      }
      results.push({ success: true, action: 'screenshot', message: 'Screenshot captured' });
      continue;
    }
    
    // Execute action (user confirmed, skip safety for first action)
    const result = await (actionExecutor ? actionExecutor(action) : systemAutomation.executeAction(action));
    result.reason = action.reason || '';
    result.userConfirmed = i === 0; // First one was confirmed
    results.push(result);
    
    if (onAction) {
      onAction(result, pending.actionIndex + i, pending.actionIndex + pending.remainingActions.length);
    }
    
    if (!result.success && !action.continue_on_error) {
      break;
    }
  }
  
  clearPendingAction();
  
  return {
    success: results.every(r => r.success),
    thought: pending.thought,
    verification: pending.verification,
    results,
    screenshotRequested,
    userConfirmed: true
  };
}

/**
 * Convert grid coordinate to pixel position
 */
function gridToPixels(coord) {
  return systemAutomation.gridToPixels(coord);
}

module.exports = {
  setProvider,
  setApiKey,
  setCopilotModel,
  getCopilotModels,
  getCurrentCopilotModel,
  getModelMetadata,
  addVisualContext,
  getLatestVisualContext,
  clearVisualContext,
  sendMessage,
  handleCommand,
  getStatus,
  startCopilotOAuth,
  setOAuthCallback,
  loadCopilotToken,
  AI_PROVIDERS,
  COPILOT_MODELS,
  // Agentic capabilities
  parseActions,
  hasActions,
  executeActions,
  gridToPixels,
  systemAutomation,
  // Safety guardrails
  ActionRiskLevel,
  analyzeActionSafety,
  describeAction,
  setPendingAction,
  getPendingAction,
  clearPendingAction,
  confirmPendingAction,
  rejectPendingAction,
  resumeAfterConfirmation
};
