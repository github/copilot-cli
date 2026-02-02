# Quick Start Guide

## Installation & Setup

### Prerequisites
- Node.js v22 or higher
- npm v10 or higher
- macOS or Windows operating system

### Install

#### Option 1: Global Install (npm)

Once published to npm, install globally:
```bash
npm install -g copilot-liku-cli
```

Then run from any directory:
```bash
liku          # Start the application
liku --help   # See available commands
```

#### Option 2: Local Development

For contributing or local development:
```bash
# Clone the repository
git clone https://github.com/TayDa64/copilot-Liku-cli.git
cd copilot-Liku-cli

# Install dependencies
npm install

# Link for global usage
npm link

# Start the application
liku start
# or
npm start
```

## First Use

### 1. Application Launch
When you start the application:
- A system tray icon appears (look in your system tray/menu bar)
- The overlay starts in **passive mode** (invisible and click-through)
- The chat window is hidden by default

### 2. Opening the Chat Window
Three ways to open chat:
1. **Click the tray icon** (macOS menu bar / Windows system tray)
2. **Press hotkey**: `Ctrl+Alt+Space` (or `Cmd+Alt+Space` on macOS)
3. **Right-click tray icon** → Select "Open Chat"

### 3. Using Selection Mode
To interact with screen elements:
1. Open chat window
2. Click the **"Selection"** button in the header
3. The overlay will show interactive dots across your screen
4. Click any dot to select it
5. The selection appears in chat
6. Overlay automatically returns to passive mode

### 4. Sending Commands
In the chat window:
1. Type your command in the input field
2. Press **Enter** or click **"Send"**
3. The agent (currently a stub) will echo your message
4. Messages appear in the chat history

### 5. Returning to Passive Mode
To make the overlay click-through again:
1. Click the **"Passive"** button in chat
2. Or select a dot (automatically switches to passive)

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Alt+Space` (macOS: `Cmd+Alt+Space`) | Toggle chat window |
| `Ctrl+Shift+O` (macOS: `Cmd+Shift+O`) | Toggle overlay visibility |
| `Ctrl+Alt+I` (macOS: `Cmd+Alt+I`) | Toggle inspect mode |
| `Ctrl+Alt+F` (macOS: `Cmd+Alt+F`) | Toggle fine grid dots |
| `Ctrl+Alt+G` (macOS: `Cmd+Alt+G`) | Show all grid levels |
| `Ctrl+Alt+=` (macOS: `Cmd+Alt+=`) | Zoom in grid |
| `Ctrl+Alt+-` (macOS: `Cmd+Alt+-`) | Zoom out grid |

## Tray Menu

Right-click the tray icon to see:
- **Open Chat** - Show/hide the chat window
- **Toggle Overlay** - Show/hide the overlay
- **Quit** - Exit the application

## Chat Window Features

### Message Types
- **User messages** (blue, right-aligned): Your commands
- **Agent messages** (gray, left-aligned): Agent responses
- **System messages** (centered, italic): Status updates

### Mode Controls
- **Passive button**: Makes overlay click-through (normal use)
- **Selection button**: Makes overlay interactive with dots

### Chat History
- Automatically scrolls to newest messages
- Shows timestamps for each message
- Persists while window is open

## Common Tasks

### Selecting a Screen Element
```
1. Press Ctrl+Alt+Space to open chat
2. Click "Selection" button
3. Click a dot on the screen
4. Selection appears in chat
5. Overlay returns to passive mode
```

### Hiding the Overlay
```
1. Right-click tray icon
2. Select "Toggle Overlay"
3. Or press Ctrl+Shift+O
```

### Exiting the Application
```
1. Right-click tray icon
2. Select "Quit"
```

## Understanding Modes

### Passive Mode (Default)
- ✅ Overlay is completely invisible to mouse
- ✅ You can click through to applications below
- ✅ No performance impact
- ✅ No dots visible
- ✅ Best for normal computer use

### Selection Mode
- ✅ Overlay captures mouse events
- ✅ Dots appear across the screen
- ✅ Click dots to select screen positions
- ✅ Mode indicator visible in top-right
- ⚠️ Cannot interact with applications below overlay

### Inspect Mode (New!)
- ✅ Detects UI elements using accessibility APIs
- ✅ Shows bounding boxes around actionable regions
- ✅ Hover reveals tooltips with element details
- ✅ Click regions to select for AI targeting
- ✅ AI receives detected regions for precision clicks
- ✅ Toggle with `Ctrl+Alt+I`

**Using Inspect Mode:**
1. Enable selection mode first
2. Press `Ctrl+Alt+I` to toggle inspect mode
3. Cyan boxes appear around detected UI elements
4. Hover over a box to see:
   - Element role (button, textbox, etc.)
   - Label/text content
   - Confidence score
   - Click coordinates
5. Click a region to select it for AI targeting
6. The AI will use the precise coordinates for actions

## Tips & Tricks

### Positioning the Chat Window
- Drag the chat window to reposition it
- Resize it by dragging edges
- Default position: bottom-right corner

### Hiding the Chat
- Close button hides (doesn't quit app)
- App continues running in system tray
- Reopen anytime with hotkey or tray icon

### Working with Multiple Screens
- Overlay covers primary display
- Chat window stays on primary display
- Move chat to secondary display if needed

### Best Practices
1. Keep overlay in passive mode when not selecting
2. Use hotkeys for quick access to chat
3. Hide chat when not in use to maximize screen space
4. Use selection mode only when targeting elements

## Troubleshooting

### Chat Window Doesn't Appear
- Check if it's hidden behind other windows
- Try the hotkey: `Ctrl+Alt+Space`
- Check tray menu: "Open Chat"

### Overlay Blocks My Clicks
- Switch to passive mode: Click "Passive" button in chat
- Or close the overlay: `Ctrl+Shift+O`

### Tray Icon Not Visible
- Check system tray (Windows: bottom-right)
- Check menu bar (macOS: top-right)
- May need to expand hidden icons

### Can't Quit Application
- Right-click tray icon → "Quit"
- Or close all windows and quit from tray

## Next Steps

### For Users
- Experiment with selection mode
- Try different chat window positions
- Explore the configuration options in `CONFIGURATION.md`

### For Developers
- Read `ARCHITECTURE.md` for system design
- See `CONFIGURATION.md` for customization
- Check `TESTING.md` for testing guide
- Review `IMPLEMENTATION_SUMMARY.md` for overview

### Integrating an Agent
See `CONFIGURATION.md` section "Agent Integration" for:
- Connecting to external agent API
- Using worker processes
- Implementing custom agent logic

## Support & Documentation

- **Usage Guide**: `ELECTRON_README.md`
- **Architecture**: `ARCHITECTURE.md`
- **Configuration**: `CONFIGURATION.md`
- **Testing**: `TESTING.md`
- **Implementation**: `IMPLEMENTATION_SUMMARY.md`

## Need Help?

If you encounter issues:
1. Check the troubleshooting section above
2. Review the documentation files
3. Check console logs (DevTools)
4. Open an issue on GitHub

---

**Enjoy using your headless agent with ultra-thin overlay!** 🎉
