#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const APP_URL = 'http://localhost:' + PORT;
const PROJECT_DIR = __dirname;
const LOCK_FILE = path.join(PROJECT_DIR, '.next', 'dev', 'lock');

console.log('====================================');
console.log('  Tim A&R Scheduling Manager');
console.log('====================================');
console.log('');

let devProcess = null;

// Kill any existing process on a given port (Windows)
function killPortProcess(port) {
  try {
    const result = execSync(
      'netstat -ano | findstr :' + port + ' | findstr LISTENING',
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const lines = result.trim().split('\n');
    const pids = new Set();
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== '0') pids.add(pid);
    }
    for (const pid of pids) {
      try {
        execSync('taskkill /F /PID ' + pid, { stdio: 'pipe' });
        console.log('[*] Killed existing process on port ' + port + ' (PID: ' + pid + ')');
      } catch (e) {
        // process may have already exited
      }
    }
    if (pids.size > 0) {
      // Give OS time to release the port
      execSync('timeout /t 2 /nobreak >NUL 2>&1', { shell: true });
    }
  } catch (e) {
    // No process on that port, that's fine
  }
}

// Remove stale lock file
function removeLockFile() {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      fs.unlinkSync(LOCK_FILE);
      console.log('[*] Removed stale lock file');
    }
  } catch (e) {
    // Lock file may be held; try removing the directory
    try {
      const lockDir = path.dirname(LOCK_FILE);
      fs.rmSync(lockDir, { recursive: true, force: true });
      console.log('[*] Removed stale lock directory');
    } catch (e2) {
      // ignore
    }
  }
}

// Check if server is ready
function checkServer() {
  return new Promise((resolve) => {
    http.get(APP_URL, (res) => {
      res.resume();
      resolve(true);
    }).on('error', () => {
      resolve(false);
    });
  });
}

// Wait for server to be ready
async function waitForServer(maxSeconds) {
  for (let i = 0; i < maxSeconds; i++) {
    if (await checkServer()) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

// Open default browser
function openBrowser() {
  try {
    execSync('start "" "' + APP_URL + '"', { shell: true, stdio: 'pipe' });
    console.log('[OK] Browser opened!');
  } catch (e) {
    console.log('[!] Could not open browser. Open manually: ' + APP_URL);
  }
}

// Cleanup on exit
function cleanup() {
  if (devProcess && !devProcess.killed) {
    try { process.kill(devProcess.pid, 'SIGTERM'); } catch (e) {}
    // Also kill entire process tree on Windows
    try { execSync('taskkill /F /T /PID ' + devProcess.pid, { stdio: 'pipe' }); } catch (e) {}
  }
}

// Main
async function main() {
  // Step 1: Kill any existing server on port 3000
  console.log('[1/4] Checking port ' + PORT + '...');
  killPortProcess(PORT);

  // Step 2: Remove stale lock file
  console.log('[2/4] Cleaning up...');
  removeLockFile();

  // Step 3: Start dev server
  console.log('[3/4] Starting Next.js dev server...');
  console.log('');

  devProcess = spawn('cmd.exe', ['/c', 'npm', 'run', 'dev'], {
    stdio: 'inherit',
    cwd: PROJECT_DIR,
    windowsHide: false
  });

  devProcess.on('error', (error) => {
    console.error('Failed to start: ' + error.message);
    process.exit(1);
  });

  devProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error('Server exited with code ' + code);
    }
    process.exit(code || 0);
  });

  // Step 4: Wait for server and open browser
  console.log('[4/4] Waiting for server...');
  const ready = await waitForServer(60);

  if (ready) {
    console.log('');
    console.log('====================================');
    console.log('  Tim is running!');
    console.log('  ' + APP_URL);
    console.log('====================================');
    console.log('');
    openBrowser();
    console.log('');
    console.log('Close this window to stop the server.');
    console.log('');
  } else {
    console.log('[!] Server is taking longer than expected...');
    openBrowser();
  }

  // Handle exit
  process.on('SIGINT', () => { cleanup(); process.exit(0); });
  process.on('SIGTERM', () => { cleanup(); process.exit(0); });
  process.on('exit', cleanup);
}

main();
