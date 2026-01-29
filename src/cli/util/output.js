/**
 * CLI Output Utilities
 * 
 * Colored console output helpers for the liku CLI.
 * @module cli/util/output
 */

// ANSI color codes
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// Check if colors are supported
const supportsColor = process.stdout.isTTY && !process.env.NO_COLOR;

function colorize(color, text) {
  if (!supportsColor) return text;
  return `${color}${text}${COLORS.reset}`;
}

/**
 * Log a message (no prefix)
 */
function log(message) {
  console.log(message);
}

/**
 * Success message (green checkmark)
 */
function success(message) {
  console.log(colorize(COLORS.green, '✓ ') + message);
}

/**
 * Error message (red X)
 */
function error(message) {
  console.error(colorize(COLORS.red, '✗ ') + message);
}

/**
 * Warning message (yellow)
 */
function warn(message) {
  console.log(colorize(COLORS.yellow, '⚠ ') + message);
}

/**
 * Info message (blue)
 */
function info(message) {
  console.log(colorize(COLORS.blue, 'ℹ ') + message);
}

/**
 * Dim text (muted)
 */
function dim(text) {
  return colorize(COLORS.dim, text);
}

/**
 * Highlight text (cyan/bright)
 */
function highlight(text) {
  return colorize(COLORS.cyan, text);
}

/**
 * Bold text
 */
function bold(text) {
  return colorize(COLORS.bright, text);
}

/**
 * Format a table of data
 */
function table(rows, headers = null) {
  if (rows.length === 0) return;
  
  // Calculate column widths
  const allRows = headers ? [headers, ...rows] : rows;
  const colCount = Math.max(...allRows.map(r => r.length));
  const colWidths = [];
  
  for (let i = 0; i < colCount; i++) {
    colWidths[i] = Math.max(...allRows.map(r => String(r[i] || '').length));
  }
  
  // Print headers
  if (headers) {
    const headerLine = headers.map((h, i) => String(h).padEnd(colWidths[i])).join('  ');
    console.log(bold(headerLine));
    console.log(dim('-'.repeat(headerLine.length)));
  }
  
  // Print rows
  for (const row of rows) {
    const line = row.map((cell, i) => String(cell || '').padEnd(colWidths[i])).join('  ');
    console.log(line);
  }
}

/**
 * Spinner for long-running operations
 */
class Spinner {
  constructor(message) {
    this.message = message;
    this.frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    this.frameIndex = 0;
    this.interval = null;
  }

  start() {
    if (!supportsColor) {
      console.log(this.message + '...');
      return;
    }
    
    process.stdout.write(this.message + ' ');
    this.interval = setInterval(() => {
      process.stdout.write(`\r${this.message} ${this.frames[this.frameIndex]}`);
      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
    }, 80);
  }

  stop(finalMessage = null) {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (supportsColor) {
      process.stdout.write('\r' + ' '.repeat(this.message.length + 10) + '\r');
    }
    if (finalMessage) {
      console.log(finalMessage);
    }
  }

  succeed(message) {
    this.stop(colorize(COLORS.green, '✓ ') + (message || this.message));
  }

  fail(message) {
    this.stop(colorize(COLORS.red, '✗ ') + (message || this.message));
  }
}

module.exports = {
  log,
  success,
  error,
  warn,
  info,
  dim,
  highlight,
  bold,
  table,
  Spinner,
  COLORS,
  colorize,
};
