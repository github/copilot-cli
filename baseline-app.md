# Copilot CLI Baseline Application - Implementation Roadmap

## Vision: Local Agentic Desktop Assistant

This forked Copilot CLI extends beyond a terminal tool into a **local agentic desktop assistant** with:
- **Electron Overlay**: Transparent grid system for precise screen targeting
- **Visual Awareness**: Real-time screen capture, OCR, and UI element detection
- **System Automation**: Mouse, keyboard, and window control via native APIs
- **AI Integration**: Multi-provider support (Copilot, OpenAI, Anthropic, Ollama)

The goal is to create a baseline application where the AI agent can:
1. See the user's screen via screen capture
2. Identify UI elements via accessibility APIs and inspect mode
3. Execute actions (click, type, scroll) with precision
4. Verify outcomes and self-correct

---

## 🔴 CRITICAL BLOCKERS

### BLOCKER-1: Preload Script Failure ✅ FIXED
- **File**: `src/renderer/overlay/preload.js`
- **Issue**: `require('../../shared/grid-math')` fails in Electron sandbox
- **Impact**: `window.electronAPI` = undefined, overlay doesn't render
- **Status**: [x] Fixed

**Solution Applied**:
- Inlined grid-math constants and `labelToScreenCoordinates()` directly in preload.js
- Sandboxed preload can't use `require('path')` or load external modules
- Removed dependency on external grid-math.js in preload context

### BLOCKER-2: PowerShell Here-String Syntax Broken ✅ FIXED
- **File**: `src/main/visual-awareness.js`
- **Issue**: `.replace(/\n/g, ' ')` breaks Here-Strings (`@" ... "@`)
- **Impact**: All 4 PowerShell functions return parse errors
- **Status**: [x] Fixed

**Solution Applied**:
- Created `executePowerShellScript()` helper function
- Writes PS1 to temp files in `os.tmpdir()/liku-ps`
- Executes with `powershell -NoProfile -ExecutionPolicy Bypass -File <path>`
- Cleans up temp files after execution
- Updated all 4 functions: `getActiveWindow()`, `extractWithWindowsOCR()`, `detectUIElements()`, `findElementAtPoint()`

### BLOCKER-3: Click-Through Failure on Background Windows ✅ FIXED
- **File**: `src/main/system-automation.js`
- **Issue**: AI clicks not reaching VS Code through transparent overlay
- **Root Cause**: `mouse_event()` is deprecated and doesn't work reliably with:
  - Electron's `setIgnoreMouseEvents(true, { forward: true })` (only forwards hardware events)
  - Layered windows with `WS_EX_TRANSPARENT` style
  - Background windows that aren't focused
- **Status**: [x] Fixed

**Solution Applied**:
1. **Replaced `mouse_event()` with `SendInput()`** - Modern Win32 API with better UIPI handling
2. **Added `SetForegroundWindow()` activation** - Activates target window before clicking
3. **Implemented `GetRealWindowFromPoint()`** - Finds actual window under cursor, skipping transparent overlays
4. **Added `ForceForeground()` with thread attachment** - Uses `AttachThreadInput()` to overcome focus restrictions
5. Updated functions: `click()`, `doubleClick()`, `drag()`

**Technical Details**:
```csharp
// Skip transparent windows (like Electron overlay)
int exStyle = GetWindowLong(hwnd, GWL_EXSTYLE);
bool isTransparent = (exStyle & WS_EX_TRANSPARENT) != 0;

// Force activate target window
AttachThreadInput(currentThread, foregroundThread, true);
SetForegroundWindow(hwnd);
AttachThreadInput(currentThread, foregroundThread, false);

// Use SendInput instead of deprecated mouse_event
SendInput(2, inputs, Marshal.SizeOf(typeof(INPUT)));
```

---

## 🟠 MISSING FEATURES

### FEATURE-3: targetId-Based Actions (M5.2)
- **Spec**: "Prefer `targetId` actions; fallback to grid if no regions"
- **Status**: [ ] Not Implemented

**Implementation Tasks**:
- [ ] Add `targetId` field to action schema in system prompt
- [ ] Create `resolveTargetId(targetId)` function in ai-service.js
- [ ] Implement fallback: targetId → inspect region center → grid coordinate
- [ ] Update action executor to accept targetId

### FEATURE-4: Inject generateAIInstructions()
- **File**: `src/main/inspect-service.js`
- **Status**: [ ] Defined but never called

**Implementation Tasks**:
- [ ] Call `generateAIInstructions()` in ai-service.js message builder
- [ ] Append to system prompt when inspect mode is active
- [ ] Include instructions for referencing regions by ID

### FEATURE-5: Screenshot Diff Heatmap (M4.2)
- **File**: `src/main/visual-awareness.js`
- **Status**: [ ] Placeholder only

**Implementation Tasks**:
- [ ] Implement pixel-level comparison using canvas or native image lib
- [ ] Generate bounding boxes for changed regions
- [ ] Create heatmap overlay visualization
- [ ] Expose diff results to AI context

### FEATURE-6: Verification Summary (M4.3)
- **Spec**: "Attach verification summary to AI response"
- **Status**: [ ] Not Implemented

**Implementation Tasks**:
- [ ] Capture screenshot after action sequence
- [ ] Compare with expected outcome (from `verification` field)
- [ ] Generate verification report
- [ ] Feed back to AI for confirmation/retry

### FEATURE-7: Input Focus Tracking
- **Spec**: "Highlight focused control; expose caret position"
- **Status**: [ ] Not Implemented

**Implementation Tasks**:
- [ ] Query focused element via UIAutomation API
- [ ] Extract caret position from text controls
- [ ] Highlight focused element in overlay
- [ ] Include focus info in AI context

### FEATURE-8: Window zOrder Population
- **File**: `src/shared/inspect-types.js`
- **Status**: [ ] Hardcoded to 0

**Implementation Tasks**:
- [ ] Query window z-order via Win32 API
- [ ] Populate `zOrder` field in window context
- [ ] Use for multi-window targeting

---

## 🟡 PARTIAL IMPLEMENTATIONS

### PARTIAL-9: Inspect Regions Display (A1-A3)
- **Status**: ✅ Code exists, blocked by BLOCKER-1 and BLOCKER-2
- **Files**: `overlay.js`, `index.html` (styles exist)

**Unblock Tasks**:
- [ ] Fix BLOCKER-1 (preload)
- [ ] Fix BLOCKER-2 (PowerShell)
- [ ] Test region rendering end-to-end

### PARTIAL-10: AI Context Payload (M5.1)
- **Status**: ⚠️ Regions appended to user message

**Completion Tasks**:
- [ ] Call `generateAIInstructions()` (FEATURE-4)
- [ ] Add `targetId` support (FEATURE-3)
- [ ] Include window context with zOrder (FEATURE-8)

---

## Implementation Phases

### Phase 1: Critical Fixes (Unblock Overlay)
**Priority**: 🔴 CRITICAL
**Estimate**: 2-3 hours

| Task ID | Description | File | Status |
|---------|-------------|------|--------|
| P1.1 | Fix preload require path | `preload.js` | [ ] |
| P1.2 | Rewrite PowerShell execution | `visual-awareness.js` | [ ] |
| P1.3 | Test overlay renders dots | Manual test | [ ] |
| P1.4 | Test inspect mode toggle | Manual test | [ ] |

### Phase 2: Core Functionality
**Priority**: 🟠 HIGH
**Estimate**: 4-6 hours

| Task ID | Description | File | Status |
|---------|-------------|------|--------|
| P2.1 | Implement targetId resolution | `ai-service.js` | [ ] |
| P2.2 | Update system prompt with targetId | `ai-service.js` | [ ] |
| P2.3 | Inject generateAIInstructions | `ai-service.js` | [ ] |
| P2.4 | Test AI uses targetId for clicks | Manual test | [ ] |

### Phase 3: Verification & Feedback Loop
**Priority**: 🟡 MEDIUM
**Estimate**: 4-6 hours

| Task ID | Description | File | Status |
|---------|-------------|------|--------|
| P3.1 | Implement pixel diff comparison | `visual-awareness.js` | [ ] |
| P3.2 | Create heatmap overlay rendering | `overlay.js` | [ ] |
| P3.3 | Add verification summary to response | `ai-service.js` | [ ] |
| P3.4 | Implement retry logic on failure | `ai-service.js` | [ ] |

### Phase 4: Enhanced Context
**Priority**: 🟢 LOW
**Estimate**: 2-4 hours

| Task ID | Description | File | Status |
|---------|-------------|------|--------|
| P4.1 | Track focused control | `visual-awareness.js` | [ ] |
| P4.2 | Extract caret position | `visual-awareness.js` | [ ] |
| P4.3 | Populate window zOrder | `visual-awareness.js` | [ ] |
| P4.4 | Add focus info to AI context | `ai-service.js` | [ ] |

---

## Testing Checklist

### Unit Tests
- [ ] `grid-math.js` coordinate conversions
- [ ] `inspect-types.js` region functions
- [ ] `system-automation.js` action parsing

### Integration Tests
- [ ] Overlay renders with electronAPI available
- [ ] Inspect mode detects UI elements
- [ ] AI receives inspect context in prompt
- [ ] Actions execute at correct coordinates

### Manual Verification
- [ ] Launch app: `npm start`
- [ ] Overlay dots visible on screen
- [ ] Ctrl+Alt+I toggles inspect mode
- [ ] Hover shows tooltips on detected regions
- [ ] Chat AI can describe screen contents
- [ ] Chat AI can click detected buttons
- [ ] Screenshot diff shows changes after action

---

## Architecture Notes

### Local Agent Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                     Electron Main Process                    │
├─────────────────────────────────────────────────────────────┤
│  ai-service.js      │ system-automation.js │ visual-awareness │
│  - Multi-provider   │ - Mouse/keyboard     │ - Screen capture  │
│  - Context builder  │ - PowerShell exec    │ - UIAutomation    │
│  - Action parser    │ - Grid math          │ - OCR integration │
├─────────────────────────────────────────────────────────────┤
│                       IPC Bridge                             │
├─────────────────────────────────────────────────────────────┤
│        Overlay Renderer        │       Chat Renderer         │
│  - Canvas grid dots            │  - Message history          │
│  - Inspect region boxes        │  - Action confirmation      │
│  - Tooltip rendering           │  - Visual context preview   │
└─────────────────────────────────────────────────────────────┘
```

### CLI Integration Path
Future: The Electron features can be exposed to a CLI interface:
- `liku inspect` - Launch overlay in inspect mode
- `liku click <targetId>` - Click a detected region
- `liku capture` - Take screenshot and analyze
- `liku ask "click the submit button"` - Natural language action

---

## Success Criteria

### Baseline Application Complete When:
1. ✅ Overlay renders dot grid without errors
2. ✅ Inspect mode detects and displays UI regions
3. ✅ AI receives region data in context
4. ✅ AI can target regions by ID or coordinates
5. ✅ Actions execute and verify outcomes
6. ✅ Screenshot diff shows what changed

### Definition of Done for Each Task:
- Code implemented and compiles without errors
- Feature works in manual testing
- No regression in existing functionality
- Console shows expected log messages

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-28 | 0.0.2 | Identified critical blockers, created baseline roadmap |
| TBD | 0.1.0 | Phase 1 complete - Overlay functional |
| TBD | 0.2.0 | Phase 2 complete - targetId actions working |
| TBD | 0.3.0 | Phase 3 complete - Verification loop |
| TBD | 1.0.0 | Baseline application complete |
