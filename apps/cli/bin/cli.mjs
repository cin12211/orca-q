#!/usr/bin/env node
import { Command } from 'commander';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = join(__dirname, '..');

const packageJson = JSON.parse(
  readFileSync(join(packageRoot, 'package.json'), 'utf-8')
);

const program = new Command();

program
  .name('orcaq')
  .description('OrcaQ - The open source database editor')
  .version(packageJson.version)
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

    const colors = {
      reset: '\x1b[0m',
      bold: '\x1b[1m',
      dim: '\x1b[2m',
      blue: '\x1b[34m',
      cyan: '\x1b[36m',
      green: '\x1b[32m',
      gray: '\x1b[90m',
    };

    const asciiArt = [
      "                       'JJ%$%)          ",
      '               $$$$$$$$$$$$$&           ',
      '          xxw$$$$$$$$$$$$$$$Bx          ',
      '        ^$$$$$$$;   $$$$$$$$$$          ',
      "       l1$$$$&   l1$$$$$$$$$$$['        ",
      '       x$$$$x  $$$$$$$$$$$$$$$$;        ',
      '      *$$$$#*********@$$$$$$$$$$x       ',
      '      *$$$           *$$$$$$$$$$x       ',
      '      *$$$$$$&      $$$$$$$$$$$$x       ',
      '                 \\\\h$$$$$$$$$$$$$x       ',
      '                *$$$$$$&  *$$$$;        ',
      '                          *$$$$;        ',
      '        ^$$$$&      $;   $$$$$          ',
      '          x&$$$$$$Bx txu$$$wj           ',
      '            x$$$$$$$$$$$$$;             ',
      '                Y00000{                 ',
    ];

    const info = [
      '',
      '',
      '',
      '',
      '',
      `${colors.bold}${colors.cyan}    OrcaQ - Database Editor${colors.reset}`,
      `${colors.dim}    v${packageJson.version}${colors.reset}`,
      '',
      `    Starting server on ${colors.green}http://${host}:${port}${colors.reset}`,
      '',
      `${colors.gray}    Press Ctrl+C to stop${colors.reset}`,
      '',
      '',
      '',
      '',
      '',
    ];

    console.log('');
    for (let i = 0; i < asciiArt.length; i++) {
      process.stdout.write(
        `${colors.gray}${asciiArt[i]}${colors.reset}${info[i] || ''}\n`
      );
    }
    console.log('');

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
