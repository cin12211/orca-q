#!/usr/bin/env node
import { Command } from 'commander';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = join(__dirname, '..');

const program = new Command();

program
  .name('orcaq')
  .description('OrcaQ - The open source database editor')
  .version('1.0.20')
  .option('-p, --port <port>', 'Port to run the server on', '9432')
  .option('-h, --host <host>', 'Host to bind to', '0.0.0.0')
  .option('--no-open', "Don't open browser automatically")
  .action(options => {
    const { port, host, open } = options;

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
    if (open) {
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
    const cleanup = () => {
      console.log('\nShutting down OrcaQ...');
      server.kill('SIGTERM');
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    server.on('error', err => {
      console.error('Failed to start server:', err.message);
      process.exit(1);
    });

    server.on('exit', code => {
      process.exit(code || 0);
    });
  });

program.parse();
