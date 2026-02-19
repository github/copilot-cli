#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const scriptPath = path.join(__dirname, 'test-ui-automation.js');
const startScript = path.join(__dirname, 'start.js');

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runStep(name, args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      stdio: 'inherit',
      shell: false,
    });

    child.on('exit', (code) => {
      if (code === 0) {
        console.log(`✅ ${name}`);
        resolve(true);
      } else {
        console.error(`❌ ${name} (exit ${code})`);
        resolve(false);
      }
    });
  });
}

function startAppForSmoke() {
  const env = {
    ...process.env,
    LIKU_ENABLE_DEBUG_IPC: '1',
    LIKU_SMOKE_DIRECT_CHAT: '1',
  };

  return spawn(process.execPath, [startScript], {
    stdio: 'inherit',
    shell: false,
    env,
  });
}

async function main() {
  console.log('========================================');
  console.log(' Targeted Shortcut Smoke Test');
  console.log('========================================');
  console.log('Phase 1 validates chat via direct in-app toggle; phase 2 validates keyboard overlay toggle with target gating.\n');

  const app = startAppForSmoke();

  try {
    await sleep(3000);

    const phase1 = [
      {
        name: 'Find overlay window (electron)',
        args: ['windows', 'Overlay', '--process=electron', '--require-match=true'],
      },
      {
        name: 'Confirm chat visible via direct toggle',
        args: ['windows', '--process=electron', '--include-untitled=true', '--min-count=2'],
      },
    ];

    let passed = 0;
    for (const step of phase1) {
      const ok = await runStep(step.name, step.args);
      if (!ok) {
        console.error('\nSmoke test stopped during phase 1.');
        process.exit(1);
      }
      passed += 1;
    }

    const phase2 = [
      {
        name: 'Toggle overlay (Ctrl+Shift+O) with target gating',
        args: ['keys', 'ctrl+shift+o', '--target-process=electron', '--target-title=Overlay'],
      },
      {
        name: 'Overlay still reachable after shortcut',
        args: ['windows', 'Overlay', '--process=electron', '--require-match=true'],
      },
    ];

    for (const step of phase2) {
      const ok = await runStep(step.name, step.args);
      if (!ok) {
        console.error('\nSmoke test stopped during phase 2.');
        process.exit(1);
      }
      passed += 1;
    }

    console.log(`\n✅ Smoke test complete (${passed} checks passed).`);
  } finally {
    if (!app.killed) {
      app.kill();
    }
  }
}

main().catch((err) => {
  console.error('Smoke test failed:', err.message);
  process.exit(1);
});
