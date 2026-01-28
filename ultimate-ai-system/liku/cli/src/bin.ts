#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { AIStreamParser, type CheckpointState } from '@liku/core';

const colors = { reset: '\x1b[0m', bright: '\x1b[1m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m' };
const log = (msg: string, c: keyof typeof colors = 'reset') => console.log(`${colors[c]}${msg}${colors.reset}`);
const logSuccess = (msg: string) => log(`✅ ${msg}`, 'green');
const logError = (msg: string) => log(`❌ ${msg}`, 'red');
const logInfo = (msg: string) => log(`ℹ️  ${msg}`, 'cyan');
const logWarning = (msg: string) => log(`⚠️  ${msg}`, 'yellow');

function showHelp() {
  console.log(`\n${colors.bright}${colors.cyan}Liku AI System CLI${colors.reset}\n
Usage: liku <command> [options]

Commands:
  init [path]       Initialize a new Liku-enabled project
  checkpoint        Create a checkpoint for session handover
  status            Show current project status
  parse <file>      Parse an AI output file for structured tags
  help              Show this help message\n`);
}

function findProjectRoot(start = process.cwd()): string | null {
  let p = resolve(start);
  while (p !== resolve(p, '..')) {
    if (existsSync(join(p, '.ai', 'manifest.json'))) return p;
    p = resolve(p, '..');
  }
  return null;
}

function initProject(target = '.') {
  const projectPath = resolve(target);
  log(`\n🚀 Initializing Liku AI System at: ${projectPath}\n`, 'bright');
  if (existsSync(join(projectPath, '.ai', 'manifest.json'))) { logWarning('Project already initialized.'); return; }
  for (const dir of ['.ai/context', '.ai/instructions', '.ai/logs', 'src', 'tests', 'packages']) {
    const full = join(projectPath, dir);
    if (!existsSync(full)) { mkdirSync(full, { recursive: true }); logInfo(`Created: ${dir}/`); }
  }
  const manifest = { version: '3.1.0', project_root: '.', system_rules: { filesystem_security: { immutable_paths: ['.ai/manifest.json'], writable_paths: ['src/**', 'tests/**', 'packages/**'] } }, agent_profile: { default: 'defensive', token_limit_soft_cap: 32000, context_strategy: 'checkpoint_handover' }, verification: { strategies: { typescript: { tier1_fast: 'pnpm test -- --related ${files}', tier2_preflight: 'pnpm build && pnpm test' } } }, memory: { checkpoint_file: '.ai/context/checkpoint.xml', provenance_log: '.ai/logs/provenance.csv' } };
  writeFileSync(join(projectPath, '.ai', 'manifest.json'), JSON.stringify(manifest, null, 2));
  logSuccess('Created: .ai/manifest.json');
  writeFileSync(join(projectPath, '.ai', 'context', 'checkpoint.xml'), '<?xml version="1.0"?>\n<checkpoint><timestamp></timestamp><context><current_task></current_task></context><pending_tasks></pending_tasks><modified_files></modified_files></checkpoint>');
  logSuccess('Created: .ai/context/checkpoint.xml');
  writeFileSync(join(projectPath, '.ai', 'logs', 'provenance.csv'), 'timestamp,action,path,agent,checksum,parent_checksum,reason\n');
  logSuccess('Created: .ai/logs/provenance.csv');
  log(`\n${colors.green}${colors.bright}✨ Project initialized!${colors.reset}\n`);
}

function createCheckpoint(context?: string) {
  const root = findProjectRoot();
  if (!root) { logError('Not in a Liku project.'); process.exit(1); }
  const ts = new Date().toISOString();
  const xml = `<?xml version="1.0"?>\n<checkpoint><timestamp>${ts}</timestamp><context><current_task>${context ?? 'Manual checkpoint'}</current_task></context><pending_tasks></pending_tasks><modified_files></modified_files></checkpoint>`;
  writeFileSync(join(root, '.ai', 'context', 'checkpoint.xml'), xml);
  logSuccess(`Checkpoint created: ${ts}`);
}

function showStatus() {
  const root = findProjectRoot();
  if (!root) { logError('Not in a Liku project.'); process.exit(1); }
  log(`\n${colors.bright}${colors.cyan}Liku Project Status${colors.reset}\n`);
  log(`Project Root: ${root}`, 'bright');
  const mp = join(root, '.ai', 'manifest.json');
  if (existsSync(mp)) { const m = JSON.parse(readFileSync(mp, 'utf-8')); logSuccess(`Manifest: v${m.version}`); logInfo(`Agent Profile: ${m.agent_profile?.default}`); logInfo(`Context Strategy: ${m.agent_profile?.context_strategy}`); }
  if (existsSync(join(root, '.ai', 'context', 'checkpoint.xml'))) logSuccess('Checkpoint file exists');
  else logWarning('No checkpoint found');
  const pp = join(root, '.ai', 'logs', 'provenance.csv');
  if (existsSync(pp)) { const lines = readFileSync(pp, 'utf-8').trim().split('\n').length - 1; logSuccess(`Provenance log: ${lines} entries`); }
  const ip = join(root, '.ai', 'instructions');
  if (existsSync(ip)) { const files = readdirSync(ip); logSuccess(`Instructions: ${files.length} file(s)`); files.forEach(f => logInfo(`  - ${f}`)); }
  console.log();
}

function parseFile(filePath: string) {
  if (!existsSync(filePath)) { logError(`File not found: ${filePath}`); process.exit(1); }
  const content = readFileSync(filePath, 'utf-8');
  const parser = new AIStreamParser();
  log(`\n${colors.bright}Parsing: ${filePath}${colors.reset}\n`);
  let count = 0;
  parser.on('checkpoint', () => { count++; log('📍 Checkpoint', 'cyan'); });
  parser.on('file_change', ({ path }) => { count++; log(`📝 File Change: ${path}`, 'green'); });
  parser.on('verify', (cmd) => { count++; log(`🔍 Verify: ${cmd}`, 'yellow'); });
  parser.on('analysis', ({ type }) => { count++; log(`📊 Analysis (${type})`, 'cyan'); });
  parser.on('hypothesis', () => { count++; log('💡 Hypothesis', 'cyan'); });
  parser.feed(content);
  log(`\n${colors.bright}Found ${count} structured event(s)${colors.reset}\n`);
}

const args = process.argv.slice(2);
switch (args[0]) {
  case 'init': initProject(args[1]); break;
  case 'checkpoint': createCheckpoint(args[1]); break;
  case 'status': showStatus(); break;
  case 'parse': if (!args[1]) { logError('Provide file path'); process.exit(1); } parseFile(args[1]); break;
  case 'help': case '--help': case '-h': case undefined: showHelp(); break;
  default: logError(`Unknown: ${args[0]}`); showHelp(); process.exit(1);
}
