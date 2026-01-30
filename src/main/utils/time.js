/**
 * Centralized time utilities for consistent timestamp handling
 */

const TIME_FORMAT = {
  ISO: 'iso',
  FILENAME_SAFE: 'filename',
  DISPLAY: 'display'
};

function nowIso() {
  return new Date().toISOString();
}

function nowFilenameSafe() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function nowDisplay() {
  return new Date().toLocaleString();
}

function formatTimestamp(date, format = TIME_FORMAT.ISO) {
  const d = date instanceof Date ? date : new Date(date);
  
  switch (format) {
    case TIME_FORMAT.FILENAME_SAFE:
      return d.toISOString().replace(/[:.]/g, '-');
    case TIME_FORMAT.DISPLAY:
      return d.toLocaleString();
    case TIME_FORMAT.ISO:
    default:
      return d.toISOString();
  }
}

function parseTimestamp(timestamp) {
  return new Date(timestamp);
}

function timeSince(timestamp) {
  const ms = Date.now() - new Date(timestamp).getTime();
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}

module.exports = {
  TIME_FORMAT,
  nowIso,
  nowFilenameSafe,
  nowDisplay,
  formatTimestamp,
  parseTimestamp,
  timeSince
};
