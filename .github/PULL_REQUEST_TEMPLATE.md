# Precision Grounding + Inspect Overlay (Opus Execution Plan)

## Summary
- Align grid math across overlay, main, and AI prompts using shared constants.
- Add local fine grid around the cursor for precise targeting without full-grid noise.
- Introduce devtools-style inspect overlays (actionable element boxes + metadata).
- Ensure AI uses the same visual grounding as the user.

## Goals / Non-Goals
**Goals**
- User and AI see the same targeting primitives (grid + inspect metadata).
- Fine precision selection without needing full fine-grid visibility.
- Deterministic coordinate mapping across renderer/main/AI prompt.

**Non-Goals**
- Full external app DOM access (we rely on OCR + visual detection).
- Replacing the grid system entirely.

## Problem
- Fine dots do not appear around the cursor, preventing high-precision selection.
- AI coordinate grounding drifts due to mismatched math across modules.
- AI lacks the same visualization/inspection context the user sees.

## Approach
1) Shared grid math module used by renderer, main, and AI prompt.
2) Local fine-grid rendering around cursor in selection mode.
3) Inspect layer backed by visual-awareness to surface actionable regions.
4) AI prompt + action executor aligned to overlay math and inspect metadata.

## Key Changes (Planned)
- `src/shared/grid-math.js`: canonical grid constants + label → pixel conversion.
- `src/renderer/overlay/overlay.js`: local fine-grid render + shared math usage.
- `src/renderer/overlay/preload.js`: expose grid math to renderer safely.
- `src/main/system-automation.js`: unify coordinate mapping.
- `src/main/ai-service.js`: ground prompts + fine label support.
- `src/main/index.js`: optional inspect toggle + overlay commands.
- `src/main/visual-awareness.js`: actionable element detection + metadata surface.

## Implementation Plan
**Phase 1: Grounding & Precision**
- [x] Shared grid math module and renderer/main integration.
- [x] Local fine-grid around cursor with snap highlight.
- [ ] Add label→pixel IPC from main to overlay to guarantee exact mapping.
- [ ] Add fine label rendering on hover (C3.12) in local grid.

**Phase 2: Inspect Overlay (Devtools‑Style)**
- [ ] Add inspect toggle command and UI indicator.
- [ ] Visual-awareness pass: actionable region detection (buttons, inputs, links).
- [ ] Overlay layer draws bounding boxes + tooltip with text/role/confidence.
- [ ] Selection handoff: click through to element center.

**Phase 3: AI Grounding + Action Execution**
- [ ] Include inspect metadata + screen size in AI context.
- [ ] Prefer inspect targets; fallback to grid only if needed.
- [ ] Add “precision click” action with safety confirmation.

## UX Notes
- Inspect mode should be visually distinct (e.g., cyan boxes, tooltip anchored).
- Local fine grid should fade in/out smoothly and never block click-through.
- Keep overlays under 16ms frame budget; throttle redraw to pointer move.

## Testing
**Unit**
- Grid label conversions (coarse + fine).
- Shared constants remain consistent across renderer/main/AI.

**Manual**
- Cursor-local fine dots appear in selection mode and track cursor.
- Background click-through still works in both modes.
- Inspect overlay alignment with visible UI elements.

**Regression**
- Coarse grid rendering.
- Pulse effect visibility.
- Safety confirmation flow intact.

## Risks / Mitigations
- DPI scaling drift → use Electron `screen.getPrimaryDisplay().scaleFactor`.
- Performance → local fine grid only; throttled draw.
- Overlay click-through → hide overlay only at click execution.

## Observability / Debugging
- Add a debug overlay toggle for grid math readouts.
- Log label→pixel conversions when in inspect mode.
- Capture last 10 action targets in memory for post-mortem.

## Opus Notes (Websearch Required)
- Verify Electron overlay best practices (`setIgnoreMouseEvents` behavior).
- Validate DPI/scaling guidance for Windows and macOS.
- Check common patterns for devtools-like overlays.

## Checklist
- [ ] Shared grid math used everywhere (renderer, main, AI prompt).
- [ ] Local fine grid visible and performant.
- [ ] Inspect overlay works and aligns with AI context.
- [ ] AI actions target inspect regions with correct coordinates.
- [ ] Tests updated/added and passing.
