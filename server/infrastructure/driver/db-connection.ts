import { DatabaseClientType } from '~/core/constants/database-client-type';
import {
  EConnectionMethod,
  type ISSLConfig,
  type ISSHConfig,
} from '~/core/types/entities/connection.entity';
import { createSshTunnel } from '~/server/utils/ssh-tunnel';
import { createDatabaseAdapter } from './factory';
import type { IDatabaseAdapter } from './types';

type CachedAdapter = {
  adapter: IDatabaseAdapter;
  lastUsed: number;
  sshTunnelClose?: () => Promise<void>;
};

const adapterCache = new Map<string, CachedAdapter>();
const LRU_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const DEFAULT_PORTS: Partial<Record<DatabaseClientType, number>> = {
  [DatabaseClientType.POSTGRES]: 5432,
  [DatabaseClientType.MYSQL]: 3306,
  [DatabaseClientType.MARIADB]: 3306,
  [DatabaseClientType.MYSQL2]: 3306,
  [DatabaseClientType.MONGODB]: 27017,
  [DatabaseClientType.REDIS]: 6379,
  [DatabaseClientType.MSSQL]: 1433,
  [DatabaseClientType.ORACLE]: 1521,
  [DatabaseClientType.SNOWFLAKE]: 443,
  [DatabaseClientType.BETTER_SQLITE3]: 0,
  [DatabaseClientType.SQLITE3]: 0,
};

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

function getDefaultPort(type: DatabaseClientType) {
  return DEFAULT_PORTS[type] ?? 5432;
}

async function resolveHealthCheckConnection({
  url,
  type,
  method,
  host,
  port,
  username,
  password,
  database,
  serviceName,
  filePath,
  ssl,
  ssh,
}: {
  url: string;
  type: DatabaseClientType;
  method: EConnectionMethod;
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  database?: string;
  serviceName?: string;
  filePath?: string;
  ssl?: ISSLConfig;
  ssh?: ISSHConfig;
}) {
  let sshTunnelClose: (() => Promise<void>) | undefined;

  if (method === EConnectionMethod.STRING) {
    if (!url) {
      throw new Error(
        'Missing connection string for string-based health check.'
      );
    }

    return {
      connection: url,
      sshTunnelClose,
    };
  }

  if (method === EConnectionMethod.FILE) {
    if (!filePath) {
      throw new Error('Missing file path for file-based health check.');
    }

    return {
      connection: {
        filename: filePath,
      },
      sshTunnelClose,
    };
  }

  if (!host) {
    throw new Error('Missing host for form-based health check.');
  }

  let finalHost = host;
  let finalPort = parseInt(port || `${getDefaultPort(type)}`, 10);

  if (ssh?.enabled) {
    const tunnel = await createSshTunnel(ssh, host, finalPort);
    finalHost = tunnel.localHost;
    finalPort = tunnel.localPort;
    sshTunnelClose = tunnel.close;
  }

  const connection: Record<string, unknown> = {
    host: finalHost,
    port: finalPort,
    user: username,
    password,
  };

  if (serviceName) {
    connection.database = serviceName;
    connection.serviceName = serviceName;
  } else if (database) {
    connection.database = database;
  }

  if (ssl?.mode && ssl.mode !== 'disable') {
    connection.ssl = {
      rejectUnauthorized: ssl.rejectUnauthorized ?? true,
      ca: ssl.ca,
      cert: ssl.cert,
      key: ssl.key,
    };
  }

  return {
    connection,
    sshTunnelClose,
  };
}

export const getDatabaseSource = async ({
  dbConnectionString,
  type,
  host,
  port,
  username,
  password,
  database,
  serviceName,
  filePath,
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
  serviceName?: string;
  filePath?: string;
  ssl?: ISSLConfig;
  ssh?: ISSHConfig;
}): Promise<IDatabaseAdapter> => {
  const dbType = type ?? DatabaseClientType.POSTGRES;

  let finalConnection: string | any = dbConnectionString;
  let cacheKey = `${dbType}://${dbConnectionString}`;
  let sshTunnelClose: (() => Promise<void>) | undefined;
  const targetName = serviceName || database || '';

  if (!dbConnectionString && filePath) {
    finalConnection = {
      filename: filePath,
    };

    cacheKey = `${dbType}://${filePath}`;
  } else if (!dbConnectionString && host) {
    let finalHost = host;
    let finalPort = parseInt(port || `${getDefaultPort(dbType)}`, 10);

    if (ssh?.enabled) {
      const tunnel = await createSshTunnel(ssh, host, finalPort);
      finalHost = tunnel.localHost;
      finalPort = tunnel.localPort;
      sshTunnelClose = tunnel.close;
    }

    if (dbType === DatabaseClientType.ORACLE) {
      finalConnection = {
        user: username,
        password,
        connectString: `${finalHost}:${finalPort}/${targetName}`,
        serviceName: targetName,
        database: targetName,
      };
    } else {
      finalConnection = {
        host: finalHost,
        port: finalPort,
        user: username,
        password,
        database: targetName,
      };
    }

    if (ssl?.mode && ssl.mode !== 'disable') {
      finalConnection.ssl = {
        rejectUnauthorized: ssl.rejectUnauthorized ?? true,
        ca: ssl.ca,
        cert: ssl.cert,
        key: ssl.key,
      };
    }

    cacheKey = `${dbType}://${username}@${host}:${finalPort}/${targetName}${ssh?.enabled ? '-ssh' : ''}${ssl?.mode ? `-${ssl.mode}` : ''}`;
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
  type,
  method,
  host,
  port,
  username,
  password,
  database,
  serviceName,
  filePath,
  ssl,
  ssh,
}: {
  url: string;
  type: DatabaseClientType;
  method: EConnectionMethod;
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  database?: string;
  serviceName?: string;
  filePath?: string;
  ssl?: ISSLConfig;
  ssh?: ISSHConfig;
}): Promise<{ isConnectedSuccess: boolean; message?: string }> {
  let sshTunnelClose: (() => Promise<void>) | undefined;

  try {
    const resolvedConnection = await resolveHealthCheckConnection({
      url,
      type,
      method,
      host,
      port,
      username,
      password,
      database,
      serviceName,
      filePath,
      ssl,
      ssh,
    });
    const { connection } = resolvedConnection;
    sshTunnelClose = resolvedConnection.sshTunnelClose;

    const adapter = createDatabaseAdapter(type, connection);
    const isConnected = await adapter.healthCheck();
    await adapter.destroy();
    if (sshTunnelClose) await sshTunnelClose();
    return {
      isConnectedSuccess: isConnected,
    };
  } catch (error: any) {
    console.error('Database connection failed:', error);
    if (sshTunnelClose) await sshTunnelClose();
    return {
      isConnectedSuccess: false,
      message: error?.message || 'Database connection failed',
    };
  }
}
