import { readValidatedBody } from 'h3';
import { z } from 'zod';
import {
  connectionBodySchema,
  parseConnectionBody,
} from '~/server/infrastructure/nosql/redis/parse-connection-body';
import { deleteRedisKeys } from '~/server/infrastructure/nosql/redis/redis-browser.service';

const keysDeleteBodySchema = connectionBodySchema.extend({
  keys: z.array(z.string().min(1)).min(1),
});

export default defineEventHandler(async event => {
  const body = await readValidatedBody(event, keysDeleteBodySchema.parse);

  return deleteRedisKeys(parseConnectionBody(body), body.keys);
});
