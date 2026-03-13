import { Client } from 'ssh2';
import { createServer, type Server } from 'node:net';
import type { ISSHConfig } from '~/components/modules/connection';

interface TunnelInstance {
  server: Server;
  client: Client;
  localPort: number;
}

const activeTunnels = new Map<string, TunnelInstance>();

export async function createSshTunnel(
  sshConfig: ISSHConfig,
  dbHost: string,
  dbPort: number
): Promise<{ localHost: string; localPort: number; close: () => Promise<void> }> {
  const tunnelKey = `${sshConfig.host}:${sshConfig.port}:${sshConfig.username}:${dbHost}:${dbPort}`;

  if (activeTunnels.has(tunnelKey)) {
    const tunnel = activeTunnels.get(tunnelKey)!;
    return {
      localHost: '127.0.0.1',
      localPort: tunnel.localPort,
      close: async () => {
        // Shared tunnel, don't close immediately unless we implement ref counting
      },
    };
  }

  return new Promise((resolve, reject) => {
    const client = new Client();
    const server = createServer(sock => {
      client.forwardOut(
        sock.remoteAddress || '127.0.0.1',
        sock.remotePort || 0,
        dbHost,
        dbPort,
        (err, stream) => {
          if (err) {
            sock.end();
            return;
          }
          sock.pipe(stream).pipe(sock);
        }
      );
    });

    client
      .on('ready', () => {
        server.listen(0, '127.0.0.1', () => {
          const address = server.address();
          const localPort =
            typeof address === 'string' ? 0 : address?.port || 0;

          const close = async () => {
            return new Promise<void>(res => {
              server.close(() => {
                client.end();
                activeTunnels.delete(tunnelKey);
                res();
              });
            });
          };

          activeTunnels.set(tunnelKey, { server, client, localPort });
          resolve({ localHost: '127.0.0.1', localPort, close });
        });
      })
      .on('error', err => {
        server.close();
        reject(err);
      })
      .connect({
        host: sshConfig.host,
        port: sshConfig.port || 22,
        username: sshConfig.username,
        password: sshConfig.password,
        privateKey: sshConfig.privateKey,
      });
  });
}
