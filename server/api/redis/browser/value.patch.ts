import { readValidatedBody } from 'h3';
import { z } from 'zod';
import {
  connectionBodySchema,
  parseConnectionBody,
} from '~/server/infrastructure/nosql/redis/parse-connection-body';
import { updateRedisKeyValue } from '~/server/infrastructure/nosql/redis/redis-browser.service';

const valuePatchBodySchema = connectionBodySchema.extend({
  key: z.string().min(1),
  previewKind: z.enum(['text', 'json', 'table', 'readonly']).optional(),
  stringFormat: z.enum(['plain', 'json']).optional(),
  tableKind: z.enum(['hash', 'list', 'set', 'zset']).optional(),
  ttlSeconds: z.number().nullable().optional(),
  value: z.unknown(),
});

export default defineEventHandler(async event => {
  const body = await readValidatedBody(event, valuePatchBodySchema.parse);

  return updateRedisKeyValue(parseConnectionBody(body), body.key, {
    previewKind: body.previewKind,
    stringFormat: body.stringFormat,
    tableKind: body.tableKind,
    ttlSeconds: body.ttlSeconds,
    value: body.value,
  });
});
