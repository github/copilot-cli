/**
 * PythonBridge — JSON-RPC 2.0 client for the MUSE Python server.
 *
 * Spawns `python -m multimodal_gen.server --jsonrpc --verbose` as a child
 * process and communicates via HTTP POST (JSON-RPC 2.0) on localhost.
 *
 * Uses only Node built-in modules (http, child_process, events) — NO npm deps.
 *
 * Singleton access:
 *   const bridge = PythonBridge.getShared();
 *   await bridge.start();
 *   const result = await bridge.call('ping', {});
 */

const EventEmitter = require('events');
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

// ---------------------------------------------------------------------------
// Singleton instance
// ---------------------------------------------------------------------------
let _sharedInstance = null;

// ---------------------------------------------------------------------------
// PythonBridge
// ---------------------------------------------------------------------------

class PythonBridge extends EventEmitter {
  /**
   * @param {object} options
   * @param {string} [options.pythonPath='python']  Python executable.
   * @param {string} [options.serverHost='127.0.0.1']
   * @param {number} [options.serverPort=8765]
   * @param {string} [options.cwd]  Working directory for the child process.
   */
  constructor(options = {}) {
    super();

    this.pythonPath = options.pythonPath || 'python';
    this.serverHost = options.serverHost || process.env.MUSE_GATEWAY_HOST || '127.0.0.1';
    this.serverPort = options.serverPort || Number(process.env.MUSE_GATEWAY_PORT || 8765);
    this.cwd = options.cwd || path.resolve(__dirname, '..', '..', '..', '..', 'MUSE');

    /** @type {import('child_process').ChildProcess | null} */
    this._child = null;

    /** Auto-incrementing JSON-RPC request id */
    this._nextId = 1;

    /** True while the server child process is running */
    this._running = false;

    /** True once start() has completed successfully */
    this._ready = false;

    /** True when we're connected to an externally-managed gateway (e.g. JUCE) */
    this._externalGateway = false;
  }

  // ------------------------------------------------------------------
  // Singleton
  // ------------------------------------------------------------------

  /**
   * Return (or create) a shared singleton PythonBridge instance.
   * All agents should use this to avoid spawning multiple servers.
   *
   * @param {object} [options]  Passed to the constructor only on first call.
   * @returns {PythonBridge}
   */
  static getShared(options = {}) {
    if (!_sharedInstance) {
      _sharedInstance = new PythonBridge(options);
    }
    return _sharedInstance;
  }

  /**
   * Reset the shared instance (for testing or full shutdown).
   */
  static resetShared() {
    if (_sharedInstance) {
      _sharedInstance.stop().catch(() => {});
      _sharedInstance = null;
    }
  }

  // ------------------------------------------------------------------
  // Lifecycle
  // ------------------------------------------------------------------

  /**
   * Spawn the Python JSON-RPC server and wait until it responds to `ping`.
   *
   * Polls up to 10 times (500 ms apart) before giving up.
   *
   * @returns {Promise<void>}
   */
  async start() {
    if (this._running && this._ready) {
      return; // Already started
    }

    // Prefer attaching to an already-running gateway (JUCE auto-start) to avoid port contention.
    // If ping succeeds, we don't spawn a child and we also won't send shutdown on stop().
    try {
      const res = await this._rawCall('ping', {}, 1500);
      if (res && res.status === 'ok') {
        this._ready = true;
        this._running = false;
        this._externalGateway = true;
        this.emit('started', { port: this.serverPort, attempt: 0, external: true });
        return;
      }
    } catch (_err) {
      // No gateway reachable; fall through to spawning.
    }

    // Spawn the child process
    const args = ['-m', 'multimodal_gen.server', '--gateway', '--verbose'];

    this._child = spawn(this.pythonPath, args, {
      cwd: this.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    this._running = true;
    this._externalGateway = false;

    // Forward stdout / stderr as events (useful for debugging)
    this._child.stdout.on('data', (data) => {
      const text = data.toString().trim();
      if (text) {
        this.emit('stdout', text);
      }
    });

    this._child.stderr.on('data', (data) => {
      const text = data.toString().trim();
      if (text) {
        this.emit('stderr', text);
      }
    });

    this._child.on('error', (err) => {
      this._running = false;
      this._ready = false;
      this.emit('error', err);
    });

    this._child.on('exit', (code, signal) => {
      this._running = false;
      this._ready = false;
      this.emit('stopped', { code, signal });
    });

    // Wait for server readiness (ping check)
    const maxAttempts = 10;
    const intervalMs = 500;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await _sleep(intervalMs);

      try {
        const res = await this.call('ping', {});
        if (res && res.status === 'ok') {
          this._ready = true;
          this.emit('started', { port: this.serverPort, attempt });
          return;
        }
      } catch (_err) {
        // Server not ready yet — retry
      }
    }

    // Could not reach server — clean up
    await this.stop();
    throw new Error(
      `PythonBridge: server did not respond to ping after ${maxAttempts} attempts`
    );
  }

  /**
   * Gracefully stop the server.
   *
   * Sends 'shutdown' RPC first (best-effort), then kills the child.
   *
   * @returns {Promise<void>}
   */
  async stop() {
    if (!this._running && !this._child) {
      return;
    }

    // Only request shutdown if we own the process.
    if (!this._externalGateway) {
      try {
        await this._rawCall('shutdown', {}, 2000);
      } catch (_err) {
        // Ignore — we'll kill the process anyway
      }
    }

    // Kill child process
    if (this._child) {
      try {
        this._child.kill('SIGTERM');
      } catch (_err) {
        // Already dead
      }
      this._child = null;
    }

    this._running = false;
    this._ready = false;
    this._externalGateway = false;
    this.emit('stopped', { reason: 'explicit' });
  }

  // ------------------------------------------------------------------
  // RPC
  // ------------------------------------------------------------------

  /**
   * Send a JSON-RPC 2.0 call with automatic retry on connection errors.
   *
   * @param {string} method   RPC method name.
   * @param {object} params   Named parameters.
   * @param {number} [timeoutMs=30000]  Per-attempt timeout.
   * @returns {Promise<any>}   The `result` field from the response.
   */
  async call(method, params = {}, timeoutMs = 30000) {
    const maxRetries = 2;
    const retryDelayMs = 500;
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this._rawCall(method, params, timeoutMs);
      } catch (err) {
        lastError = err;

        const isConnectionError =
          err.code === 'ECONNREFUSED' ||
          err.code === 'ECONNRESET' ||
          err.code === 'EPIPE' ||
          err.message.includes('socket hang up');

        if (isConnectionError && attempt < maxRetries) {
          await _sleep(retryDelayMs);
          continue;
        }

        throw err;
      }
    }

    throw lastError;
  }

  /**
   * Check whether the server is alive (ping succeeds).
   *
   * @returns {Promise<boolean>}
   */
  async isAlive() {
    try {
      const res = await this._rawCall('ping', {}, 3000);
      return res && res.status === 'ok';
    } catch (_err) {
      return false;
    }
  }

  /**
   * Synchronous-style getter: is the child process still running?
   *
   * @returns {boolean}
   */
  get isRunning() {
    return this._running;
  }

  // ------------------------------------------------------------------
  // Internal
  // ------------------------------------------------------------------

  /**
   * Low-level JSON-RPC call over HTTP POST.
   *
   * @param {string} method
   * @param {object} params
   * @param {number} timeoutMs
   * @returns {Promise<any>}
   * @private
   */
  _rawCall(method, params, timeoutMs = 30000) {
    const id = this._nextId++;
    const body = JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
      id,
    });

    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: this.serverHost,
          port: this.serverPort,
          path: '/',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Length': Buffer.byteLength(body),
          },
          timeout: timeoutMs,
        },
        (res) => {
          const chunks = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => {
            try {
              const raw = Buffer.concat(chunks).toString('utf-8');
              const json = JSON.parse(raw);

              if (json.error) {
                const rpcErr = new Error(
                  `JSON-RPC error ${json.error.code}: ${json.error.message}`
                );
                rpcErr.code = json.error.code;
                rpcErr.data = json.error.data;
                reject(rpcErr);
                return;
              }

              resolve(json.result);
            } catch (parseErr) {
              reject(new Error(`Failed to parse JSON-RPC response: ${parseErr.message}`));
            }
          });
        }
      );

      req.on('error', (err) => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`JSON-RPC call '${method}' timed out after ${timeoutMs}ms`));
      });

      req.write(body);
      req.end();
    });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = { PythonBridge };
