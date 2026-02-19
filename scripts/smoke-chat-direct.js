#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const testScript = path.join(__dirname, 'test-ui-automation.js');
const startScript = path.join(__dirname, 'start.js');

function runNode(args, name) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [testScript, ...args], { stdio: 'inherit', shell: false });
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

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('========================================');
  console.log(' Direct Chat Smoke Test (No Keyboard)');
  console.log('========================================');

  const env = {
    ...process.env,
    LIKU_ENABLE_DEBUG_IPC: '1',
    LIKU_SMOKE_DIRECT_CHAT: '1',
  };

  const app = spawn(process.execPath, [startScript], {
    stdio: 'inherit',
    env,
    shell: false,
  });

  try {
    await sleep(3000);

    const overlayOk = await runNode(
      ['windows', 'Overlay', '--process=electron', '--require-match=true'],
      'Overlay visible'
    );

    const chatVisibleOk = await runNode(
      ['windows', '--process=electron', '--include-untitled=true', '--min-count=2'],
      'Chat became visible via direct toggle'
    );

    if (!overlayOk || !chatVisibleOk) {
      process.exitCode = 1;
      return;
    }

    console.log('\n✅ Direct chat smoke test passed.');
  } finally {
    if (!app.killed) {
      app.kill();
    }
  }
}

main().catch((err) => {
  console.error('Direct smoke test failed:', err.message);
  process.exit(1);
});
