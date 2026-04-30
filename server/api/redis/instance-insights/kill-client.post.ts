import { readBody } from 'h3';
import {
  EConnectionMethod,
  type ISSHConfig,
  type ISSLConfig,
} from '~/core/types/entities/connection.entity';
import { killRedisClient } from '~/server/infrastructure/nosql/redis/redis-instance-insights.service';

export default defineEventHandler(async event => {
  const body: {
    method: EConnectionMethod;
    dbConnectionString?: string;
    host?: string;
    port?: string;
    username?: string;
    password?: string;
    database?: string;
    databaseIndex?: number;
    clientId: string;
    ssl?: ISSLConfig;
    ssh?: ISSHConfig;
  } = await readBody(event);

  return killRedisClient(
    {
      method: body.method,
      url: body.dbConnectionString,
      host: body.host,
      port: body.port,
      username: body.username,
      password: body.password,
      database: body.database,
      databaseIndex: body.databaseIndex,
      ssl: body.ssl,
      ssh: body.ssh,
    },
    body.clientId
  );
});
