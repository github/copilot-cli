/**
 * Inspect Service Module
 * Manages inspect overlay state, region detection, and AI context integration
 */

const { screen } = require('electron');
const visualAwareness = require('./visual-awareness');
const inspectTypes = require('../shared/inspect-types');

// ===== STATE =====
let inspectMode = false;
let currentRegions = [];
let windowContext = null;
let actionTraces = [];
let selectedRegionId = null;

const MAX_ACTION_TRACES = 100;

// ===== INSPECT MODE MANAGEMENT =====

/**
 * Enable or disable inspect mode
 * @param {boolean} enabled - Whether inspect mode should be enabled
 */
function setInspectMode(enabled) {
  inspectMode = enabled;
  if (!enabled) {
    // Clear all state when disabling inspect mode
    clearRegions();
  }
  return inspectMode;
}

/**
 * Check if inspect mode is active
 * @returns {boolean}
 */
function isInspectModeActive() {
  return inspectMode;
}

// ===== REGION MANAGEMENT =====

/**
 * Update inspect regions from various sources
 * @param {Object[]} rawRegions - Raw region data from detection
 * @param {string} source - Source of detection (accessibility, ocr, heuristic)
 * @returns {Object[]} Processed regions
 */
function updateRegions(rawRegions, source = 'unknown') {
  if (!Array.isArray(rawRegions)) return [...currentRegions];

  // Convert raw regions to inspect regions
  // Note: Accessibility API coordinates are already in screen space,
  // so no DPI scaling is needed here. Scale factor is stored in
  // windowContext for AI reference.
  const newRegions = rawRegions
    .filter(r => r && (r.bounds || (r.x !== undefined && r.y !== undefined)))
    .map(r => {
      const bounds = r.bounds || { x: r.x, y: r.y, width: r.width || 0, height: r.height || 0 };
      
      return inspectTypes.createInspectRegion({
        ...r,
        bounds: {
          x: Math.round(bounds.x || bounds.X || 0),
          y: Math.round(bounds.y || bounds.Y || 0),
          width: Math.round(bounds.width || bounds.Width || 0),
          height: Math.round(bounds.height || bounds.Height || 0)
        },
        source,
        confidence: r.confidence || calculateConfidence(r, source)
      });
    })
    .filter(r => r.bounds.width > 0 && r.bounds.height > 0);

  // Merge with existing regions (prefer newer, dedupe by overlap)
  currentRegions = mergeRegions(currentRegions, newRegions);
  
  return [...currentRegions];
}

/**
 * Clear all regions
 */
function clearRegions() {
  currentRegions = [];
  selectedRegionId = null;
}

/**
 * Get current inspect regions
 * @returns {Object[]} Copy of current regions array
 */
function getRegions() {
  // Return a shallow copy to prevent external mutations
  return [...currentRegions];
}

/**
 * Select a region by ID
 * @param {string} regionId - ID of region to select
 * @returns {Object|null} Selected region or null
 */
function selectRegion(regionId) {
  const region = currentRegions.find(r => r.id === regionId);
  if (region) {
    selectedRegionId = regionId;
  }
  return region;
}

/**
 * Get currently selected region
 * @returns {Object|null}
 */
function getSelectedRegion() {
  return currentRegions.find(r => r.id === selectedRegionId) || null;
}

/**
 * Find region at a specific point
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {Object|null}
 */
function findRegionAt(x, y) {
  return inspectTypes.findRegionAtPoint(x, y, currentRegions);
}

// ===== WINDOW CONTEXT =====

/**
 * Update window context from active window info
 * @param {Object} windowInfo - Window information
 */
async function updateWindowContext(windowInfo = null) {
  if (!windowInfo) {
    // Fetch from visual awareness
    windowInfo = await visualAwareness.getActiveWindow();
  }

  if (windowInfo && !windowInfo.error) {
    const scaleFactor = getScaleFactor();
    windowContext = inspectTypes.createWindowContext({
      ...windowInfo,
      scaleFactor
    });
  }

  return windowContext;
}

/**
 * Get current window context
 * @returns {Object|null}
 */
function getWindowContext() {
  return windowContext;
}

/**
 * Get display scale factor
 * @returns {number}
 */
function getScaleFactor() {
  try {
    return screen.getPrimaryDisplay().scaleFactor || 1;
  } catch (e) {
    return 1;
  }
}

// ===== ACTION TRACING =====

/**
 * Record an action for tracing
 * @param {Object} action - Action data
 * @param {string} [targetId] - ID of target region
 * @returns {Object} Action trace
 */
function recordAction(action, targetId = null) {
  const trace = inspectTypes.createActionTrace({
    type: action.type,
    targetId: targetId || action.targetId,
    x: action.x || 0,
    y: action.y || 0,
    outcome: 'pending'
  });

  actionTraces.push(trace);

  // Trim history
  while (actionTraces.length > MAX_ACTION_TRACES) {
    actionTraces.shift();
  }

  return trace;
}

/**
 * Update action outcome
 * @param {string} actionId - ID of action to update
 * @param {string} outcome - New outcome (success, failed)
 */
function updateActionOutcome(actionId, outcome) {
  const trace = actionTraces.find(t => t.actionId === actionId);
  if (trace) {
    trace.outcome = outcome;
  }
}

/**
 * Get action traces
 * @param {number} [limit] - Max traces to return
 * @returns {Object[]}
 */
function getActionTraces(limit = 10) {
  return actionTraces.slice(-limit);
}

// ===== AI CONTEXT GENERATION =====

/**
 * Generate AI context payload including inspect regions and window context
 * @param {Object} options - Options for context generation
 * @returns {Object} AI context payload
 */
function generateAIContext(options = {}) {
  const { maxRegions = 50, includeTraces = true } = options;

  // Format regions for AI
  const formattedRegions = currentRegions
    .slice(0, maxRegions)
    .map(r => inspectTypes.formatRegionForAI(r));

  const context = {
    inspectMode: inspectMode,
    windowContext: windowContext ? {
      appName: windowContext.appName,
      windowTitle: windowContext.windowTitle,
      bounds: windowContext.bounds,
      scaleFactor: windowContext.scaleFactor
    } : null,
    regions: formattedRegions,
    regionCount: currentRegions.length,
    selectedRegion: getSelectedRegion() ? inspectTypes.formatRegionForAI(getSelectedRegion()) : null
  };

  if (includeTraces) {
    context.recentActions = getActionTraces(5);
  }

  return context;
}

/**
 * Generate inspect instructions for AI system prompt
 * @returns {string}
 */
function generateAIInstructions() {
  if (!inspectMode || currentRegions.length === 0) {
    return '';
  }

  return `
## Inspect Mode Active

You have access to detected UI regions. Each region has:
- **id**: Unique identifier for targeting
- **label**: Human-readable name
- **role**: UI role (button, textbox, etc.)
- **center**: Click coordinates {x, y}
- **confidence**: Detection confidence (0-1)

**IMPORTANT**: When clicking detected regions:
1. Use the region's center coordinates for highest accuracy
2. If confidence < 0.7, verify with the user before clicking
3. Reference regions by their label or id in your explanations

Current regions available: ${currentRegions.length}
`;
}

// ===== REGION DETECTION INTEGRATION =====

/**
 * Detect regions from current screen using available methods
 * @param {Object} options - Detection options
 * @returns {Object} Detection results
 */
async function detectRegions(options = {}) {
  const results = {
    regions: [],
    sources: [],
    timestamp: Date.now()
  };

  try {
    // Try accessibility API first
    const uiElements = await visualAwareness.detectUIElements({ depth: 3 });
    if (uiElements.elements && uiElements.elements.length > 0) {
      updateRegions(
        uiElements.elements.map(e => ({
          label: e.Name || e.ClassName || '',
          role: e.ControlType?.replace('ControlType.', '') || 'element',
          bounds: e.Bounds,
          confidence: e.IsEnabled ? 0.9 : 0.6
        })),
        'accessibility'
      );
      results.sources.push('accessibility');
    }

    // Update window context
    await updateWindowContext();
    
    // Return copy of regions to prevent external mutation
    results.regions = [...currentRegions];
    results.windowContext = windowContext;
    
  } catch (error) {
    console.error('[INSPECT] Region detection error:', error);
    results.error = error.message;
  }

  return results;
}

// ===== HELPER FUNCTIONS =====

/**
 * Calculate confidence based on source and properties
 * @param {Object} region - Region data
 * @param {string} source - Detection source
 * @returns {number} Confidence 0-1
 */
function calculateConfidence(region, source) {
  let base = 0.5;

  // Source-based confidence
  if (source === 'accessibility') base = 0.85;
  else if (source === 'ocr') base = 0.7;
  else if (source === 'heuristic') base = 0.5;

  // Boost for having label/text
  if (region.label || region.Name) base = Math.min(1, base + 0.1);
  if (region.text || region.Value) base = Math.min(1, base + 0.05);

  // Boost for known roles
  const knownRoles = ['button', 'textbox', 'checkbox', 'link', 'menuitem'];
  const role = (region.role || region.ControlType || '').toLowerCase();
  if (knownRoles.some(r => role.includes(r))) {
    base = Math.min(1, base + 0.1);
  }

  return Math.round(base * 100) / 100;
}

/**
 * Merge regions, preferring newer and deduping overlaps
 * @param {Object[]} existing - Existing regions
 * @param {Object[]} incoming - New regions
 * @returns {Object[]} Merged regions
 */
function mergeRegions(existing, incoming) {
  const merged = [];
  const usedExisting = new Set();
  const addedIds = new Set();

  // Add incoming regions, checking for overlaps with existing
  for (const inc of incoming) {
    let isDupe = false;
    for (const ex of existing) {
      if (usedExisting.has(ex.id)) continue; // Skip already processed existing regions
      
      if (regionsOverlap(inc, ex, 0.8)) {
        // Significant overlap - prefer higher confidence
        const winner = inc.confidence >= ex.confidence ? inc : ex;
        if (!addedIds.has(winner.id)) {
          merged.push(winner);
          addedIds.add(winner.id);
        }
        usedExisting.add(ex.id);
        isDupe = true;
        break;
      }
    }
    if (!isDupe && !addedIds.has(inc.id)) {
      merged.push(inc);
      addedIds.add(inc.id);
    }
  }

  // Add remaining existing regions not overlapping
  for (const ex of existing) {
    if (!usedExisting.has(ex.id) && !addedIds.has(ex.id)) {
      const hasOverlap = incoming.some(inc => regionsOverlap(ex, inc, 0.5));
      if (!hasOverlap) {
        merged.push(ex);
        addedIds.add(ex.id);
      }
    }
  }

  return merged;
}

/**
 * Check if two regions significantly overlap
 * @param {Object} r1 - First region
 * @param {Object} r2 - Second region
 * @param {number} threshold - Overlap threshold (0-1)
 * @returns {boolean}
 */
function regionsOverlap(r1, r2, threshold = 0.5) {
  const b1 = r1.bounds;
  const b2 = r2.bounds;

  const x1 = Math.max(b1.x, b2.x);
  const y1 = Math.max(b1.y, b2.y);
  const x2 = Math.min(b1.x + b1.width, b2.x + b2.width);
  const y2 = Math.min(b1.y + b1.height, b2.y + b2.height);

  if (x2 <= x1 || y2 <= y1) return false;

  const intersectArea = (x2 - x1) * (y2 - y1);
  const r1Area = b1.width * b1.height;
  const r2Area = b2.width * b2.height;
  const minArea = Math.min(r1Area, r2Area);

  // Handle zero area case
  if (minArea <= 0) return false;

  return intersectArea / minArea >= threshold;
}

// ===== EXPORTS =====
module.exports = {
  // Mode management
  setInspectMode,
  isInspectModeActive,
  
  // Region management
  updateRegions,
  clearRegions,
  getRegions,
  selectRegion,
  getSelectedRegion,
  findRegionAt,
  
  // Window context
  updateWindowContext,
  getWindowContext,
  getScaleFactor,
  
  // Action tracing
  recordAction,
  updateActionOutcome,
  getActionTraces,
  
  // AI integration
  generateAIContext,
  generateAIInstructions,
  
  // Detection
  detectRegions
};
