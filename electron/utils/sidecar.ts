import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { createLogger } from '../logger';
import {
  findFreePort,
  getRuntimeBinaryPath,
  RUNTIME_HOST,
  RUNTIME_PORT,
  waitForPort,
} from './port';

let sidecarProcess: ChildProcess | null = null;
const logger = createLogger('sidecar');

function logSidecarStream(level: 'info' | 'warn', data: Buffer): void {
  const message = data.toString('utf8').trim();

  if (!message) {
    return;
  }

  for (const line of message.split(/\r?\n/)) {
    logger[level](line);
  }
}

/**
 * Spawn the Nitro runtime sidecar and wait for it to be ready.
 * Returns the URL the sidecar is listening on.
 */
export async function spawnSidecar(): Promise<string> {
  const port = await findFreePort(RUNTIME_PORT);
  const serverPath = getRuntimeBinaryPath();
  logger.info('Starting Nitro runtime sidecar', {
    host: RUNTIME_HOST,
    port,
    serverPath,
  });

  sidecarProcess = spawn(process.execPath, [serverPath], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      HOST: RUNTIME_HOST,
      PORT: String(port),
      NITRO_HOST: RUNTIME_HOST,
      NITRO_PORT: String(port),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  sidecarProcess.stdout?.on('data', (data: Buffer) => {
    logSidecarStream('info', data);
  });

  sidecarProcess.stderr?.on('data', (data: Buffer) => {
    logSidecarStream('warn', data);
  });

  sidecarProcess.on('exit', (code, signal) => {
    sidecarProcess = null;
    if (code !== 0 && signal !== 'SIGTERM' && signal !== 'SIGKILL') {
      logger.error(
        `Nitro runtime exited unexpectedly (code=${code}, signal=${signal})`
      );
      return;
    }

    logger.info(`Nitro runtime stopped (code=${code}, signal=${signal})`);
  });

  await waitForPort(port);
  logger.info('Nitro runtime sidecar is ready', {
    url: `http://${RUNTIME_HOST}:${port}`,
  });

  return `http://${RUNTIME_HOST}:${port}`;
}

/**
 * Kill the Nitro sidecar if it is running.
 */
export function killSidecar(): void {
  if (!sidecarProcess) return;

  try {
    logger.info('Stopping Nitro runtime sidecar');
    sidecarProcess.kill('SIGTERM');
  } catch {
    // Already dead — ignore
  }

  sidecarProcess = null;
}
