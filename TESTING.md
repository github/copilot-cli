# Testing Guide

## Manual Testing Checklist

### Initial Launch
- [ ] Application starts without errors
- [ ] Tray icon appears in system tray/menu bar
- [ ] Overlay window is invisible and click-through
- [ ] Chat window is hidden by default

### Tray Icon Functionality
- [ ] Right-click tray icon shows context menu
- [ ] "Open Chat" menu item works
- [ ] "Toggle Overlay" menu item works
- [ ] "Quit" menu item closes application
- [ ] Click tray icon toggles chat (macOS)

### Global Hotkeys
- [ ] `Ctrl+Alt+Space` (Cmd+Alt+Space on macOS) toggles chat window
- [ ] `Ctrl+Shift+O` (Cmd+Shift+O on macOS) toggles overlay visibility
- [ ] Hotkeys work from any application

### Chat Window
- [ ] Window appears at bottom-right corner
- [ ] Window is resizable
- [ ] Window can be dragged
- [ ] Closing window hides it (doesn't quit app)
- [ ] Window shows welcome message on first open
- [ ] Mode buttons are visible and functional

### Passive Mode
- [ ] Overlay is completely click-through
- [ ] Can interact with applications normally
- [ ] No dots visible on overlay
- [ ] Mode indicator not visible

### Selection Mode
- [ ] Click "Selection" button activates mode
- [ ] Dots appear on overlay (coarse grid, ~100px spacing)
- [ ] Mode indicator appears in top-right
- [ ] Dots are clickable
- [ ] Clicking dot shows message in chat
- [ ] Automatically returns to passive mode after dot click
- [ ] Cannot interact with applications behind overlay

### Chat Functionality
- [ ] Can type message in input field
- [ ] Enter key sends message
- [ ] Send button works
- [ ] Messages appear in chat history with timestamp
- [ ] User messages appear on right (blue)
- [ ] Agent messages appear on left (gray)
- [ ] System messages appear in center (italic)
- [ ] Chat history scrolls automatically
- [ ] Scrollbar works correctly

### IPC Communication
- [ ] Dot selection in overlay appears in chat
- [ ] Mode changes from chat affect overlay
- [ ] Messages from chat get echoed back (stub agent)

### Window Management
- [ ] Overlay stays on top of all windows
- [ ] Chat window can go behind other windows
- [ ] Minimizing chat window works
- [ ] Reopening chat restores position and size
- [ ] Chat window persists messages between hide/show

### Platform-Specific (macOS)
- [ ] App hidden from Dock
- [ ] Overlay floats above fullscreen apps
- [ ] Tray icon visible in menu bar
- [ ] Mission Control doesn't show overlay as separate space
- [ ] Works correctly with multiple displays

### Platform-Specific (Windows)
- [ ] Tray icon visible in system tray
- [ ] Overlay stays above most windows
- [ ] Works with fullscreen windows
- [ ] Alt+Tab doesn't show overlay
- [ ] Works correctly with multiple displays

### Performance
- [ ] Application starts quickly (< 3 seconds)
- [ ] Memory usage stays reasonable (< 300MB)
- [ ] CPU usage low when idle (< 1%)
- [ ] No lag when switching modes
- [ ] Smooth animations and transitions
- [ ] No memory leaks after extended use

### Edge Cases
- [ ] Changing screen resolution updates overlay
- [ ] Disconnecting/reconnecting displays works
- [ ] Switching between fullscreen apps works
- [ ] Overlay works on secondary displays
- [ ] System sleep/wake preserves state
- [ ] Rapid mode switching doesn't cause issues
- [ ] Many dots can be clicked in sequence

## Automated Testing

### Runtime Smoke Tests (Recommended)

Use these first before manual checklist items:

```bash
# Deterministic two-phase smoke test
# Phase 1: direct in-app chat toggle (no keyboard emulation)
# Phase 2: target-gated overlay shortcut validation
npm run smoke:shortcuts

# Direct chat smoke only (no keyboard emulation)
npm run smoke:chat-direct

# Baseline UI automation module checks
npm run test:ui

# Optional: include keyboard injection checks (disabled by default)
node scripts/test-ui-automation-baseline.js --allow-keys
```

Why this is the default path:

- Avoids accidental key injection into other focused apps (for example VS Code).
- Separates app-runtime failures from shortcut-routing failures.
- Produces deterministic pass/fail results using process/window targeting.
- Uses non-zero exit codes on mismatch so CI/local scripts can fail fast.
- Avoids accidental global key injection in default baseline runs.

### Unit Tests (Future)
```javascript
// Example test structure
describe('Overlay Window', () => {
  it('should create overlay window', () => {
    // Test window creation
  });
  
  it('should set click-through mode', () => {
    // Test ignore mouse events
  });
  
  it('should generate dot grid', () => {
    // Test dot generation
  });
});

describe('IPC Communication', () => {
  it('should send dot selection', () => {
    // Test IPC message
  });
  
  it('should handle mode changes', () => {
    // Test mode switching
  });
});
```

### Integration Tests (Future)
```javascript
const { Application } = require('spectron');

describe('Application Launch', () => {
  let app;
  
  beforeEach(async () => {
    app = new Application({
      path: electron,
      args: [path.join(__dirname, '..')]
    });
    await app.start();
  });
  
  afterEach(async () => {
    if (app && app.isRunning()) {
      await app.stop();
    }
  });
  
  it('should show tray icon', async () => {
    // Test tray presence
  });
});
```

## Performance Testing

### Memory Profiling
1. Open Chrome DevTools (Cmd+Alt+I / Ctrl+Shift+I)
2. Go to Memory tab
3. Take heap snapshot
4. Use application for 5-10 minutes
5. Take another snapshot
6. Compare for memory leaks

### CPU Profiling
1. Open Performance tab in DevTools
2. Record while using application
3. Look for long tasks (> 50ms)
4. Identify optimization opportunities

### Startup Time
```bash
# Measure startup time
time npm start
# Target: < 3 seconds to first window
```

## Security Testing

### CSP Validation
1. Open DevTools Console
2. Look for CSP violations
3. Should see no errors

### IPC Security
1. Verify context isolation is enabled
2. Verify node integration is disabled
3. Check preload scripts expose only necessary APIs

### Dependency Audit
```bash
npm audit
# Should show 0 vulnerabilities
```

## Browser Testing

### Overlay Rendering
- [ ] Transparent background works
- [ ] Dots render correctly
- [ ] Labels visible and positioned correctly
- [ ] Hover effects work smoothly
- [ ] CSS transforms work correctly

### Chat Rendering
- [ ] Dark theme displays correctly
- [ ] Fonts load properly
- [ ] Scrolling is smooth
- [ ] Input field responsive
- [ ] Buttons work correctly

## Debugging Tips

### Enable DevTools

```javascript
// In main process
overlayWindow.webContents.openDevTools({ mode: 'detach' });
chatWindow.webContents.openDevTools({ mode: 'detach' });
```

### Console Logging

```javascript
// Main process logs
console.log('Main process:', data);

// Renderer process logs appear in DevTools console
console.log('Renderer:', data);
```

### IPC Debugging

```javascript
// Log all IPC messages
ipcMain.on('*', (event, ...args) => {
  console.log('IPC:', event.channel, args);
});
```

### Network Monitoring

Use DevTools Network tab to check:
- No unexpected network requests
- All local resources load correctly

## Known Issues

### macOS
- Mission Control may show overlay briefly when switching spaces
- Some fullscreen games might not be covered by overlay
- Accessibility permissions required for synthetic input

### Windows
- Exclusive fullscreen games not covered
- Some UWP apps may be above overlay
- Windows Defender SmartScreen may flag first run

### General
- High DPI displays may need scaling adjustments
- Multiple displays require per-display dot generation
- Very large screens (> 4K) may need coarser grid

## Reporting Issues

When reporting issues, include:
1. Operating system and version
2. Electron version (`npm list electron`)
3. Steps to reproduce
4. Expected vs actual behavior
5. Console logs (DevTools + terminal)
6. Screenshots if applicable
