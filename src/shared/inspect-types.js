/**
 * Inspect Overlay Data Contracts
 * Shared type definitions for inspect regions, window context, and action traces
 */

/**
 * Inspect Region Data Contract
 * Represents an actionable region on screen detected through various sources
 * @typedef {Object} InspectRegion
 * @property {string} id - Unique identifier for the region
 * @property {Object} bounds - Bounding box {x, y, width, height}
 * @property {string} label - Human-readable label (e.g., "Search button")
 * @property {string} text - Text content if available
 * @property {string} role - Accessibility role (button, textbox, etc.)
 * @property {number} confidence - Detection confidence 0-1
 * @property {string} source - Detection source (accessibility, ocr, heuristic)
 * @property {number} timestamp - When this region was detected
 */

/**
 * Window Context Data Contract
 * Information about the active window and process
 * @typedef {Object} WindowContext
 * @property {string} appName - Application name
 * @property {string} windowTitle - Window title
 * @property {number} pid - Process ID
 * @property {Object} bounds - Window bounds {x, y, width, height}
 * @property {number} zOrder - Z-order (depth) of window
 * @property {number} scaleFactor - Display scale factor for DPI normalization
 */

/**
 * Action Trace Data Contract
 * Records of actions for replay and debugging
 * @typedef {Object} ActionTrace
 * @property {string} actionId - Unique action identifier
 * @property {string} type - Action type (click, type, key, etc.)
 * @property {string} [targetId] - ID of target region if applicable
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 * @property {number} timestamp - When action was executed
 * @property {string} outcome - Result (success, failed, pending)
 */

/**
 * Create a new inspect region object
 * @param {Object} params - Region parameters
 * @returns {InspectRegion}
 */
function createInspectRegion(params) {
  return {
    id: params.id || `region-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    bounds: {
      x: params.x || params.bounds?.x || 0,
      y: params.y || params.bounds?.y || 0,
      width: params.width || params.bounds?.width || 0,
      height: params.height || params.bounds?.height || 0
    },
    label: params.label || params.name || '',
    text: params.text || '',
    role: params.role || params.controlType || 'unknown',
    confidence: typeof params.confidence === 'number' ? params.confidence : 0.5,
    source: params.source || 'unknown',
    timestamp: params.timestamp || Date.now()
  };
}

/**
 * Create a new window context object
 * @param {Object} params - Window parameters
 * @returns {WindowContext}
 */
function createWindowContext(params) {
  return {
    appName: params.appName || params.processName || '',
    windowTitle: params.windowTitle || params.title || '',
    pid: params.pid || params.processId || 0,
    bounds: {
      x: params.bounds?.x || params.bounds?.X || 0,
      y: params.bounds?.y || params.bounds?.Y || 0,
      width: params.bounds?.width || params.bounds?.Width || 0,
      height: params.bounds?.height || params.bounds?.Height || 0
    },
    zOrder: params.zOrder || 0,
    scaleFactor: params.scaleFactor || 1
  };
}

/**
 * Create a new action trace object
 * @param {Object} params - Action parameters
 * @returns {ActionTrace}
 */
function createActionTrace(params) {
  return {
    actionId: params.actionId || `action-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    type: params.type || 'unknown',
    targetId: params.targetId || null,
    x: params.x || 0,
    y: params.y || 0,
    timestamp: params.timestamp || Date.now(),
    outcome: params.outcome || 'pending'
  };
}

/**
 * Normalize coordinates with scale factor
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} scaleFactor - Display scale factor
 * @returns {Object} Normalized {x, y}
 */
function normalizeCoordinates(x, y, scaleFactor = 1) {
  return {
    x: Math.round(x * scaleFactor),
    y: Math.round(y * scaleFactor)
  };
}

/**
 * Denormalize coordinates from scaled to logical
 * @param {number} x - X coordinate (scaled)
 * @param {number} y - Y coordinate (scaled)
 * @param {number} scaleFactor - Display scale factor
 * @returns {Object} Logical {x, y}
 */
function denormalizeCoordinates(x, y, scaleFactor = 1) {
  return {
    x: Math.round(x / scaleFactor),
    y: Math.round(y / scaleFactor)
  };
}

/**
 * Check if a point is within a region's bounds
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {InspectRegion} region - The region to check
 * @returns {boolean}
 */
function isPointInRegion(x, y, region) {
  const { bounds } = region;
  return x >= bounds.x && 
         x < bounds.x + bounds.width && 
         y >= bounds.y && 
         y < bounds.y + bounds.height;
}

/**
 * Find the closest region to a point
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {InspectRegion[]} regions - Array of regions
 * @returns {InspectRegion|null} Closest region or null
 */
function findClosestRegion(x, y, regions) {
  if (!regions || regions.length === 0) return null;
  
  let closest = null;
  let minDist = Infinity;
  
  for (const region of regions) {
    const centerX = region.bounds.x + region.bounds.width / 2;
    const centerY = region.bounds.y + region.bounds.height / 2;
    const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
    
    if (dist < minDist) {
      minDist = dist;
      closest = region;
    }
  }
  
  return closest;
}

/**
 * Find region containing a point
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {InspectRegion[]} regions - Array of regions
 * @returns {InspectRegion|null} Containing region or null
 */
function findRegionAtPoint(x, y, regions) {
  if (!regions || regions.length === 0) return null;
  
  // Find all regions containing the point
  const containing = regions.filter(r => isPointInRegion(x, y, r));
  
  if (containing.length === 0) return null;
  if (containing.length === 1) return containing[0];
  
  // If multiple regions, return the smallest (most specific)
  return containing.reduce((smallest, r) => {
    const smallestArea = smallest.bounds.width * smallest.bounds.height;
    const rArea = r.bounds.width * r.bounds.height;
    return rArea < smallestArea ? r : smallest;
  });
}

/**
 * Format region for AI context
 * @param {InspectRegion} region - The region to format
 * @returns {Object} AI-friendly format
 */
function formatRegionForAI(region) {
  return {
    id: region.id,
    label: region.label,
    text: region.text,
    role: region.role,
    confidence: region.confidence,
    center: {
      x: Math.round(region.bounds.x + region.bounds.width / 2),
      y: Math.round(region.bounds.y + region.bounds.height / 2)
    },
    bounds: region.bounds
  };
}

module.exports = {
  createInspectRegion,
  createWindowContext,
  createActionTrace,
  normalizeCoordinates,
  denormalizeCoordinates,
  isPointInRegion,
  findClosestRegion,
  findRegionAtPoint,
  formatRegionForAI
};
