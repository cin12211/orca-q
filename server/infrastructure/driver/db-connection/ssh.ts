import { DatabaseClientType } from '~/core/constants/database-client-type';
import {
  ESSHAuthMethod,
  type ISSHConfig,
  type ISSLConfig,
} from '~/core/types/entities/connection.entity';
import { createSshTunnel } from '~/server/utils/ssh-tunnel';
import { getDefaultPort } from './ports';
import { applyConnectionStringSsl } from './ssl';

// Cache-key fragment for SSH identity. Excludes the ephemeral local tunnel port
// so a rebuilt tunnel maps back to the same cache entry.
export function sshCacheKeyPart(ssh?: ISSHConfig): string {
  if (!ssh?.enabled) return '';
  const method =
    ssh.authMethod ??
    (ssh.useSshKey ? ESSHAuthMethod.KEY : ESSHAuthMethod.PASSWORD);
  return `-ssh:${ssh.host ?? ''}:${ssh.port ?? ''}:${ssh.username ?? ''}:${method}`;
}

export async function resolveSshConnectionString({
  url,
  type,
  ssl,
  ssh,
}: {
  url: string;
  type: DatabaseClientType;
  ssl?: ISSLConfig;
  ssh?: ISSHConfig;
}) {
  if (!ssh?.enabled) {
    return {
      connection: applyConnectionStringSsl({
        connection: url,
        type,
        ssl,
      }),
      sshTunnelClose: undefined,
      sshTunnelAlive: undefined,
    };
  }

  const parsedUrl = new URL(url);
  const targetHost = parsedUrl.hostname;

  if (!targetHost) {
    throw new Error('Missing host in SSH connection string.');
  }

  const targetPort = Number(parsedUrl.port) || getDefaultPort(type);
  const tunnel = await createSshTunnel(ssh, targetHost, targetPort);

  parsedUrl.hostname = tunnel.localHost;
  parsedUrl.port = `${tunnel.localPort}`;

  return {
    connection: applyConnectionStringSsl({
      connection: parsedUrl.toString(),
      type,
      ssl,
    }),
    sshTunnelClose: tunnel.close,
    sshTunnelAlive: tunnel.isAlive,
  };
}
