import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createDatabaseAdapter } from './factory';
import type { IDatabaseAdapter } from './types';
import type { ISSLConfig, ISSHConfig } from '~/components/modules/connection';
import { createSshTunnel } from '~/server/utils/ssh-tunnel';

type CachedAdapter = {
  adapter: IDatabaseAdapter;
  lastUsed: number;
  sshTunnelClose?: () => Promise<void>;
};

const adapterCache = new Map<string, CachedAdapter>();
const LRU_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// Cleanup every 1 minute
function cleanupIdleAdapters() {
  const now = Date.now();

  for (const [key, cached] of adapterCache.entries()) {
    const idleTime = now - cached.lastUsed;

    if (idleTime > LRU_TIMEOUT) {
      cached.adapter.destroy().catch(console.error);
      if (cached.sshTunnelClose) {
        cached.sshTunnelClose().catch(console.error);
      }
      adapterCache.delete(key);
      console.log(
        `[Adapter Cache] Destroyed idle adapter for ${cached.adapter.dbType}`
      );
    }
  }
}

setInterval(cleanupIdleAdapters, 60 * 1000);

// Graceful shutdown handler
async function shutdownAllAdapters() {
  for (const [key, cached] of adapterCache.entries()) {
    try {
      await cached.adapter.destroy();
      if (cached.sshTunnelClose) {
        await cached.sshTunnelClose();
      }
      console.log(
        `[Adapter Cache] Adapter closed on shutdown: ${cached.adapter.dbType}`
      );
    } catch (err) {
      console.error(
        `[Adapter Cache] Error shutting down adapter: ${cached.adapter.dbType}`,
        err
      );
    } finally {
      adapterCache.delete(key);
    }
  }
}

process.on('SIGINT', async () => {
  await shutdownAllAdapters();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await shutdownAllAdapters();
  process.exit(0);
});

process.on('exit', async () => {
  await shutdownAllAdapters();
});

export const getDatabaseSource = async ({
  dbConnectionString,
  type,
  host,
  port,
  username,
  password,
  database,
  ssl,
  ssh,
}: {
  dbConnectionString: string;
  type?: DatabaseClientType;
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  database?: string;
  ssl?: ISSLConfig;
  ssh?: ISSHConfig;
}): Promise<IDatabaseAdapter> => {
  const dbType = type ?? DatabaseClientType.POSTGRES;

  let finalConnection: string | any = dbConnectionString;
  let cacheKey = `${dbType}://${dbConnectionString}`;
  let sshTunnelClose: (() => Promise<void>) | undefined;

  if (!dbConnectionString && host) {
    let finalHost = host;
    let finalPort = parseInt(port || '5432', 10);

    if (ssh?.enabled) {
      const tunnel = await createSshTunnel(ssh, host, finalPort);
      finalHost = tunnel.localHost;
      finalPort = tunnel.localPort;
      sshTunnelClose = tunnel.close;
    }

    finalConnection = {
      host: finalHost,
      port: finalPort,
      user: username,
      password,
      database,
    };

    if (ssl?.mode && ssl.mode !== 'disable') {
      finalConnection.ssl = {
        rejectUnauthorized: ssl.rejectUnauthorized ?? true,
        ca: ssl.ca,
        cert: ssl.cert,
        key: ssl.key,
      };
    }

    cacheKey = `${dbType}://${username}@${host}:${port}/${database}${ssh?.enabled ? '-ssh' : ''}${ssl?.mode ? `-${ssl.mode}` : ''}`;
  }

  let cached = adapterCache.get(cacheKey);

  if (cached) {
    cached.lastUsed = Date.now();
    return cached.adapter;
  }

  const newAdapter = createDatabaseAdapter(dbType, finalConnection);

  adapterCache.set(cacheKey, {
    adapter: newAdapter,
    lastUsed: Date.now(),
    sshTunnelClose,
  });

  return newAdapter;
};

export async function healthCheckConnection({
  url,
  type = DatabaseClientType.POSTGRES,
  host,
  port,
  username,
  password,
  database,
  ssl,
  ssh,
}: {
  url: string;
  type?: DatabaseClientType;
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  database?: string;
  ssl?: ISSLConfig;
  ssh?: ISSHConfig;
}) {
  let sshTunnelClose: (() => Promise<void>) | undefined;
  try {
    let finalConnection: string | any = url;

    if (!url && host) {
      let finalHost = host;
      let finalPort = parseInt(port || '5432', 10);

      if (ssh?.enabled) {
        const tunnel = await createSshTunnel(ssh, host, finalPort);
        finalHost = tunnel.localHost;
        finalPort = tunnel.localPort;
        sshTunnelClose = tunnel.close;
      }

      finalConnection = {
        host: finalHost,
        port: finalPort,
        user: username,
        password,
        database,
      };

      if (ssl?.mode && ssl.mode !== 'disable') {
        finalConnection.ssl = {
          rejectUnauthorized: ssl.rejectUnauthorized ?? true,
          ca: ssl.ca,
          cert: ssl.cert,
          key: ssl.key,
        };
      }
    }

    const adapter = createDatabaseAdapter(type, finalConnection);
    const isConnected = await adapter.healthCheck();
    await adapter.destroy();
    if (sshTunnelClose) await sshTunnelClose();
    return isConnected;
  } catch (error) {
    console.error('Database connection failed:', error);
    if (sshTunnelClose) await sshTunnelClose();
    return false;
  }
}
