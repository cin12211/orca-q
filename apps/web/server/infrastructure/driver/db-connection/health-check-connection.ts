import type { DatabaseClientType } from '~/core/constants/database-client-type';
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
import {
  createManagedSqliteConnectionString,
  isManagedSqliteProviderKind,
} from '../managed-sqlite';
import { getDefaultPort } from './ports';
import { resolveRuntimeContext } from './runtime-context';
import { resolveSshConnectionString } from './ssh';
import { createSslConnectionOptions } from './ssl';

export async function resolveHealthCheckConnection({
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
