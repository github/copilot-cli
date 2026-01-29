/**
 * start command - Launch the Electron agent
 * @module cli/commands/start
 */

const { spawn } = require('child_process');
const path = require('path');
const { success, info, error } = require('../util/output');

const PROJECT_ROOT = path.resolve(__dirname, '../../..');

/**
 * Run the start command
 */
async function run(args, options) {
  if (!options.quiet) {
    info('Starting Copilot-Liku agent...');
  }

  return new Promise((resolve, reject) => {
    // Copy environment and clear ELECTRON_RUN_AS_NODE
    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;

    // Get electron path
    let electronPath;
    try {
      electronPath = require('electron');
    } catch (e) {
      error('Electron not found. Run: npm install');
      return reject(new Error('Electron not installed'));
    }

    const child = spawn(electronPath, ['.'], {
      cwd: PROJECT_ROOT,
      env,
      stdio: options.quiet ? 'ignore' : 'inherit',
      detached: options.background || false,
      windowsHide: false,
    });

    if (options.background) {
      // Detach and let it run
      child.unref();
      if (!options.quiet) {
        success('Agent started in background');
      }
      resolve({ success: true, pid: child.pid });
    } else {
      // Wait for exit
      child.on('exit', (code, signal) => {
        if (signal) {
          resolve({ success: true, signal });
        } else {
          resolve({ success: code === 0, code });
        }
      });

      child.on('error', (err) => {
        error(`Failed to start: ${err.message}`);
        reject(err);
      });
    }
  });
}

module.exports = { run };
