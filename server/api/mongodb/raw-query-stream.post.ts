import { defineEventHandler, readBody } from 'h3';
import type { MongoRawQueryRequest } from '~/core/types/mongodb-raw-query.types';
import { streamMongoRawQuery } from '~/server/infrastructure/nosql/mongodb/raw-query';

export default defineEventHandler(async event => {
  const body = await readBody<MongoRawQueryRequest>(event);
  return streamMongoRawQuery(event, body);
});
