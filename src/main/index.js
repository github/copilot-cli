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

// State management
let overlayMode = 'selection'; // start in selection so the grid is visible immediately
let isChatVisible = false;

/**
 * Create the transparent overlay window that floats above all other windows
 */
function createOverlayWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
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
  overlayWindow.webContents.on('console-message', (event) => {
    const { level, message, line, sourceId } = event;
    console.log(`[overlay console] (${level}) ${sourceId}:${line} - ${message}`);
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

  chatWindow.webContents.on('did-finish-load', () => {
    // Force bounds one more time after load
    chatWindow.setBounds({ x: X, y: Y, width: W, height: H });
    console.log(`[CHAT] Loaded. Bounds: ${JSON.stringify(chatWindow.getBounds())}`);
  });

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
  console.log('[SHORTCUTS] Registering overlay shortcuts (F, G, +, -, Esc)');
  
  // F to toggle fine grid
  globalShortcut.register('F', () => {
    if (overlayWindow && overlayMode === 'selection') {
      console.log('[SHORTCUTS] F pressed - toggle fine grid');
      overlayWindow.webContents.send('overlay-command', { action: 'toggle-fine' });
    }
  });
  
  // G to show all grids
  globalShortcut.register('G', () => {
    if (overlayWindow && overlayMode === 'selection') {
      console.log('[SHORTCUTS] G pressed - show all grids');
      overlayWindow.webContents.send('overlay-command', { action: 'show-all' });
    }
  });
  
  // = (plus without shift) to zoom in
  globalShortcut.register('=', () => {
    if (overlayWindow && overlayMode === 'selection') {
      console.log('[SHORTCUTS] = pressed - zoom in');
      overlayWindow.webContents.send('overlay-command', { action: 'zoom-in' });
    }
  });
  
  // - to zoom out
  globalShortcut.register('-', () => {
    if (overlayWindow && overlayMode === 'selection') {
      console.log('[SHORTCUTS] - pressed - zoom out');
      overlayWindow.webContents.send('overlay-command', { action: 'zoom-out' });
    }
  });
  
  // Escape to cancel selection
  globalShortcut.register('Escape', () => {
    if (overlayWindow && overlayMode === 'selection') {
      console.log('[SHORTCUTS] Escape pressed - cancel');
      overlayWindow.webContents.send('overlay-command', { action: 'cancel' });
    }
  });
}

/**
 * Unregister overlay-specific shortcuts when leaving selection mode
 */
function unregisterOverlayShortcuts() {
  console.log('[SHORTCUTS] Unregistering overlay shortcuts');
  const keys = ['F', 'G', '=', '-', 'Escape'];
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

  // Handle chat messages
  ipcMain.on('chat-message', async (event, message) => {
    console.log('Chat message:', message);
    
    // Check for slash commands first
    if (message.startsWith('/')) {
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

    // Check if we should include visual context
    const includeVisualContext = message.toLowerCase().includes('screen') || 
                                  message.toLowerCase().includes('see') ||
                                  message.toLowerCase().includes('look') ||
                                  message.toLowerCase().includes('show') ||
                                  message.toLowerCase().includes('capture') ||
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
          chatWindow.webContents.send('agent-response', {
            text: result.message,
            timestamp: Date.now(),
            provider: result.provider,
            hasVisualContext: result.hasVisualContext
          });
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
  ipcMain.on('capture-screen', async (event, options = {}) => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { 
          width: screen.getPrimaryDisplay().workAreaSize.width,
          height: screen.getPrimaryDisplay().workAreaSize.height
        }
      });

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
        console.log(`Screen captured: ${imageData.width}x${imageData.height}`);

        // Store in visual context for AI processing
        storeVisualContext(imageData);
      }
    } catch (error) {
      console.error('Screen capture failed:', error);
      if (chatWindow) {
        chatWindow.webContents.send('screen-captured', { error: error.message });
      }
    }
  });

  // Capture a specific region
  ipcMain.on('capture-region', async (event, { x, y, width, height }) => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { 
          width: screen.getPrimaryDisplay().workAreaSize.width,
          height: screen.getPrimaryDisplay().workAreaSize.height
        }
      });

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
      aiStatus
    };
  });

  // Get AI service status
  ipcMain.handle('get-ai-status', () => {
    return aiService.getStatus();
  });

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
 * Get visual context for AI (called by agent integration)
 */
function getVisualContext() {
  return visualContextHistory;
}

/**
 * Initialize the application
 */
app.whenReady().then(() => {
  createOverlayWindow();
  createChatWindow();
  createTray();
  registerShortcuts();
  setupIPC();
  
  // Set up Copilot OAuth callback to notify chat on auth completion
  aiService.setOAuthCallback((result) => {
    if (chatWindow && !chatWindow.isDestroyed()) {
      chatWindow.webContents.send('agent-response', {
        text: result.success ? result.message : `Authentication failed: ${result.message}`,
        type: result.success ? 'system' : 'error',
        timestamp: Date.now()
      });
    }
  });
  
  // Try to load saved Copilot token
  aiService.loadCopilotToken();

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

// Clean up shortcuts on quit
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// Prevent app from quitting when closing chat window
app.on('before-quit', () => {
  app.isQuitting = true;
});
