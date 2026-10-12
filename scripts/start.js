/**
 * Runs BexSign from the project root with one command, on Windows, macOS or Linux:
 *
 *   npm start               API (server/, port 5000) and client dev server (client/, port 3003) together
 *   npm run start:api       only the API
 *   npm run start:web       only the client dev server
 *   npm run serve           production style: builds the client once (if needed) and the API serves it too,
 *                           so the whole app runs on the API's port (add --build to rebuild)
 *
 * Before starting it installs missing dependencies, creates the .env files from their examples and brings the
 * database up to date (server/scripts/migrate.js). Add --no-migrate to skip that step.
 * Ctrl+C stops both processes.
 */
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const serverDir = path.join(root, 'server');
const clientDir = path.join(root, 'client');
const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const apiOnly = has('--api-only');
const webOnly = has('--web-only');
const serveBuilt = has('--serve');
const skipMigrate = has('--no-migrate');

const ESC = String.fromCharCode(27);
const colors = { api: `${ESC}[36m`, web: `${ESC}[35m`, run: `${ESC}[32m`, warn: `${ESC}[33m`, reset: `${ESC}[0m` };
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const tag = (name) => (useColor ? `${colors[name] || ''}[${name}]${colors.reset}` : `[${name}]`);
const say = (text) => console.log(`${tag('run')} ${text}`);
const warn = (text) => console.log(`${tag('warn')} ${text}`);

/** Reads KEY=value lines of an .env file (enough to know the ports; dotenv itself runs inside the API). */
function readEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line) => {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !line.trim().startsWith('#')) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  });
  return out;
}

/* ------------------------------------------------------------------ 1. dependencies and .env files */
spawnSync(process.execPath, [path.join(__dirname, 'setup.js')], { stdio: 'inherit' });

const serverEnv = readEnv(path.join(serverDir, '.env'));
const clientEnv = readEnv(path.join(clientDir, '.env'));
const apiPort = Number(process.env.PORT || serverEnv.PORT) || 5000;
const webPort = Number(clientEnv.VITE_PORT) || 3003;

/* ------------------------------------------------------------------ 2. database */
if (!skipMigrate && !webOnly) {
  say('Checking the database structure (server/scripts/migrate.js)...');
  const migrate = spawnSync(process.execPath, [path.join(serverDir, 'scripts', 'migrate.js')], { cwd: serverDir, stdio: 'inherit' });
  if (migrate.status === 1) {
    warn('The database could not be prepared (see above). Is MySQL / MariaDB running, and are DB_* in server/.env right?');
    warn('Starting anyway: the API retries when it is asked for data. Use --no-migrate to skip this check.');
  }
}

/* ------------------------------------------------------------------ 3. the processes */
const children = [];
let stopping = false;

function run(name, command, commandArgs, options) {
  const child = spawn(command, commandArgs, { ...options, stdio: ['inherit', 'pipe', 'pipe'] });
  const forward = (stream, isError) => {
    let buffer = '';
    stream.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop();
      lines.forEach((line) => (isError ? console.error : console.log)(`${tag(name)} ${line}`));
    });
    stream.on('end', () => {
      if (buffer) (isError ? console.error : console.log)(`${tag(name)} ${buffer}`);
    });
  };
  forward(child.stdout, false);
  forward(child.stderr, true);
  child.on('exit', (code, signal) => {
    if (stopping) return;
    stopping = true;
    if (code === 1 && name === 'api') warn(`The API stopped. If it said the port is in use, another BexSign API may already be running on port ${apiPort}.`);
    say(`${name} exited (${signal || `code ${code}`}); stopping the rest.`);
    stopAll();
    process.exitCode = code || 0;
  });
  children.push(child);
  return child;
}

function stopAll() {
  stopping = true;
  children.forEach((child) => {
    if (child.exitCode !== null) return;
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    else child.kill('SIGTERM');
  });
}
['SIGINT', 'SIGTERM', 'SIGHUP'].forEach((signal) => process.on(signal, () => {
  say('Stopping...');
  stopAll();
  setTimeout(() => process.exit(0), 300);
}));

const viteBin = path.join(clientDir, 'node_modules', 'vite', 'bin', 'vite.js');

if (serveBuilt) {
  // One process: the API also serves the built client
  if (!fs.existsSync(path.join(clientDir, 'dist', 'index.html')) || has('--build')) {
    say('Building the client (client/dist)...');
    const build = spawnSync(process.execPath, [viteBin, 'build'], { cwd: clientDir, stdio: 'inherit' });
    if (build.status !== 0) {
      warn('The client build failed; the API is not started.');
      process.exit(build.status || 1);
    }
  }
  say(`Starting the API with the built client on http://localhost:${apiPort}`);
  run('api', process.execPath, ['index.js'], { cwd: serverDir, env: { ...process.env, SERVE_CLIENT: 'true' } });
} else {
  if (!webOnly) {
    say(`Starting the API on http://localhost:${apiPort}`);
    run('api', process.execPath, ['index.js'], { cwd: serverDir, env: { ...process.env } });
  }
  if (!apiOnly) {
    say(`Starting the client on http://localhost:${webPort}`);
    run('web', process.execPath, [viteBin, '--port', String(webPort), '--strictPort'], { cwd: clientDir, env: { ...process.env } });
  }
  say('Press Ctrl+C to stop.');
}
