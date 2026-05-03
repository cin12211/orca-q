import { readBody } from 'h3';
import {
  EConnectionMethod,
  type ISSHConfig,
  type ISSLConfig,
} from '~/core/types/entities/connection.entity';
import { createRedisRuntimeClient } from '~/server/infrastructure/nosql/redis/redis.client';

const parseCommand = (command: string) => {
  const tokens: string[] = [];
  const regex = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|(\S+)/g;

  for (const match of command.matchAll(regex)) {
    tokens.push(match[1] || match[2] || match[3]);
  }

  return tokens;
};

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
    command: string;
    ssl?: ISSLConfig;
    ssh?: ISSHConfig;
  } = await readBody(event);

  const runtime = await createRedisRuntimeClient({
    method: body.method,
    url: body.stringConnection,
    host: body.host,
    port: body.port,
    username: body.username,
    password: body.password,
    database: `${body.databaseIndex ?? body.database ?? 0}`,
    ssl: body.ssl,
    ssh: body.ssh,
  });

  try {
    if ((body.databaseIndex ?? 0) > 0) {
      await runtime.client.select(body.databaseIndex ?? 0);
    }

    const args = parseCommand(body.command);

    console.log('🚀 ~ body.command:', body.command);

    if (!args.length) {
      throw new Error('Redis command cannot be empty.');
    }

    const result = await runtime.client.sendCommand(args);

    console.log('🚀 ~ result:', result);

    return {
      command: args,
      result,
    };
  } finally {
    await runtime.close();
  }
});
