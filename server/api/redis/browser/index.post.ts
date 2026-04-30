import { readBody } from 'h3';
import type { RedisConnectionRequestBody } from '~/core/types/redis-workspace.types';
import { parseConnectionBody } from '~/server/infrastructure/nosql/redis/parse-connection-body';
import {
  listRedisKeys,
  listRedisDatabases,
} from '~/server/infrastructure/nosql/redis/redis-browser.service';

export default defineEventHandler(async event => {
  const body: RedisConnectionRequestBody & {
    keyPattern?: string;
    cursor?: string;
    selectedKey?: string;
  } = await readBody(event);

  const payload = parseConnectionBody(body);

  const [keys, databases] = await Promise.all([
    listRedisKeys(payload, {
      cursor: body.cursor,
      keyPattern: body.keyPattern,
    }),
    listRedisDatabases(payload, body.databaseIndex),
  ]);

  return {
    ...keys,
    databases,
    selectedKeyDetail: null,
  };
});
