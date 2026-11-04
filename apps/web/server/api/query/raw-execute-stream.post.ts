import { defineEventHandler, readBody, createError } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { DatabaseMetadataRequestParams } from '~/core/types';
import { createQueryAdapter } from '~/server/infrastructure/database/adapters/query';

interface RequestBody extends DatabaseMetadataRequestParams {
  query: string;
  params?: Record<string, unknown>;
}

function hasConnectionTarget(body: RequestBody) {
  return Boolean(
    body.dbConnectionString || body.host || body.filePath || body.managedSqlite
  );
}

export default defineEventHandler(async event => {
  const body = await readBody<RequestBody>(event);

  if (!body.query || !hasConnectionTarget(body)) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields: query and a valid connection target',
    });
  }

  const adapter = await createQueryAdapter(
    body.type,
    body
  );

  return await adapter.rawExecuteStream(event, body.query, body.params);
});
