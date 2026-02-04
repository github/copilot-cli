// ===== CONFIGURATION =====
const gridConfig = window.electronAPI?.getGridConstants
  ? window.electronAPI.getGridConstants()
  : null;
const COARSE_SPACING = gridConfig?.coarseSpacing || 100;  // Coarse grid: 100px spacing
const FINE_SPACING = gridConfig?.fineSpacing || 25;       // Fine grid: 25px spacing
const START_OFFSET = gridConfig?.startOffset || (COARSE_SPACING / 2); // 50px offset to center grid cells
const FINE_START = gridConfig?.fineStart || (FINE_SPACING / 2);
const LOCAL_FINE_RADIUS = gridConfig?.localFineRadius || 3;

// ===== STATE MANAGEMENT =====
let state = {
  currentMode: 'passive',
  zoomLevel: 1, // 1 = coarse, 2 = fine, 3 = all
  width: window.innerWidth,
  height: window.innerHeight,
  mouse: { x: 0, y: 0 },
  indicators: {
    zoom: { visible: false, text: '1x', timeout: null },
    mode: { visible: true, text: 'Selection Mode' },
    feedback: { visible: false, text: '', timeout: null }
  },
  // Inspect mode state
  inspectMode: false,
  inspectRegions: [],
  actionableRegions: [], // New: AI-detected regions for overlay
  hoveredRegion: null,
  selectedRegionId: null,
  // Live UI mirror state
  uiMirrorMode: false,
  uiMirrorElements: []
};

// ===== CANVAS SETUP =====
const canvas = document.getElementById('dot-canvas');
const ctx = canvas.getContext('2d', { alpha: true }); // optimize for alpha
const container = document.getElementById('overlay-container');

// Elements for UI
const ui = {
  modeIndicator: document.getElementById('mode-indicator'),
  zoomIndicator: document.getElementById('zoom-indicator'),
  statusBar: document.getElementById('status-bar'),
  gridStatus: document.getElementById('grid-status'),
  coordsStatus: document.getElementById('coords-status'),
  interactionRegion: document.getElementById('interaction-region'),
  border: document.getElementById('overlay-border'),
  // Inspect elements
  inspectContainer: document.getElementById('inspect-container'),
  inspectIndicator: document.getElementById('inspect-indicator'),
  inspectTooltip: document.getElementById('inspect-tooltip'),
  regionCount: document.getElementById('region-count')
};

// ===== RENDERING ENGINE =====
let animationFrameId = null;
let isDirty = false; // Draw only when needed

function requestDraw() {
  if (animationFrameId !== null) return;
  isDirty = true;
  animationFrameId = requestAnimationFrame(draw);
}

function draw() {
  animationFrameId = null;
  if (!isDirty) return;
  isDirty = false;
  
  const { width, height, currentMode, zoomLevel } = state;
  
  // Clear canvas
  ctx.clearRect(0, 0, width, height);
  
  if (currentMode !== 'selection') return;

  // 1. Draw Coarse Grid (Always visible in selection)
  // ADAPTIVE GRID: If we have actionable regions, fade the grid significantly to reduce clutter
  // This prioritizes the "Live UI" view as requested
  const hasRegions = state.actionableRegions && state.actionableRegions.length > 0;
  const gridOpacity = hasRegions ? 0.15 : 0.85; 
  const dotOpacity = hasRegions ? 0.15 : 0.85;
  const labelOpacity = hasRegions ? 0.1 : 0.7;

  ctx.fillStyle = `rgba(0, 122, 255, ${dotOpacity})`;
  ctx.strokeStyle = `rgba(255, 255, 255, ${dotOpacity + 0.1})`;
  ctx.lineWidth = 2;
  
  // Font for labels
  ctx.font = '500 11px "SF Mono", "Monaco", "Menlo", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  
  // Calculate grid bounds
  const cols = Math.ceil((width - START_OFFSET) / COARSE_SPACING) + 1;
  const rows = Math.ceil((height - START_OFFSET) / COARSE_SPACING) + 1;
  
  // Draw Coarse Dots + Labels
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const x = START_OFFSET + c * COARSE_SPACING;
      const y = START_OFFSET + r * COARSE_SPACING;
      
      if (x > width || y > height) continue;
      
      // Draw Dot
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 122, 255, ${dotOpacity})`;
      ctx.fill();
      ctx.stroke();
      
      // Draw Label
      const label = generateLabel(c, r, false);
      const metrics = ctx.measureText(label);
      const bgW = metrics.width + 10;
      const bgH = 16;
      
      // Label Background (Fainter if regions present)
      ctx.fillStyle = `rgba(0, 0, 0, ${labelOpacity})`;
      ctx.fillRect(x - bgW / 2, y - 20 - bgH, bgW, bgH);
      
      // Label Text
      ctx.fillStyle = `rgba(255, 255, 255, ${hasRegions ? 0.4 : 1.0})`;
      ctx.fillText(label, x, y - 24);
    }
  }

  // 2. Draw Fine Grid (If Zoom Level >= 2)
  if (zoomLevel >= 2) {
    ctx.fillStyle = 'rgba(100, 180, 255, 0.5)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    
    // Performance: Batch all fine dots into one path
    ctx.beginPath();
    
    const fCols = Math.ceil(width / FINE_SPACING);
    const fRows = Math.ceil(height / FINE_SPACING);
    
    for (let c = 0; c < fCols; c++) {
      for (let r = 0; r < fRows; r++) {
        const x = FINE_START + c * FINE_SPACING;
        const y = FINE_START + r * FINE_SPACING;
        
        if (x > width || y > height) continue;

        // Skip if overlaps with Coarse grid (approx check)
        // Coarse grid is at 50 + n*100.
        const nearestCoarseX = Math.round((x - START_OFFSET)/COARSE_SPACING) * COARSE_SPACING + START_OFFSET;
        const nearestCoarseY = Math.round((y - START_OFFSET)/COARSE_SPACING) * COARSE_SPACING + START_OFFSET;
        
        if (Math.abs(x - nearestCoarseX) < 10 && Math.abs(y - nearestCoarseY) < 10) continue;
        
        ctx.moveTo(x + 3, y);
        ctx.arc(x, y, 3, 0, Math.PI*2);
      }
    }
    ctx.fill();
    ctx.stroke();
  }

  // 3. Draw Local Fine Grid (If Zoom Level < 2)
  if (zoomLevel < 2) {
    drawLocalFineGrid();
  }
  
  // 4. Draw Actionable Regions (AI Vision)
  if (state.actionableRegions && state.actionableRegions.length > 0) {
    drawActionableRegions();
  }
}

// Resize handler
function resize() {
  state.width = window.innerWidth;
  state.height = window.innerHeight;
  canvas.width = state.width;
  canvas.height = state.height;
  requestDraw();
}
window.addEventListener('resize', resize);
resize(); // Init

// ===== UTILS =====
function generateLabel(col, row, isFine) {
  if (isFine) {
     // Fine grid logic (B3.21 style)
     const coarseCol = Math.floor(col / 4);
     const coarseRow = Math.floor(row / 4);
     const subCol = col % 4;
     const subRow = row % 4;
     const letter = getColLetter(coarseCol);
     return `${letter}${coarseRow}.${subCol}${subRow}`;
  } else {
    // Coarse grid logic (A1 style)
    const letter = getColLetter(col);
    return `${letter}${row}`;
  }
}

function getColLetter(colIndex) {
  let letter = '';
  if (colIndex >= 26) {
    letter += String.fromCharCode(65 + Math.floor(colIndex / 26) - 1);
  }
  letter += String.fromCharCode(65 + (colIndex % 26));
  return letter;
}

// Coordinate mapping for AI (Inverse of drawing)
// This must match generateLabel and draw loop logic exactly
function labelToScreenCoordinates(label) {
  if (window.electronAPI?.labelToScreenCoordinates) {
    return window.electronAPI.labelToScreenCoordinates(label);
  }
  if (!label) return null;
  const match = label.match(/^([A-Z]+)(\d+)(\.(\d)(\d))?$/);
  if (!match) return null;
  
  const [, letters, rowStr, , subColStr, subRowStr] = match;
  
  // Decode column letters to match getColLetter()
  // A=0..Z=25, AA=26, AB=27, etc.
  let colIndex;
  if (letters.length === 1) {
    colIndex = letters.charCodeAt(0) - 65;
  } else {
    const first = letters.charCodeAt(0) - 65 + 1;
    const second = letters.charCodeAt(1) - 65;
    colIndex = (first * 26) + second;
  }
  
  const rowIndex = parseInt(rowStr, 10);
  
  if (subColStr && subRowStr) {
     // Fine grid logic: index into the global fine grid (25px spacing)
     const subCol = parseInt(subColStr, 10);
     const subRow = parseInt(subRowStr, 10);
     const fineCol = (colIndex * 4) + subCol;
     const fineRow = (rowIndex * 4) + subRow;
     const fineX = FINE_START + fineCol * FINE_SPACING;
     const fineY = FINE_START + fineRow * FINE_SPACING;
     return { x: fineX, y: fineY, screenX: fineX, screenY: fineY };
  } else {
    // Coarse
    const x = START_OFFSET + colIndex * COARSE_SPACING;
    const y = START_OFFSET + rowIndex * COARSE_SPACING;
    return { x, y, screenX: x, screenY: y };
  }
}

function drawLocalFineGrid() {
  if (state.currentMode !== 'selection') return;
  const { mouse, width, height } = state;
  if (!mouse) return;

  const baseCol = Math.round((mouse.x - FINE_START) / FINE_SPACING);
  const baseRow = Math.round((mouse.y - FINE_START) / FINE_SPACING);

  const minCol = baseCol - LOCAL_FINE_RADIUS;
  const maxCol = baseCol + LOCAL_FINE_RADIUS;
  const minRow = baseRow - LOCAL_FINE_RADIUS;
  const maxRow = baseRow + LOCAL_FINE_RADIUS;

  ctx.fillStyle = 'rgba(120, 200, 255, 0.7)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = 1;

  ctx.beginPath();
  for (let c = minCol; c <= maxCol; c++) {
    const x = FINE_START + c * FINE_SPACING;
    if (x < 0 || x > width) continue;
    for (let r = minRow; r <= maxRow; r++) {
      const y = FINE_START + r * FINE_SPACING;
      if (y < 0 || y > height) continue;
      ctx.moveTo(x + 2, y);
      ctx.arc(x, y, 2, 0, Math.PI * 2);
    }
  }
  ctx.fill();
  ctx.stroke();

  const centerX = FINE_START + baseCol * FINE_SPACING;
  const centerY = FINE_START + baseRow * FINE_SPACING;
  if (centerX >= 0 && centerX <= width && centerY >= 0 && centerY <= height) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 255, 200, 0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawActionableRegions() {
  const { actionableRegions, hoveredRegion } = state;
  if (!actionableRegions) return;

  // Style for regions
  ctx.lineWidth = 1;
  ctx.textBaseline = 'top';

  // Smart De-Cluttering:
  // If we have > 50 regions, we might want to skip drawing containers that fully enclose other regions?
  // For now, relies on the improved visual style to handle density.

  actionableRegions.forEach((region, index) => {
    const { bounds, label, type, id } = region;
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) return;

    const x = bounds.x;
    const y = bounds.y;
    const w = bounds.width;
    const h = bounds.height;
    
    // Check hover state (from mousemove or DOM interaction)
    const isHovered = hoveredRegion && hoveredRegion.id === id;

    // 1. Determine Style based on interactivity and state
    const isPrimaryAction = ['Button', 'Hyperlink', 'MenuItem', 'TabItem', 'CheckBox'].includes(type);
    const isInput = ['Edit', 'ComboBox', 'Document'].includes(type);
    
    let strokeColor, fillColor, textColor, bgAlpha;
    
    if (isHovered) {
      strokeColor = 'rgba(255, 255, 0, 1.0)'; // Bright Yellow highlight
      fillColor = 'rgba(255, 255, 0, 0.1)';
      textColor = '#ffff00';
      bgAlpha = 0.95;
      ctx.lineWidth = 2;
    } else if (isPrimaryAction) {
      strokeColor = 'rgba(0, 255, 255, 0.7)'; // Cyan for clickable
      fillColor = 'rgba(0, 255, 255, 0.02)';
      textColor = '#00ffff';
      bgAlpha = 0.8;
      ctx.lineWidth = 1;
    } else if (isInput) {
      strokeColor = 'rgba(0, 255, 100, 0.6)'; // Greenish for inputs
      fillColor = 'rgba(0, 255, 100, 0.02)';
      textColor = '#00ff66';
      bgAlpha = 0.7;
      ctx.lineWidth = 1;
    } else {
      // Containers/Text - Subtle
      strokeColor = 'rgba(100, 180, 255, 0.3)';
      fillColor = 'transparent';
      textColor = 'rgba(200, 220, 255, 0.8)';
      bgAlpha = 0.6;
      ctx.lineWidth = 0.5;
    }

    // 2. Draw Outline
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = fillColor;
    
    // Use dashed lines for containers/large areas to reduce noise
    if (!isHovered && w > 300 && h > 300) {
       ctx.setLineDash([4, 4]);
    } else {
       ctx.setLineDash([]);
    }
    
    ctx.strokeRect(x, y, w, h);
    ctx.fillRect(x, y, w, h);
    ctx.setLineDash([]); // Reset

    // 3. Draw Label
    // CLARITY FIX: Only show Index by default. Show full Name only on Hover.
    // This keeps the screen clean while allowing "Confident Communication" via ID reference.
    const idx = index + 1;
    let labelText = `#${idx}`;
    
    if (isHovered && label) {
       // Show full info on hover
       labelText = `${label} (${type})`;
       ctx.font = 'bold 12px "SF Mono", "Monaco", monospace'; // Larger font on hover
    } else {
       ctx.font = 'bold 10px "SF Mono", "Monaco", monospace';
    }

    const textMetrics = ctx.measureText(labelText);
    const textW = textMetrics.width + 6;
    const textH = isHovered ? 16 : 12;

    // Label Position: Interior Top-Left
    // Ensure it doesn't go off-screen
    let lx = x; 
    let ly = y;
    
    // Label Background
    ctx.fillStyle = `rgba(0, 20, 20, ${bgAlpha})`;
    ctx.fillRect(lx, ly, textW, textH);

    // Label Text
    ctx.fillStyle = textColor;
    ctx.fillText(labelText, lx + 3, ly + 1);
  });
}

// ===== INPUT HANDLING =====

// Visual Feedback Helper
function showFeedback(text) {
  const el = document.getElementById('key-feedback');
  let fb = el;
  if(!fb) {
      fb = document.createElement('div');
      fb.id = 'key-feedback';
      fb.style.cssText = `position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
        background:rgba(0,120,215,0.9); color:white; padding:16px 32px; border-radius:8px;
        font-size:18px; font-weight:600; opacity:0; transition:opacity 0.2s; pointer-events:none; z-index:99999;`;
      document.body.appendChild(fb);
  }
  fb.textContent = text;
  fb.style.opacity = 1;
  clearTimeout(state.indicators.feedback.timeout);
  state.indicators.feedback.timeout = setTimeout(() => fb.style.opacity = 0, 1000);
}

// Mouse Tracking for Virtual Interaction
document.addEventListener('mousemove', (e) => {
  state.mouse = { x: e.clientX, y: e.clientY };
  if(ui.coordsStatus) ui.coordsStatus.textContent = `${e.clientX}, ${e.clientY}`;
  
  if (state.currentMode === 'selection') {
    requestDraw();

    // 0. HIT TESTING for Actionable Regions
    const { actionableRegions } = state;
    if (actionableRegions && actionableRegions.length > 0) {
      const hit = actionableRegions
        .filter(r => 
          e.clientX >= r.bounds.x && 
          e.clientX <= (r.bounds.x + r.bounds.width) &&
          e.clientY >= r.bounds.y && 
          e.clientY <= (r.bounds.y + r.bounds.height)
        )
        // Sort by area ascending so we pick the smallest/most specific one
        .sort((a,b) => (a.bounds.width * a.bounds.height) - (b.bounds.width * b.bounds.height))[0];
      
      if (state.hoveredRegion !== (hit || null)) {
        state.hoveredRegion = hit || null;
        requestDraw();
      }
    }

    // Virtual Interaction Logic
    // Find nearest grid point
    const spacing = state.zoomLevel >= 2 ? FINE_SPACING : COARSE_SPACING;
    const offset = state.zoomLevel >= 2 ? FINE_START : START_OFFSET;
    
    // Nearest index
    const c = Math.round((e.clientX - offset) / spacing);
    const r = Math.round((e.clientY - offset) / spacing);
    const snapX = offset + c * spacing;
    const snapY = offset + r * spacing;
    
    // Dist
    const dx = e.clientX - snapX;
    const dy = e.clientY - snapY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    // Highlight if close
    if (dist < 30) {
      if(ui.interactionRegion) {
        ui.interactionRegion.style.left = (snapX - 15) + 'px';
        ui.interactionRegion.style.top = (snapY - 15) + 'px';
        ui.interactionRegion.style.width = '30px';
        ui.interactionRegion.style.height = '30px';
        ui.interactionRegion.classList.add('visible');
        ui.interactionRegion.dataset.x = snapX;
        ui.interactionRegion.dataset.y = snapY;
      }
    } else {
      if(ui.interactionRegion) ui.interactionRegion.classList.remove('visible');
    }
  }
});

document.addEventListener('click', (e) => {
  if (state.currentMode === 'selection' && ui.interactionRegion && ui.interactionRegion.classList.contains('visible')) {
    const x = parseFloat(ui.interactionRegion.dataset.x);
    const y = parseFloat(ui.interactionRegion.dataset.y);
    
    // Flash effect
    showPulse(x, y);
    
    // Send to main
    let label;
    let type;
    if (state.zoomLevel >= 2) {
      const fineCol = Math.round((x - FINE_START) / FINE_SPACING);
      const fineRow = Math.round((y - FINE_START) / FINE_SPACING);
      label = generateLabel(fineCol, fineRow, true);
      type = 'fine';
    } else {
      const colInit = Math.round((x - START_OFFSET) / COARSE_SPACING);
      const rowInit = Math.round((y - START_OFFSET) / COARSE_SPACING);
      label = generateLabel(colInit, rowInit, false);
      type = 'coarse';
    }
    
    if(window.electronAPI) {
        window.electronAPI.selectDot({
          id: `virtual-${x}-${y}`,
          x, y, bg: true, label,
          screenX: x, screenY: y,
          type
        });
    }
  }
});

// Pulse Effect (Doppler)
function showPulse(x, y) {
  const el = document.createElement('div');
  el.className = 'pulse-ring';
  el.style.cssText = `position:fixed; left:${x}px; top:${y}px; width:10px; height:10px; 
    transform:translate(-50%,-50%); background:rgba(0,255,200,0.5); border-radius:50%; 
    box-shadow: 0 0 15px rgba(0,255,200,0.8); border: 2px solid #00ffcc;
    transition:all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94); pointer-events:none; z-index:2147483647;`;
  document.body.appendChild(el);
  requestAnimationFrame(() => {
    el.style.width = '120px';
    el.style.height = '120px';
    el.style.opacity = 0;
    el.style.borderWidth = '0px';
  });
  setTimeout(() => el.remove(), 700);
}

// ===== IPC & COMMANDS =====
if (window.electronAPI) {
  window.electronAPI.onModeChanged((mode) => {
    state.currentMode = mode;
    state.zoomLevel = 1; 
    
    if (mode === 'selection') {
      if(ui.modeIndicator) ui.modeIndicator.classList.add('visible');
      if(ui.border) ui.border.classList.add('active');
    } else {
      if(ui.modeIndicator) ui.modeIndicator.classList.remove('visible');
      if(ui.border) ui.border.classList.remove('active');
      if(ui.interactionRegion) ui.interactionRegion.classList.remove('visible');
    }
    requestDraw();
  });
  
  window.electronAPI.onOverlayCommand((data) => {
    handleCommand(data);
  });
  
  // Initialize State from Main Process
  window.electronAPI.getState().then(initialState => {
    console.log('Initial state loaded:', initialState);
    if (initialState.overlayMode) {
      state.currentMode = initialState.overlayMode;
      // If valid mode, trigger UI update
      if (state.currentMode === 'selection') {
        if(ui.modeIndicator) ui.modeIndicator.classList.add('visible');
        if(ui.border) ui.border.classList.add('active');
      }
      requestDraw();
    }
    // Load inspect mode state if available
    if (initialState.inspectMode !== undefined) {
      state.inspectMode = initialState.inspectMode;
      updateInspectIndicator();
    }
  }).catch(err => console.error('Failed to get initial state:', err));
  
  // Listen for inspect regions update
  if (window.electronAPI.onInspectRegionsUpdate) {
    window.electronAPI.onInspectRegionsUpdate((regions) => {
      console.log('Received inspect regions:', regions?.length || 0);
      updateInspectRegions(regions);
    });
  }
  
  // Listen for inspect mode toggle
  if (window.electronAPI.onInspectModeChanged) {
    window.electronAPI.onInspectModeChanged((enabled) => {
      console.log('Inspect mode changed:', enabled);
      state.inspectMode = enabled;
      updateInspectIndicator();
      if (!enabled) {
        clearInspectRegions();
      }
    });
  }
  
  // Listen for live UI watcher updates (background UI changes)
  if (window.electronAPI.onUIWatcherUpdate) {
    window.electronAPI.onUIWatcherUpdate((diff) => {
      if (diff && (diff.added?.length || diff.changed?.length || diff.removed?.length)) {
        console.log('[Overlay] UI watcher update:', {
          added: diff.added?.length || 0,
          changed: diff.changed?.length || 0,
          removed: diff.removed?.length || 0
        });
        // Update UI mirror elements for subtle visual feedback
        state.uiMirrorElements = diff.currentElements || [];
        // Could trigger subtle highlight of changed elements here
        // For now, just log - full visual rendering can be added later
      }
    });
  }
  
  // Identify
  console.log('Hooked electronAPI events');
} else {
  console.warn('electronAPI not found - running in standalone mode?');
}

function handleCommand(data) {
  if (data.action !== 'update-inspect-regions') {
    console.log('Command:', data.action);
  }
  switch (data.action) {
    case 'toggle-fine':
      state.zoomLevel = state.zoomLevel >= 2 ? 1 : 2;
      showFeedback(state.zoomLevel >= 2 ? 'Fine Grid ON' : 'Fine Grid OFF');
      requestDraw();
      break;
    case 'show-all':
      state.zoomLevel = 3;
      showFeedback('All Grids Visible');
      requestDraw();
      break;
    case 'zoom-in':
      state.zoomLevel = Math.min(3, state.zoomLevel + 1);
      showFeedback(`Zoom: ${state.zoomLevel}x`);
      requestDraw();
      break;
    case 'zoom-out':
      state.zoomLevel = Math.max(1, state.zoomLevel - 1);
      showFeedback(`Zoom: ${state.zoomLevel}x`);
      requestDraw();
      break;
    case 'set-click-through':
      document.body.style.pointerEvents = data.enabled ? 'none' : '';
      if(ui.interactionRegion) ui.interactionRegion.style.pointerEvents = data.enabled ? 'none' : '';
      // Also update inspect regions pointer events
      if(ui.inspectContainer) ui.inspectContainer.style.pointerEvents = data.enabled ? 'none' : '';
      break;
    case 'pulse-click':
    case 'highlight-coordinate':
      showPulse(data.x, data.y);
      break;
    case 'get-coordinates':
      if (data.label && window.electronAPI.sendCoordinates) {
        // Not implemented in preload yet, but logical place
        // For now, we rely on main process calculating it via ai-service
      }
      break;
    // Inspect mode commands
    case 'toggle-inspect':
      state.inspectMode = !state.inspectMode;
      showFeedback(state.inspectMode ? 'Inspect Mode ON' : 'Inspect Mode OFF');
      updateInspectIndicator();
      if (!state.inspectMode) {
        clearInspectRegions();
      }
      break;
    case 'update-inspect-regions':
      if (data.regions) {
        // Reuse inspection capability for AI vision visualization
        // Check if we should use DOM (legacy/inspect) or Canvas (performance)
        // For high-frequency updates, we'll store in actionableRegions and use canvas
        state.actionableRegions = data.regions;
        requestDraw();
        
        // If actual inspect mode is active, also update DOM for interaction
        if (state.inspectMode) {
            updateInspectRegions(data.regions);
        }
      }
      break;
    case 'clear-inspect-regions':
      clearInspectRegions();
      break;
  }
  
  if (ui.gridStatus) {
    ui.gridStatus.textContent = state.zoomLevel > 1 ? 'Grid: Fine' : 'Grid: Coarse';
  }
}

// ===== INSPECT MODE FUNCTIONS =====

/**
 * Update inspect indicator visibility
 */
function updateInspectIndicator() {
  if (ui.inspectIndicator) {
    if (state.inspectMode) {
      ui.inspectIndicator.classList.add('visible');
    } else {
      ui.inspectIndicator.classList.remove('visible');
    }
  }
}

/**
 * Update inspect regions display
 * @param {Array} regions - Array of region objects with bounds, label, role, confidence
 */
function updateInspectRegions(regions) {
  if (!ui.inspectContainer) return;
  
  // Clear existing regions
  ui.inspectContainer.innerHTML = '';
  state.inspectRegions = regions || [];
  
  // Update region count
  if (ui.regionCount) {
    ui.regionCount.textContent = state.inspectRegions.length;
  }
  
  // Render regions
  state.inspectRegions.forEach((region, index) => {
    const el = createRegionElement(region, index);
    ui.inspectContainer.appendChild(el);
  });
  
  console.log(`Rendered ${state.inspectRegions.length} inspect regions`);
}

/**
 * Create a DOM element for an inspect region
 * @param {Object} region - Region data
 * @param {number} index - Region index
 * @returns {HTMLElement}
 */
function createRegionElement(region, index) {
  const el = document.createElement('div');
  el.className = 'inspect-region';
  el.dataset.regionId = region.id;
  el.dataset.index = index;
  
  // Position and size
  const bounds = region.bounds || {};
  el.style.left = `${bounds.x || 0}px`;
  el.style.top = `${bounds.y || 0}px`;
  el.style.width = `${bounds.width || 0}px`;
  el.style.height = `${bounds.height || 0}px`;
  
  // Add classes for state
  // Handle undefined/null confidence - default to 1.0 (high confidence)
  const confidence = region.confidence ?? 1.0;
  if (confidence < 0.7) {
    el.classList.add('low-confidence');
  }
  if (region.id === state.selectedRegionId) {
    el.classList.add('selected');
  }
  
  // Add label
  const label = document.createElement('span');
  label.className = 'inspect-region-label';
  label.textContent = region.label || region.role || `Region ${index + 1}`;
  el.appendChild(label);
  
  // Event handlers
  el.addEventListener('mouseenter', (e) => {
    state.hoveredRegion = region;
    showInspectTooltip(region, e.clientX, e.clientY);
  });
  
  el.addEventListener('mouseleave', () => {
    state.hoveredRegion = null;
    hideInspectTooltip();
  });
  
  el.addEventListener('mousemove', (e) => {
    if (state.hoveredRegion === region) {
      positionTooltip(e.clientX, e.clientY);
    }
  });
  
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    selectRegion(region);
  });
  
  return el;
}

/**
 * Show inspect tooltip for a region
 * @param {Object} region - Region data
 * @param {number} x - Mouse X position
 * @param {number} y - Mouse Y position
 */
function showInspectTooltip(region, x, y) {
  if (!ui.inspectTooltip) return;
  
  // Update tooltip content
  const roleEl = ui.inspectTooltip.querySelector('.tooltip-role');
  const labelEl = ui.inspectTooltip.querySelector('.tooltip-label');
  const textEl = document.getElementById('tooltip-text');
  const posEl = document.getElementById('tooltip-position');
  const confEl = document.getElementById('tooltip-confidence');
  const confBar = document.getElementById('tooltip-confidence-bar');
  
  if (roleEl) roleEl.textContent = region.role || 'element';
  if (labelEl) labelEl.textContent = region.label || 'Unknown';
  if (textEl) textEl.textContent = region.text || '-';
  
  const centerX = Math.round((region.bounds?.x || 0) + (region.bounds?.width || 0) / 2);
  const centerY = Math.round((region.bounds?.y || 0) + (region.bounds?.height || 0) / 2);
  if (posEl) posEl.textContent = `${centerX}, ${centerY}`;
  
  const confidence = Math.round((region.confidence || 0.5) * 100);
  if (confEl) confEl.textContent = `${confidence}%`;
  if (confBar) confBar.style.width = `${confidence}%`;
  
  // Position and show tooltip
  positionTooltip(x, y);
  ui.inspectTooltip.classList.add('visible');
}

/**
 * Position tooltip near cursor
 * @param {number} x - Mouse X
 * @param {number} y - Mouse Y
 */
function positionTooltip(x, y) {
  if (!ui.inspectTooltip) return;
  
  const offset = 15;
  const tooltipRect = ui.inspectTooltip.getBoundingClientRect();
  
  // Default position: below and to the right of cursor
  let left = x + offset;
  let top = y + offset;
  
  // Adjust if tooltip would go off screen
  if (left + tooltipRect.width > window.innerWidth) {
    left = x - tooltipRect.width - offset;
  }
  if (top + tooltipRect.height > window.innerHeight) {
    top = y - tooltipRect.height - offset;
  }
  
  ui.inspectTooltip.style.left = `${left}px`;
  ui.inspectTooltip.style.top = `${top}px`;
}

/**
 * Hide inspect tooltip
 */
function hideInspectTooltip() {
  if (ui.inspectTooltip) {
    ui.inspectTooltip.classList.remove('visible');
  }
}

/**
 * Select a region and notify main process
 * @param {Object} region - Region to select
 */
function selectRegion(region) {
  // Update state
  state.selectedRegionId = region.id;
  
  // Update visual state
  document.querySelectorAll('.inspect-region').forEach(el => {
    el.classList.remove('selected');
    if (el.dataset.regionId === region.id) {
      el.classList.add('selected');
    }
  });
  
  // Show pulse at region center
  const centerX = (region.bounds?.x || 0) + (region.bounds?.width || 0) / 2;
  const centerY = (region.bounds?.y || 0) + (region.bounds?.height || 0) / 2;
  showPulse(centerX, centerY);
  
  // Notify main process
  if (window.electronAPI?.selectInspectRegion) {
    window.electronAPI.selectInspectRegion({
      targetId: region.id,
      region: region,
      bounds: region.bounds,
      x: centerX,
      y: centerY
    });
  } else if (window.electronAPI?.selectDot) {
    // Fallback to dot selection
    window.electronAPI.selectDot({
      id: `inspect-${region.id}`,
      x: centerX,
      y: centerY,
      label: region.label || region.role,
      targetId: region.id,
      type: 'inspect-region',
      screenX: centerX,
      screenY: centerY,
      region: region
    });
  }
  
  showFeedback(`Selected: ${region.label || region.role || 'Region'}`);
}

/**
 * Clear all inspect regions
 */
function clearInspectRegions() {
  if (ui.inspectContainer) {
    ui.inspectContainer.innerHTML = '';
  }
  state.inspectRegions = [];
  state.hoveredRegion = null;
  state.selectedRegionId = null;
  
  if (ui.regionCount) {
    ui.regionCount.textContent = '0';
  }
  
  hideInspectTooltip();
}

/**
 * Find region at a point (for hover detection)
 * Uses exclusive bounds (x < right, y < bottom) for correct hit detection
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {Object|null}
 */
function findRegionAtPoint(x, y) {
  for (const region of state.inspectRegions) {
    const b = region.bounds;
    // Use exclusive bounds (< instead of <=) for mathematical correctness
    if (x >= b.x && x < b.x + b.width && y >= b.y && y < b.y + b.height) {
      return region;
    }
  }
  return null;
}

// Expose Helper Global
window.labelToScreenCoordinates = labelToScreenCoordinates;

// Expose inspect functions globally for debugging
window.updateInspectRegions = updateInspectRegions;
window.clearInspectRegions = clearInspectRegions;

console.log('High-Performance Canvas Overlay Loaded');
requestDraw(); 
