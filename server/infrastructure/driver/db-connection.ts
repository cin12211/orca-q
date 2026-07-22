import { createHash } from 'node:crypto';
import {
  resolveConnectionFamily,
  resolveConnectionProviderKind,
} from '~/core/constants/connection-capabilities';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import {
  EConnectionFamily,
  EConnectionMethod,
  EConnectionProviderKind,
  ESSHAuthMethod,
  ESSLMode,
  type IManagedSqliteConfig,
  type ISSLConfig,
  type ISSHConfig,
} from '~/core/types/entities/connection.entity';
import { assertSupportedConnectionRuntime } from '~/server/infrastructure/nosql';
import { pingRedisConnection } from '~/server/infrastructure/nosql/redis/redis.client';
import { createSshTunnel } from '~/server/utils/ssh-tunnel';
import {
  normalizeConnectionError,
  type NormalizedConnectionError,
} from './connection-error';
import { createDatabaseAdapter } from './factory';
import {
  createManagedSqliteConnectionString,
  isManagedSqliteProviderKind,
} from './managed-sqlite';
import type { IDatabaseAdapter } from './types';

type CachedAdapter = {
  adapter: IDatabaseAdapter;
  lastUsed: number;
  sshTunnelClose?: () => Promise<void>;
  sshTunnelAlive?: () => boolean;
};

const adapterCache = new Map<string, CachedAdapter>();
const LRU_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const DEFAULT_PORTS: Partial<Record<DatabaseClientType, number>> = {
  [DatabaseClientType.POSTGRES]: 5432,
  [DatabaseClientType.MYSQL]: 3306,
  [DatabaseClientType.MARIADB]: 3306,
  [DatabaseClientType.MYSQL2]: 3306,
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

function isMysqlClient(type: DatabaseClientType) {
  return (
    type === DatabaseClientType.MYSQL ||
    type === DatabaseClientType.MARIADB ||
    type === DatabaseClientType.MYSQL2
  );
}

function isSslEnabled(ssl?: ISSLConfig) {
  return Boolean(ssl?.mode && ssl.mode !== 'disable');
}

// Cache-key fragment for SSL. Includes the full trust material (not just the
// mode) so two connections that differ only by CA/cert/key/rejectUnauthorized
// do not collide onto the same cached adapter.
function sslCacheKeyPart(ssl?: ISSLConfig): string {
  if (!isSslEnabled(ssl) || !ssl) return '';
  const material = JSON.stringify([
    ssl.mode,
    ssl.ca ?? '',
    ssl.cert ?? '',
    ssl.key ?? '',
    ssl.rejectUnauthorized ?? null,
  ]);
  return `-ssl:${createHash('sha1').update(material).digest('hex').slice(0, 12)}`;
}

// Cache-key fragment for SSH identity. Excludes the ephemeral local tunnel port
// so a rebuilt tunnel maps back to the same cache entry.
function sshCacheKeyPart(ssh?: ISSHConfig): string {
  if (!ssh?.enabled) return '';
  const method =
    ssh.authMethod ??
    (ssh.useSshKey ? ESSHAuthMethod.KEY : ESSHAuthMethod.PASSWORD);
  return `-ssh:${ssh.host ?? ''}:${ssh.port ?? ''}:${ssh.username ?? ''}:${method}`;
}

function createSslConnectionOptions(ssl: ISSLConfig) {
  const isVerify =
    ssl.mode === ESSLMode.VERIFY_CA || ssl.mode === ESSLMode.VERIFY_FULL;

  // Mode drives verification. require/preferred encrypt the channel but must
  // NOT fail on a self-signed/untrusted cert (the common managed-DB case) —
  // only an explicit rejectUnauthorized can force it on. verify-ca and
  // verify-full always enforce chain validation.
  const rejectUnauthorized = isVerify
    ? true
    : (ssl.rejectUnauthorized ?? false);

  const options: {
    rejectUnauthorized: boolean;
    ca?: string;
    cert?: string;
    key?: string;
    checkServerIdentity?: () => undefined;
  } = { rejectUnauthorized };

  // Omit empty strings so the TLS layer falls back to its defaults instead of
  // trying to parse a blank PEM.
  if (ssl.ca) options.ca = ssl.ca;
  if (ssl.cert) options.cert = ssl.cert;
  if (ssl.key) options.key = ssl.key;

  // verify-ca validates the chain but NOT the server hostname; verify-full
  // does both (the TLS default when rejectUnauthorized is true).
  if (ssl.mode === ESSLMode.VERIFY_CA) {
    options.checkServerIdentity = () => undefined;
  }

  return options;
}

function applyConnectionStringSsl({
  connection,
  type,
  ssl,
}: {
  connection: string;
  type: DatabaseClientType;
  ssl?: ISSLConfig;
}) {
  if (!isSslEnabled(ssl) || !ssl) {
    return connection;
  }

  if (isMysqlClient(type)) {
    return {
      uri: connection,
      ssl: createSslConnectionOptions(ssl),
    };
  }

  // node-postgres ignores SSL options embedded only as a raw string, so pass a
  // config object with an explicit `ssl` block. Previously the plain string was
  // returned unchanged and SSL was silently dropped on the string path.
  if (type === DatabaseClientType.POSTGRES) {
    return {
      connectionString: connection,
      ssl: createSslConnectionOptions(ssl),
    };
  }

  return connection;
}

async function resolveSshConnectionString({
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

function resolveRuntimeContext(input: {
  type: DatabaseClientType;
  method: EConnectionMethod;
  providerKind?: EConnectionProviderKind;
  family?: EConnectionFamily;
  managedSqlite?: IManagedSqliteConfig;
}) {
  const providerKind = resolveConnectionProviderKind({
    type: input.type,
    method: input.method,
    providerKind: input.providerKind,
    managedSqlite: input.managedSqlite,
  });

  const family =
    input.family ??
    resolveConnectionFamily({
      type: input.type,
      method: input.method,
      providerKind,
      managedSqlite: input.managedSqlite,
    });

  return {
    providerKind,
    family,
  };
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
  providerKind,
  family,
  managedSqlite,
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
  providerKind?: EConnectionProviderKind;
  family?: EConnectionFamily;
  managedSqlite?: IManagedSqliteConfig;
  ssl?: ISSLConfig;
  ssh?: ISSHConfig;
}) {
  let sshTunnelClose: (() => Promise<void>) | undefined;

  const runtimeContext = resolveRuntimeContext({
    type,
    method,
    providerKind,
    family,
    managedSqlite,
  });

  assertSupportedConnectionRuntime(runtimeContext);

  if (method === EConnectionMethod.STRING) {
    if (!url) {
      throw new Error(
        'Missing connection string for string-based health check.'
      );
    }

    return resolveSshConnectionString({
      url,
      type,
      ssl,
      ssh,
    });
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

  if (method === EConnectionMethod.MANAGED) {
    if (
      !runtimeContext.providerKind ||
      !isManagedSqliteProviderKind(runtimeContext.providerKind)
    ) {
      throw new Error(
        'Managed SQLite health checks require a managed provider kind.'
      );
    }

    if (!managedSqlite) {
      throw new Error(
        'Managed SQLite health checks require provider credentials.'
      );
    }

    return {
      connection: createManagedSqliteConnectionString(
        runtimeContext.providerKind,
        managedSqlite
      ),
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
    connection.ssl = createSslConnectionOptions(ssl);
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
  providerKind,
  family,
  managedSqlite,
  ssl,
  ssh,
}: {
  dbConnectionString?: string;
  type?: DatabaseClientType;
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  database?: string;
  serviceName?: string;
  filePath?: string;
  providerKind?: EConnectionProviderKind;
  family?: EConnectionFamily;
  managedSqlite?: IManagedSqliteConfig;
  ssl?: ISSLConfig;
  ssh?: ISSHConfig;
}): Promise<IDatabaseAdapter> => {
  if (!type) {
    throw new Error('Database type is required to resolve a database adapter.');
  }

  const dbType = type;

  const method = filePath
    ? EConnectionMethod.FILE
    : providerKind && isManagedSqliteProviderKind(providerKind)
      ? EConnectionMethod.MANAGED
      : managedSqlite &&
          isManagedSqliteProviderKind(
            resolveConnectionProviderKind({
              type: dbType,
              method: EConnectionMethod.MANAGED,
              providerKind,
              managedSqlite,
            })
          )
        ? EConnectionMethod.MANAGED
        : dbConnectionString
          ? EConnectionMethod.STRING
          : EConnectionMethod.FORM;

  const runtimeContext = resolveRuntimeContext({
    type: dbType,
    method,
    providerKind,
    family,
    managedSqlite,
  });

  assertSupportedConnectionRuntime(runtimeContext);

  const targetName = serviceName || database || '';
  const realPort = parseInt(port || `${getDefaultPort(dbType)}`, 10);

  const isManaged = Boolean(
    method === EConnectionMethod.MANAGED &&
      runtimeContext.providerKind &&
      managedSqlite
  );

  // Managed SQLite connection string is deterministic and needs no tunnel, so
  // compute it once for both the cache key and the connection config.
  const managedConnection = isManaged
    ? createManagedSqliteConnectionString(
        runtimeContext.providerKind!,
        managedSqlite!
      )
    : undefined;

  // --- Stable cache key: independent of any ephemeral local tunnel port and
  // sensitive to the full SSL trust material, so it never collides or pins to a
  // dead tunnel port. ---
  let cacheKey: string;
  if (dbConnectionString) {
    cacheKey = `${dbType}://${dbConnectionString}${sshCacheKeyPart(ssh)}${sslCacheKeyPart(ssl)}`;
  } else if (filePath) {
    cacheKey = `${dbType}://${filePath}`;
  } else if (isManaged) {
    cacheKey = `${runtimeContext.providerKind}://${managedConnection}`;
  } else if (host) {
    cacheKey = `${dbType}://${username ?? ''}@${host}:${realPort}/${targetName}${sshCacheKeyPart(ssh)}${sslCacheKeyPart(ssl)}`;
  } else {
    cacheKey = `${dbType}://${dbConnectionString}`;
  }

  // --- Cache lookup with dead-tunnel self-heal ---
  const cached = adapterCache.get(cacheKey);
  if (cached) {
    const tunnelDead =
      typeof cached.sshTunnelAlive === 'function' && !cached.sshTunnelAlive();

    if (!tunnelDead) {
      cached.lastUsed = Date.now();
      return cached.adapter;
    }

    // The SSH tunnel behind this adapter died; tear it down and rebuild so the
    // caller gets a live connection instead of a pool bound to a dead port.
    adapterCache.delete(cacheKey);
    await cached.adapter.destroy().catch(() => {});
    if (cached.sshTunnelClose) await cached.sshTunnelClose().catch(() => {});
  }

  // --- Build the connection, opening an SSH tunnel only on a cache miss ---
  let finalConnection: string | any = dbConnectionString;
  let sshTunnelClose: (() => Promise<void>) | undefined;
  let sshTunnelAlive: (() => boolean) | undefined;

  if (dbConnectionString && ssh?.enabled) {
    const resolved = await resolveSshConnectionString({
      url: dbConnectionString,
      type: dbType,
      ssl,
      ssh,
    });
    finalConnection = resolved.connection;
    sshTunnelClose = resolved.sshTunnelClose;
    sshTunnelAlive = resolved.sshTunnelAlive;
  } else if (dbConnectionString) {
    finalConnection = applyConnectionStringSsl({
      connection: dbConnectionString,
      type: dbType,
      ssl,
    });
  } else if (filePath) {
    finalConnection = { filename: filePath };
  } else if (isManaged) {
    finalConnection = managedConnection;
  } else if (host) {
    let finalHost = host;
    let finalPort = realPort;

    if (ssh?.enabled) {
      const tunnel = await createSshTunnel(ssh, host, finalPort);
      finalHost = tunnel.localHost;
      finalPort = tunnel.localPort;
      sshTunnelClose = tunnel.close;
      sshTunnelAlive = tunnel.isAlive;
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

    if (isSslEnabled(ssl) && ssl) {
      finalConnection.ssl = createSslConnectionOptions(ssl);
    }
  }

  const newAdapter = createDatabaseAdapter(dbType, finalConnection, {
    providerKind: runtimeContext.providerKind,
    managedSqlite,
  });

  adapterCache.set(cacheKey, {
    adapter: newAdapter,
    lastUsed: Date.now(),
    sshTunnelClose,
    sshTunnelAlive,
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
  providerKind,
  family,
  managedSqlite,
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
  providerKind?: EConnectionProviderKind;
  family?: EConnectionFamily;
  managedSqlite?: IManagedSqliteConfig;
  ssl?: ISSLConfig;
  ssh?: ISSHConfig;
}): Promise<
  { isConnectedSuccess: boolean } & Partial<NormalizedConnectionError>
> {
  let sshTunnelClose: (() => Promise<void>) | undefined;

  try {
    const runtimeContext = resolveRuntimeContext({
      type,
      method,
      providerKind,
      family,
      managedSqlite,
    });

    if (runtimeContext.family === EConnectionFamily.REDIS) {
      const isConnected = await pingRedisConnection({
        method,
        url,
        host,
        port,
        username,
        password,
        database,
        ssl,
        ssh,
      });

      return {
        isConnectedSuccess: isConnected,
      };
    }

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
      providerKind,
      family,
      managedSqlite,
      ssl,
      ssh,
    });
    const { connection } = resolvedConnection;
    sshTunnelClose = resolvedConnection.sshTunnelClose;

    const adapter = createDatabaseAdapter(type, connection, {
      providerKind: runtimeContext.providerKind,
      managedSqlite,
    });
    // verifyConnection throws the real driver error (unlike healthCheck, which
    // returns a bare boolean) so failures can be reported with detail.
    await adapter.verifyConnection();
    await adapter.destroy();
    if (sshTunnelClose) await sshTunnelClose();

    return {
      isConnectedSuccess: true,
    };
  } catch (error: unknown) {
    console.error('Database connection failed:', error);
    if (sshTunnelClose) await sshTunnelClose();
    return {
      isConnectedSuccess: false,
      ...normalizeConnectionError(error, {
        type,
        sslEnabled: isSslEnabled(ssl),
        sshEnabled: Boolean(ssh?.enabled),
      }),
    };
  }
}
