import type { DatabaseClientType } from '~/core/constants/database-client-type';
import {
  EConnectionFamily,
  EConnectionMethod,
  type EConnectionProviderKind,
  type IBrokerConfig,
  type IManagedSqliteConfig,
  type ISSLConfig,
  type ISSHConfig,
} from '~/core/types/entities/connection.entity';
import { BrokerConnectionError } from '~/server/infrastructure/nosql/broker/broker-connection';
import { verifyKafkaConnection } from '~/server/infrastructure/nosql/kafka/kafka.client';
import { pingMongoConnection } from '~/server/infrastructure/nosql/mongodb/mongodb.client';
import { verifyRabbitConnection } from '~/server/infrastructure/nosql/rabbitmq/rabbitmq-overview.service';
import { pingRedisConnection } from '~/server/infrastructure/nosql/redis/redis.client';
import {
  normalizeConnectionError,
  type NormalizedConnectionError,
} from '../connection-error';
import { createDatabaseAdapter } from '../factory';
import type { IDatabaseAdapter } from '../types';
import { resolveHealthCheckConnection } from './health-check-connection';
import { resolveRuntimeContext } from './runtime-context';
import { isSslEnabled } from './ssl';

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
  broker,
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
  broker?: IBrokerConfig;
  ssl?: ISSLConfig;
  ssh?: ISSHConfig;
}): Promise<
  { isConnectedSuccess: boolean } & Partial<NormalizedConnectionError>
> {
  let sshTunnelClose: (() => Promise<void>) | undefined;
  let adapter: IDatabaseAdapter | undefined;

  try {
    const runtimeContext = resolveRuntimeContext({
      type,
      method,
      providerKind,
      family,
      managedSqlite,
    });

    if (runtimeContext.family === EConnectionFamily.REDIS) {
      try {
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
      } catch (error: unknown) {
        console.error('Redis connection failed:', error);
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

    if (
      runtimeContext.family === EConnectionFamily.RABBITMQ ||
      runtimeContext.family === EConnectionFamily.KAFKA
    ) {
      const brokerInput = {
        method,
        host,
        port,
        username,
        password,
        ssl,
        ssh,
        broker,
      };

      try {
        if (runtimeContext.family === EConnectionFamily.RABBITMQ) {
          await verifyRabbitConnection(brokerInput);
        } else {
          await verifyKafkaConnection(brokerInput);
        }

        return { isConnectedSuccess: true };
      } catch (error: unknown) {
        console.error(`${type} connection failed:`, error);

        if (error instanceof BrokerConnectionError) {
          return {
            isConnectedSuccess: false,
            message: error.message,
            hint: error.hint,
            code: error.code,
            detail: error.detail,
          };
        }

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

    if (runtimeContext.family === EConnectionFamily.MONGODB) {
      try {
        const isConnected = await pingMongoConnection({
          dbConnectionString:
            method === EConnectionMethod.STRING ? url : undefined,
          host,
          port,
          username,
          password,
          database,
        });

        return {
          isConnectedSuccess: isConnected,
        };
      } catch (error: unknown) {
        console.error('MongoDB connection failed:', error);
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

    adapter = createDatabaseAdapter(type, connection, {
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
    // A connection can open fine and still be rejected (e.g. server version
    // too old); release its pool before reporting.
    await adapter?.destroy().catch(() => {});
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
