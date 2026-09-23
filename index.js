#!/usr/bin/env node
/**
 * Random Joke CLI (no dependencies)
 *
 * Usage:
 *   node index.js [--category Any] [--unsafe] [--timeout 5000] [--retries 2] [--repeat 1]
 *
 * Examples:
 *   ./index.js
 *   ./index.js --category Programming
 *   ./index.js --unsafe --repeat 3
 */

const DEFAULT_TIMEOUT = 5000; // ms
const DEFAULT_RETRIES = 2;
const DEFAULT_REPEAT = 1;

function parseArgs(argv) {
  const args = {
    category: 'Any',
    safe: true,
    timeout: DEFAULT_TIMEOUT,
    retries: DEFAULT_RETRIES,
    repeat: DEFAULT_REPEAT,
  };

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--category' || a === '-c') {
      args.category = argv[++i] || 'Any';
    } else if (a === '--unsafe') {
      args.safe = false;
    } else if (a === '--timeout') {
      args.timeout = Number(argv[++i]) || DEFAULT_TIMEOUT;
    } else if (a === '--retries') {
      args.retries = Math.max(0, Number(argv[++i]) || DEFAULT_RETRIES);
    } else if (a === '--repeat') {
      args.repeat = Math.max(1, Number(argv[++i]) || DEFAULT_REPEAT);
    } else if (a === '--help' || a === '-h') {
      printHelpAndExit();
    } else {
      console.warn(`Unknown arg: ${a}`);
      printHelpAndExit(1);
    }
  }
  return args;
}

function printHelpAndExit(code = 0) {
  console.log(`
Random Joke CLI

Usage:
  index.js [--category <Category>] [--unsafe] [--timeout <ms>] [--retries <n>] [--repeat <n>]

Options:
  --category, -c   Joke category (Any, Programming, Misc, Dark, Pun, Spooky, Christmas, etc.)
  --unsafe         Allow all flags (disables blacklist). By default explicit/racist/etc. are filtered.
  --timeout        Fetch timeout in milliseconds (default ${DEFAULT_TIMEOUT})
  --retries        Number of retries on network errors (default ${DEFAULT_RETRIES})
  --repeat         How many jokes to fetch (default ${DEFAULT_REPEAT})
  --help, -h       Show this help
`);
  process.exit(code);
}

async function fetchWithTimeout(url, timeoutMs, retries) {
  let lastErr = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(id);
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status}`);
        // For 4xx/5xx, don't retry further in many cases, but we'll retry anyway a limited number of times.
        throw lastErr;
      }
      const data = await res.json();
      return data;
    } catch (err) {
      clearTimeout(id);
      lastErr = err;
      const isAbort = err.name === 'AbortError';
      const isLast = attempt === retries;
      if (isLast) break;
      const backoff = 200 * Math.pow(2, attempt); // simple exponential backoff
      await new Promise(r => setTimeout(r, backoff));
    }
  }
  throw lastErr;
}

function buildUrl(category, safe) {
  const base = 'https://v2.jokeapi.dev/joke';
  const cat = encodeURIComponent(category || 'Any');
  const params = new URLSearchParams();
  if (safe) params.set('blacklistFlags', 'nsfw,religious,political,racist,sexist,explicit');
  // You can add other params like lang= or format=
  return `${base}/${cat}?${params.toString()}`;
}

function printJoke(data) {
  if (!data) return;
  if (data.error) {
    console.error('API error:', data.message || JSON.stringify(data));
    return;
  }
  if (data.type === 'single') {
    console.log(data.joke);
  } else {
    console.log(data.setup);
    console.log(data.delivery);
  }
}

async function main() {
  const opts = parseArgs(process.argv);
  const url = buildUrl(opts.category, opts.safe);

  for (let i = 0; i < opts.repeat; i++) {
    try {
      const data = await fetchWithTimeout(url, opts.timeout, opts.retries);
      printJoke(data);
      if (i < opts.repeat - 1) console.log('---'); // separator between jokes
    } catch (err) {
      console.error('Failed to fetch joke:', err.message || err);
      process.exitCode = 1;
      return;
    }
  }
}

main();
