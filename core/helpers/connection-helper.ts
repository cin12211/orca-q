import type { Connection } from '~/core/stores';

export function getConnectionParams(connection?: Connection) {
  if (!connection) return {};

  return {
    dbConnectionString: connection.connectionString || '',
    host: connection.host,
    port: connection.port,
    username: connection.username,
    password: connection.password,
    database: connection.database,
    type: connection.type,
    ssl: connection.ssl,
    ssh: connection.ssh,
  };
}
