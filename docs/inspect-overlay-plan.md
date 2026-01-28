# Inspect Overlay Implementation Plan

## Goal
Provide a devtools-style inspect layer that shares the same grounding data
between the user and the AI, improving precision for actionable targets.

## Scope
- Add an inspect toggle that draws actionable boxes.
- Surface text/role/confidence metadata in a tooltip.
- Feed inspect metadata into AI context so the model targets the same regions.
- Keep overlay click-through behavior intact.

## Non-Goals
- Full external DOM access for third-party apps.
- Replacing the grid system entirely.

## Deliverables
1) Inspect overlay renderer (bounding boxes, tooltip, hover focus).
2) Visual-awareness pipeline for actionable regions.
3) AI context payload for inspect regions (JSON).
4) Precision click path: prefer inspect targets, fallback to grid.

## Non-Web Devtools-Style Features (High Impact)
- **Active Window + Process Context**: app name, window title, PID, bounds, z-order.
- **Native Accessibility Tree**: roles/names/values via OS APIs (UIA/AX) mapped to boxes.
- **Control-Type Heuristics**: detect native controls (buttons, menus, dialogs) from screenshots + accessibility hints.
- **Window Region Map**: detect child windows/panels (e.g., dialogs, toolbars) for scoped actions.
- **Input Focus Tracking**: highlight focused control; expose caret position if available.
- **Screenshot Diff + Change Heatmap**: show what changed after each action for verification.
- **Pointer Hit-Test**: infer clickability via cursor changes + repeated hover sampling.
- **System Event Log**: keystrokes/clicks + timestamps + target region, for replay and debugging.

## Spec (Draft)
**Data Contracts**
- `inspect.region[]`: `{ id, bounds, label, text, role, confidence, source, timestamp }`
- `window.context`: `{ appName, windowTitle, pid, bounds, zOrder }`
- `action.trace[]`: `{ actionId, type, targetId?, x, y, timestamp, outcome }`

**Overlay Behavior**
- Inspect mode toggles bounding boxes and tooltips.
- Hover reveals role/text/confidence and highlights closest region.
- Click selects region; sends `targetId` + bounds to main process.

**AI Context**
- Include latest `window.context` + `inspect.region[]` in prompt.
- Prefer `targetId` actions; fallback to grid if no regions.

## Backlog
**Epic A: Inspect Overlay UX**
- A1: Render bounding boxes + tooltip in overlay.
- A2: Hover highlights nearest region and shows metadata.
- A3: Click selects region and emits `targetId`.

**Epic B: Native App Awareness**
- B1: Active window/process metadata collection.
- B2: Native accessibility tree extraction (best-effort, OS-dependent).
- B3: Map accessibility nodes to screen coordinates.

**Epic C: Action Verification**
- C1: Screenshot diff and heatmap after actions.
- C2: Action trace log with timing and outcomes.
- C3: Verification hooks that AI can request explicitly.

## Detailed Task List
**Milestone 1: Inspect Overlay MVP**
- M1.1: Add `inspect` mode toggle + status indicator in overlay UI.
- M1.2: Implement overlay layer for region boxes + hover tooltip.
- M1.3: Emit `inspect.region[]` payload to main process on update.
- M1.4: Add IPC to select a region and return `targetId` + bounds.

**Milestone 2: Native Context Capture**
- M2.1: Capture active window title/app name/PID/bounds.
- M2.2: Normalize coordinates with `scaleFactor`.
- M2.3: Persist `window.context` snapshots for AI context.

**Milestone 3: Accessibility Bridge (Best Effort)**
- M3.1: Probe platform accessibility API availability.
- M3.2: Extract role/name/value where possible.
- M3.3: Map nodes to screen coordinates or nearest OCR box.

**Milestone 4: Action Verification**
- M4.1: Add screenshot diff utility (pre/post action).
- M4.2: Generate heatmap overlay of change areas.
- M4.3: Attach verification summary to AI response.

**Milestone 5: AI Targeting Integration**
- M5.1: Inject `inspect.region[]` + `window.context` into AI prompt.
- M5.2: Prefer `targetId` actions; fallback to grid.
- M5.3: Add safety confirmation when target confidence is low.

## Dependencies
- Accessibility APIs vary by OS; build behind feature flags.
- Requires consistent coordinate normalization across renderer/main.

## Suggested Owners
- Overlay/UI: Renderer maintainers.
- OS Integration: Main process + automation layer.
- AI Context: AI service layer.

## Milestone Exit Criteria
- MVP: Hover + tooltip + selection works and emits `targetId`.
- Native Context: Window metadata consistently attached to AI context.
- Verification: Diff heatmap appears after actions and is logged.

## Implementation Notes
- Use `screen.getPrimaryDisplay().scaleFactor` for DPI normalization.
- Throttle redraw on mouse move (<= 60fps).
- Keep boxes visually distinct from the grid (cyan outline + label).

## Acceptance Criteria
- Inspect mode shows boxes aligned with visible UI.
- Hovering a box reveals text/role/confidence.
- AI clicks target inspect boxes reliably with correct coordinates.
- Grid remains functional and click-through stays intact.

## Suggested Tests
- Unit: element-to-screen coordinate normalization.
- Manual: box alignment on 100% and 125% DPI.
- Regression: overlay dots + pulse still render.
