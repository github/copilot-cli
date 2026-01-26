// ===== STATE MANAGEMENT =====
let currentMode = 'passive';
let zoomLevel = 1; // 1 = coarse only, 2 = fine visible
let coarseDots = [];
let fineDots = [];
let mousePosition = { x: 0, y: 0 };
let interactionRadius = 200; // Radius around mouse where fine dots appear
let fineDotsVisible = false;
let zoomIndicatorTimeout = null;

// ===== DOM ELEMENTS =====
const canvas = document.getElementById('dot-canvas');
const ctx = canvas.getContext('2d');
const dotsContainer = document.getElementById('dots-container');
const modeIndicator = document.getElementById('mode-indicator');
const overlayBorder = document.getElementById('overlay-border');
const cornerIndicators = document.querySelectorAll('.corner-indicator');
const statusBar = document.getElementById('status-bar');
const gridStatus = document.getElementById('grid-status');
const coordsStatus = document.getElementById('coords-status');
const zoomIndicator = document.getElementById('zoom-indicator');
const interactionRegion = document.getElementById('interaction-region');

// Set canvas size
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ===== GRID CONFIGURATION =====
const COARSE_SPACING = 100;  // Coarse grid: 100px spacing
const FINE_SPACING = 25;      // Fine grid: 25px spacing (appears on zoom/hover)

/**
 * Generate label for a dot based on grid position
 */
function generateDotLabel(col, row, isFineGrid) {
  if (isFineGrid) {
    // Fine grid uses extended labeling: letter + number + sub-position
    const coarseCol = Math.floor(col / 4);
    const coarseRow = Math.floor(row / 4);
    const subCol = col % 4;
    const subRow = row % 4;
    const letter = String.fromCharCode(65 + (coarseCol % 26));
    return `${letter}${coarseRow}.${subCol}${subRow}`;
  } else {
    // Coarse grid uses simple A-Z + row number
    const letter = String.fromCharCode(65 + (col % 26));
    const prefix = col >= 26 ? String.fromCharCode(65 + Math.floor(col / 26) - 1) : '';
    return `${prefix}${letter}${row}`;
  }
}

/**
 * Generate coarse grid of dots (always visible in selection mode)
 */
function generateCoarseGrid() {
  const dots = [];
  const spacing = COARSE_SPACING;
  
  for (let x = spacing; x < window.innerWidth; x += spacing) {
    for (let y = spacing; y < window.innerHeight; y += spacing) {
      const col = Math.floor((x - spacing) / spacing);
      const row = Math.floor((y - spacing) / spacing);
      dots.push({
        id: `coarse-${col}-${row}`,
        x,
        y,
        col,
        row,
        label: generateDotLabel(col, row, false),
        type: 'coarse'
      });
    }
  }
  
  return dots;
}

/**
 * Generate fine grid of dots (appears on zoom/interaction)
 */
function generateFineGrid() {
  const dots = [];
  const spacing = FINE_SPACING;
  
  for (let x = spacing; x < window.innerWidth; x += spacing) {
    for (let y = spacing; y < window.innerHeight; y += spacing) {
      // Skip positions that overlap with coarse grid
      if (x % COARSE_SPACING === 0 && y % COARSE_SPACING === 0) {
        continue;
      }
      
      const col = Math.floor((x - spacing) / spacing);
      const row = Math.floor((y - spacing) / spacing);
      dots.push({
        id: `fine-${col}-${row}`,
        x,
        y,
        col,
        row,
        label: generateDotLabel(col, row, true),
        type: 'fine'
      });
    }
  }
  
  return dots;
}

/**
 * Calculate distance between two points
 */
function distance(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * Render all dots on the overlay
 */
function renderDots() {
  // Clear previous dots
  dotsContainer.innerHTML = '';
  
  if (currentMode !== 'selection') {
    return;
  }

  // Render coarse dots (always visible in selection mode)
  coarseDots.forEach(dot => {
    const dotEl = document.createElement('div');
    dotEl.className = 'dot';
    dotEl.style.left = dot.x + 'px';
    dotEl.style.top = dot.y + 'px';
    dotEl.dataset.id = dot.id;
    dotEl.dataset.type = 'coarse';
    
    const labelEl = document.createElement('div');
    labelEl.className = 'dot-label';
    labelEl.textContent = dot.label;
    labelEl.style.left = dot.x + 'px';
    labelEl.style.top = dot.y + 'px';
    
    dotEl.addEventListener('click', (e) => {
      e.stopPropagation();
      selectDot(dot);
    });
    
    dotEl.addEventListener('mouseenter', () => {
      showFineDotsAround(dot.x, dot.y);
    });

    dotsContainer.appendChild(dotEl);
    dotsContainer.appendChild(labelEl);
  });

  // Render fine dots (conditionally visible based on zoom/interaction)
  fineDots.forEach(dot => {
    const dotEl = document.createElement('div');
    dotEl.className = 'dot fine';
    dotEl.style.left = dot.x + 'px';
    dotEl.style.top = dot.y + 'px';
    dotEl.dataset.id = dot.id;
    dotEl.dataset.type = 'fine';
    
    const labelEl = document.createElement('div');
    labelEl.className = 'dot-label fine-label';
    labelEl.textContent = dot.label;
    labelEl.style.left = dot.x + 'px';
    labelEl.style.top = dot.y + 'px';
    
    dotEl.addEventListener('click', (e) => {
      e.stopPropagation();
      selectDot(dot);
    });

    dotsContainer.appendChild(dotEl);
    dotsContainer.appendChild(labelEl);
  });

  // Update fine dots visibility based on current state
  updateFineDotsVisibility();
}

/**
 * Update visibility of fine dots based on zoom level and mouse position
 */
function updateFineDotsVisibility() {
  const fineDotElements = dotsContainer.querySelectorAll('.dot.fine');
  const fineLabels = dotsContainer.querySelectorAll('.dot-label.fine-label');
  
  fineDotElements.forEach((dotEl, index) => {
    const dotX = parseFloat(dotEl.style.left);
    const dotY = parseFloat(dotEl.style.top);
    const dist = distance(mousePosition.x, mousePosition.y, dotX, dotY);
    
    // Show fine dots if zoom level > 1 OR within interaction radius of mouse
    const shouldShow = zoomLevel > 1 || (fineDotsVisible && dist < interactionRadius);
    
    dotEl.classList.toggle('visible', shouldShow);
    if (fineLabels[index]) {
      fineLabels[index].classList.toggle('visible', shouldShow && dist < interactionRadius / 2);
    }
  });
}

/**
 * Show fine dots around a specific position
 */
function showFineDotsAround(x, y) {
  mousePosition = { x, y };
  fineDotsVisible = true;
  updateFineDotsVisibility();
  updateInteractionRegion(x, y);
}

/**
 * Update the interaction region highlight
 */
function updateInteractionRegion(x, y) {
  const region = interactionRegion;
  const size = interactionRadius * 2;
  
  region.style.left = (x - interactionRadius) + 'px';
  region.style.top = (y - interactionRadius) + 'px';
  region.style.width = size + 'px';
  region.style.height = size + 'px';
  region.classList.add('visible');
}

/**
 * Handle dot selection
 */
function selectDot(dot) {
  console.log('Dot selected:', dot);
  
  // Visual feedback
  const dotEl = dotsContainer.querySelector(`[data-id="${dot.id}"]`);
  if (dotEl) {
    dotEl.classList.add('selected');
    setTimeout(() => dotEl.classList.remove('selected'), 500);
  }

  // Send to main process
  window.electronAPI.selectDot({
    id: dot.id,
    x: dot.x,
    y: dot.y,
    label: dot.label,
    type: dot.type,
    timestamp: Date.now()
  });
}

/**
 * Update overlay border and corner indicators
 */
function updateBorderState(active) {
  overlayBorder.classList.toggle('active', active);
  cornerIndicators.forEach(indicator => {
    indicator.classList.toggle('active', active);
  });
  statusBar.classList.toggle('visible', active);
}

/**
 * Update mode display and all UI elements
 */
function updateModeDisplay() {
  const isSelection = currentMode === 'selection';
  
  if (isSelection) {
    modeIndicator.innerHTML = '<span class="mode-icon"></span>Selection Mode - Click a dot';
    modeIndicator.classList.add('visible');
    updateBorderState(true);
    
    // Regenerate grids when entering selection mode to ensure they're fresh
    coarseDots = generateCoarseGrid();
    fineDots = generateFineGrid();
    console.log(`Generated ${coarseDots.length} coarse dots and ${fineDots.length} fine dots`);
  } else {
    modeIndicator.classList.remove('visible');
    updateBorderState(false);
    interactionRegion.classList.remove('visible');
  }
  
  renderDots();
}

/**
 * Update zoom level and show indicator
 */
function setZoomLevel(level) {
  zoomLevel = Math.max(1, Math.min(3, level));
  
  // Update zoom indicator
  const zoomLevelEl = zoomIndicator.querySelector('.zoom-level');
  zoomLevelEl.textContent = zoomLevel + 'x';
  zoomIndicator.classList.add('visible');
  
  // Update grid status
  gridStatus.textContent = zoomLevel > 1 ? 'Grid: Fine' : 'Grid: Coarse';
  
  // Adjust interaction radius based on zoom
  interactionRadius = 200 / zoomLevel;
  
  // Update visibility
  updateFineDotsVisibility();
  
  // Hide indicator after delay
  clearTimeout(zoomIndicatorTimeout);
  zoomIndicatorTimeout = setTimeout(() => {
    zoomIndicator.classList.remove('visible');
  }, 2000);
}

// ===== EVENT LISTENERS =====

// Mouse move - track position and show fine dots when near coarse dots
document.addEventListener('mousemove', (e) => {
  mousePosition = { x: e.clientX, y: e.clientY };
  
  // Update coordinates display
  coordsStatus.textContent = `${e.clientX}, ${e.clientY}`;
  
  if (currentMode === 'selection') {
    // Check if mouse is near any coarse dot to show fine dots
    let nearCoarseDot = false;
    for (const dot of coarseDots) {
      if (distance(e.clientX, e.clientY, dot.x, dot.y) < 80) {
        nearCoarseDot = true;
        showFineDotsAround(dot.x, dot.y);
        break;
      }
    }
    
    // If near mouse but not a coarse dot, still update fine dots visibility
    if (!nearCoarseDot && fineDotsVisible) {
      updateFineDotsVisibility();
      updateInteractionRegion(e.clientX, e.clientY);
    }
    
    // Hide interaction region if not near any dot and zoom level is 1
    if (!nearCoarseDot && zoomLevel === 1) {
      fineDotsVisible = false;
      interactionRegion.classList.remove('visible');
      updateFineDotsVisibility();
    }
  }
});

// Mouse leave - hide fine dots
document.addEventListener('mouseleave', () => {
  fineDotsVisible = false;
  interactionRegion.classList.remove('visible');
  updateFineDotsVisibility();
});

// Wheel event - zoom in/out
document.addEventListener('wheel', (e) => {
  if (currentMode !== 'selection') return;
  
  e.preventDefault();
  
  if (e.deltaY < 0) {
    // Scroll up - zoom in (show fine dots)
    setZoomLevel(zoomLevel + 1);
  } else {
    // Scroll down - zoom out (hide fine dots)
    setZoomLevel(zoomLevel - 1);
  }
}, { passive: false });

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (currentMode !== 'selection') return;
  
  // '+' or '=' to zoom in
  if (e.key === '+' || e.key === '=') {
    e.preventDefault();
    setZoomLevel(zoomLevel + 1);
    showKeyFeedback('Zoom In');
  }
  // '-' to zoom out
  if (e.key === '-') {
    e.preventDefault();
    setZoomLevel(zoomLevel - 1);
    showKeyFeedback('Zoom Out');
  }
  // 'f', 'F', or 'Space' to toggle fine grid everywhere
  if (e.key === 'f' || e.key === 'F' || e.key === ' ') {
    e.preventDefault();
    const newLevel = zoomLevel > 1 ? 1 : 2;
    setZoomLevel(newLevel);
    showKeyFeedback(newLevel > 1 ? 'Fine Grid ON' : 'Fine Grid OFF');
  }
  // 'g' to toggle all grids visible
  if (e.key === 'g' || e.key === 'G') {
    e.preventDefault();
    setZoomLevel(3);
    showKeyFeedback('All Grids Visible');
  }
  // Escape to exit selection mode
  if (e.key === 'Escape') {
    window.electronAPI.selectDot({ cancelled: true });
    showKeyFeedback('Cancelled');
  }
});

/**
 * Show visual feedback for key presses
 */
function showKeyFeedback(message) {
  // Create or update feedback element
  let feedback = document.getElementById('key-feedback');
  if (!feedback) {
    feedback = document.createElement('div');
    feedback.id = 'key-feedback';
    feedback.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 120, 215, 0.9);
      color: white;
      padding: 16px 32px;
      border-radius: 8px;
      font-size: 18px;
      font-weight: 600;
      z-index: 99999;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
    `;
    document.body.appendChild(feedback);
  }
  
  feedback.textContent = message;
  feedback.style.opacity = '1';
  
  // Fade out after delay
  clearTimeout(feedback._timeout);
  feedback._timeout = setTimeout(() => {
    feedback.style.opacity = '0';
  }, 800);
}

// NOTE: Canvas has pointer-events: none for click-through to background apps.
// Fine dots are shown on mouse move/hover near coarse dots instead of click.
// This allows clicking through to background applications while still
// being able to click on dots (which have pointer-events: auto).

// Window resize
window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  coarseDots = generateCoarseGrid();
  fineDots = generateFineGrid();
  renderDots();
});

// Listen for mode changes from main process
window.electronAPI.onModeChanged((mode) => {
  console.log('Mode changed to:', mode);
  currentMode = mode;
  zoomLevel = 1;
  fineDotsVisible = false;
  
  // Always regenerate grids on mode change
  coarseDots = generateCoarseGrid();
  fineDots = generateFineGrid();
  console.log(`Regenerated grids: ${coarseDots.length} coarse, ${fineDots.length} fine`);
  
  updateModeDisplay();
});

// ===== OVERLAY COMMAND HANDLER (from main process globalShortcut) =====
window.electronAPI.onOverlayCommand && window.electronAPI.onOverlayCommand((data) => {
  console.log('Received overlay command:', data);
  
  if (currentMode !== 'selection') {
    console.log('Ignoring command - not in selection mode');
    return;
  }
  
  switch (data.action) {
    case 'toggle-fine':
      const newLevel = zoomLevel > 1 ? 1 : 2;
      setZoomLevel(newLevel);
      showKeyFeedback(newLevel > 1 ? 'Fine Grid ON' : 'Fine Grid OFF');
      break;
    case 'show-all':
      setZoomLevel(3);
      showKeyFeedback('All Grids Visible');
      break;
    case 'zoom-in':
      setZoomLevel(zoomLevel + 1);
      showKeyFeedback('Zoom In: ' + Math.min(zoomLevel + 1, 3) + 'x');
      break;
    case 'zoom-out':
      setZoomLevel(zoomLevel - 1);
      showKeyFeedback('Zoom Out: ' + Math.max(zoomLevel - 1, 1) + 'x');
      break;
    case 'cancel':
      window.electronAPI.selectDot({ cancelled: true });
      showKeyFeedback('Cancelled');
      break;
    default:
      console.log('Unknown command:', data.action);
  }
});

// ===== INITIALIZATION =====
coarseDots = generateCoarseGrid();
fineDots = generateFineGrid();
console.log(`Initial grid generation: ${coarseDots.length} coarse, ${fineDots.length} fine`);

window.electronAPI.getState().then(state => {
  currentMode = state.overlayMode;
  updateModeDisplay();
});

console.log('Overlay initialized with adaptive grid system');
console.log('Overlay shortcuts: Ctrl+Alt+F = toggle fine, Ctrl+Alt+G = show all, Ctrl+Alt++/- = zoom, Ctrl+Alt+X = cancel');
