import { defineEventHandler, readBody } from 'h3';
import type { MongoRawQueryApprovalRequest } from '~/core/types/mongodb-raw-query.types';
import { approveMongoRawQuery } from '~/server/infrastructure/nosql/mongodb/raw-query';

export default defineEventHandler(async event => {
  const { challengeId } = await readBody<MongoRawQueryApprovalRequest>(event);
  return approveMongoRawQuery(challengeId);
});
