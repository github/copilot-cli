# GPT Workspace Report

## Current State & Issues
- Overlay logic was blocked by CSP inline-script; now externalized (`src/renderer/overlay/overlay.js` with `script-src 'self'`), so dots/grid should render again. Tested via CSP check; initial inline error reproduced in logs.
- Overlay clicks were swallowed because `#overlay-container` had `pointer-events: none`; switched to `pointer-events: auto` so dots can be interacted with. Click-through is now governed by `BrowserWindow#setIgnoreMouseEvents`.
- Chat window could get stuck maximized/off-screen; `ensureChatBounds()` now unmaximizes and resizes to default bounds on toggle.
- Electron caching path issues mitigated by redirecting disk/media cache and userData to `%TEMP%\\copilot-liku-electron-cache`; GPU shader disk cache disabled.
- Missing renderer security hardening: CSP still allows inline styles (`style-src 'self' 'unsafe-inline'`); preload uses `contextIsolation: true` but no `sandbox` flag. Renderer still has no `script-src` nonces/hashes and no `img-src` restriction.
- Visual awareness and AI integration exist (`visual-awareness.js`, `ai-service.js`) but are partial stubs (e.g., heuristic diffing, placeholder OCR paths, desktop capture hooks). No renderer UX to surface these capabilities yet.

## Gaps / Risks (ordered)
1) Overlay reliability: need validation that the new external script loads and dot rendering works on launch; still rely on global shortcuts for visibility with no in-app affordance if shortcuts fail.  
2) Window interaction: overlay toggling depends on `setIgnoreMouseEvents`; we should confirm mode flips work under selection/passive and add UI affordance in chat to switch modes.  
3) Chat lifecycle: close button prevents exit; no in-app quit control beyond tray. Session state (history/position) not persisted, and chat has no throttling/typing guardrails.  
4) Security hardening: CSP could drop `unsafe-inline` for styles (move CSS to file), restrict `img-src`, add nonces/hashes. Preload could enable `sandbox: true` and disable remote modules.  
5) Visual features: capture/diff/OCR are stubs; no scheduled captures, no annotation overlay, and no feedback loop into chat.  
6) Testing/QA: no automated smoke for Electron windows, hotkeys, or IPC; manual testing only, leading to regressions (e.g., CSP breakage).  
7) Packaging: no build/pack script; start relies on `scripts/start.js` to clear `ELECTRON_RUN_AS_NODE`, but production packaging path is undefined.

## Recommendations (actionable)
1) Overlay activation & UX  
   - Add an always-on overlay status indicator (e.g., small corner widget) to switch modes and exit overlay without shortcuts.  
   - Confirm `setOverlayMode` works by logging `isIgnoreMouseEvents()` and renderer `mode-changed` events (already logged) and add an IPC ping from overlay on init for readiness.  
   - Ensure `#overlay-container` uses `pointer-events: auto` (done) and consider toggling via a CSS class for clarity (`.click-through`).

2) CSP & security (based on Electron security guide: https://www.electronjs.org/docs/latest/tutorial/security)  
   - Move inline styles to an external CSS file and remove `'unsafe-inline'` from `style-src`.  
   - Add `img-src 'self' data:` and explicit `connect-src` to the minimal endpoints used.  
   - Set `sandbox: true`, `contextIsolation: true` (already set), disable `nodeIntegration` (already false), and `enableRemoteModule: false`.  
   - Add `Content-Security-Policy` reporting endpoint for easier debugging.

3) Chat window handling  
   - On toggle/show, always normalize bounds to default size (done) and ensure `unmaximize()` is called.  
   - Add tray menu item to reset windows (overlay/passive, chat reposition).  
   - Provide an in-UI close/quit action wired to `app.quit()` via IPC.

4) Visual awareness pipeline  
   - Wire overlay dot selection to trigger `capture-region` using `desktopCapturer` and feed the cropped image into `visual-awareness` for OCR/diffing.  
   - Add scheduled or on-demand full-screen captures to keep `visualContextHistory` fresh; expose a chat command `/capture` to trigger.  
   - Replace heuristic diffing with pixel-level diff (e.g., `pixelmatch` on PNG buffers) and persist a short history on disk in temp.

5) Testing & tooling  
   - Add a minimal Playwright or Spectron-style smoke test: launch app, assert overlay window visible, dots rendered, hotkeys toggle overlay/chat, IPC `get-state` returns selection.  
   - Add a `lint`/`format` script and basic CI (GitHub Actions) to catch CSP/packaging regressions.

6) Packaging & startup  
   - Introduce an Electron Forge or `electron-builder` config; ensure `scripts/start.js` logic (clearing `ELECTRON_RUN_AS_NODE`) is mirrored in production entry.  
   - Bundle tray icon under `resources/` and verify load order; add fallback vector (ico/icns) variants.

## User-Reported Findings (Latest)
- Chat window can appear fullscreen with no obvious minimize/restore controls.  
- Editor reports ~11 problems in `src/renderer/chat/index.html` and `src/renderer/overlay/index.html` (likely CSP/inline script or DOM API typing issues).  
- Overlay dots render (coarse/fine) but background apps are not interactable while overlay is visible.

## Implemented Fixes for Findings
- Forced chat window to normalize its bounds on every toggle, unmaximizing if needed (`src/main/index.js`).  
- Overlay selection now uses `setIgnoreMouseEvents(true, { forward: true })` so you can click dots while underlying apps still receive input (`src/main/index.js`).  
- Externalized chat script into `src/renderer/chat/chat.js` and updated CSP to allow `script-src 'self'` (`src/renderer/chat/index.html`). This removes inline-script CSP violations and stabilizes UI behaviors.

## Quick Checks Performed
- Confirmed CSP breakage via overlay console log; externalized script to restore execution.  
- Verified Electron security doc is reachable (HTTP 200) for reference on CSP/sandbox guidance.  
- Reviewed main process lifecycle, overlay/chat renderer wiring, and visual-awareness stubs for integration gaps.
