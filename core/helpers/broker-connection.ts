import type { Connection } from '~/core/stores';

/** Connection fields sent to the /api/rabbitmq and /api/kafka routes. */
export function getBrokerConnectionPayload(connection: Connection) {
  return {
    method: connection.method,
    host: connection.host,
    port: connection.port,
    username: connection.username,
    password: connection.password,
    ssl: connection.ssl,
    ssh: connection.ssh,
    broker: connection.broker,
  };
}
