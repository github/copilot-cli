/**
 * PowerShell Execution Layer
 * 
 * Provides reliable PowerShell script execution for UI automation.
 * @module ui-automation/core/powershell
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { CONFIG } = require('../config');

/**
 * Execute a PowerShell script from a temp file
 * More reliable than inline commands for complex scripts
 * 
 * @param {string} script - PowerShell script content
 * @param {number} [timeout] - Execution timeout in ms
 * @returns {Promise<{stdout: string, stderr: string, error?: string}>}
 */
async function executePowerShellScript(script, timeout = CONFIG.DEFAULT_TIMEOUT) {
  const scriptPath = path.join(
    CONFIG.TEMP_DIR, 
    `script_${Date.now()}_${Math.random().toString(36).slice(2)}.ps1`
  );
  
  try {
    fs.writeFileSync(scriptPath, script, 'utf8');
    
    return new Promise((resolve) => {
      exec(
        `powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`,
        {
          encoding: 'utf8',
          maxBuffer: CONFIG.PS_MAX_BUFFER,
          timeout: timeout,
        },
        (error, stdout, stderr) => {
          // Clean up temp file
          try { fs.unlinkSync(scriptPath); } catch {}
          
          if (error) {
            resolve({ stdout: stdout || '', stderr: stderr || '', error: error.message });
          } else {
            resolve({ stdout: stdout || '', stderr: stderr || '' });
          }
        }
      );
    });
  } catch (err) {
    try { fs.unlinkSync(scriptPath); } catch {}
    return { stdout: '', stderr: '', error: err.message };
  }
}

/**
 * Execute a simple PowerShell command inline
 * 
 * @param {string} command - PowerShell command
 * @returns {Promise<string>} Command output
 */
async function executePowerShell(command) {
  return new Promise((resolve, reject) => {
    const psCommand = command.replace(/"/g, '`"');
    
    exec(`powershell -NoProfile -Command "${psCommand}"`, {
      encoding: 'utf8',
      maxBuffer: CONFIG.PS_MAX_BUFFER,
    }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

module.exports = {
  executePowerShellScript,
  executePowerShell,
};
