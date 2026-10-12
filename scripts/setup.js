/**
 * First-time setup, run by "npm install" in the project root (postinstall) and by "npm run setup":
 *   - installs the dependencies of server/ and client/ when their node_modules are missing
 *   - creates server/.env and client/.env from the .env.example files when they do not exist
 * Works the same on Windows, macOS and Linux. Nothing that already exists is changed.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const log = (text) => console.log(`[bexsign] ${text}`);

function installDependencies(folder) {
  const dir = path.join(root, folder);
  if (fs.existsSync(path.join(dir, 'node_modules', '.package-lock.json'))) return;
  log(`Installing ${folder}/ dependencies...`);
  // A string command through the shell: "npm" resolves to npm.cmd on Windows and npm elsewhere
  const result = spawnSync('npm install --no-audit --no-fund', { cwd: dir, stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    log(`npm install failed in ${folder}/ (exit code ${result.status}). Run it there by hand to see the error.`);
    process.exit(result.status || 1);
  }
}

function ensureEnv(folder) {
  const target = path.join(root, folder, '.env');
  const example = path.join(root, folder, '.env.example');
  if (fs.existsSync(target) || !fs.existsSync(example)) return;
  fs.copyFileSync(example, target);
  log(`Created ${folder}/.env from ${folder}/.env.example - open it and fill in your database and email settings.`);
}

installDependencies('server');
installDependencies('client');
ensureEnv('server');
ensureEnv('client');
log('Setup complete. Start everything with: npm start');
