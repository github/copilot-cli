const assert = require('assert');
const { gridToPixels } = require('../src/main/system-automation');

function expectCoord(label, expectedX, expectedY) {
  const result = gridToPixels(label);
  assert.strictEqual(result.x, expectedX, `${label} x`);
  assert.strictEqual(result.y, expectedY, `${label} y`);
}

expectCoord('A0', 50, 50);
expectCoord('B0', 150, 50);
expectCoord('A1', 50, 150);
expectCoord('C3', 250, 350);
expectCoord('Z0', 2550, 50);
expectCoord('AA0', 2650, 50);
expectCoord('C3.12', 237.5, 362.5);

console.log('gridToPixels tests passed');
