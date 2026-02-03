// Ensure Electron runs in app mode even if a dev shell has ELECTRON_RUN_AS_NODE set
if (process.env.ELECTRON_RUN_AS_NODE) {
  console.warn('ELECTRON_RUN_AS_NODE was set; clearing so the app can start normally.');
  delete process.env.ELECTRON_RUN_AS_NODE;
}

const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  globalShortcut,
  ipcMain,
  screen,
  nativeImage,
  desktopCapturer
} = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// AI Service for handling chat responses
const aiService = require('./ai-service.js');

// Visual awareness for advanced screen analysis
const visualAwareness = require('./visual-awareness.js');

// Live UI Watcher for continuous UI monitoring
const { UIWatcher } = require('./ui-watcher.js');

// Multi-agent system for advanced AI orchestration
const { createAgentSystem } = require('./agents/index.js');

// Inspect service for overlay region detection and targeting
const inspectService = require('./inspect-service.js');


// Ensure caches land in a writable location to avoid Windows permission issues
const cacheRoot = path.join(os.tmpdir(), 'copilot-liku-electron-cache');
const mediaCache = path.join(cacheRoot, 'media');
const userDataPath = path.join(cacheRoot, 'user-data');

try {
  fs.mkdirSync(cacheRoot, { recursive: true });
  fs.mkdirSync(mediaCache, { recursive: true });
  fs.mkdirSync(userDataPath, { recursive: true });

  // Force Electron to use temp-backed storage to avoid permission issues on locked-down drives
  app.setPath('userData', userDataPath);
  app.setPath('cache', cacheRoot);

  app.commandLine.appendSwitch('disk-cache-dir', cacheRoot);
  app.commandLine.appendSwitch('media-cache-dir', mediaCache);
  app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
} catch (error) {
  console.warn('Unable to create cache directories; continuing with defaults.', error);
}

// Keep references to windows to prevent garbage collection
let overlayWindow = null;
let chatWindow = null;
let tray = null;

// Live UI watcher instance
let uiWatcher = null;

// State management
let overlayMode = 'selection'; // start in selection so the grid is visible immediately
let isChatVisible = false;

/**
 * Create the transparent overlay window that floats above all other windows
 */
function createOverlayWindow() {
  const { width, height } = screen.getPrimaryDisplay().bounds;
  
  overlayWindow = new BrowserWindow({
    width,
    height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    focusable: true,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../renderer/overlay/preload.js')
    }
  });

  // Set highest level for macOS to float above fullscreen apps
  if (process.platform === 'darwin') {
    overlayWindow.setAlwaysOnTop(true, 'screen-saver');
    overlayWindow.setFullScreen(true);
  } else {
    // On Windows: Use maximize instead of fullscreen to avoid interfering with other windows
    overlayWindow.setAlwaysOnTop(true, 'screen-saver');
    overlayWindow.maximize();
    overlayWindow.setPosition(0, 0);
  }

  // Start in click-through mode
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });

  overlayWindow.loadFile(path.join(__dirname, '../renderer/overlay/index.html'));

  // Once the overlay loads, ensure it is visible and interactive
  overlayWindow.webContents.on('did-finish-load', () => {
    overlayWindow.show();
    setOverlayMode('selection');
  });

  // Pipe renderer console to main for debugging without DevTools
  overlayWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const levelNames = ['verbose', 'info', 'warn', 'error'];
    const levelStr = levelNames[level] || `level-${level}`;
    const lineStr = line !== undefined ? `:${line}` : '';
    const source = sourceId ? sourceId.split('/').pop() : 'overlay';
    console.log(`[overlay console] (${levelStr}) ${source}${lineStr} - ${message}`);
  });

  // Prevent overlay from appearing in Dock/Taskbar
  if (process.platform === 'darwin') {
    app.dock.hide();
  }

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });
}

// Chat window position preferences (persisted)
let chatBoundsPrefs = null;

function loadChatBoundsPrefs() {
  try {
    const prefsPath = path.join(userDataPath, 'chat-bounds.json');
    if (fs.existsSync(prefsPath)) {
      chatBoundsPrefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
      console.log('Loaded chat bounds preferences:', chatBoundsPrefs);
    }
  } catch (e) {
    console.warn('Could not load chat bounds preferences:', e);
  }
}

function saveChatBoundsPrefs(bounds) {
  try {
    const prefsPath = path.join(userDataPath, 'chat-bounds.json');
    fs.writeFileSync(prefsPath, JSON.stringify(bounds));
    chatBoundsPrefs = bounds;
  } catch (e) {
    console.warn('Could not save chat bounds preferences:', e);
  }
}

/**
 * Create the chat window positioned at screen edge (bottom-right)
 * FRESH APPROACH: Create window with absolute minimal config, position AFTER creation
 */
function createChatWindow() {
  // Destroy existing window if any
  if (chatWindow) {
    chatWindow.destroy();
    chatWindow = null;
  }

  const display = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = display.workAreaSize;
  
  // HARDCODED small window - bottom right
  const W = 380;
  const H = 500;
  const X = screenWidth - W - 20;
  const Y = screenHeight - H - 20;

  console.log(`[CHAT] Creating at ${X},${Y} size ${W}x${H}`);

  chatWindow = new BrowserWindow({
    width: W,
    height: H,
    x: X,
    y: Y,
    minWidth: 300,
    minHeight: 400,
    maxWidth: 600,
    maxHeight: 800,
    frame: false,
    transparent: false,
    resizable: true,
    minimizable: true,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: false,
    skipTaskbar: false,
    show: false,
    backgroundColor: '#1e1e1e',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../renderer/chat/preload.js')
    }
  });

  // Immediately set bounds again
  chatWindow.setBounds({ x: X, y: Y, width: W, height: H });

  chatWindow.loadFile(path.join(__dirname, '../renderer/chat/index.html'));

  const persistBounds = () => {
    if (!chatWindow) return;
    saveChatBoundsPrefs(chatWindow.getBounds());
  };

  chatWindow.webContents.on('did-finish-load', () => {
    // Force bounds one more time after load
    chatWindow.setBounds({ x: X, y: Y, width: W, height: H });
    console.log(`[CHAT] Loaded. Bounds: ${JSON.stringify(chatWindow.getBounds())}`);
  });

  chatWindow.on('resize', persistBounds);
  chatWindow.on('move', persistBounds);

  chatWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      chatWindow.hide();
      isChatVisible = false;
    }
  });

  chatWindow.on('closed', () => {
    chatWindow = null;
  });
}

/**
 * Toggle chat - recreate window fresh each time to avoid fullscreen bug
 */
function toggleChat() {
  if (chatWindow && chatWindow.isVisible()) {
    chatWindow.hide();
    isChatVisible = false;
    return;
  }

  // RECREATE window fresh each time
  createChatWindow();
  
  // Show after a brief delay to ensure bounds are set
  setTimeout(() => {
    if (chatWindow) {
      const display = screen.getPrimaryDisplay();
      const { width: screenWidth, height: screenHeight } = display.workAreaSize;
      const W = 380, H = 500;
      const X = screenWidth - W - 20;
      const Y = screenHeight - H - 20;
      
      // AGGRESSIVE: Multiple setters to override any system defaults
      chatWindow.unmaximize();
      chatWindow.setFullScreen(false);
      chatWindow.setSize(W, H);
      chatWindow.setPosition(X, Y);
      chatWindow.setBounds({ x: X, y: Y, width: W, height: H });
      
      chatWindow.show();
      chatWindow.focus();
      
      // AFTER show: force bounds again 
      chatWindow.setSize(W, H);
      chatWindow.setPosition(X, Y);
      
      isChatVisible = true;
      console.log(`[CHAT] Shown. Final bounds: ${JSON.stringify(chatWindow.getBounds())}`);
      
      // Validate bounds after 200ms and correct if needed
      setTimeout(() => {
        if (chatWindow) {
          const bounds = chatWindow.getBounds();
          if (bounds.width !== W || bounds.height !== H) {
            console.log(`[CHAT] CORRECTING: Bounds were ${JSON.stringify(bounds)}, forcing to ${W}x${H}@${X},${Y}`);
            chatWindow.setSize(W, H);
            chatWindow.setPosition(X, Y);
          }
        }
      }, 200);
    }
  }, 100);
}

/**
 * Create system tray icon with menu
 */
function loadTrayIcon() {
  const candidates = [
    path.join(__dirname, '../assets/tray-icon.png'),
    path.join(app.getAppPath(), 'src/assets/tray-icon.png'),
    path.join(process.resourcesPath, 'assets', 'tray-icon.png'),
    path.join(process.resourcesPath, 'tray-icon.png')
  ];

  for (const candidate of candidates) {
    try {
      if (!fs.existsSync(candidate)) {
        continue;
      }

      const image = nativeImage.createFromPath(candidate);

      if (!image.isEmpty()) {
        return { image, source: candidate };
      }

      console.warn(`Tray icon candidate was empty: ${candidate}`);
    } catch (error) {
      console.warn(`Tray icon candidate failed (${candidate}):`, error);
    }
  }

  const fallbackBase64 = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAASbSURBVFhHxZf7U1R1FMDv34E8hGW5LBcMAiQiQkMgogVqYW1FA1EDRF6Rg5oMp0hn0CYQB4KBFAlGGoQZgtmaxmqRQWCkSIpVA7aUjZeJkI8RrTnN+a57Y5e7j/xlzy935nvvPZ/z/n6/nCDEbAkK2gpBz8WCEJIAQkgiCKFKEEJTQAhXgRCeDkKEBhSRGaCIzARF1G5QRO0DRXQO8NH5wMcUAB9TAvzWUuBjy4CPPQx8XDnwcRUgT6gEecIxkCdWgTzpJMiTqkGmPAUyZR3IUhpBltIEHIMHb8PAkAQMfP41DAxVYmBYKgrhKhQ2q1GI0GBA5E4MeDETFVHZqHhpHyqic9H/5Xz0jylE/y0l6P/Ke8jHliG/7QjyceXIxwP6JVSi36vH0S+xCuVJH6P89Wr0Vdaib3Id+qY0oiy1GWVvnEWOPHcVXPZmK3IUdlfBZWntZEAiuAruk96BHBWcq+A+6k4ygFW7S+A+27uRY632jPDUvAbcebAV1cXnngnu81YPGcD63Gn43sMtOPKTAaVk7PosftR0yWm4t6YPORoyzsA3Jb6PLV2DFkDj/DKOXL2J0zN3LNb7f7iFL2S1O4R77/gKOZpwzsD1U7MioLFjEMNUn1iEXVDVYXm9Dlfur7Jv6Blf0GMX7p3xDRlA49U2nMJ+vneEKTXO30V10Rm7BUeeD/88x74fu3EbFTs6bcI37voWOTbb7cDzK9qYskerT9bBkwvbMONIFyqLvrDIecD2dpxZvM/+O9U5YRO+8W0dGUAbizScql0/ZfLm9Of9IjxUfRr7R397mhCTjN1YwPgD3WLONfCdyfDHf6NiV68k3CtzADna1WzBNyV9IAKCkk+Ing+Pz6xB/ydTxmUM0HSIOZ/64y+2nnTokiTcK+sycrSlSsGpz9VFzUyBfnpehKeXdlhhLSXnxICY895BI1s7+tkvknCv3SPI0X4uBacJV1GrZQr6dHqx4MrrTaG1JWtzXnX+GltruzgjCffMHiUDSkAKTuN1z1GTt2PXZsVqz4ZeK6SlHKwfFQuu7eIttvZh26+ScM89Y8g9Pcmsg1PBhaXVMAXUAeZWE9KbcWbhnhXWJFRwEblfiwU38bupBjJPjkvCPfeOI8eOURJwc86NCytMSd5xrdhqqrI+XLz7cB28sHZUhG/er8NHj/9h74LyhiThnu9MkAHsDCcJp7A3dI4yJYtLDzAko1UcryGZnVjZ8iPLeeW5cQvPqeB0V/9k/+nGl2zCPXKuI8cOkDbgFHYhrQH1BpOy3gGDw9lOcMo5ycqDJxhWdMUm3CN3kgyoAFtw83iNz7/AQkxC4zWuWCsJp7CbPScpbZ60C/fIMyBHR2d7cPN4VR3SiuOVZHjiNp7RTrNW+7RnGof0S2LOyXNn4B77b5IBx8AR3Bz24KwuvPC95Qi2Fsq5o7Cb4e75RuRMlwbH8LU5D87WoqZyCGu6JvHLy3NY021grRZVesVuwVnD3Q/MIcduLP8Dbl1wtiacM3D3gkUyoBpcBd9QdAc5uqu5Cr6heJkMqANXwd1K7iHHbqkugru9+5AMaAJXwd1KV/Ff/Hw4CMaLXiMAAAAASUVORK5CYII=';
  const fallbackImage = nativeImage.createFromDataURL(`data:image/png;base64,${fallbackBase64}`);

  return { image: fallbackImage, source: 'embedded-fallback' };
}

function createTray() {
  const { image: trayIcon, source } = loadTrayIcon();

  try {
    tray = new Tray(trayIcon);
  } catch (error) {
    console.error('Failed to initialize tray icon:', error);
    tray = new Tray(nativeImage.createEmpty());
  }

  if (source === 'embedded-fallback') {
    console.warn('Using embedded fallback tray icon because no valid asset was found.');
  } else {
    console.log(`Tray icon loaded from: ${source}`);
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Chat',
      click: () => toggleChat()
    },
    {
      label: 'Toggle Overlay',
      click: () => toggleOverlay()
    },
    { type: 'separator' },
    {
      label: 'Reset Window Positions',
      click: () => {
        // Clear saved preferences and reset both windows
        chatBoundsPrefs = null;
        try {
          const prefsPath = path.join(userDataPath, 'chat-bounds.json');
          if (fs.existsSync(prefsPath)) fs.unlinkSync(prefsPath);
        } catch (e) {}
        ensureChatBounds(true);
        if (chatWindow && chatWindow.isVisible()) {
          chatWindow.show();
          chatWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Copilot Agent Overlay');
  tray.setContextMenu(contextMenu);

  // On macOS, clicking tray icon shows chat
  tray.on('click', () => {
    toggleChat();
  });
}

/**
 * Ensure chat window has valid bounds (not off-screen, not fullscreen)
 */
function ensureChatBounds(force = false) {
  if (!chatWindow) return;
  
  // Always ensure not fullscreen
  if (chatWindow.isFullScreen()) {
    chatWindow.setFullScreen(false);
  }
  
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const bounds = chatWindow.getBounds();
  
  // Check if off-screen
  const isOffScreen = bounds.x < -bounds.width || 
                      bounds.x > width ||
                      bounds.y < -bounds.height ||
                      bounds.y > height;

  // Check if too large for screen
  const isTooLarge = bounds.width > width || bounds.height > height;

  if (force || isOffScreen || isTooLarge) {
    if (chatWindow.isMaximized()) {
      chatWindow.unmaximize();
    }
    
    // Use saved preferences or calculate default bottom-right position
    const defaultWidth = chatBoundsPrefs?.width || 380;
    const defaultHeight = chatBoundsPrefs?.height || 520;
    const margin = 20;
    
    chatWindow.setBounds({
      width: Math.min(defaultWidth, width - margin * 2),
      height: Math.min(defaultHeight, height - margin * 2),
      x: chatBoundsPrefs?.x ?? Math.max(0, width - defaultWidth - margin),
      y: chatBoundsPrefs?.y ?? Math.max(0, height - defaultHeight - margin)
    });
  }
}

/**
 * Toggle overlay visibility
 */
function toggleOverlay() {
  if (!overlayWindow) return;

  if (overlayWindow.isVisible()) {
    overlayWindow.hide();
    setOverlayMode('passive');
  } else {
    overlayWindow.show();
    setOverlayMode('selection');
  }
}

/**
 * Set overlay mode (passive or selection)
 * 
 * CRITICAL: We ALWAYS use setIgnoreMouseEvents(true, { forward: true }) so that
 * clicks pass through to background applications. The overlay dots use CSS
 * pointer-events: auto to still receive clicks when hovered. This is the
 * correct pattern for transparent overlays with clickable elements.
 */
function setOverlayMode(mode) {
  overlayMode = mode;
  
  if (!overlayWindow) return;

  // ALWAYS forward mouse events to apps beneath the overlay.
  // Dots with pointer-events: auto in CSS will still receive clicks.
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });

  if (mode === 'passive') {
    overlayWindow.setFocusable(false);
    unregisterOverlayShortcuts();
  } else if (mode === 'selection') {
    // In selection mode, allow the window to be focusable for keyboard events
    if (typeof overlayWindow.setFocusable === 'function') {
      overlayWindow.setFocusable(true);
    }
    registerOverlayShortcuts();
  }

  // Notify overlay renderer of mode change
  overlayWindow.webContents.send('mode-changed', mode);
  console.log(`Overlay mode set to ${mode} (click-through enabled, dots are clickable via CSS)`);
}

/**
 * Register overlay-specific shortcuts when in selection mode
 * These use globalShortcut because the overlay has setIgnoreMouseEvents(true)
 * which means keyboard events go to background apps, not the overlay window
 */
function registerOverlayShortcuts() {
  console.log('[SHORTCUTS] Registering overlay shortcuts (Ctrl+Alt+F/G/+/-/X/I)');
  
  // Ctrl+Alt+F to toggle fine grid
  globalShortcut.register('CommandOrControl+Alt+F', () => {
    if (overlayWindow && overlayMode === 'selection') {
      console.log('[SHORTCUTS] Ctrl+Alt+F pressed - toggle fine grid');
      console.log('[SHORTCUTS] overlayWindow destroyed?', overlayWindow.isDestroyed());
      console.log('[SHORTCUTS] Sending overlay-command to webContents');
      overlayWindow.webContents.send('overlay-command', { action: 'toggle-fine' });
      console.log('[SHORTCUTS] Sent overlay-command');
    } else {
      console.log('[SHORTCUTS] Ctrl+Alt+F pressed but not in selection mode or no overlay');
    }
  });
  
  // Ctrl+Alt+G to show all grids
  globalShortcut.register('CommandOrControl+Alt+G', () => {
    if (overlayWindow && overlayMode === 'selection') {
      console.log('[SHORTCUTS] Ctrl+Alt+G pressed - show all grids');
      overlayWindow.webContents.send('overlay-command', { action: 'show-all' });
    }
  });
  
  // Ctrl+Alt+= to zoom in
  globalShortcut.register('CommandOrControl+Alt+=', () => {
    if (overlayWindow && overlayMode === 'selection') {
      console.log('[SHORTCUTS] Ctrl+Alt+= pressed - zoom in');
      overlayWindow.webContents.send('overlay-command', { action: 'zoom-in' });
    }
  });
  
  // Ctrl+Alt+- to zoom out
  globalShortcut.register('CommandOrControl+Alt+-', () => {
    if (overlayWindow && overlayMode === 'selection') {
      console.log('[SHORTCUTS] Ctrl+Alt+- pressed - zoom out');
      overlayWindow.webContents.send('overlay-command', { action: 'zoom-out' });
    }
  });
  
  // Ctrl+Alt+X to cancel selection
  globalShortcut.register('CommandOrControl+Alt+X', () => {
    if (overlayWindow && overlayMode === 'selection') {
      console.log('[SHORTCUTS] Ctrl+Alt+X pressed - cancel');
      overlayWindow.webContents.send('overlay-command', { action: 'cancel' });
    }
  });
  
  // Ctrl+Alt+I to toggle inspect mode
  globalShortcut.register('CommandOrControl+Alt+I', () => {
    if (overlayWindow && overlayMode === 'selection') {
      console.log('[SHORTCUTS] Ctrl+Alt+I pressed - toggle inspect mode');
      // Toggle inspect mode via IPC
      const newState = !inspectService.isInspectModeActive();
      inspectService.setInspectMode(newState);
      
      // Notify overlay
      overlayWindow.webContents.send('inspect-mode-changed', newState);
      overlayWindow.webContents.send('overlay-command', { action: 'toggle-inspect' });
      
      // If enabled, trigger region detection
      if (newState) {
        // Use async detection with error handling
        inspectService.detectRegions().then(results => {
          if (overlayWindow && !overlayWindow.isDestroyed()) {
            overlayWindow.webContents.send('inspect-regions-update', results.regions);
          }
        }).catch(err => {
          console.error('[SHORTCUTS] Inspect region detection failed:', err);
        });
      }
    }
  });
}

/**
 * Unregister overlay-specific shortcuts when leaving selection mode
 */
function unregisterOverlayShortcuts() {
  console.log('[SHORTCUTS] Unregistering overlay shortcuts');
  const keys = [
    'CommandOrControl+Alt+F',
    'CommandOrControl+Alt+G',
    'CommandOrControl+Alt+=',
    'CommandOrControl+Alt+-',
    'CommandOrControl+Alt+X',
    'CommandOrControl+Alt+I'
  ];
  keys.forEach(key => {
    try {
      globalShortcut.unregister(key);
    } catch (e) {
      // Ignore errors if shortcut wasn't registered
    }
  });
}

/**
 * Register global shortcuts
 */
function registerShortcuts() {
  // Ctrl+Alt+Space to toggle chat
  globalShortcut.register('CommandOrControl+Alt+Space', () => {
    toggleChat();
  });

  // Ctrl+Shift+O to toggle overlay
  globalShortcut.register('CommandOrControl+Shift+O', () => {
    toggleOverlay();
  });
}

/**
 * Set up IPC handlers
 */
function setupIPC() {
  // Handle dot selection from overlay
  ipcMain.on('dot-selected', (event, data) => {
    console.log('Dot selected:', data);
    
    // Forward to chat window
    if (chatWindow) {
      chatWindow.webContents.send('dot-selected', data);
    }

    // Switch back to passive mode after selection (unless cancelled)
    if (!data.cancelled) {
      setOverlayMode('passive');
    }
  });

  // Handle mode change requests from chat
  ipcMain.on('set-mode', (event, mode) => {
    setOverlayMode(mode);
  });

  // Agentic mode flag (when true, actions execute automatically)
  let agenticMode = false;
  let pendingActions = null;

  // Handle chat messages
  ipcMain.on('chat-message', async (event, message) => {
    console.log('Chat message:', message);
    
    // Check for slash commands first
    if (message.startsWith('/')) {
      // Handle agentic mode toggle
      if (message === '/agentic' || message === '/agent') {
        agenticMode = !agenticMode;
        if (chatWindow) {
          chatWindow.webContents.send('agent-response', {
            text: `Agentic mode ${agenticMode ? 'ENABLED' : 'DISABLED'}. ${agenticMode ? 'Actions will execute automatically.' : 'Actions will require confirmation.'}`,
            type: 'system',
            timestamp: Date.now()
          });
        }
        return;
      }
      
      // ===== MULTI-AGENT SYSTEM COMMANDS =====
      // /orchestrate - Run full orchestration on a task
      if (message.startsWith('/orchestrate ')) {
        const task = message.slice('/orchestrate '.length).trim();
        if (chatWindow) {
          chatWindow.webContents.send('agent-response', {
            text: `🎭 Starting multi-agent orchestration for: "${task}"`,
            type: 'system',
            timestamp: Date.now()
          });
          chatWindow.webContents.send('agent-typing', { isTyping: true });
        }
        
        try {
          const { orchestrator } = getAgentSystem();
          const result = await orchestrator.orchestrate(task);
          
          if (chatWindow) {
            chatWindow.webContents.send('agent-typing', { isTyping: false });
            chatWindow.webContents.send('agent-response', {
              text: `🎭 Orchestration complete:\n\n${JSON.stringify(result, null, 2)}`,
              type: result.status === 'success' ? 'message' : 'error',
              timestamp: Date.now()
            });
          }
        } catch (error) {
          if (chatWindow) {
            chatWindow.webContents.send('agent-typing', { isTyping: false });
            chatWindow.webContents.send('agent-response', {
              text: `❌ Orchestration failed: ${error.message}`,
              type: 'error',
              timestamp: Date.now()
            });
          }
        }
        return;
      }
      
      // /research - Use researcher agent
      if (message.startsWith('/research ')) {
        const query = message.slice('/research '.length).trim();
        if (chatWindow) {
          chatWindow.webContents.send('agent-response', {
            text: `🔍 Researching: "${query}"`,
            type: 'system',
            timestamp: Date.now()
          });
          chatWindow.webContents.send('agent-typing', { isTyping: true });
        }
        
        try {
          const { orchestrator } = getAgentSystem();
          const result = await orchestrator.research(query);
          
          if (chatWindow) {
            chatWindow.webContents.send('agent-typing', { isTyping: false });
            chatWindow.webContents.send('agent-response', {
              text: result.findings?.length > 0 
                ? `🔍 Research findings:\n\n${result.findings.join('\n\n')}`
                : `🔍 No findings for query.`,
              type: 'message',
              timestamp: Date.now()
            });
          }
        } catch (error) {
          if (chatWindow) {
            chatWindow.webContents.send('agent-typing', { isTyping: false });
            chatWindow.webContents.send('agent-response', {
              text: `❌ Research failed: ${error.message}`,
              type: 'error',
              timestamp: Date.now()
            });
          }
        }
        return;
      }
      
      // /build - Use builder agent
      if (message.startsWith('/build ')) {
        const spec = message.slice('/build '.length).trim();
        if (chatWindow) {
          chatWindow.webContents.send('agent-response', {
            text: `🔨 Starting build: "${spec}"`,
            type: 'system',
            timestamp: Date.now()
          });
          chatWindow.webContents.send('agent-typing', { isTyping: true });
        }
        
        try {
          const { orchestrator } = getAgentSystem();
          const result = await orchestrator.build(spec);
          
          if (chatWindow) {
            chatWindow.webContents.send('agent-typing', { isTyping: false });
            chatWindow.webContents.send('agent-response', {
              text: `🔨 Build complete:\n\n${JSON.stringify(result, null, 2)}`,
              type: result.status === 'success' ? 'message' : 'error',
              timestamp: Date.now()
            });
          }
        } catch (error) {
          if (chatWindow) {
            chatWindow.webContents.send('agent-typing', { isTyping: false });
            chatWindow.webContents.send('agent-response', {
              text: `❌ Build failed: ${error.message}`,
              type: 'error',
              timestamp: Date.now()
            });
          }
        }
        return;
      }
      
      // /verify - Use verifier agent
      if (message.startsWith('/verify ')) {
        const target = message.slice('/verify '.length).trim();
        if (chatWindow) {
          chatWindow.webContents.send('agent-response', {
            text: `✅ Verifying: "${target}"`,
            type: 'system',
            timestamp: Date.now()
          });
          chatWindow.webContents.send('agent-typing', { isTyping: true });
        }
        
        try {
          const { orchestrator } = getAgentSystem();
          const result = await orchestrator.verify(target);
          
          if (chatWindow) {
            chatWindow.webContents.send('agent-typing', { isTyping: false });
            chatWindow.webContents.send('agent-response', {
              text: `✅ Verification results:\n\n${JSON.stringify(result, null, 2)}`,
              type: result.passed ? 'message' : 'error',
              timestamp: Date.now()
            });
          }
        } catch (error) {
          if (chatWindow) {
            chatWindow.webContents.send('agent-typing', { isTyping: false });
            chatWindow.webContents.send('agent-response', {
              text: `❌ Verification failed: ${error.message}`,
              type: 'error',
              timestamp: Date.now()
            });
          }
        }
        return;
      }
      
      // /agent-status - Get multi-agent system status
      if (message === '/agent-status' || message === '/agents') {
        try {
          const { stateManager, orchestrator } = getAgentSystem();
          const state = stateManager.getState();
          const currentSession = orchestrator.currentSession;
          
          const statusText = `
🤖 **Multi-Agent System Status**

**Session:** ${currentSession || 'No active session'}
**Task Queue:** ${state.taskQueue.length} pending
**Completed:** ${state.completedTasks.length}
**Failed:** ${state.failedTasks.length}
**Handoffs:** ${state.handoffs.length}

**Available Commands:**
• \`/orchestrate <task>\` - Full multi-agent task execution
• \`/research <query>\` - Research using RLC patterns
• \`/build <spec>\` - Build code with builder agent
• \`/verify <target>\` - Verify code/changes
• \`/agent-reset\` - Reset agent system state
`;
          
          if (chatWindow) {
            chatWindow.webContents.send('agent-response', {
              text: statusText,
              type: 'system',
              timestamp: Date.now()
            });
          }
        } catch (error) {
          if (chatWindow) {
            chatWindow.webContents.send('agent-response', {
              text: `❌ Failed to get status: ${error.message}`,
              type: 'error',
              timestamp: Date.now()
            });
          }
        }
        return;
      }
      
      // /agent-reset - Reset multi-agent system
      if (message === '/agent-reset') {
        try {
          const { stateManager } = getAgentSystem();
          stateManager.resetState();
          agentSystem = null;
          
          if (chatWindow) {
            chatWindow.webContents.send('agent-response', {
              text: '🔄 Multi-agent system reset successfully.',
              type: 'system',
              timestamp: Date.now()
            });
          }
        } catch (error) {
          if (chatWindow) {
            chatWindow.webContents.send('agent-response', {
              text: `❌ Reset failed: ${error.message}`,
              type: 'error',
              timestamp: Date.now()
            });
          }
        }
        return;
      }
      
      let commandResult = aiService.handleCommand(message);
      
      // Handle async commands (like /login)
      if (commandResult && typeof commandResult.then === 'function') {
        commandResult = await commandResult;
      }
      
      if (commandResult) {
        if (chatWindow) {
          chatWindow.webContents.send('agent-response', {
            text: commandResult.message,
            type: commandResult.type,
            timestamp: Date.now()
          });
        }
        return;
      }
    }

    // Check if we should include visual context (expanded triggers for agentic actions)
    const includeVisualContext = message.toLowerCase().includes('screen') || 
                                  message.toLowerCase().includes('see') ||
                                  message.toLowerCase().includes('look') ||
                                  message.toLowerCase().includes('show') ||
                                  message.toLowerCase().includes('capture') ||
                                  message.toLowerCase().includes('click') ||
                                  message.toLowerCase().includes('type') ||
                                  message.toLowerCase().includes('print') ||
                                  message.toLowerCase().includes('open') ||
                                  message.toLowerCase().includes('close') ||
                                  visualContextHistory.length > 0;

    // Send initial "thinking" indicator
    if (chatWindow) {
      chatWindow.webContents.send('agent-typing', { isTyping: true });
    }

    try {
      // Call AI service
      const result = await aiService.sendMessage(message, {
        includeVisualContext
      });

      if (chatWindow) {
        chatWindow.webContents.send('agent-typing', { isTyping: false });
        
        if (result.success) {
          // Check if response contains actions
          console.log('[AGENTIC] Parsing response for actions...');
          const actionData = aiService.parseActions(result.message);
          console.log('[AGENTIC] parseActions result:', actionData ? 'found' : 'null');
          
          if (actionData && actionData.actions && actionData.actions.length > 0) {
            console.log('[AGENTIC] AI returned actions:', actionData.actions.length);
            console.log('[AGENTIC] Actions:', JSON.stringify(actionData.actions));
            
            // Store pending actions
            pendingActions = actionData;
            
            // Send response with action data
            chatWindow.webContents.send('agent-response', {
              text: result.message,
              timestamp: Date.now(),
              provider: result.provider,
              hasVisualContext: result.hasVisualContext,
              hasActions: true,
              actionData: actionData
            });
            
            // If agentic mode, execute immediately
            if (agenticMode) {
              console.log('[AGENTIC] Auto-executing actions (agentic mode)');
              executeActionsAndRespond(actionData);
            }
          } else {
            console.log('[AGENTIC] No actions detected in response');
            // Normal response without actions
            chatWindow.webContents.send('agent-response', {
              text: result.message,
              timestamp: Date.now(),
              provider: result.provider,
              hasVisualContext: result.hasVisualContext
            });
          }
        } else {
          chatWindow.webContents.send('agent-response', {
            text: `Error: ${result.error}`,
            type: 'error',
            timestamp: Date.now()
          });
        }
      }
    } catch (error) {
      console.error('AI service error:', error);
      if (chatWindow) {
        chatWindow.webContents.send('agent-typing', { isTyping: false });
        chatWindow.webContents.send('agent-response', {
          text: `Error: ${error.message}`,
          type: 'error',
          timestamp: Date.now()
        });
      }
    }
  });

  // Helper for executing actions with visual feedback and overlay management
  async function performSafeAgenticAction(action) {
    // Only intercept clicks/drags that need overlay interaction
    if (action.type === 'click' || action.type === 'double_click' || action.type === 'right_click' || action.type === 'drag') {
       let x = action.x || action.fromX;
       let y = action.y || action.fromY;
       
       // Coordinate Scaling for Precision (Fix for Q4)
       // If visual context exists, scale from Image Space -> Screen Space
       const latestVisual = aiService.getLatestVisualContext();
       if (latestVisual && latestVisual.width && latestVisual.height) {
         const display = screen.getPrimaryDisplay();
         const screenW = display.bounds.width; // e.g., 1920
         const screenH = display.bounds.height; // e.g., 1080
         // Calculate scale multiples
         const scaleX = screenW / latestVisual.width; 
         const scaleY = screenH / latestVisual.height;
         
         // Only apply if there's a significant difference (e.g. > 1% mismatch)
         if (Math.abs(scaleX - 1) > 0.01 || Math.abs(scaleY - 1) > 0.01) {
           console.log(`[EXECUTOR] Scaling coords from ${latestVisual.width}x${latestVisual.height} to ${screenW}x${screenH} (Target: ${x},${y})`);
           x = Math.round(x * scaleX);
           y = Math.round(y * scaleY);
           // Update action object for system automation
           if(action.x) action.x = x;
           if(action.y) action.y = y;
           if(action.fromX) action.fromX = x;
           if(action.fromY) action.fromY = y;
           if(action.toX) action.toX = Math.round(action.toX * scaleX);
           if(action.toY) action.toY = Math.round(action.toY * scaleY);
           console.log(`[EXECUTOR] Scaled target: ${x},${y}`);
         }
       }
       
       console.log(`[EXECUTOR] Intercepting ${action.type} at (${x},${y})`);

       // 1. Visual Feedback (Pulse - Doppler Effect)
       if (overlayWindow && !overlayWindow.isDestroyed() && overlayWindow.webContents) {
         overlayWindow.webContents.send('overlay-command', {
           action: 'pulse-click',
           x: x, 
           y: y,
           label: action.reason ? 'Action' : undefined
         });
       }
       
       // 2. Wait for user to see pulse (Doppler expansion)
       await new Promise(r => setTimeout(r, 600));
       
       // 3. Prepare for Pass-through
       const wasVisible = overlayWindow && !overlayWindow.isDestroyed() && overlayWindow.isVisible();
       if (wasVisible) {
         // A. Disable renderer pointer-events (CSS level)
         // This ensures elements like dots don't capture the click
         overlayWindow.webContents.send('overlay-command', {
           action: 'set-click-through',
           enabled: true
         });

         // B. Set Electron window to ignore mouse events FULLY (no forwarding)
         // This ensures the window is completely transparent to the OS mouse subsystem
         overlayWindow.setIgnoreMouseEvents(true);
         
         // Give OS time to update window regions
         await new Promise(r => setTimeout(r, 50));
       }
       
       // 4. Exec via System Automation
       let result;
       try {
         result = await aiService.systemAutomation.executeAction(action);
       } catch (e) {
         result = { success: false, error: e.message };
       }
       
       // 5. Restore Overlay Interactability
       if (wasVisible && overlayWindow && !overlayWindow.isDestroyed()) {
         // Brief delay to ensure OS processed the click
         await new Promise(r => setTimeout(r, 50));
         
         // A. Restore renderer pointer-events
         overlayWindow.webContents.send('overlay-command', {
           action: 'set-click-through',
           enabled: false
         });
         
         // B. Restore Electron window behavior (forwarding enabled for UI interaction)
         // Note: We use forward: true so users can click dots but see through transparent areas
         overlayWindow.setIgnoreMouseEvents(true, { forward: true });
       }
       
       return result;
    }
    
    // Non-spatial actions (type, key, wait) - just execute
    return aiService.systemAutomation.executeAction(action);
  }

  // Execute actions and send results
  async function executeActionsAndRespond(actionData) {
    if (!chatWindow) return;
    
    chatWindow.webContents.send('action-executing', { 
      thought: actionData.thought,
      total: actionData.actions.length 
    });
    
    // CRITICAL: Blur chat window before executing actions so keyboard/mouse
    // input reaches the desktop instead of staying within Electron
    if (chatWindow && !chatWindow.isDestroyed()) {
      chatWindow.blur();
    }
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.blur();
      // Temporarily lower overlay z-index so popups (like Run dialog) appear above
      overlayWindow.setAlwaysOnTop(true, 'pop-up-menu');
    }
    
    try {
      const results = await aiService.executeActions(
        actionData,
        // Progress callback
        (result, index, total) => {
          chatWindow.webContents.send('action-progress', {
            current: index + 1,
            total,
            result
          });
        },
        // Screenshot callback - MUST hide overlay before capture
        async () => {
          // Hide overlay before capturing so AI sees actual screen
          const wasOverlayVisible = overlayWindow && overlayWindow.isVisible();
          if (wasOverlayVisible) {
            overlayWindow.hide();
            await new Promise(resolve => setTimeout(resolve, 50));
          }

          const sources = await require('electron').desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: { 
              width: screen.getPrimaryDisplay().bounds.width,
              height: screen.getPrimaryDisplay().bounds.height
            }
          });

          // Restore overlay after capture
          if (wasOverlayVisible && overlayWindow) {
            overlayWindow.show();
          }

          if (sources.length > 0) {
            const imageData = {
              dataURL: sources[0].thumbnail.toDataURL(),
              width: sources[0].thumbnail.getSize().width,
              height: sources[0].thumbnail.getSize().height,
              timestamp: Date.now()
            };
            storeVisualContext(imageData);
          }
        },
        // Options with safe executor
        { actionExecutor: performSafeAgenticAction }
      );
      
      // Send completion notification
      chatWindow.webContents.send('action-complete', {
        success: results.success,
        actionsCount: actionData.actions.length,
        thought: results.thought,
        verification: results.verification,
        results: results.results
      });
      
      // If screenshot was requested, capture and show result
      if (results.screenshotRequested) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Hide overlay before capturing
        const wasOverlayVisible = overlayWindow && overlayWindow.isVisible();
        if (wasOverlayVisible) {
          overlayWindow.hide();
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        const sources = await require('electron').desktopCapturer.getSources({
          types: ['screen'],
          thumbnailSize: { 
            width: screen.getPrimaryDisplay().bounds.width,
            height: screen.getPrimaryDisplay().bounds.height
          }
        });

        // Restore overlay after capture
        if (wasOverlayVisible && overlayWindow) {
          overlayWindow.show();
        }

        if (sources.length > 0) {
          const imageData = {
            dataURL: sources[0].thumbnail.toDataURL(),
            width: sources[0].thumbnail.getSize().width,
            height: sources[0].thumbnail.getSize().height,
            timestamp: Date.now()
          };
          storeVisualContext(imageData);
          chatWindow.webContents.send('screen-captured', imageData);
        }
      }
      
    } catch (error) {
      console.error('[AGENTIC] Action execution error:', error);
      chatWindow.webContents.send('action-complete', {
        success: false,
        actionsCount: actionData.actions ? actionData.actions.length : 0,
        error: error.message
      });
    } finally {
      // Restore overlay z-index after action execution
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.setAlwaysOnTop(true, 'screen-saver');
      }
    }
    
    pendingActions = null;
  }

  // Handle confirmed action execution
  ipcMain.on('execute-actions', async (event, actionData) => {
    console.log('[AGENTIC] User confirmed action execution');
    await executeActionsAndRespond(actionData || pendingActions);
  });

  // Handle action cancellation
  ipcMain.on('cancel-actions', () => {
    console.log('[AGENTIC] User cancelled actions');
    pendingActions = null;
    aiService.clearPendingAction();
    if (chatWindow) {
      chatWindow.webContents.send('agent-response', {
        text: 'Actions cancelled.',
        type: 'system',
        timestamp: Date.now()
      });
    }
  });

  // ===== SAFETY GUARDRAILS IPC HANDLERS =====
  
  // Analyze action safety before execution
  ipcMain.handle('analyze-action-safety', (event, { action, targetInfo }) => {
    return aiService.analyzeActionSafety(action, targetInfo || {});
  });

  // Get pending action awaiting confirmation
  ipcMain.handle('get-pending-action', () => {
    return aiService.getPendingAction();
  });

  // Confirm pending action and resume execution
  ipcMain.handle('confirm-pending-action', async (event, { actionId }) => {
    console.log('[SAFETY] User confirmed action:', actionId);
    
    const pending = aiService.getPendingAction();
    if (!pending || pending.actionId !== actionId) {
      return { success: false, error: 'No matching pending action' };
    }
    
    // Resume execution after confirmation
    try {
      const results = await aiService.resumeAfterConfirmation(
        // Progress callback
        (result, index, total) => {
          if (chatWindow && !chatWindow.isDestroyed()) {
            chatWindow.webContents.send('action-progress', {
              current: index + 1,
              total,
              result,
              userConfirmed: true
            });
          }
        },
        // Screenshot callback
        async () => {
          if (overlayWindow && !overlayWindow.isDestroyed()) {
            overlayWindow.hide();
          }
          await new Promise(r => setTimeout(r, 100));
          
          const sources = await desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: { 
              width: screen.getPrimaryDisplay().bounds.width,
              height: screen.getPrimaryDisplay().bounds.height
            }
          });
          
          if (overlayWindow && !overlayWindow.isDestroyed()) {
            overlayWindow.show();
          }
          
          if (sources.length > 0) {
            const imageData = {
              dataURL: sources[0].thumbnail.toDataURL(),
              width: sources[0].thumbnail.getSize().width,
              height: sources[0].thumbnail.getSize().height,
              timestamp: Date.now()
            };
            storeVisualContext(imageData);
          }
        },
        // Options with safe executor
        { actionExecutor: performSafeAgenticAction }
      );
      
      // Notify chat of completion
      if (chatWindow && !chatWindow.isDestroyed()) {
        chatWindow.webContents.send('action-complete', {
          success: results.success,
          userConfirmed: true,
          results: results.results
        });
      }
      
      return { success: true, results };
    } catch (error) {
      console.error('[SAFETY] Resume after confirmation failed:', error);
      return { success: false, error: error.message };
    }
  });

  // Reject pending action
  ipcMain.handle('reject-pending-action', (event, { actionId }) => {
    console.log('[SAFETY] User rejected action:', actionId);
    
    const rejected = aiService.rejectPendingAction(actionId);
    
    if (rejected && chatWindow && !chatWindow.isDestroyed()) {
      chatWindow.webContents.send('action-rejected', {
        actionId,
        message: 'Action rejected by user'
      });
      chatWindow.webContents.send('agent-response', {
        text: '🛡️ Action rejected. The potentially risky action was not executed.',
        type: 'system',
        timestamp: Date.now()
      });
    }
    
    return { success: rejected };
  });

  // Convert grid label to screen coordinates
  ipcMain.handle('label-to-coordinates', (event, label) => {
    // Use gridToPixels from ai-service which uses system-automation
    const coords = aiService.gridToPixels(label);
    if (coords) {
      return {
        success: true,
        label,
        x: coords.x,
        y: coords.y,
        screenX: coords.x,
        screenY: coords.y
      };
    }
    return { success: false, error: `Invalid grid label: ${label}` };
  });

  // Safe click with overlay hide/show and safety analysis
  ipcMain.handle('safe-click-at', async (event, { x, y, button = 'left', label, targetInfo }) => {
    console.log(`[SAFETY] Safe click requested at (${x}, ${y}), button: ${button}`);
    
    // Analyze safety
    const action = { type: 'click', x, y, button, reason: label || '' };
    const safety = aiService.analyzeActionSafety(action, targetInfo || {});
    
    // If HIGH or CRITICAL, don't execute - require explicit confirmation
    if (safety.requiresConfirmation) {
      console.log(`[SAFETY] Click requires confirmation: ${safety.riskLevel}`);
      
      aiService.setPendingAction({
        ...safety,
        actionIndex: 0,
        remainingActions: [action],
        completedResults: [],
        thought: `Click at (${x}, ${y})`,
        verification: 'Verify click target'
      });
      
      // Notify chat window
      if (chatWindow && !chatWindow.isDestroyed()) {
        chatWindow.webContents.send('action-requires-confirmation', {
          actionId: safety.actionId,
          action: action,
          safety: safety,
          description: safety.description,
          riskLevel: safety.riskLevel,
          warnings: safety.warnings
        });
      }
      
      return {
        success: false,
        pending: true,
        actionId: safety.actionId,
        riskLevel: safety.riskLevel,
        message: `Action requires confirmation: ${safety.warnings.join(', ')}`
      };
    }
    
    // SAFE/LOW/MEDIUM - execute with visual feedback
    try {
      // INJECTION: Ensure visual feedback system is loaded
      if (overlayWindow && !overlayWindow.isDestroyed()) {
         try {
             const isLoaded = await overlayWindow.webContents.executeJavaScript('window.hasPulseSystem === true').catch(() => false);
             
             if (!isLoaded) {
                 const css = `
                    .pulse-ring {
                      position: absolute;
                      border-radius: 50%;
                      pointer-events: none;
                      animation: pulse-animation 0.8s ease-out forwards;
                      border: 2px solid #00ffcc;
                      background: radial-gradient(circle, rgba(0,255,204,0.3) 0%, rgba(0,255,204,0) 70%);
                      box-shadow: 0 0 15px rgba(0, 255, 204, 0.6);
                      z-index: 2147483647;
                      transform: translate(-50%, -50%);
                    }
                    @keyframes pulse-animation {
                      0% { width: 10px; height: 10px; opacity: 1; transform: translate(-50%, -50%) scale(1); }
                      100% { width: 100px; height: 100px; opacity: 0; transform: translate(-50%, -50%) scale(1.5); }
                    }
                 `;
                 await overlayWindow.webContents.insertCSS(css);
                 overlayWindow.webContents.executeJavaScript(`
                    const { ipcRenderer } = require('electron');
                    window.showPulseClick = (x, y) => {
                      const el = document.createElement('div');
                      el.className = 'pulse-ring';
                      el.style.left = x + 'px';
                      el.style.top = y + 'px';
                      document.body.appendChild(el);
                      setTimeout(() => el.remove(), 1000);
                    };
                    ipcRenderer.removeAllListeners('overlay-command');
                    ipcRenderer.on('overlay-command', (event, data) => {
                        if (data.action === 'pulse-click') window.showPulseClick(data.x, data.y);
                    });
                    window.hasPulseSystem = true;
                 `);
             }
         } catch(e) { console.error('Safe click injection error:', e); }
      }

      // Show visual indicator on overlay
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.webContents.send('overlay-command', {
          action: 'pulse-click', // Updated to pulse
          x, y,
          label: label || `${x},${y}`
        });
      }
      
      await new Promise(r => setTimeout(r, 150));
      
      // Hide overlay for click-through
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.hide();
      }
      
      await new Promise(r => setTimeout(r, 50));
      
      // Execute click via system-automation
      const result = await aiService.systemAutomation.executeAction({
        type: 'click',
        x: Math.round(x),
        y: Math.round(y),
        button
      });
      
      await new Promise(r => setTimeout(r, 100));
      
      // Restore overlay
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.show();
      }
      
      console.log(`[SAFETY] Click executed: ${result.success}`);
      
      return {
        success: result.success,
        x, y,
        riskLevel: safety.riskLevel,
        error: result.error
      };
      
    } catch (error) {
      console.error('[SAFETY] Safe click failed:', error);
      
      // Always restore overlay on error
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.show();
      }
      
      return { success: false, error: error.message };
    }
  });

  // ===== WINDOW CONTROLS =====
  ipcMain.on('minimize-chat', () => {
    if (chatWindow) {
      chatWindow.minimize();
    }
  });

  ipcMain.on('hide-chat', () => {
    if (chatWindow) {
      chatWindow.hide();
      isChatVisible = false;
    }
  });

  // ===== SCREEN CAPTURE (AI Visual Awareness) =====
  // CRITICAL: Hide overlay before capture so AI sees actual screen content without dots
  ipcMain.on('capture-screen', async (event, options = {}) => {
    try {
      // Hide overlay BEFORE capturing so screenshot shows actual screen (not dots)
      const wasOverlayVisible = overlayWindow && overlayWindow.isVisible();
      if (wasOverlayVisible) {
        overlayWindow.hide();
        // Brief delay to ensure overlay is fully hidden
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { 
          width: screen.getPrimaryDisplay().bounds.width,
          height: screen.getPrimaryDisplay().bounds.height
        }
      });

      // Restore overlay after capture
      if (wasOverlayVisible && overlayWindow) {
        overlayWindow.show();
      }

      if (sources.length > 0) {
        const primarySource = sources[0];
        const thumbnail = primarySource.thumbnail;
        
        // Get image data
        const imageData = {
          dataURL: thumbnail.toDataURL(),
          width: thumbnail.getSize().width,
          height: thumbnail.getSize().height,
          x: 0,
          y: 0,
          timestamp: Date.now(),
          sourceId: primarySource.id,
          sourceName: primarySource.name
        };

        // Send to chat window
        if (chatWindow) {
          chatWindow.webContents.send('screen-captured', imageData);
        }

        // Log for debugging
        console.log(`Screen captured: ${imageData.width}x${imageData.height} (overlay was ${wasOverlayVisible ? 'hidden' : 'already hidden'})`);

        // Store in visual context for AI processing
        storeVisualContext(imageData);
      }
    } catch (error) {
      console.error('Screen capture failed:', error);
      // Ensure overlay is restored on error
      if (overlayWindow && !overlayWindow.isVisible()) {
        overlayWindow.show();
      }
      if (chatWindow) {
        chatWindow.webContents.send('screen-captured', { error: error.message });
      }
    }
  });

  // Capture a specific region
  ipcMain.on('capture-region', async (event, { x, y, width, height }) => {
    try {
      // Hide overlay BEFORE capturing
      const wasOverlayVisible = overlayWindow && !overlayWindow.isDestroyed() && overlayWindow.isVisible();
      if (wasOverlayVisible) {
        overlayWindow.hide();
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { 
          width: screen.getPrimaryDisplay().bounds.width,
          height: screen.getPrimaryDisplay().bounds.height
        }
      });

      // Restore overlay after capture
      if (wasOverlayVisible && overlayWindow) {
        overlayWindow.show();
      }

      if (sources.length > 0) {
        const primarySource = sources[0];
        const thumbnail = primarySource.thumbnail;
        
        // Crop to region
        const cropped = thumbnail.crop({
          x: Math.max(0, x),
          y: Math.max(0, y),
          width: Math.min(width, thumbnail.getSize().width - x),
          height: Math.min(height, thumbnail.getSize().height - y)
        });

        const imageData = {
          dataURL: cropped.toDataURL(),
          width: cropped.getSize().width,
          height: cropped.getSize().height,
          x,
          y,
          timestamp: Date.now(),
          type: 'region'
        };

        if (chatWindow) {
          chatWindow.webContents.send('screen-captured', imageData);
        }

        storeVisualContext(imageData);
      }
    } catch (error) {
      console.error('Region capture failed:', error);
      // Ensure overlay is restored on error
      if (overlayWindow && !overlayWindow.isVisible()) {
        overlayWindow.show();
      }
    }
  });

  // Get current state
  ipcMain.handle('get-state', () => {
    const aiStatus = aiService.getStatus();
    return {
      overlayMode,
      isChatVisible,
      visualContextCount: visualContextHistory.length,
      aiProvider: aiStatus.provider,
      model: aiStatus.model,
      aiStatus,
      // Inspect mode state
      inspectMode: inspectService.isInspectModeActive(),
      inspectRegionCount: inspectService.getRegions().length
    };
  });

  // ===== INSPECT MODE IPC HANDLERS =====
  
  // Toggle inspect mode
  ipcMain.on('toggle-inspect-mode', () => {
    const newState = !inspectService.isInspectModeActive();
    inspectService.setInspectMode(newState);
    console.log(`[INSPECT] Mode toggled: ${newState}`);
    
    // Notify overlay
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send('inspect-mode-changed', newState);
    }
    
    // Notify chat
    if (chatWindow && !chatWindow.isDestroyed()) {
      chatWindow.webContents.send('inspect-mode-changed', newState);
    }
    
    // If enabled, trigger region detection
    if (newState) {
      detectAndSendInspectRegions().catch(err => {
        console.error('[INSPECT] Region detection failed:', err);
      });
    }
  });
  
  // Request inspect regions detection
  ipcMain.on('request-inspect-regions', async () => {
    await detectAndSendInspectRegions().catch(err => {
      console.error('[INSPECT] Region detection request failed:', err);
    });
  });
  
  // Handle inspect region selection from overlay
  ipcMain.on('inspect-region-selected', (event, data) => {
    console.log('[INSPECT] Region selected:', data);
    
    // Record the action
    const trace = inspectService.recordAction({
      type: 'select',
      targetId: data.targetId,
      x: data.x,
      y: data.y
    }, data.targetId);
    
    // Forward to chat window with targetId for AI targeting
    if (chatWindow && !chatWindow.isDestroyed()) {
      chatWindow.webContents.send('inspect-region-selected', {
        ...data,
        actionId: trace.actionId
      });
    }
    
    // Select the region in service
    inspectService.selectRegion(data.targetId);
  });
  
  // Get inspect context for AI
  ipcMain.handle('get-inspect-context', () => {
    return inspectService.generateAIContext();
  });
  
  // Get inspect regions
  ipcMain.handle('get-inspect-regions', () => {
    return inspectService.getRegions();
  });
  
  // Get window context
  ipcMain.handle('get-window-context', async () => {
    return await inspectService.updateWindowContext();
  });
  
  /**
   * Detect UI regions and send to overlay
   */
  async function detectAndSendInspectRegions() {
    try {
      console.log('[INSPECT] Detecting regions...');
      const results = await inspectService.detectRegions();
      
      // Send regions to overlay
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.webContents.send('inspect-regions-update', results.regions);
      }
      
      // Notify chat of new context
      if (chatWindow && !chatWindow.isDestroyed()) {
        chatWindow.webContents.send('inspect-context-update', {
          regionCount: results.regions.length,
          windowContext: results.windowContext
        });
      }
      
      console.log(`[INSPECT] Detected ${results.regions.length} regions`);
      return results;
    } catch (error) {
      console.error('[INSPECT] Detection failed:', error);
      return { regions: [], error: error.message };
    }
  }

  // ===== AI CLICK-THROUGH AUTOMATION (Q4 FIX) =====
  // This allows AI to click at coordinates THROUGH the overlay to the background app
  // The overlay should NOT intercept these programmatic clicks
  ipcMain.handle('click-through-at', async (event, { x, y, button = 'left', label }) => {
    try {
      console.log(`[CLICK-THROUGH] Executing click at (${x}, ${y}) label=${label || 'none'}`);

      // INJECTION: Ensure visual feedback system is loaded on first click
      if (overlayWindow && !overlayWindow.isDestroyed()) {
         try {
             // Check if pulse system is loaded in renderer
             const isLoaded = await overlayWindow.webContents.executeJavaScript('window.hasPulseSystem === true').catch(() => false);
             
             if (!isLoaded) {
                 console.log('[CLICK-THROUGH] Injecting visual feedback system...');
                 const css = `
                    .pulse-ring {
                      position: absolute;
                      border-radius: 50%;
                      pointer-events: none;
                      animation: pulse-animation 0.8s ease-out forwards;
                      border: 2px solid #00ffcc;
                      background: radial-gradient(circle, rgba(0,255,204,0.3) 0%, rgba(0,255,204,0) 70%);
                      box-shadow: 0 0 15px rgba(0, 255, 204, 0.6);
                      z-index: 2147483647;
                      transform: translate(-50%, -50%);
                    }
                    @keyframes pulse-animation {
                      0% { width: 10px; height: 10px; opacity: 1; transform: translate(-50%, -50%) scale(1); }
                      100% { width: 100px; height: 100px; opacity: 0; transform: translate(-50%, -50%) scale(1.5); }
                    }
                 `;
                 await overlayWindow.webContents.insertCSS(css);
                 
                 const js = `
                    const { ipcRenderer } = require('electron');
                    window.showPulseClick = (x, y) => {
                      const el = document.createElement('div');
                      el.className = 'pulse-ring';
                      el.style.left = x + 'px';
                      el.style.top = y + 'px';
                      document.body.appendChild(el);
                      setTimeout(() => el.remove(), 1000);
                    };
                    ipcRenderer.removeAllListeners('overlay-command');
                    ipcRenderer.on('overlay-command', (event, data) => {
                        if (data.action === 'pulse-click') window.showPulseClick(data.x, data.y);
                    });
                    window.hasPulseSystem = true;
                 `;
                 await overlayWindow.webContents.executeJavaScript(js);
             }
         } catch (e) { console.error('Visual injection error:', e); }
      }
      
      // 1. Show visual feedback on overlay (optional - for user awareness)
      if (overlayWindow && !overlayWindow.isDestroyed() && overlayWindow.webContents) {
        overlayWindow.webContents.send('overlay-command', {
          action: 'pulse-click', // Changed from highlight-coordinate to specific pulse-click
          x, y, label
        });
      }
      
      // 2. Brief delay for visual feedback (increased to let pulse show)
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 3. Hide overlay to ensure click goes through
      const wasVisible = overlayWindow && !overlayWindow.isDestroyed() && overlayWindow.isVisible();
      if (wasVisible) {
        overlayWindow.hide();
        // Give Windows DWM more time to process transparency
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      
      // 4. Execute the click using robotjs or similar automation
      // Note: This requires robotjs to be installed and working
      try {
        const robot = require('robotjs');
        // Double move to ensure OS registers cursor position
        robot.moveMouse(x, y);
        robot.moveMouse(x, y);
        await new Promise(resolve => setTimeout(resolve, 50));
        robot.mouseClick(button);
        console.log(`[CLICK-THROUGH] Click executed successfully at (${x}, ${y})`);
      } catch (robotError) {
        console.error('[CLICK-THROUGH] Robot click failed:', robotError.message);
        // Fallback: try using PowerShell on Windows
        if (process.platform === 'win32') {
          const { exec } = require('child_process');
          const psCommand = `
            Add-Type -AssemblyName System.Windows.Forms
            [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})
            Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);' -Name U32 -Namespace W
            [W.U32]::mouse_event(0x02, 0, 0, 0, 0)
            [W.U32]::mouse_event(0x04, 0, 0, 0, 0)
          `;
          await new Promise((resolve, reject) => {
            exec(`powershell -Command "${psCommand.replace(/"/g, '\\"')}"`, (error) => {
              if (error) reject(error);
              else resolve();
            });
          });
          console.log(`[CLICK-THROUGH] PowerShell click executed at (${x}, ${y})`);
        } else {
          throw robotError;
        }
      }
      
      // 5. Restore overlay after a delay (let the click register)
      await new Promise(resolve => setTimeout(resolve, 150));
      if (wasVisible && overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.show();
      }
      
      return { success: true, x, y, label };
    } catch (error) {
      console.error('[CLICK-THROUGH] Error:', error);
      // Ensure overlay is restored on error
      if (overlayWindow && !overlayWindow.isDestroyed() && !overlayWindow.isVisible()) {
        overlayWindow.show();
      }
      return { success: false, error: error.message };
    }
  });

  // NOTE: label-to-coordinates, analyze-action-safety, safe-click-at, confirm-pending-action,
  // reject-pending-action, and get-pending-action handlers are registered above in 
  // SAFETY GUARDRAILS IPC HANDLERS section. Do NOT register duplicate handlers here.

  // NOTE: strict mode requires unique IPC handlers
  // Previously duplicate handlers were removed from here.

  // Set AI provider
  ipcMain.on('set-ai-provider', (event, provider) => {
    const success = aiService.setProvider(provider);
    if (chatWindow) {
      chatWindow.webContents.send('provider-changed', { 
        provider, 
        success,
        status: aiService.getStatus()
      });
    }
  });

  // Set API key
  ipcMain.on('set-api-key', (event, { provider, key }) => {
    const success = aiService.setApiKey(provider, key);
    if (chatWindow) {
      chatWindow.webContents.send('api-key-set', { provider, success });
    }
  });

  // Check auth status for a provider
  ipcMain.on('check-auth', async (event, provider) => {
    const status = aiService.getStatus();
    const currentProvider = provider || status.provider;
    let authStatus = 'disconnected';
    
    if (currentProvider === 'copilot') {
      // Check if Copilot token exists
      const tokenPath = require('path').join(app.getPath('appData'), 'copilot-agent', 'copilot-token.json');
      try {
        if (require('fs').existsSync(tokenPath)) {
          authStatus = 'connected';
        }
      } catch (e) {
        authStatus = 'disconnected';
      }
    } else if (currentProvider === 'ollama') {
      // Ollama doesn't need auth, just check if running
      authStatus = 'connected';
    } else {
      // OpenAI/Anthropic need API keys
      authStatus = status.hasApiKey ? 'connected' : 'disconnected';
    }
    
    if (chatWindow) {
      chatWindow.webContents.send('auth-status', {
        provider: currentProvider,
        status: authStatus
      });
    }
  });

  // ===== VISUAL AWARENESS =====
  
  // Get active window info
  ipcMain.handle('get-active-window', async () => {
    return await visualAwareness.getActiveWindow();
  });

  // Find element at coordinates
  ipcMain.handle('find-element-at', async (event, { x, y }) => {
    return await visualAwareness.findElementAtPoint(x, y);
  });

  // Detect UI elements
  ipcMain.handle('detect-ui-elements', async (event, options = {}) => {
    return await visualAwareness.detectUIElements(options);
  });

  // Extract text via OCR
  ipcMain.handle('extract-text', async (event, options = {}) => {
    const latestContext = visualContextHistory[visualContextHistory.length - 1];
    if (!latestContext) {
      return { error: 'No screen capture available. Capture screen first.' };
    }
    return await visualAwareness.extractTextFromImage(latestContext, options);
  });

  // Full screen analysis
  ipcMain.handle('analyze-screen', async (event, options = {}) => {
    const latestContext = visualContextHistory[visualContextHistory.length - 1];
    if (!latestContext) {
      return { error: 'No screen capture available. Capture screen first.' };
    }
    const analysis = await visualAwareness.analyzeScreen(latestContext, options);
    
    // Send analysis to chat window
    if (chatWindow) {
      chatWindow.webContents.send('screen-analysis', analysis);
    }
    
    return analysis;
  });

  // Get screen diff history
  ipcMain.handle('get-screen-diff-history', () => {
    return visualAwareness.getScreenDiffHistory();
  });

  // ===== MULTI-AGENT SYSTEM IPC HANDLERS =====
  // Initialize agent system lazily
  let agentSystem = null;
  
  function getAgentSystem() {
    if (!agentSystem) {
      agentSystem = createAgentSystem(aiService);
    }
    return agentSystem;
  }

  // Spawn a new agent session
  ipcMain.handle('agent-spawn', async (event, { task, options = {} }) => {
    try {
      const { orchestrator } = getAgentSystem();
      const sessionId = await orchestrator.startSession(task);
      
      if (chatWindow && !chatWindow.isDestroyed()) {
        chatWindow.webContents.send('agent-event', {
          type: 'session-started',
          sessionId,
          task,
          timestamp: Date.now()
        });
      }
      
      return { success: true, sessionId };
    } catch (error) {
      console.error('[AGENT] Spawn failed:', error);
      return { success: false, error: error.message };
    }
  });

  // Execute a task with the agent system
  ipcMain.handle('agent-run', async (event, { task, options = {} }) => {
    try {
      const { orchestrator } = getAgentSystem();
      
      // Notify chat of execution start
      if (chatWindow && !chatWindow.isDestroyed()) {
        chatWindow.webContents.send('agent-event', {
          type: 'execution-started',
          task,
          timestamp: Date.now()
        });
      }

      const result = await orchestrator.orchestrate(task);
      
      // Notify chat of completion
      if (chatWindow && !chatWindow.isDestroyed()) {
        chatWindow.webContents.send('agent-event', {
          type: 'execution-complete',
          task,
          result,
          timestamp: Date.now()
        });
      }
      
      return { success: true, result };
    } catch (error) {
      console.error('[AGENT] Run failed:', error);
      
      if (chatWindow && !chatWindow.isDestroyed()) {
        chatWindow.webContents.send('agent-event', {
          type: 'execution-error',
          task,
          error: error.message,
          timestamp: Date.now()
        });
      }
      
      return { success: false, error: error.message };
    }
  });

  // Research a topic using the researcher agent
  ipcMain.handle('agent-research', async (event, { query, options = {} }) => {
    try {
      const { orchestrator } = getAgentSystem();
      const result = await orchestrator.research(query);
      return { success: true, result };
    } catch (error) {
      console.error('[AGENT] Research failed:', error);
      return { success: false, error: error.message };
    }
  });

  // Verify code/changes using the verifier agent
  ipcMain.handle('agent-verify', async (event, { target, options = {} }) => {
    try {
      const { orchestrator } = getAgentSystem();
      const result = await orchestrator.verify(target);
      return { success: true, result };
    } catch (error) {
      console.error('[AGENT] Verify failed:', error);
      return { success: false, error: error.message };
    }
  });

  // Build code/features using the builder agent
  ipcMain.handle('agent-build', async (event, { specification, options = {} }) => {
    try {
      const { orchestrator } = getAgentSystem();
      const result = await orchestrator.build(specification);
      return { success: true, result };
    } catch (error) {
      console.error('[AGENT] Build failed:', error);
      return { success: false, error: error.message };
    }
  });

  // Get agent system status
  ipcMain.handle('agent-status', async () => {
    try {
      const { stateManager, orchestrator } = getAgentSystem();
      const state = stateManager.getState();
      const currentSession = orchestrator.currentSession;
      
      return {
        success: true,
        status: {
          initialized: !!agentSystem,
          currentSession,
          taskQueue: state.taskQueue.length,
          completedTasks: state.completedTasks.length,
          failedTasks: state.failedTasks.length,
          activeAgents: Object.keys(state.agents).filter(k => state.agents[k].currentTask).length,
          handoffCount: state.handoffs.length,
          sessions: state.sessions
        }
      };
    } catch (error) {
      console.error('[AGENT] Status failed:', error);
      return { success: false, error: error.message };
    }
  });

  // Reset agent system state
  ipcMain.handle('agent-reset', async () => {
    try {
      const { stateManager } = getAgentSystem();
      stateManager.resetState();
      agentSystem = null; // Force re-initialization
      
      return { success: true, message: 'Agent system reset successfully' };
    } catch (error) {
      console.error('[AGENT] Reset failed:', error);
      return { success: false, error: error.message };
    }
  });

  // Get agent handoff history
  ipcMain.handle('agent-handoffs', async () => {
    try {
      const { stateManager } = getAgentSystem();
      const state = stateManager.getState();
      return { success: true, handoffs: state.handoffs };
    } catch (error) {
      console.error('[AGENT] Get handoffs failed:', error);
      return { success: false, error: error.message };
    }
  });
}

// ===== VISUAL CONTEXT MANAGEMENT (AI Awareness) =====
let visualContextHistory = [];
const MAX_VISUAL_CONTEXT_ITEMS = 10;

/**
 * Store visual context for AI processing
 */
function storeVisualContext(imageData) {
  visualContextHistory.push({
    ...imageData,
    id: `vc-${Date.now()}`
  });

  // Keep only recent items
  if (visualContextHistory.length > MAX_VISUAL_CONTEXT_ITEMS) {
    visualContextHistory.shift();
  }

  // Also add to AI service for vision capabilities
  aiService.addVisualContext(imageData);

  // Notify chat window of visual context update
  if (chatWindow) {
    chatWindow.webContents.send('visual-context-update', {
      count: visualContextHistory.length,
      latest: imageData.timestamp
    });
  }
}

/**
 * Initialize the application
 */
app.whenReady().then(() => {
  loadChatBoundsPrefs();
  createOverlayWindow();
  createChatWindow();
  createTray();
  registerShortcuts();
  setupIPC();
  
  // Start the UI watcher for live UI monitoring
  try {
    uiWatcher = new UIWatcher({
      pollInterval: 400,
      maxElements: 60,
      includeInvisible: false
    });
    uiWatcher.on('ui-changed', (diff) => {
      // Forward UI changes to overlay for live mirror updates
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.webContents.send('ui-watcher-update', diff);
      }
    });
    uiWatcher.start();
    console.log('[Main] UI Watcher started for live UI monitoring');
  } catch (e) {
    console.warn('[Main] Could not start UI watcher:', e.message);
  }
  
  // Set up Copilot OAuth callback to notify chat on auth completion
  aiService.setOAuthCallback((result) => {
    if (chatWindow && !chatWindow.isDestroyed()) {
      chatWindow.webContents.send('agent-response', {
        text: result.success ? result.message : `Authentication failed: ${result.message}`,
        type: result.success ? 'system' : 'error',
        timestamp: Date.now()
      });
      
      // Also send auth status update
      chatWindow.webContents.send('auth-status', {
        provider: 'copilot',
        status: result.success ? 'connected' : 'error'
      });
    }
  });
  
  // Try to load saved Copilot token
  aiService.loadCopilotToken();
  
  // Send initial auth status after a short delay (wait for chat window to be ready)
  setTimeout(() => {
    if (chatWindow && !chatWindow.isDestroyed()) {
      const status = aiService.getStatus();
      const tokenPath = require('path').join(app.getPath('appData'), 'copilot-agent', 'copilot-token.json');
      const hasCopilotToken = require('fs').existsSync(tokenPath);
      
      chatWindow.webContents.send('auth-status', {
        provider: status.provider,
        status: hasCopilotToken ? 'connected' : 'disconnected'
      });
    }
  }, 1000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createOverlayWindow();
      createChatWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Clean up shortcuts and UI watcher on quit
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (uiWatcher) {
    uiWatcher.stop();
    console.log('[Main] UI Watcher stopped');
  }
});

// Prevent app from quitting when closing chat window
app.on('before-quit', () => {
  app.isQuitting = true;
});
