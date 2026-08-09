import type { Connection } from '~/core/stores';
import { EConnectionMethod } from '~/core/types/entities/connection.entity';

export function getConnectionParams(connection?: Connection) {
  if (!connection) return {};

  return {
    dbConnectionString:
      connection.method === EConnectionMethod.STRING
        ? connection.connectionString || ''
        : '',
    host: connection.host,
    port: connection.port,
    username: connection.username,
    password: connection.password,
    database: connection.database,
    serviceName: connection.serviceName,
    filePath: connection.filePath,
    type: connection.type,
    providerKind: connection.providerKind,
    managedSqlite: connection.managedSqlite,
    ssl: connection.ssl,
    ssh: connection.ssh,
  };
}
