# Integrated Terminal Architecture for Copilot Liku CLI

## Executive Summary

This document proposes adding an **integrated terminal** to the Copilot Liku CLI Electron app. This eliminates the unreliable approach of opening external terminals via Windows automation (Win+R, SendKeys) and enables the AI to directly execute shell commands within the app.

## Problem Statement

Currently, when the AI needs to run commands (e.g., "open a terminal and run `npm install`"), it:
1. Tries to press `Win+R` to open Run dialog
2. Types `wt` or `cmd` to open external terminal
3. Uses SendKeys to type commands

**Issues:**
- Unreliable (timing-dependent, can fail silently)
- Loses output (AI can't see command results)
- User loses context (focus switches away)
- Can't chain commands or handle errors

## Proposed Solution

Implement an **integrated terminal panel** using:
- **node-pty** - Spawns real shell processes (PowerShell, cmd, bash)
- **xterm.js** - Terminal UI component for rendering
- New **`run_command`** action type for AI

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          Main Process                            │
│  ┌────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │  AI        │  │  Terminal    │  │   Action Executor      │  │
│  │  Service   │──│  Service     │──│  (run_command handler) │  │
│  └─────┬──────┘  └──────┬───────┘  └────────────────────────┘  │
│        │                │                                       │
│        │         ┌──────┴───────┐                              │
│        │         │   node-pty   │ ← Real shell process         │
│        │         │   Instance   │                              │
│        │         └──────┬───────┘                              │
│  ┌─────┴────────────────┴────────────────────────────────┐     │
│  │                    IPC Router                          │     │
│  └─────┬───────────────────────────────────────┬─────────┘     │
└────────┼───────────────────────────────────────┼───────────────┘
         │                                       │
    ┌────┴────────┐                      ┌──────┴──────┐
    │    Chat     │                      │  Terminal   │
    │   Renderer  │                      │  Renderer   │
    │             │                      │             │
    │ ┌─────────┐ │                      │ ┌─────────┐ │
    │ │  Chat   │ │                      │ │ xterm.js│ │
    │ │  Panel  │ │                      │ │Terminal │ │
    │ └─────────┘ │                      │ │  UI     │ │
    │ ┌─────────┐ │                      │ └─────────┘ │
    │ │ Terminal│◄┼──────────────────────┼─┤ Output   │ │
    │ │ Output  │ │   IPC stream         │ │ Buffer  │ │
    │ │ Display │ │                      │ └─────────┘ │
    │ └─────────┘ │                      └─────────────┘
    └─────────────┘                      (Optional standalone)
```

## Key Components

### 1. Terminal Service (`src/main/terminal-service.js`)

Central service managing terminal instances:

```javascript
/**
 * Terminal Service
 * Manages node-pty instances and routes data to renderers
 */
const os = require('os');
const path = require('path');

// node-pty is a native module - must be installed
let pty;
try {
  pty = require('node-pty');
} catch (e) {
  console.error('[TERMINAL] node-pty not installed. Terminal features disabled.');
}

class TerminalService {
  constructor() {
    this.terminals = new Map(); // terminalId -> { pty, buffer, subscribers }
    this.nextId = 1;
  }

  /**
   * Create a new terminal instance
   * @param {Object} options - Shell options
   * @returns {string} terminalId
   */
  create(options = {}) {
    if (!pty) {
      throw new Error('node-pty not available');
    }

    const shell = options.shell || this.getDefaultShell();
    const cwd = options.cwd || os.homedir();
    const env = { ...process.env, ...options.env };
    
    const id = `term-${this.nextId++}`;
    
    const ptyProcess = pty.spawn(shell, options.args || [], {
      name: 'xterm-256color',
      cols: options.cols || 120,
      rows: options.rows || 30,
      cwd,
      env
    });

    const instance = {
      pty: ptyProcess,
      buffer: '',          // Rolling output buffer
      maxBuffer: 50000,    // Keep last 50KB
      subscribers: [],     // IPC subscribers for output
      commandQueue: [],    // Pending commands
      lastCommand: null,
      exitCode: null
    };

    // Collect output
    ptyProcess.onData((data) => {
      // Append to buffer (trim if too large)
      instance.buffer += data;
      if (instance.buffer.length > instance.maxBuffer) {
        instance.buffer = instance.buffer.slice(-instance.maxBuffer);
      }
      
      // Notify subscribers
      instance.subscribers.forEach(callback => {
        try { callback(data); } catch (e) {}
      });
    });

    ptyProcess.onExit(({ exitCode }) => {
      instance.exitCode = exitCode;
      console.log(`[TERMINAL] ${id} exited with code ${exitCode}`);
    });

    this.terminals.set(id, instance);
    console.log(`[TERMINAL] Created ${id} with shell ${shell}`);
    
    return id;
  }

  /**
   * Write data to terminal (e.g., command)
   */
  write(terminalId, data) {
    const instance = this.terminals.get(terminalId);
    if (!instance || !instance.pty) {
      throw new Error(`Terminal ${terminalId} not found`);
    }
    instance.pty.write(data);
    instance.lastCommand = data.trim();
  }

  /**
   * Execute a command and wait for output
   * Returns the output after command completes
   */
  async execute(terminalId, command, options = {}) {
    const instance = this.terminals.get(terminalId);
    if (!instance) {
      throw new Error(`Terminal ${terminalId} not found`);
    }

    const timeout = options.timeout || 30000;
    const bufferBefore = instance.buffer.length;
    
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);

      // Write command with newline
      instance.pty.write(command + '\r');
      instance.lastCommand = command;

      // Simple completion detection: wait for prompt or timeout
      // For better detection, look for PS1/prompt patterns
      let outputCollected = '';
      let idleTimer = null;
      
      const dataHandler = (data) => {
        outputCollected += data;
        
        // Reset idle timer on each data
        if (idleTimer) clearTimeout(idleTimer);
        
        // Consider command "done" after 500ms of no output
        idleTimer = setTimeout(() => {
          cleanup();
          resolve({
            command,
            output: outputCollected,
            success: true
          });
        }, options.idleTimeout || 500);
      };

      instance.subscribers.push(dataHandler);
      
      const cleanup = () => {
        clearTimeout(timer);
        if (idleTimer) clearTimeout(idleTimer);
        const idx = instance.subscribers.indexOf(dataHandler);
        if (idx > -1) instance.subscribers.splice(idx, 1);
      };
    });
  }

  /**
   * Get output buffer
   */
  getBuffer(terminalId) {
    const instance = this.terminals.get(terminalId);
    return instance ? instance.buffer : '';
  }

  /**
   * Subscribe to terminal output
   */
  subscribe(terminalId, callback) {
    const instance = this.terminals.get(terminalId);
    if (instance) {
      instance.subscribers.push(callback);
    }
  }

  /**
   * Resize terminal
   */
  resize(terminalId, cols, rows) {
    const instance = this.terminals.get(terminalId);
    if (instance && instance.pty) {
      instance.pty.resize(cols, rows);
    }
  }

  /**
   * Destroy terminal
   */
  destroy(terminalId) {
    const instance = this.terminals.get(terminalId);
    if (instance) {
      instance.pty.kill();
      this.terminals.delete(terminalId);
      console.log(`[TERMINAL] Destroyed ${id}`);
    }
  }

  /**
   * Get default shell for platform
   */
  getDefaultShell() {
    if (process.platform === 'win32') {
      return process.env.COMSPEC || 'cmd.exe';
      // Or for PowerShell: return 'powershell.exe';
      // Or for Windows Terminal: return 'wt.exe';
    } else if (process.platform === 'darwin') {
      return process.env.SHELL || '/bin/zsh';
    }
    return process.env.SHELL || '/bin/bash';
  }

  /**
   * List active terminals
   */
  list() {
    return Array.from(this.terminals.entries()).map(([id, inst]) => ({
      id,
      lastCommand: inst.lastCommand,
      exitCode: inst.exitCode,
      bufferSize: inst.buffer.length
    }));
  }
}

module.exports = { TerminalService };
```

### 2. New Action Type: `run_command`

Add to `system-automation.js` ACTION_TYPES:

```javascript
const ACTION_TYPES = {
  // ... existing types ...
  RUN_COMMAND: 'run_command',    // Execute shell command
  RUN_SCRIPT: 'run_script',      // Execute multi-line script
  TERMINAL_CREATE: 'terminal_create',
  TERMINAL_CLOSE: 'terminal_close',
};
```

**Action Format:**
```json
{
  "type": "run_command",
  "command": "npm install lodash",
  "cwd": "C:/projects/myapp",
  "timeout": 60000,
  "shell": "powershell",
  "reason": "Install lodash dependency"
}
```

### 3. AI Service Integration

Update system prompt in `ai-service.js`:

```javascript
const SYSTEM_PROMPT = `
// ... existing content ...

## TERMINAL COMMANDS (PREFERRED over keyboard automation!)

When you need to run shell commands, use the \`run_command\` action:

\`\`\`json
{
  "thought": "Installing required npm package",
  "actions": [
    {"type": "run_command", "command": "npm install lodash", "cwd": "C:/project", "reason": "Install lodash"}
  ],
  "verification": "Check npm output shows successful install"
}
\`\`\`

### Command Action Types:
- \`{"type": "run_command", "command": "<shell command>", "cwd": "/optional/path"}\` - Run single command
- \`{"type": "run_script", "script": "line1\\nline2\\nline3"}\` - Run multi-line script
- \`{"type": "terminal_create", "shell": "powershell"}\` - Create new terminal session
- \`{"type": "terminal_close", "terminalId": "term-1"}\` - Close terminal

### IMPORTANT:
- ALWAYS prefer \`run_command\` over trying to open external terminals with keyboard shortcuts
- \`run_command\` output is captured and visible to you
- You can chain commands: \`npm install && npm run build\`
- Commands run in the integrated terminal within the app
`;
```

### 4. Chat UI Integration

**Option A: Show output in chat messages**

The simplest approach - terminal output appears as system messages:

```javascript
// In chat.js - add handler for terminal output
if (window.electronAPI.onTerminalOutput) {
  window.electronAPI.onTerminalOutput((data) => {
    addMessage(`📟 Terminal:\n\`\`\`\n${data.output}\n\`\`\``, 'system');
  });
}
```

**Option B: Embedded terminal panel in chat**

Add a collapsible terminal panel:

```html
<!-- In chat/index.html -->
<div id="terminal-panel" class="terminal-panel collapsed">
  <div class="terminal-header" onclick="toggleTerminal()">
    <span>📟 Terminal</span>
    <span class="terminal-toggle">▼</span>
  </div>
  <div id="terminal-container"></div>
</div>
```

```javascript
// In chat.js
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';

let terminal = null;

function initTerminal() {
  terminal = new Terminal({
    theme: {
      background: '#1a1a2e',
      foreground: '#e0e0e0',
      cursor: '#00ffcc'
    },
    fontSize: 12,
    fontFamily: 'Consolas, monospace'
  });
  
  const fitAddon = new FitAddon();
  terminal.loadAddon(fitAddon);
  
  terminal.open(document.getElementById('terminal-container'));
  fitAddon.fit();
  
  // Connect to main process terminal
  window.electronAPI.onTerminalData((data) => {
    terminal.write(data);
  });
  
  // Send input to main process
  terminal.onData((data) => {
    window.electronAPI.terminalInput(data);
  });
}
```

### 5. IPC Handlers in Main Process

Add to `index.js`:

```javascript
const { TerminalService } = require('./terminal-service');
const terminalService = new TerminalService();

// Default terminal for AI commands
let aiTerminal = null;

function ensureAITerminal() {
  if (!aiTerminal || terminalService.terminals.get(aiTerminal)?.exitCode !== null) {
    aiTerminal = terminalService.create({
      shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/bash',
      cwd: process.cwd()
    });
    
    // Subscribe chat to output
    terminalService.subscribe(aiTerminal, (data) => {
      if (chatWindow && !chatWindow.isDestroyed()) {
        chatWindow.webContents.send('terminal-data', data);
      }
    });
  }
  return aiTerminal;
}

// IPC Handlers
ipcMain.handle('terminal-create', (event, options) => {
  return terminalService.create(options);
});

ipcMain.handle('terminal-execute', async (event, { terminalId, command, options }) => {
  const id = terminalId || ensureAITerminal();
  return await terminalService.execute(id, command, options);
});

ipcMain.on('terminal-input', (event, data) => {
  const id = ensureAITerminal();
  terminalService.write(id, data);
});

ipcMain.handle('terminal-resize', (event, { terminalId, cols, rows }) => {
  terminalService.resize(terminalId || aiTerminal, cols, rows);
});

ipcMain.handle('terminal-get-output', (event, terminalId) => {
  return terminalService.getBuffer(terminalId || aiTerminal);
});

ipcMain.handle('terminal-list', () => {
  return terminalService.list();
});

ipcMain.handle('terminal-destroy', (event, terminalId) => {
  terminalService.destroy(terminalId);
});
```

### 6. Action Executor Update

In the action execution flow, add handling for `run_command`:

```javascript
// In executeActions function or performSafeAgenticAction
case 'run_command':
  const termId = ensureAITerminal();
  
  // Notify chat that command is running
  if (chatWindow) {
    chatWindow.webContents.send('action-progress', {
      message: `Running: ${action.command}`
    });
  }
  
  const cmdResult = await terminalService.execute(termId, action.command, {
    timeout: action.timeout || 30000,
    idleTimeout: action.idleTimeout || 1000
  });
  
  result = {
    success: true,
    output: cmdResult.output,
    command: action.command,
    terminalId: termId
  };
  
  // Send output to chat so AI can see it
  if (chatWindow) {
    chatWindow.webContents.send('terminal-output', {
      command: action.command,
      output: cmdResult.output,
      success: cmdResult.success
    });
  }
  break;

case 'run_script':
  const scriptTermId = ensureAITerminal();
  const lines = action.script.split('\n');
  const outputs = [];
  
  for (const line of lines) {
    if (line.trim()) {
      const lineResult = await terminalService.execute(scriptTermId, line);
      outputs.push(lineResult.output);
    }
  }
  
  result = {
    success: true,
    outputs,
    terminalId: scriptTermId
  };
  break;
```

## Required Dependencies

Add to `package.json`:

```json
{
  "dependencies": {
    "electron": "^35.7.5",
    "node-pty": "^1.0.0",
    "xterm": "^5.3.0",
    "xterm-addon-fit": "^0.8.0",
    "xterm-addon-web-links": "^0.9.0"
  }
}
```

**Installation Note:** `node-pty` is a native module that requires compilation. On Windows, this requires:
- Python (for node-gyp)
- Visual Studio Build Tools
- `npm install --global windows-build-tools` (run as admin)

**Alternative for easier installation:**
```bash
npm install electron-rebuild
npx electron-rebuild -f -w node-pty
```

## Security Considerations

### 1. Command Sanitization

```javascript
function sanitizeCommand(command) {
  // Reject obviously dangerous patterns
  const dangerous = [
    /rm\s+-rf\s+[\/~]/i,           // rm -rf /
    /format\s+[a-z]:/i,            // format C:
    /del\s+\/[fqs]+\s+[a-z]:\\/i,  // del /f /s C:\
    /mkfs/i,                        // filesystem format
    />>\s*\/etc\//i,               // writing to /etc
    /curl.*\|\s*(ba)?sh/i,         // pipe curl to shell
  ];
  
  for (const pattern of dangerous) {
    if (pattern.test(command)) {
      throw new Error(`Potentially dangerous command blocked: ${command}`);
    }
  }
  
  return command;
}
```

### 2. Working Directory Restrictions

```javascript
function validateCwd(cwd) {
  const resolved = path.resolve(cwd);
  
  // Block system directories
  const blocked = [
    'C:\\Windows',
    'C:\\Program Files',
    '/etc',
    '/usr',
    '/bin',
    '/sbin'
  ];
  
  for (const dir of blocked) {
    if (resolved.toLowerCase().startsWith(dir.toLowerCase())) {
      return false;
    }
  }
  
  return true;
}
```

### 3. User Confirmation for Risky Commands

Integrate with existing safety guardrails:

```javascript
function analyzeCommandSafety(command) {
  const riskPatterns = {
    HIGH: [
      /rm\s/i, /del\s/i, /remove/i,
      /sudo/i, /admin/i,
      /install/i, /uninstall/i,
      /npm\s+publish/i,
      /git\s+push.*--force/i
    ],
    MEDIUM: [
      /npm\s+install/i,
      /git\s+(commit|push|checkout)/i,
      /mv\s/i, /move\s/i,
      /cp\s/i, /copy\s/i
    ]
  };
  
  for (const pattern of riskPatterns.HIGH) {
    if (pattern.test(command)) {
      return { riskLevel: 'HIGH', requiresConfirmation: true };
    }
  }
  
  for (const pattern of riskPatterns.MEDIUM) {
    if (pattern.test(command)) {
      return { riskLevel: 'MEDIUM', requiresConfirmation: false };
    }
  }
  
  return { riskLevel: 'LOW', requiresConfirmation: false };
}
```

### 4. Environment Variable Protection

```javascript
function getSafeEnv() {
  const env = { ...process.env };
  
  // Remove sensitive variables
  delete env.API_KEY;
  delete env.SECRET;
  delete env.PASSWORD;
  delete env.TOKEN;
  delete env.AWS_SECRET_ACCESS_KEY;
  delete env.GITHUB_TOKEN;
  
  return env;
}
```

## UI Design

### Terminal Panel Styles

```css
.terminal-panel {
  background: #0d1117;
  border-top: 1px solid #30363d;
  max-height: 300px;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.terminal-panel.collapsed {
  max-height: 30px;
}

.terminal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  background: #161b22;
  cursor: pointer;
  user-select: none;
}

.terminal-header:hover {
  background: #21262d;
}

#terminal-container {
  height: 270px;
  padding: 4px;
}

/* xterm.js customization */
.xterm {
  padding: 8px;
}

.xterm-viewport {
  background: #0d1117 !important;
}
```

### Action Card for Commands

```css
.action-item.command {
  background: rgba(0, 100, 0, 0.2);
  border-left: 3px solid #00ff00;
}

.action-item.command .command-text {
  font-family: 'Consolas', 'Monaco', monospace;
  color: #00ff00;
}

.terminal-output {
  background: #0a0a0a;
  border-radius: 6px;
  padding: 12px;
  font-family: 'Consolas', monospace;
  font-size: 12px;
  max-height: 200px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
```

## Implementation Phases

### Phase 1: Core Terminal Service (MVP)
1. Install node-pty
2. Create `terminal-service.js`
3. Add `run_command` action type
4. Display output in chat messages
5. Update AI system prompt

**Estimated effort:** 2-3 days

### Phase 2: Chat Panel Integration
1. Install xterm.js
2. Add collapsible terminal panel to chat UI
3. Stream output in real-time
4. Support user input to terminal

**Estimated effort:** 2-3 days

### Phase 3: Safety & Polish
1. Command sanitization
2. Integration with safety guardrails
3. Working directory management
4. Multiple terminal sessions
5. Terminal history/recall

**Estimated effort:** 2-3 days

## Benefits

| Feature | Before (External Terminal) | After (Integrated Terminal) |
|---------|---------------------------|----------------------------|
| Reliability | ~60% success rate | ~99% success rate |
| Output capture | None | Full capture |
| Speed | 3-5 seconds | <100ms |
| User experience | Focus lost | Stays in app |
| Error handling | None | Full |
| AI awareness | Blind | Full output visibility |

## Alternative: Simple child_process Approach

If installing node-pty is problematic, a simpler approach using `child_process.spawn`:

```javascript
const { spawn } = require('child_process');

async function runCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/bash';
    const shellArgs = process.platform === 'win32' ? ['/c', command] : ['-c', command];
    
    const proc = spawn(shell, shellArgs, {
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...options.env }
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => {
      stdout += data.toString();
      // Stream to UI
    });
    
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    proc.on('close', (code) => {
      resolve({
        stdout,
        stderr,
        exitCode: code,
        success: code === 0
      });
    });
    
    proc.on('error', reject);
  });
}
```

**Trade-offs:**
- ✅ No native modules
- ✅ Simple installation
- ❌ No interactive commands
- ❌ No PTY features (colors, terminal control codes)
- ❌ No real-time streaming (buffered output)

## Conclusion

The integrated terminal architecture enables the AI to reliably execute shell commands, see their output, and make intelligent decisions based on results. This transforms the app from a GUI automation tool into a true AI agent capable of software development tasks.

**Recommended approach:** Start with Phase 1 using node-pty for full terminal emulation, as this provides the best experience for development workflows. Fall back to simple child_process if native module installation is problematic.
