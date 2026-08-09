import { resolveConnectionProviderKind } from '~/core/constants/connection-capabilities';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import {
  EConnectionMethod,
  type EConnectionFamily,
  type EConnectionProviderKind,
  type IManagedSqliteConfig,
  type ISSLConfig,
  type ISSHConfig,
} from '~/core/types/entities/connection.entity';
import { assertSupportedConnectionRuntime } from '~/server/infrastructure/nosql';
import { createSshTunnel } from '~/server/utils/ssh-tunnel';
import { createDatabaseAdapter } from '../factory';
import {
  createManagedSqliteConnectionString,
  isManagedSqliteProviderKind,
} from '../managed-sqlite';
import type { IDatabaseAdapter } from '../types';
import { adapterCache } from './adapter-cache';
import { getDefaultPort } from './ports';
import { resolveRuntimeContext } from './runtime-context';
import { resolveSshConnectionString, sshCacheKeyPart } from './ssh';
import {
  applyConnectionStringSsl,
  createSslConnectionOptions,
  isSslEnabled,
  sslCacheKeyPart,
} from './ssl';

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
