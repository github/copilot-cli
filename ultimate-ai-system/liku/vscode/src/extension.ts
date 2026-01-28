import * as vscode from 'vscode';
import * as fs from 'node:fs';
import * as path from 'node:path';

let outputChannel: vscode.OutputChannel;

function findManifest(): string | undefined {
  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    const mp = path.join(folder.uri.fsPath, '.ai', 'manifest.json');
    if (fs.existsSync(mp)) return mp;
  }
  return undefined;
}

function getProjectRoot(): string | undefined {
  const mp = findManifest();
  return mp ? path.dirname(path.dirname(mp)) : undefined;
}

async function createCheckpoint() {
  const root = getProjectRoot();
  if (!root) { vscode.window.showErrorMessage('Not in a Liku project.'); return; }
  const context = await vscode.window.showInputBox({ prompt: 'Checkpoint description', value: 'VS Code checkpoint' });
  const ts = new Date().toISOString();
  const xml = `<?xml version="1.0"?>\n<checkpoint><timestamp>${ts}</timestamp><context><current_task>${context ?? 'Manual'}</current_task></context><pending_tasks></pending_tasks><modified_files></modified_files></checkpoint>`;
  const cp = path.join(root, '.ai', 'context', 'checkpoint.xml');
  const dir = path.dirname(cp);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(cp, xml);
  vscode.window.showInformationMessage(`✅ Checkpoint created at ${ts}`);
}

async function showStatus() {
  const root = getProjectRoot();
  if (!root) { vscode.window.showErrorMessage('Not in a Liku project.'); return; }
  outputChannel.clear(); outputChannel.show();
  outputChannel.appendLine('═══════════════════════════════════════');
  outputChannel.appendLine('   Liku AI Architect - Project Status');
  outputChannel.appendLine('═══════════════════════════════════════');
  outputChannel.appendLine(`Project Root: ${root}`);
  const mp = path.join(root, '.ai', 'manifest.json');
  if (fs.existsSync(mp)) { const m = JSON.parse(fs.readFileSync(mp, 'utf-8')); outputChannel.appendLine(`Manifest: v${m.version}`); }
}

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel('Liku AI Architect');
  outputChannel.appendLine('Liku AI Architect activated');
  context.subscriptions.push(
    vscode.commands.registerCommand('liku.refactor', () => vscode.window.showInformationMessage('🛡️ Refactor Protocol Initiated')),
    vscode.commands.registerCommand('liku.checkpoint', createCheckpoint),
    vscode.commands.registerCommand('liku.status', showStatus),
    outputChannel
  );
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBar.text = '$(shield) Liku';
  statusBar.command = 'liku.status';
  if (findManifest()) statusBar.show();
  context.subscriptions.push(statusBar);
}

export function deactivate() { outputChannel?.dispose(); }
