import type { DatabaseMetadataRequestParams } from '#shared/types/database-schemas.types';
import { defineEventHandler, readBody } from 'h3';
import { getMongoReplicationInsight } from '~~/server/infrastructure/nosql/mongodb/mongodb-instance-insights.service';

export default defineEventHandler(async event => {
  const body = await readBody<DatabaseMetadataRequestParams>(event);

  return getMongoReplicationInsight(body);
});
