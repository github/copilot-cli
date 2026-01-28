/**
 * Mouse Movement
 * 
 * Basic mouse position and movement functions.
 * @module ui-automation/mouse/movement
 */

const { executePowerShellScript } = require('../core/powershell');
const { log } = require('../core/helpers');

/**
 * Move mouse to coordinates
 * 
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {Promise<void>}
 */
async function moveMouse(x, y) {
  x = Math.round(x);
  y = Math.round(y);
  
  const script = `
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})
`;
  await executePowerShellScript(script);
  log(`Mouse moved to (${x}, ${y})`);
}

/**
 * Get current mouse position
 * 
 * @returns {Promise<{x: number, y: number}>}
 */
async function getMousePosition() {
  const result = await executePowerShellScript(`
Add-Type -AssemblyName System.Windows.Forms
$pos = [System.Windows.Forms.Cursor]::Position
Write-Output "$($pos.X),$($pos.Y)"
`);
  const output = (result.stdout || '').trim();
  const parts = output.split(',');
  const x = parseInt(parts[0], 10) || 0;
  const y = parseInt(parts[1], 10) || 0;
  return { x, y };
}

module.exports = {
  moveMouse,
  getMousePosition,
};
