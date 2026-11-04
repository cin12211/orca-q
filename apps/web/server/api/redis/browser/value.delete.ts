import { readValidatedBody } from 'h3';
import { z } from 'zod';
import {
  connectionBodySchema,
  parseConnectionBody,
} from '~/server/infrastructure/nosql/redis/parse-connection-body';
import { deleteRedisKeys } from '~/server/infrastructure/nosql/redis/redis-browser.service';

const valueDeleteBodySchema = connectionBodySchema.extend({
  key: z.string().min(1),
});

export default defineEventHandler(async event => {
  const body = await readValidatedBody(event, valueDeleteBodySchema.parse);

  return deleteRedisKeys(parseConnectionBody(body), [body.key]);
});
