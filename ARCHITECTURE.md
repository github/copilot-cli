# Architecture Documentation

## Overview

This application implements an Electron-based headless agent system with an ultra-thin overlay architecture. The design prioritizes minimal resource usage, non-intrusive UI, and extensible agent integration.

## Design Principles

1. **Minimal Footprint**: Single main process, lightweight renderers, no heavy frameworks
2. **Non-Intrusive**: Transparent overlay, edge-docked chat, never blocks user workspace
3. **Performance-First**: Click-through by default, minimal background processing
4. **Secure**: Context isolation, no Node integration in renderers, CSP headers
5. **Extensible**: Clean IPC message schema ready for agent integration

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Main Process                            │
│  ┌────────────┐  ┌──────────┐  ┌────────────┐  ┌─────────────┐ │
│  │  Overlay   │  │   Chat   │  │    Tray    │  │   Global    │ │
│  │  Manager   │  │  Manager │  │   Icon     │  │  Hotkeys    │ │
│  └─────┬──────┘  └────┬─────┘  └─────┬──────┘  └──────┬──────┘ │
│        │              │              │                │         │
│  ┌─────┴──────────────┴──────────────┴────────────────┴──────┐  │
│  │                    IPC Router                             │  │
│  └─────┬────────────────────────────────────────────┬────────┘  │
└────────┼────────────────────────────────────────────┼───────────┘
         │                                            │
    ┌────┴────────┐                          ┌───────┴────────┐
    │   Overlay   │                          │      Chat      │
    │  Renderer   │                          │    Renderer    │
    │             │                          │                │
    │ ┌─────────┐ │                          │ ┌────────────┐ │
    │ │  Dots   │ │                          │ │   History  │ │
    │ │  Grid   │ │                          │ │            │ │
    │ └─────────┘ │                          │ └────────────┘ │
    │ ┌─────────┐ │                          │ ┌────────────┐ │
    │ │  Mode   │ │                          │ │   Input    │ │
    │ │Indicator│ │                          │ │            │ │
    │ └─────────┘ │                          │ └────────────┘ │
    └─────────────┘                          │ ┌────────────┐ │
                                             │ │  Controls  │ │
                                             │ └────────────┘ │
                                             └────────────────┘
```

## Component Details

### Main Process (`src/main/index.js`)

**Responsibilities:**
- Window lifecycle management
- IPC message routing
- Global state management
- System integration (tray, hotkeys)

**Key Functions:**
- `createOverlayWindow()`: Creates transparent, always-on-top overlay
- `createChatWindow()`: Creates edge-docked chat interface
- `createTray()`: Sets up system tray icon and menu
- `registerShortcuts()`: Registers global hotkeys
- `setupIPC()`: Configures IPC message handlers
- `setOverlayMode()`: Switches between passive/selection modes
- `toggleChat()`: Shows/hides chat window
- `toggleOverlay()`: Shows/hides overlay

**State:**
```javascript
{
  overlayMode: 'passive' | 'selection',
  isChatVisible: boolean,
  overlayWindow: BrowserWindow,
  chatWindow: BrowserWindow,
  tray: Tray
}
```

### Overlay Renderer (`src/renderer/overlay/`)

**Responsibilities:**
- Render dot grid
- Handle dot interactions
- Display mode indicator
- Communicate selections to main process

**Files:**
- `index.html`: UI structure and styles
- `preload.js`: Secure IPC bridge

**State:**
```javascript
{
  currentMode: 'passive' | 'selection',
  gridType: 'coarse' | 'fine',
  dots: Array<{id, x, y, label}>
}
```

**Key Functions:**
- `generateCoarseGrid()`: Creates 100px spacing grid
- `generateFineGrid()`: Creates 50px spacing grid
- `renderDots()`: Renders interactive dots
- `selectDot()`: Handles dot click events
- `updateModeDisplay()`: Updates UI based on mode

### Chat Renderer (`src/renderer/chat/`)

**Responsibilities:**
- Display chat history
- Handle user input
- Show mode controls
- Receive agent responses

**Files:**
- `index.html`: UI structure and styles
- `preload.js`: Secure IPC bridge

**State:**
```javascript
{
  currentMode: 'passive' | 'selection',
  messages: Array<{text, type, timestamp}>
}
```

**Key Functions:**
- `addMessage()`: Adds message to history
- `sendMessage()`: Sends user message to main
- `setMode()`: Changes overlay mode
- `updateModeDisplay()`: Updates mode button states

## IPC Message Schema

### Message Types

#### overlay → main → chat: dot-selected
```javascript
{
  id: string,        // e.g., 'dot-100-200'
  x: number,         // Screen X coordinate
  y: number,         // Screen Y coordinate
  label: string,     // e.g., 'A2'
  timestamp: number  // Unix timestamp in ms
}
```

#### chat → main → overlay: set-mode
```javascript
'passive' | 'selection'
```

#### chat → main: chat-message
```javascript
string  // User message text
```

#### main → chat: agent-response
```javascript
{
  text: string,      // Response text
  timestamp: number  // Unix timestamp in ms
}
```

#### main → overlay: mode-changed
```javascript
'passive' | 'selection'
```

#### renderer → main: get-state (invoke/handle)
```javascript
// Response:
{
  overlayMode: 'passive' | 'selection',
  isChatVisible: boolean
}
```

## Window Configuration

### Overlay Window

```javascript
{
  // Frameless and transparent
  frame: false,
  transparent: true,
  
  // Always on top
  alwaysOnTop: true,
  level: 'screen-saver', // macOS only
  
  // Full screen
  fullscreen: true,
  
  // Non-interactive by default
  focusable: false,
  skipTaskbar: true,
  
  // Security
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    preload: 'overlay/preload.js'
  }
}
```

### Chat Window

```javascript
{
  // Standard window with frame
  frame: true,
  transparent: false,
  
  // Positioned at bottom-right
  x: width - chatWidth - margin,
  y: height - chatHeight - margin,
  
  // Resizable but not always on top
  resizable: true,
  alwaysOnTop: false,
  
  // Hidden by default
  show: false,
  
  // Security
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    preload: 'chat/preload.js'
  }
}
```

## Mode System

### Passive Mode
- **Purpose**: Allow normal application interaction
- **Behavior**: 
  - Overlay fully click-through via `setIgnoreMouseEvents(true)`
  - No dots rendered
  - Mode indicator hidden
  - CPU usage minimal (no event processing)
  
### Selection Mode
- **Purpose**: Enable screen element selection
- **Behavior**:
  - Overlay captures mouse events via `setIgnoreMouseEvents(false)`
  - Dots rendered with CSS `pointer-events: auto`
  - Mode indicator visible
  - Click events captured and routed via IPC
  - Automatically reverts to passive after selection

## Security Architecture

### Context Isolation
All renderer processes use context isolation to prevent prototype pollution attacks.

### Preload Scripts
Secure bridge between main and renderer processes:
```javascript
contextBridge.exposeInMainWorld('electronAPI', {
  // Only expose necessary methods
  selectDot: (data) => ipcRenderer.send('dot-selected', data),
  onModeChanged: (cb) => ipcRenderer.on('mode-changed', cb)
});
```

### Content Security Policy
All HTML files include CSP headers:
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; style-src 'self' 'unsafe-inline';">
```

### No Remote Content
All resources loaded locally, no CDN or external dependencies.

## Performance Characteristics

### Memory Usage
- **Target**: < 300MB steady-state
- **Baseline**: ~150MB for Electron + Chromium
- **Overlay**: ~20-30MB (minimal DOM, vanilla JS)
- **Chat**: ~30-40MB (simple UI, limited history)

### CPU Usage
- **Idle (passive mode)**: < 0.5%
- **Selection mode**: < 2%
- **During interaction**: < 5%

### Startup Time
- **Target**: < 3 seconds to functional
- **Breakdown**:
  - Electron init: ~1s
  - Window creation: ~1s
  - Renderer load: ~0.5s

## Extensibility Points

### Agent Integration
Replace stub in `src/main/index.js`:
```javascript
ipcMain.on('chat-message', async (event, message) => {
  // Call external agent API or worker process
  const response = await agent.process(message);
  chatWindow.webContents.send('agent-response', response);
});
```

### Custom Grid Patterns
Add to overlay renderer:
```javascript
function generateCustomGrid(pattern) {
  // Implement custom dot placement logic
}
```

### Additional Windows
Follow pattern:
```javascript
function createSettingsWindow() {
  settingsWindow = new BrowserWindow({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });
}
```

### Plugin System (Future)
```javascript
// Example plugin interface
const plugin = {
  name: 'screen-capture',
  init: (mainProcess) => {
    // Register IPC handlers
    ipcMain.on('capture-screen', plugin.captureScreen);
  }
};
```

## Platform Differences

### macOS
- Window level: `'screen-saver'` to float above fullscreen
- Dock: Hidden via `app.dock.hide()`
- Tray: NSStatusBar with popover behavior
- Permissions: Requires accessibility + screen recording

### Windows
- Window level: Standard `alwaysOnTop`
- Taskbar: Overlay hidden via `skipTaskbar`
- Tray: System tray with balloon tooltips
- Permissions: No special permissions required

## Troubleshooting

### Overlay Not Appearing
1. Check window level setting
2. Verify `alwaysOnTop` is true
3. Test with `overlayWindow.show()`
4. Check GPU acceleration settings

### Click-Through Not Working
1. Verify `setIgnoreMouseEvents(true, {forward: true})`
2. Check CSS `pointer-events` on elements
3. Test in different applications
4. Check for conflicting event handlers

### Chat Not Showing
1. Verify `chatWindow.show()` is called
2. Check window position (may be off-screen)
3. Verify not hidden behind other windows
4. Check `skipTaskbar` setting

### IPC Messages Not Received
1. Verify preload script loaded
2. Check `contextBridge` exposure
3. Enable IPC logging in DevTools
4. Verify correct channel names

## Best Practices

### DO
- Use context isolation
- Disable node integration in renderers
- Minimize renderer dependencies
- Implement proper cleanup on window close
- Use debouncing for frequent events
- Test on both platforms

### DON'T
- Enable node integration in production
- Load remote content without validation
- Create/destroy windows repeatedly
- Poll continuously in background
- Ignore security warnings
- Assume platform consistency

## References

- [Electron Documentation](https://electronjs.org/docs)
- [Electron Security Guide](https://electronjs.org/docs/tutorial/security)
- [IPC Communication](https://electronjs.org/docs/api/ipc-main)
- [BrowserWindow API](https://electronjs.org/docs/api/browser-window)
