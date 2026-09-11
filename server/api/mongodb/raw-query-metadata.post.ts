import { defineEventHandler, readBody } from 'h3';
import type { MongoRawQueryMetadataRequest } from '~/core/types/mongodb-raw-query.types';
import { getMongoRawQueryMetadata } from '~/server/infrastructure/nosql/mongodb/raw-query';

export default defineEventHandler(async event => {
  const body = await readBody<MongoRawQueryMetadataRequest>(event);
  return getMongoRawQueryMetadata(body);
});
