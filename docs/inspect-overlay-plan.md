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
