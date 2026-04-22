import { DatabaseClientType } from '~/core/constants/database-client-type';
import {
  EConnectionMethod,
  type ISSLConfig,
  type ISSHConfig,
} from '~/core/types/entities/connection.entity';
import { healthCheckConnection } from '~/server/infrastructure/driver/db-connection';

export default defineEventHandler(
  async (event): Promise<{ isConnectedSuccess: boolean; message?: string }> => {
    const body: {
      method?: EConnectionMethod;
      stringConnection?: string;
      host?: string;
      port?: string;
      username?: string;
      password?: string;
      database?: string;
      serviceName?: string;
      filePath?: string;
      type?: DatabaseClientType;
      ssl?: ISSLConfig;
      ssh?: ISSHConfig;
    } = await readBody(event);

    if (!body.type || !body.method) {
      return { isConnectedSuccess: false };
    }

    const result = await healthCheckConnection({
      url: body.stringConnection || '',
      method: body.method,
      host: body.host,
      port: body.port,
      username: body.username,
      password: body.password,
      database: body.database,
      serviceName: body.serviceName,
      filePath: body.filePath,
      type: body.type,
      ssl: body.ssl,
      ssh: body.ssh,
    });

    return result;
  }
);
