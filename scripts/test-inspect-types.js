/**
 * Test for inspect-types module
 * Validates coordinate normalization and region functions
 */
const assert = require('assert');
const inspectTypes = require('../src/shared/inspect-types');

console.log('Running inspect-types tests...');

// Test createInspectRegion
const region = inspectTypes.createInspectRegion({
  x: 100, y: 200, width: 50, height: 30,
  label: 'Test Button', role: 'button', confidence: 0.85
});
assert.strictEqual(region.bounds.x, 100, 'Region bounds.x');
assert.strictEqual(region.bounds.y, 200, 'Region bounds.y');
assert.strictEqual(region.bounds.width, 50, 'Region bounds.width');
assert.strictEqual(region.bounds.height, 30, 'Region bounds.height');
assert.strictEqual(region.label, 'Test Button', 'Region label');
assert.strictEqual(region.role, 'button', 'Region role');
assert.strictEqual(region.confidence, 0.85, 'Region confidence');
console.log('✓ createInspectRegion works');

// Test normalizeCoordinates
const normalized = inspectTypes.normalizeCoordinates(100, 200, 1.5);
assert.strictEqual(normalized.x, 150, 'Normalized x with scale 1.5');
assert.strictEqual(normalized.y, 300, 'Normalized y with scale 1.5');

const normalized2 = inspectTypes.normalizeCoordinates(100, 200, 1);
assert.strictEqual(normalized2.x, 100, 'Normalized x with scale 1');
assert.strictEqual(normalized2.y, 200, 'Normalized y with scale 1');
console.log('✓ normalizeCoordinates works');

// Test denormalizeCoordinates
const denormalized = inspectTypes.denormalizeCoordinates(150, 300, 1.5);
assert.strictEqual(denormalized.x, 100, 'Denormalized x with scale 1.5');
assert.strictEqual(denormalized.y, 200, 'Denormalized y with scale 1.5');
console.log('✓ denormalizeCoordinates works');

// Test isPointInRegion
const testRegion = inspectTypes.createInspectRegion({ x: 100, y: 100, width: 50, height: 50 });
assert.strictEqual(inspectTypes.isPointInRegion(125, 125, testRegion), true, 'Point inside region');
assert.strictEqual(inspectTypes.isPointInRegion(100, 100, testRegion), true, 'Point at top-left corner');
assert.strictEqual(inspectTypes.isPointInRegion(150, 150, testRegion), true, 'Point at bottom-right corner');
assert.strictEqual(inspectTypes.isPointInRegion(99, 125, testRegion), false, 'Point outside left');
assert.strictEqual(inspectTypes.isPointInRegion(151, 125, testRegion), false, 'Point outside right');
console.log('✓ isPointInRegion works');

// Test findRegionAtPoint
const regions = [
  inspectTypes.createInspectRegion({ id: 'r1', x: 0, y: 0, width: 100, height: 100 }),
  inspectTypes.createInspectRegion({ id: 'r2', x: 50, y: 50, width: 50, height: 50 })  // Overlaps with r1
];
const foundRegion = inspectTypes.findRegionAtPoint(75, 75, regions);
// Should return the smaller (more specific) region
assert.strictEqual(foundRegion.id, 'r2', 'Find smallest overlapping region');

const noRegion = inspectTypes.findRegionAtPoint(200, 200, regions);
assert.strictEqual(noRegion, null, 'No region at point returns null');
console.log('✓ findRegionAtPoint works');

// Test formatRegionForAI
const aiRegion = inspectTypes.formatRegionForAI(region);
assert.strictEqual(aiRegion.id, region.id, 'AI format preserves id');
assert.strictEqual(aiRegion.center.x, 125, 'AI format calculates center x');
assert.strictEqual(aiRegion.center.y, 215, 'AI format calculates center y');
console.log('✓ formatRegionForAI works');

// Test createWindowContext
const windowCtx = inspectTypes.createWindowContext({
  processName: 'notepad',
  title: 'Untitled - Notepad',
  processId: 1234,
  bounds: { X: 100, Y: 100, Width: 800, Height: 600 },
  scaleFactor: 1.25
});
assert.strictEqual(windowCtx.appName, 'notepad', 'Window context appName');
assert.strictEqual(windowCtx.windowTitle, 'Untitled - Notepad', 'Window context title');
assert.strictEqual(windowCtx.pid, 1234, 'Window context pid');
assert.strictEqual(windowCtx.scaleFactor, 1.25, 'Window context scaleFactor');
console.log('✓ createWindowContext works');

// Test createActionTrace
const trace = inspectTypes.createActionTrace({
  type: 'click',
  targetId: 'r1',
  x: 125,
  y: 125
});
assert.strictEqual(trace.type, 'click', 'Action trace type');
assert.strictEqual(trace.targetId, 'r1', 'Action trace targetId');
assert.strictEqual(trace.outcome, 'pending', 'Action trace default outcome');
console.log('✓ createActionTrace works');

console.log('\n✅ All inspect-types tests passed!');
