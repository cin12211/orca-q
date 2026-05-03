import { readBody } from 'h3';
import type { RedisConnectionRequestBody } from '~/core/types/redis-workspace.types';
import { parseConnectionBody } from '~/server/infrastructure/nosql/redis/parse-connection-body';
import { listRedisDatabases } from '~/server/infrastructure/nosql/redis/redis-browser.service';

export default defineEventHandler(async event => {
  const body: RedisConnectionRequestBody = await readBody(event);

  return listRedisDatabases(parseConnectionBody(body), body.databaseIndex);
});
