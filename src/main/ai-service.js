/**
 * AI Service Module
 * Handles integration with AI backends (GitHub Copilot, OpenAI, Claude, local models)
 * Supports visual context for AI awareness of screen content
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { shell } = require('electron');

// ===== CONFIGURATION =====
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
const GITHUB_DEVICE_CODE_URL = 'https://github.com/login/device/code';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';

// Current configuration
let currentProvider = 'copilot'; // Default to GitHub Copilot
let apiKeys = {
  copilot: process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '',
  openai: process.env.OPENAI_API_KEY || '',
  anthropic: process.env.ANTHROPIC_API_KEY || ''
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
const SYSTEM_PROMPT = `You are Liku, an intelligent AI assistant integrated into a desktop overlay system. You have the following capabilities:

1. **Screen Awareness**: You can see screenshots of the user's screen when they share visual context with you. Analyze these images to understand what applications, UI elements, and content the user is working with.

2. **Coordinate System**: The user can select specific points on their screen using a dot grid overlay. When they select coordinates, you'll receive them as (x, y) positions.

3. **UI Interaction Guidance**: Help users navigate their applications by describing what you see and suggesting actions based on screen coordinates.

4. **Context Retention**: You maintain conversation history and visual context across messages.

When the user shares a screenshot:
- Describe what you see in detail
- Identify the application being used
- Note any UI elements, text, or data visible
- Suggest relevant actions or answer questions about the content

When the user selects coordinates:
- Reference what's near those coordinates if visual context is available
- Help with pixel-precise tasks like clicking specific elements

Be concise but helpful. Use your visual understanding to provide contextually relevant assistance.`;

/**
 * Set the AI provider
 */
function setProvider(provider) {
  if (AI_PROVIDERS[provider]) {
    currentProvider = provider;
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

  // Build user message with optional visual context
  const latestVisual = includeVisual ? getLatestVisualContext() : null;

  if (latestVisual && currentProvider === 'openai') {
    // OpenAI vision format
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: userMessage },
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
        { type: 'text', text: userMessage }
      ]
    });
  } else if (latestVisual && currentProvider === 'ollama') {
    // Ollama vision format
    const base64Data = latestVisual.dataURL.replace(/^data:image\/\w+;base64,/, '');
    messages.push({
      role: 'user',
      content: userMessage,
      images: [base64Data]
    });
  } else {
    messages.push({
      role: 'user',
      content: userMessage
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
 * Call GitHub Copilot API
 */
function callCopilot(messages) {
  return new Promise((resolve, reject) => {
    if (!apiKeys.copilot) {
      // Try to load saved token
      if (!loadCopilotToken()) {
        return reject(new Error('Not authenticated. Use /login to authenticate with GitHub Copilot.'));
      }
    }

    const config = AI_PROVIDERS.copilot;
    const hasVision = messages.some(m => Array.isArray(m.content));
    
    const data = JSON.stringify({
      model: hasVision ? config.visionModel : config.model,
      messages: messages,
      max_tokens: 2048,
      temperature: 0.7,
      stream: false
    });

    const options = {
      hostname: config.baseUrl,
      path: config.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKeys.copilot}`,
        'Editor-Version': 'vscode/1.85.0',
        'Editor-Plugin-Version': 'copilot/1.0.0',
        'Copilot-Integration-Id': 'copilot-agent-overlay',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode === 401) {
            // Token expired or invalid
            apiKeys.copilot = '';
            return reject(new Error('Token expired. Use /login to re-authenticate.'));
          }
          
          const result = JSON.parse(body);
          if (result.choices && result.choices[0]) {
            resolve(result.choices[0].message.content);
          } else if (result.error) {
            reject(new Error(result.error.message || 'Copilot API error'));
          } else {
            reject(new Error('Invalid response from Copilot'));
          }
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
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
      try {
        if (fs.existsSync(TOKEN_FILE)) fs.unlinkSync(TOKEN_FILE);
      } catch (e) {}
      return { type: 'system', message: 'Logged out from GitHub Copilot.' };

    case '/status':
      const status = getStatus();
      return {
        type: 'info',
        message: `Provider: ${status.provider}\nCopilot: ${status.hasCopilotKey ? 'Authenticated' : 'Not authenticated'}\nOpenAI: ${status.hasOpenAIKey ? 'Key set' : 'No key'}\nAnthropic: ${status.hasAnthropicKey ? 'Key set' : 'No key'}\nHistory: ${status.historyLength} messages\nVisual: ${status.visualContextCount} captures`
      };

    case '/help':
      return {
        type: 'info',
        message: `Available commands:
/login - Authenticate with GitHub Copilot (recommended)
/logout - Remove GitHub Copilot authentication
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
    hasCopilotKey: !!apiKeys.copilot,
    hasOpenAIKey: !!apiKeys.openai,
    hasAnthropicKey: !!apiKeys.anthropic,
    historyLength: conversationHistory.length,
    visualContextCount: visualContextBuffer.length,
    availableProviders: Object.keys(AI_PROVIDERS)
  };
}

module.exports = {
  setProvider,
  setApiKey,
  addVisualContext,
  getLatestVisualContext,
  clearVisualContext,
  sendMessage,
  handleCommand,
  getStatus,
  startCopilotOAuth,
  setOAuthCallback,
  loadCopilotToken,
  AI_PROVIDERS
};
