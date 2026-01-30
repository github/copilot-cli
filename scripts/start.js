const { spawn } = require('child_process');
const path = require('path');

// Copy environment and force Electron to run with its GUI
const env = { ...process.env };

if (env.ELECTRON_RUN_AS_NODE) {
  console.warn('Clearing ELECTRON_RUN_AS_NODE before launching Electron GUI.');
  delete env.ELECTRON_RUN_AS_NODE;
}

// The electron package exports the path to the binary when required from Node
const electronPath = require('electron');
const appDir = path.resolve(__dirname, '..');

const child = spawn(electronPath, ['.'], {
  cwd: appDir,
  env,
  stdio: 'inherit',
  windowsHide: false
});

child.on('exit', (code, signal) => {
  if (signal) {
    console.log(`Electron exited via signal ${signal}`);
    process.exit(0);
  } else {
    process.exit(code ?? 0);
  }
});
