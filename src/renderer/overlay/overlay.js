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
  }
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
  border: document.getElementById('overlay-border')
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
  ctx.fillStyle = 'rgba(0, 122, 255, 0.85)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
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
      ctx.fillStyle = 'rgba(0, 122, 255, 0.85)';
      ctx.fill();
      ctx.stroke();
      
      // Draw Label
      const label = generateLabel(c, r, false);
      const metrics = ctx.measureText(label);
      const bgW = metrics.width + 10;
      const bgH = 16;
      
      // Label Background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(x - bgW / 2, y - 20 - bgH, bgW, bgH);
      
      // Label Text
      ctx.fillStyle = 'white';
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
resize(); // Initesize(); // Init

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
    const colInit = Math.round((x - START_OFFSET) / COARSE_SPACING);
    const rowInit = Math.round((y - START_OFFSET) / COARSE_SPACING);
    const label = generateLabel(colInit, rowInit, false);
    
    if(window.electronAPI) {
        window.electronAPI.selectDot({
          id: `virtual-${x}-${y}`,
          x, y, bg: true, label,
          screenX: x, screenY: y,
          type: 'coarse'
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
  }).catch(err => console.error('Failed to get initial state:', err));
  
  // Identify
  console.log('Hooked electronAPI events');
} else {
  console.warn('electronAPI not found - running in standalone mode?');
}

function handleCommand(data) {
  console.log('Command:', data.action);
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
  }
  
  if (ui.gridStatus) {
    ui.gridStatus.textContent = state.zoomLevel > 1 ? 'Grid: Fine' : 'Grid: Coarse';
  }
}

// Expose Helper Global
window.labelToScreenCoordinates = labelToScreenCoordinates;

console.log('High-Performance Canvas Overlay Loaded');
requestDraw(); 
