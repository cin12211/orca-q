import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { findFreePort, getRuntimeBinaryPath, RUNTIME_HOST, RUNTIME_PORT, waitForPort } from './port';

let sidecarProcess: ChildProcess | null = null;

/**
 * Spawn the Nitro runtime sidecar and wait for it to be ready.
 * Returns the URL the sidecar is listening on.
 */
export async function spawnSidecar(): Promise<string> {
  const port = await findFreePort(RUNTIME_PORT);
  const serverPath = getRuntimeBinaryPath();

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
    process.stdout.write(`[sidecar] ${data}`);
  });

  sidecarProcess.stderr?.on('data', (data: Buffer) => {
    process.stderr.write(`[sidecar] ${data}`);
  });

  sidecarProcess.on('exit', (code, signal) => {
    sidecarProcess = null;
    if (code !== 0 && signal !== 'SIGTERM' && signal !== 'SIGKILL') {
      console.error(`[sidecar] Nitro runtime exited unexpectedly (code=${code}, signal=${signal})`);
    }
  });

  await waitForPort(port);

  return `http://${RUNTIME_HOST}:${port}`;
}

/**
 * Kill the Nitro sidecar if it is running.
 */
export function killSidecar(): void {
  if (!sidecarProcess) return;

  try {
    sidecarProcess.kill('SIGTERM');
  } catch {
    // Already dead — ignore
  }

  sidecarProcess = null;
}
