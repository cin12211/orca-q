import { DatabaseClientType } from '~/core/constants/database-client-type';
import { healthCheckConnection } from '~/server/infrastructure/driver/db-connection';
import type { ISSLConfig, ISSHConfig } from '~/components/modules/connection';

export default defineEventHandler(
  async (event): Promise<{ isConnectedSuccess: boolean }> => {
    const body: {
      stringConnection?: string;
      host?: string;
      port?: string;
      username?: string;
      password?: string;
      database?: string;
      type?: DatabaseClientType;
      ssl?: ISSLConfig;
      ssh?: ISSHConfig;
    } = await readBody(event);

    const isConnectedSuccess = await healthCheckConnection({
      url: body.stringConnection || '',
      host: body.host,
      port: body.port,
      username: body.username,
      password: body.password,
      database: body.database,
      type: body.type,
      ssl: body.ssl,
      ssh: body.ssh,
    });

    return {
      isConnectedSuccess,
    };
  }
);
