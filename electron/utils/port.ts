import path from 'node:path';
import net from 'node:net';

const SIDECAR_HOST = '127.0.0.1';
const WAIT_TIMEOUT_MS = 20_000;
const POLL_INTERVAL_MS = 200;

export const RUNTIME_PORT = 29092;
export const RUNTIME_HOST = SIDECAR_HOST;

/**
 * Try to bind on a port. Returns the port if free, throws if taken.
 */
export function tryBindPort(port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(port, SIDECAR_HOST, () => {
      server.close(() => resolve(port));
    });
  });
}

/**
 * Find a free TCP port starting from the preferred port.
 */
export async function findFreePort(preferred: number): Promise<number> {
  try {
    return await tryBindPort(preferred);
  } catch {
    // Preferred port taken — let OS assign one
    return new Promise((resolve, reject) => {
      const server = net.createServer();
      server.once('error', reject);
      server.listen(0, SIDECAR_HOST, () => {
        const addr = server.address();
        const port = typeof addr === 'object' && addr ? addr.port : 0;
        server.close(() => resolve(port));
      });
    });
  }
}

/**
 * Poll TCP until the server at host:port accepts connections or timeout passes.
 */
export function waitForPort(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + WAIT_TIMEOUT_MS;

    const attempt = () => {
      const socket = new net.Socket();
      socket.setTimeout(POLL_INTERVAL_MS);

      socket.once('connect', () => {
        socket.destroy();
        resolve();
      });

      socket.once('error', () => {
        socket.destroy();
        if (Date.now() >= deadline) {
          reject(
            new Error(
              `Timed out waiting for server at ${SIDECAR_HOST}:${port}`
            )
          );
          return;
        }
        setTimeout(attempt, POLL_INTERVAL_MS);
      });

      socket.once('timeout', () => {
        socket.destroy();
        if (Date.now() >= deadline) {
          reject(
            new Error(
              `Timed out waiting for server at ${SIDECAR_HOST}:${port}`
            )
          );
          return;
        }
        setTimeout(attempt, POLL_INTERVAL_MS);
      });

      socket.connect(port, SIDECAR_HOST);
    };

    attempt();
  });
}

/**
 * Determine the path to the Nitro runtime binary bundled in extraResources.
 */
export function getRuntimeBinaryPath(): string {
  // We use the raw Nitro server script instead of a standalone binary
  const scriptName = path.join('server', 'index.mjs');

  if (process.env.NODE_ENV === 'development') {
    // Dev mode: use the one built by scripts/electron-before-build.mjs
    return path.join(__dirname, '..', 'electron-runtime', scriptName);
  }

  // Production: extraResources unpacks to process.resourcesPath/runtime/
  return path.join(process.resourcesPath, 'runtime', scriptName);
}
