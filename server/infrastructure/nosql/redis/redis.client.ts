import { createClient } from 'redis';
import {
  EConnectionMethod,
  type ISSLConfig,
  type ISSHConfig,
} from '~/core/types/entities/connection.entity';
import { createSshTunnel } from '~/server/utils/ssh-tunnel';

const DEFAULT_REDIS_PORT = 6379;

export interface RedisRuntimeInput {
  method: EConnectionMethod;
  url?: string;
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  database?: string;
  ssl?: ISSLConfig;
  ssh?: ISSHConfig;
}

const parseRedisDatabaseIndex = (value?: string) => {
  const parsed = Number.parseInt(value || '0', 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const encodeAuthSegment = (value?: string) =>
  value ? encodeURIComponent(value) : '';

const buildRedisUrl = (
  input: RedisRuntimeInput,
  host: string,
  port: number
) => {
  const scheme =
    input.ssl?.mode && input.ssl.mode !== 'disable' ? 'rediss' : 'redis';
  const dbIndex = parseRedisDatabaseIndex(input.database);
  const username = encodeAuthSegment(input.username);
  const password = encodeAuthSegment(input.password);
  const auth =
    username || password ? `${username}${password ? `:${password}` : ''}@` : '';

  return `${scheme}://${auth}${host}:${port}/${dbIndex}`;
};

export async function createRedisRuntimeClient(input: RedisRuntimeInput) {
  let sshTunnelClose: (() => Promise<void>) | undefined;
  let url = input.url;

  if (input.method === EConnectionMethod.FORM) {
    if (!input.host) {
      throw new Error('Redis host is required.');
    }

    let finalHost = input.host;
    let finalPort = Number.parseInt(input.port || `${DEFAULT_REDIS_PORT}`, 10);

    if (input.ssh?.enabled) {
      const tunnel = await createSshTunnel(input.ssh, input.host, finalPort);
      finalHost = tunnel.localHost;
      finalPort = tunnel.localPort;
      sshTunnelClose = tunnel.close;
    }

    url = buildRedisUrl(input, finalHost, finalPort);
  } else if (input.method === EConnectionMethod.STRING && input.ssh?.enabled) {
    if (!input.url) {
      throw new Error('Redis connection string is required.');
    }

    const parsed = new URL(input.url);
    const tunnel = await createSshTunnel(
      input.ssh,
      parsed.hostname,
      Number.parseInt(parsed.port || `${DEFAULT_REDIS_PORT}`, 10)
    );
    parsed.hostname = tunnel.localHost;
    parsed.port = `${tunnel.localPort}`;
    url = parsed.toString();
    sshTunnelClose = tunnel.close;
  }

  if (!url) {
    throw new Error('Redis connection details are incomplete.');
  }

  const client = createClient({
    url,
    socket:
      input.ssl?.mode && input.ssl.mode !== 'disable'
        ? {
            tls: true,
            rejectUnauthorized: input.ssl.rejectUnauthorized ?? true,
            ca: input.ssl.ca,
            cert: input.ssl.cert,
            key: input.ssl.key,
          }
        : undefined,
  });

  client.on('error', () => undefined);
  await client.connect();

  return {
    client,
    databaseIndex: parseRedisDatabaseIndex(input.database),
    close: async () => {
      if (client.isOpen) {
        await client.quit();
      }

      if (sshTunnelClose) {
        await sshTunnelClose();
      }
    },
  };
}

export async function pingRedisConnection(input: RedisRuntimeInput) {
  const runtime = await createRedisRuntimeClient(input);

  try {
    await runtime.client.ping();
    return true;
  } finally {
    await runtime.close();
  }
}
