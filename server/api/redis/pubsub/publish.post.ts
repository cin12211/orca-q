import { readBody } from 'h3';
import {
  EConnectionMethod,
  type ISSHConfig,
  type ISSLConfig,
} from '~/core/types/entities/connection.entity';
import { publishRedisPubSubMessage } from '~/server/infrastructure/nosql/redis/redis-pubsub.service';

export default defineEventHandler(async event => {
  const body: {
    method: EConnectionMethod;
    stringConnection?: string;
    host?: string;
    port?: string;
    username?: string;
    password?: string;
    database?: string;
    databaseIndex?: number;
    channel: string;
    payload: string;
    ssl?: ISSLConfig;
    ssh?: ISSHConfig;
  } = await readBody(event);

  return publishRedisPubSubMessage(
    {
      method: body.method,
      url: body.stringConnection,
      host: body.host,
      port: body.port,
      username: body.username,
      password: body.password,
      database: body.database,
      databaseIndex: body.databaseIndex,
      ssl: body.ssl,
      ssh: body.ssh,
    },
    body.channel,
    body.payload
  );
});
