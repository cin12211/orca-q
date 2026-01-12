#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = join(__dirname, '..');

// Parse command line arguments
const args = process.argv.slice(2);
let port = process.env.PORT || '9432';
let host = process.env.HOST || '0.0.0.0';
let openBrowser = true;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--port' || args[i] === '-p') {
    port = args[i + 1] || port;
    i++;
  } else if (args[i] === '--host' || args[i] === '-h') {
    host = args[i + 1] || host;
    i++;
  } else if (args[i] === '--no-open') {
    openBrowser = false;
  } else if (args[i] === '--help') {
    console.log(`
OrcaQ - The open source database editor

Usage: orcaq [options]

Options:
  -p, --port <port>   Port to run the server on (default: 9432)
  -h, --host <host>   Host to bind to (default: 0.0.0.0)
  --no-open           Don't open browser automatically
  --help              Show this help message

Examples:
  npx orcaq
  npx orcaq --port 9432
  npx orcaq --port 8080 --host localhost
`);
    process.exit(0);
  }
}

// Path to the Nitro server entry
const serverEntry = join(packageRoot, '.output', 'server', 'index.mjs');

if (!existsSync(serverEntry)) {
  console.error('Error: Server files not found.');
  console.error('Expected:', serverEntry);
  process.exit(1);
}

console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🐋 OrcaQ - Database Editor                              ║
║                                                           ║
║   Starting server on http://${host}:${port}                   
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`);

// Start the Nitro server
const server = spawn('node', [serverEntry], {
  cwd: packageRoot,
  env: {
    ...process.env,
    PORT: port,
    HOST: host,
    NITRO_PORT: port,
    NITRO_HOST: host,
  },
  stdio: 'inherit',
});

// Open browser after a short delay
if (openBrowser) {
  setTimeout(() => {
    const url = `http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`;
    const openCommand =
      process.platform === 'darwin'
        ? 'open'
        : process.platform === 'win32'
          ? 'start'
          : 'xdg-open';

    spawn(openCommand, [url], { detached: true, stdio: 'ignore' }).unref();
  }, 1500);
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nShutting down OrcaQ...');
  server.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  server.kill('SIGTERM');
  process.exit(0);
});

server.on('error', err => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});

server.on('exit', code => {
  process.exit(code || 0);
});
