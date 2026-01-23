# Electron Headless Agent + Ultra-Thin Overlay

This is an implementation of an Electron-based application with a headless agent architecture and ultra-thin overlay interface.

## Architecture

The application consists of three main components:

### 1. Main Process (`src/main/index.js`)
- Manages overlay window (transparent, full-screen, always-on-top)
- Manages chat window (small, edge-docked)
- Handles system tray icon and context menu
- Registers global hotkeys:
  - `Ctrl+Alt+Space` (or `Cmd+Alt+Space` on macOS): Toggle chat window
  - `Ctrl+Shift+O` (or `Cmd+Shift+O` on macOS): Toggle overlay window
- Manages IPC communication between windows

### 2. Overlay Window (`src/renderer/overlay/`)
- Full-screen, transparent, always-on-top window
- Click-through by default (passive mode)
- Displays a coarse grid of dots (100px spacing)
- In selection mode, dots become interactive
- Minimal footprint with vanilla JavaScript

### 3. Chat Window (`src/renderer/chat/`)
- Small window positioned at bottom-right by default
- Contains:
  - Chat history display
  - Mode controls (Passive/Selection)
  - Input field for commands
- Hidden by default, shown via hotkey or tray icon

## Installation

```bash
npm install
```

## Running the Application

```bash
npm start
```

## Usage

1. **Launch the application** - The overlay starts in passive mode (click-through)
2. **Open chat window** - Click tray icon or press `Ctrl+Alt+Space`
3. **Enable selection mode** - Click "Selection" button in chat window
4. **Select dots** - Click any dot on the overlay to select it
5. **Return to passive mode** - Automatically switches back after selection, or click "Passive" button

## Modes

### Passive Mode
- Overlay is completely click-through
- Users can interact with applications normally
- Overlay is invisible to mouse events

### Selection Mode
- Overlay captures mouse events
- Dots become interactive
- Click dots to select screen positions
- Automatically returns to passive mode after selection

## Platform-Specific Behavior

### macOS
- Uses `screen-saver` window level to float above fullscreen apps
- Hides from Dock
- Tray icon appears in menu bar

### Windows
- Uses standard `alwaysOnTop` behavior
- Tray icon appears in system tray
- Works with most windowed applications

## Architecture Benefits

1. **Minimal footprint**: Single overlay renderer with vanilla JS, no heavy frameworks
2. **Non-intrusive**: Overlay is transparent and sparse; chat is at screen edge
3. **Performance**: Click-through mode prevents unnecessary event processing
4. **Extensibility**: IPC message system ready for agent integration
5. **Cross-platform**: Works on macOS and Windows with appropriate adaptations

## Future Enhancements

- Agent integration (LLM-based reasoning)
- Screen capture and analysis
- Fine grid mode for precise targeting
- Highlight layers for suggested targets
- Persistent window positioning
- Custom tray icon
- Task list implementation
- Settings panel

## Development

The application follows Electron best practices:
- Context isolation enabled
- Node integration disabled in renderers
- Preload scripts for secure IPC
- Minimal renderer dependencies
- Single persistent windows (no repeated creation/destruction)

## File Structure

```
src/
├── main/
│   └── index.js           # Main process
├── renderer/
│   ├── overlay/
│   │   ├── index.html     # Overlay UI
│   │   └── preload.js     # Overlay IPC bridge
│   └── chat/
│       ├── index.html     # Chat UI
│       └── preload.js     # Chat IPC bridge
└── assets/
    └── tray-icon.png      # System tray icon (placeholder)
```
