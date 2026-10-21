import { defineEventHandler, readBody } from 'h3';
import type { DatabaseMetadataRequestParams } from '~/core/types/database-schemas.types';
import { getMongoOverviewInsight } from '~/server/infrastructure/nosql/mongodb/mongodb-instance-insights.service';

export default defineEventHandler(async event => {
  const body = await readBody<DatabaseMetadataRequestParams>(event);
  return getMongoOverviewInsight(body);
});
