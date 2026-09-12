# Fix: Extension bootstrap path mismatch in `launchExtension()`

Fixes #2890 — Extensions fail to load due to SEA cache directory path mismatch.

## Root Cause

When `app.js` forks an extension subprocess, it builds the bootstrap path from
`cliDistDir` (the pkg cache directory, e.g., `~/.copilot/pkg/universal/<ver>/`).

But the forked child process runs the SEA binary's embedded `index.js`, which
validates the bootstrap path against `dirname(import.meta.url)` — the SEA
binary's own directory. These paths never match:

| | macOS | Windows (npm) |
|---|---|---|
| SEA dir (`index.js`) | `darwin-arm64/<ver>/` | `npm/.../copilot-win32-x64/` |
| Bootstrap from (`app.js`) | `universal/<ver>/preloads/` | `universal/<ver>/preloads/` |
| `preloads/` exists in SEA dir? | No (only in cache) | No (not shipped in platform pkg) |

The security check in `index.js`:

```js
var z = dirname(fileURLToPath(import.meta.url));  // → SEA binary dir
var K = process.argv.find(e => basename(e) === "extension_bootstrap.mjs");
var Q = K ? resolve(K) : undefined;
var q = Q?.startsWith(resolve(z, "preloads") + sep) ? Q : undefined;
// q is undefined → falls through → "Invalid command format" error
```

## Proposed Fix (Option A — smallest change)

In `launchExtension()`, resolve the bootstrap path relative to the SEA binary
directory (via `process.execPath`) instead of `cliDistDir`:

```js
// Before (current):
const bootstrapPath = path.join(this.options.cliDistDir, "preloads", "extension_bootstrap.mjs");

// After (proposed):
const seaBootstrap = path.join(path.dirname(process.execPath), "preloads", "extension_bootstrap.mjs");
const cacheBootstrap = path.join(this.options.cliDistDir, "preloads", "extension_bootstrap.mjs");
const bootstrapPath = fs.existsSync(seaBootstrap) ? seaBootstrap : cacheBootstrap;
```

This also requires shipping `preloads/extension_bootstrap.mjs` and
`preloads/extension_sdk_resolver.mjs` in the platform-specific npm packages
(`@github/copilot-win32-x64`, `@github/copilot-darwin-arm64`, etc.).

**Note:** `COPILOT_SDK_PATH` does not need to change — it correctly points to
the pkg cache's `copilot-sdk/` directory and is resolved via environment
variable in the bootstrap, not via relative path.

## Alternative Fix (Option B — no platform package changes)

Instead of requiring `preloads/` in the SEA directory, expand the security check
in `index.js` to accept bootstrap paths from any trusted pkg cache directory:

```js
// Parent (app.js) passes the trusted directory when forking:
env: { COPILOT_TRUSTED_DIST_DIR: this.options.cliDistDir, ... }

// Child (index.js) validates against multiple trusted prefixes:
const trustedDirs = [resolve(z, "preloads")];
if (process.env.COPILOT_TRUSTED_DIST_DIR) {
    trustedDirs.push(resolve(process.env.COPILOT_TRUSTED_DIST_DIR, "preloads"));
}
const q = trustedDirs.some(d => Q?.startsWith(d + sep)) ? Q : undefined;
```

Option B is more robust (no platform package changes needed) but slightly
loosens the security boundary by trusting an env-var-specified directory.

## Verified

Option A was tested locally on Windows 11 (npm install, CLI 1.0.35) by:
1. Copying `preloads/` to the SEA binary directory
2. Patching the minified `app.js` to prefer `dirname(process.execPath)`

Both user-level and project-level extensions loaded successfully after the fix.

## Affected Versions

- CLI 1.0.34 (confirmed macOS + Windows)
- CLI 1.0.35 (confirmed Windows)
