# Configuration Examples

## Window Configuration

### Overlay Window Settings

You can customize the overlay window behavior in `src/main/index.js`:

```javascript
// Adjust window level for macOS
overlayWindow.setAlwaysOnTop(true, 'screen-saver'); // Options: 'normal', 'floating', 'torn-off-menu', 'modal-panel', 'main-menu', 'status', 'pop-up-menu', 'screen-saver'

// Adjust dot grid spacing
const spacing = 100; // Change to 50 for finer grid, 200 for coarser
```

### Chat Window Position

Modify chat window position in `src/main/index.js`:

```javascript
// Bottom-right (default)
const chatWidth = 350;
const chatHeight = 500;
const margin = 20;
x: width - chatWidth - margin,
y: height - chatHeight - margin,

// Top-right
x: width - chatWidth - margin,
y: margin,

// Bottom-left
x: margin,
y: height - chatHeight - margin,

// Center
x: (width - chatWidth) / 2,
y: (height - chatHeight) / 2,
```

## Hotkey Configuration

Global hotkeys can be customized in `src/main/index.js`:

```javascript
// Toggle chat window
globalShortcut.register('CommandOrControl+Alt+Space', () => {
  toggleChat();
});

// Toggle overlay
globalShortcut.register('CommandOrControl+Shift+O', () => {
  toggleOverlay();
});

// Alternative hotkeys:
// 'CommandOrControl+Shift+A' - Command/Ctrl + Shift + A
// 'Alt+Space' - Alt + Space
// 'F12' - F12 key
```

## IPC Message Schema

### Overlay → Main → Chat

**Dot Selection:**
```javascript
{
  id: 'dot-100-200',      // Unique dot identifier
  x: 100,                 // Screen X coordinate
  y: 200,                 // Screen Y coordinate
  label: 'A2',            // Human-readable label
  timestamp: 1641234567890 // Unix timestamp
}
```

### Chat → Main → Overlay

**Mode Change:**
```javascript
'passive'  // Click-through mode
'selection' // Interactive mode
```

**Chat Message:**
```javascript
{
  text: 'Click the save button',
  timestamp: 1641234567890
}
```

### Main → Chat

**Agent Response:**
```javascript
{
  text: 'I found 3 buttons that might be "save"',
  timestamp: 1641234567890
}
```

## Styling Customization

### Overlay Dots

Edit `src/renderer/overlay/index.html`:

```css
.dot {
  width: 8px;        /* Dot size */
  height: 8px;
  background: rgba(0, 122, 255, 0.7);  /* Dot color */
  border: 1px solid rgba(255, 255, 255, 0.8); /* Border */
}

.dot:hover {
  width: 12px;       /* Hover size */
  height: 12px;
}
```

### Chat Window Theme

Edit `src/renderer/chat/index.html`:

```css
body {
  background: #1e1e1e;  /* Dark theme background */
  color: #d4d4d4;       /* Text color */
}

/* Light theme alternative:
body {
  background: #ffffff;
  color: #1e1e1e;
}
*/
```

## Performance Tuning

### Memory Optimization

```javascript
// Adjust dot density based on screen size
const screenArea = window.innerWidth * window.innerHeight;
const spacing = screenArea > 3000000 ? 150 : 100; // Larger spacing for large screens

// Lazy rendering - only render visible dots
function generateVisibleDots(viewportX, viewportY, viewportW, viewportH) {
  // Implementation for viewport-based rendering
}
```

### Disable DevTools in Production

In `src/main/index.js`:

```javascript
// Add to BrowserWindow options
webPreferences: {
  devTools: process.env.NODE_ENV !== 'production'
}
```

## Agent Integration

### Connecting to External Agent

Replace the echo stub in `src/main/index.js`:

```javascript
const axios = require('axios'); // npm install axios

ipcMain.on('chat-message', async (event, message) => {
  try {
    // Call external agent API
    const response = await axios.post('http://localhost:8080/agent', {
      message,
      context: {
        mode: overlayMode,
        timestamp: Date.now()
      }
    });
    
    // Forward response to chat
    if (chatWindow) {
      chatWindow.webContents.send('agent-response', {
        text: response.data.text,
        timestamp: Date.now()
      });
    }
  } catch (error) {
    console.error('Agent error:', error);
    chatWindow.webContents.send('agent-response', {
      text: 'Agent unavailable',
      timestamp: Date.now()
    });
  }
});
```

### Using Worker Process

```javascript
const { fork } = require('child_process');

// In main process
const agentWorker = fork(path.join(__dirname, 'agent-worker.js'));

agentWorker.on('message', (response) => {
  if (chatWindow) {
    chatWindow.webContents.send('agent-response', response);
  }
});

ipcMain.on('chat-message', (event, message) => {
  agentWorker.send({ type: 'message', data: message });
});
```

## Platform-Specific Tweaks

### macOS

```javascript
// Enable better fullscreen behavior
if (process.platform === 'darwin') {
  app.dock.hide(); // Hide from dock
  
  // Enable accessibility permissions check
  const { systemPreferences } = require('electron');
  if (!systemPreferences.isTrustedAccessibilityClient(false)) {
    console.log('Requesting accessibility permissions');
    systemPreferences.isTrustedAccessibilityClient(true);
  }
}
```

### Windows

```javascript
// Enable Windows-specific features
if (process.platform === 'win32') {
  // Set app user model ID for notifications
  app.setAppUserModelId('com.github.copilot.agent');
  
  // Configure window to stay above taskbar
  overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1);
}
```

## Security Best Practices

### Content Security Policy

The application already uses CSP headers. To customize:

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self'; 
               style-src 'self' 'unsafe-inline';
               img-src 'self' data:;">
```

### Secure IPC

All IPC communication uses context isolation and preload scripts. Never:
- Enable `nodeIntegration: true` in production
- Disable `contextIsolation`
- Load remote content without validation

## Development vs Production

### Development Mode

```bash
# Enable DevTools and verbose logging
NODE_ENV=development npm start
```

### Production Build

```bash
# Disable DevTools, enable optimizations
NODE_ENV=production npm start
```

Add to package.json:

```json
{
  "scripts": {
    "start:dev": "NODE_ENV=development electron .",
    "start:prod": "NODE_ENV=production electron .",
    "package": "electron-builder"
  }
}
```
