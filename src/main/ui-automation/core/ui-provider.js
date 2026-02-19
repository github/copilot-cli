const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * @typedef {Object} Bounds
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 */

/**
 * @typedef {Object} UIElement
 * @property {string} id
 * @property {string} name
 * @property {string} role
 * @property {Bounds} bounds
 * @property {boolean} isClickable
 * @property {boolean} isFocusable
 * @property {UIElement[]} children
 */

class UIProvider {
  constructor() {
    const binDir = path.join(__dirname, '..', '..', '..', '..', 'bin');
    const candidates = [
      path.join(binDir, 'WindowsUIA.exe'),
      path.join(binDir, 'windows-uia.exe')
    ];
    this.binaryPath = candidates.find(filePath => fs.existsSync(filePath)) || candidates[0];
  }

  /**
   * Fetches the UI tree from the native binary.
   * @returns {Promise<UIElement>}
   */
  async getUITree() {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(this.binaryPath)) {
        return reject(new Error('UIAutomation binary not found. Build it with: powershell -ExecutionPolicy Bypass -File src/native/windows-uia/build.ps1'));
      }

      const child = spawn(this.binaryPath);
      let output = '';
      let errorOutput = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      child.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(`Process exited with code ${code}: ${errorOutput}`));
        }

        try {
          const parsed = JSON.parse(output);
          const uiTree = this.parseNode(parsed);
          resolve(uiTree);
        } catch (err) {
          reject(new Error(`Failed to parse JSON output: ${err.message}`));
        }
      });
      
      child.on('error', (err) => {
        reject(new Error(`Failed to start subprocess: ${err.message}`));
      });
    });
  }

  /**
   * Parses the OS-specific JSON node into a unified UIElement.
   * @param {Object} node
   * @returns {UIElement}
   */
  parseNode(node) {
    return {
      id: node.id || '',
      name: node.name || '',
      role: node.role || '',
      bounds: {
        x: node.bounds?.x || 0,
        y: node.bounds?.y || 0,
        width: node.bounds?.width || 0,
        height: node.bounds?.height || 0
      },
      isClickable: !!node.isClickable,
      isFocusable: !!node.isFocusable,
      children: (node.children || []).map(child => this.parseNode(child))
    };
  }
}

module.exports = { UIProvider };
