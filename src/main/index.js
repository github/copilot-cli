const { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain, screen } = require('electron');
const path = require('path');

// Keep references to windows to prevent garbage collection
let overlayWindow = null;
let chatWindow = null;
let tray = null;

// State management
let overlayMode = 'passive'; // 'passive' or 'selection'
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
    focusable: false,
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
  } else {
    overlayWindow.setAlwaysOnTop(true);
  }

  // Make full screen
  overlayWindow.setFullScreen(true);

  // Start in click-through mode
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });

  overlayWindow.loadFile(path.join(__dirname, '../renderer/overlay/index.html'));

  // Prevent overlay from appearing in Dock/Taskbar
  if (process.platform === 'darwin') {
    app.dock.hide();
  }

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });
}

/**
 * Create the chat window positioned at screen edge
 */
function createChatWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  // Position at bottom-right corner with some margin
  const chatWidth = 350;
  const chatHeight = 500;
  const margin = 20;

  chatWindow = new BrowserWindow({
    width: chatWidth,
    height: chatHeight,
    x: width - chatWidth - margin,
    y: height - chatHeight - margin,
    frame: true,
    transparent: false,
    alwaysOnTop: false,
    skipTaskbar: false,
    resizable: true,
    minimizable: true,
    maximizable: false,
    show: false, // Start hidden
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../renderer/chat/preload.js')
    }
  });

  chatWindow.loadFile(path.join(__dirname, '../renderer/chat/index.html'));

  chatWindow.on('close', (event) => {
    // Hide instead of closing
    event.preventDefault();
    chatWindow.hide();
    isChatVisible = false;
  });

  chatWindow.on('closed', () => {
    chatWindow = null;
  });
}

/**
 * Create system tray icon with menu
 */
function createTray() {
  // Create tray icon with proper error handling
  const trayIconPath = path.join(__dirname, '../assets/tray-icon.png');
  const fs = require('fs');
  
  // Check if icon file exists
  if (fs.existsSync(trayIconPath)) {
    try {
      tray = new Tray(trayIconPath);
    } catch (error) {
      console.error('Failed to load tray icon:', error);
      tray = new Tray(require('electron').nativeImage.createEmpty());
    }
  } else {
    console.warn('Tray icon not found at:', trayIconPath);
    tray = new Tray(require('electron').nativeImage.createEmpty());
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
 * Toggle chat window visibility
 */
function toggleChat() {
  if (!chatWindow) return;

  if (chatWindow.isVisible()) {
    chatWindow.hide();
    isChatVisible = false;
  } else {
    chatWindow.show();
    chatWindow.focus();
    isChatVisible = true;
  }
}

/**
 * Toggle overlay visibility
 */
function toggleOverlay() {
  if (!overlayWindow) return;

  if (overlayWindow.isVisible()) {
    overlayWindow.hide();
  } else {
    overlayWindow.show();
  }
}

/**
 * Set overlay mode (passive or selection)
 */
function setOverlayMode(mode) {
  overlayMode = mode;
  
  if (!overlayWindow) return;

  if (mode === 'passive') {
    // Full click-through
    overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  } else if (mode === 'selection') {
    // Allow interaction with overlay
    overlayWindow.setIgnoreMouseEvents(false);
  }

  // Notify overlay renderer of mode change
  overlayWindow.webContents.send('mode-changed', mode);
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

    // Switch back to passive mode after selection
    setOverlayMode('passive');
  });

  // Handle mode change requests from chat
  ipcMain.on('set-mode', (event, mode) => {
    setOverlayMode(mode);
  });

  // Handle chat messages
  ipcMain.on('chat-message', (event, message) => {
    console.log('Chat message:', message);
    
    // Here we would forward to agent
    // For now, echo back
    if (chatWindow) {
      chatWindow.webContents.send('agent-response', {
        text: `Echo: ${message}`,
        timestamp: Date.now()
      });
    }
  });

  // Get current state
  ipcMain.handle('get-state', () => {
    return {
      overlayMode,
      isChatVisible
    };
  });
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
