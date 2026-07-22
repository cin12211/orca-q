import { createServer, type Server } from 'node:net';
import { Client, type ConnectConfig } from 'ssh2';
import type { ISSHConfig } from '~/components/modules/connection';
import { ESSHAuthMethod } from '~/core/types/entities/connection.entity';

interface TunnelInstance {
  server: Server;
  client: Client;
  localPort: number;
  refCount: number;
  alive: boolean;
}

export interface SshTunnelHandle {
  localHost: string;
  localPort: number;
  close: () => Promise<void>;
  /** True while the underlying SSH connection is still usable. */
  isAlive: () => boolean;
}

const activeTunnels = new Map<string, TunnelInstance>();
// In-flight creations, so concurrent callers share one connection attempt
// instead of racing to build duplicate (leaked) tunnels.
const pendingTunnels = new Map<string, Promise<TunnelInstance>>();

const KEEPALIVE_INTERVAL_MS = 15_000;
const KEEPALIVE_COUNT_MAX = 3;
const READY_TIMEOUT_MS = 20_000;

function resolveAuthMethod(ssh: ISSHConfig): ESSHAuthMethod {
  return (
    ssh.authMethod ??
    (ssh.useSshKey ? ESSHAuthMethod.KEY : ESSHAuthMethod.PASSWORD)
  );
}

/**
 * Build ssh2 auth options for the selected method only. Previously both
 * `password` and an empty `privateKey` string were always passed, which made
 * ssh2 throw while parsing a blank key and broke password auth.
 */
export function buildAuthConfig(ssh: ISSHConfig): Partial<ConnectConfig> {
  if (resolveAuthMethod(ssh) === ESSHAuthMethod.KEY) {
    if (!ssh.privateKey) {
      throw new Error(
        'SSH key authentication was selected but no private key was provided.'
      );
    }

    return {
      privateKey: ssh.privateKey,
      // password doubles as the passphrase for an encrypted private key.
      ...(ssh.password ? { passphrase: ssh.password } : {}),
    };
  }

  return { password: ssh.password };
}

function buildTunnelKey(
  ssh: ISSHConfig,
  dbHost: string,
  dbPort: number
): string {
  return `${ssh.host}:${ssh.port}:${ssh.username}:${resolveAuthMethod(ssh)}:${dbHost}:${dbPort}`;
}

function createTunnelInstance(
  sshConfig: ISSHConfig,
  dbHost: string,
  dbPort: number,
  tunnelKey: string
): Promise<TunnelInstance> {
  return new Promise((resolve, reject) => {
    const client = new Client();
    let settled = false;

    // Drop a dead tunnel from the registry so the next request rebuilds it
    // instead of reusing a broken client — the main cause of intermittent
    // "works once, then fails" behaviour.
    const evict = () => {
      const tunnel = activeTunnels.get(tunnelKey);
      if (tunnel && tunnel.client === client) {
        tunnel.alive = false;
        activeTunnels.delete(tunnelKey);
      }
      try {
        server.close();
      } catch {
        // already closed
      }
    };

    const server = createServer(sock => {
      client.forwardOut(
        sock.remoteAddress || '127.0.0.1',
        sock.remotePort || 0,
        dbHost,
        dbPort,
        (err, stream) => {
          if (err) {
            console.error('[SSH Tunnel] forwardOut failed:', err.message);
            sock.destroy();
            return;
          }
          sock.pipe(stream).pipe(sock);
          stream.on('error', () => sock.destroy());
          sock.on('error', () => stream.destroy());
        }
      );
    });

    server.on('error', err => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    });

    let authConfig: Partial<ConnectConfig>;
    try {
      authConfig = buildAuthConfig(sshConfig);
    } catch (err) {
      reject(err as Error);
      return;
    }

    client
      .on('ready', () => {
        server.listen(0, '127.0.0.1', () => {
          const address = server.address();
          const localPort =
            typeof address === 'string' ? 0 : address?.port || 0;

          if (localPort === 0) {
            settled = true;
            server.close();
            client.end();
            reject(new Error('SSH tunnel failed to bind a local port.'));
            return;
          }

          const instance: TunnelInstance = {
            server,
            client,
            localPort,
            refCount: 1,
            alive: true,
          };
          activeTunnels.set(tunnelKey, instance);
          settled = true;
          resolve(instance);
        });
      })
      .on('error', err => {
        evict();
        if (!settled) {
          settled = true;
          reject(err);
        }
      })
      .on('close', evict)
      .on('end', evict)
      .connect({
        host: sshConfig.host,
        port: sshConfig.port || 22,
        username: sshConfig.username,
        keepaliveInterval: KEEPALIVE_INTERVAL_MS,
        keepaliveCountMax: KEEPALIVE_COUNT_MAX,
        readyTimeout: READY_TIMEOUT_MS,
        ...authConfig,
      });
  });
}

export async function createSshTunnel(
  sshConfig: ISSHConfig,
  dbHost: string,
  dbPort: number
): Promise<SshTunnelHandle> {
  if (!sshConfig.host) {
    throw new Error('SSH tunnel requires an SSH host.');
  }

  const tunnelKey = buildTunnelKey(sshConfig, dbHost, dbPort);

  // Reference-counted close: a shared tunnel is only torn down once every
  // consumer (health check, live adapter, ...) has released it, so one caller
  // never closes the tunnel out from under another.
  const closeTunnel = async () => {
    const tunnel = activeTunnels.get(tunnelKey);
    if (!tunnel) return;

    tunnel.refCount -= 1;
    if (tunnel.refCount > 0) return;

    tunnel.alive = false;
    activeTunnels.delete(tunnelKey);
    await new Promise<void>(res => {
      tunnel.server.close(() => {
        tunnel.client.end();
        res();
      });
    });
  };

  const toHandle = (instance: TunnelInstance): SshTunnelHandle => ({
    localHost: '127.0.0.1',
    localPort: instance.localPort,
    close: closeTunnel,
    isAlive: () => instance.alive && activeTunnels.get(tunnelKey) === instance,
  });

  const existing = activeTunnels.get(tunnelKey);
  if (existing?.alive) {
    existing.refCount += 1;
    return toHandle(existing);
  }

  const pending = pendingTunnels.get(tunnelKey);
  if (pending) {
    const instance = await pending;
    instance.refCount += 1;
    return toHandle(instance);
  }

  const creation = createTunnelInstance(sshConfig, dbHost, dbPort, tunnelKey);
  pendingTunnels.set(tunnelKey, creation);
  try {
    const instance = await creation;
    return toHandle(instance);
  } finally {
    pendingTunnels.delete(tunnelKey);
  }
}
