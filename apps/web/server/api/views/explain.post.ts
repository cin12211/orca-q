import { defineEventHandler, readBody } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { DatabaseMetadataRequestParams } from '~/core/types';
import { createViewAdapter } from '~/server/infrastructure/database/adapters/views';

interface RequestBody extends DatabaseMetadataRequestParams {
  schema: string;
  viewName: string;
}

export default defineEventHandler(async event => {
  const body = await readBody<RequestBody>(event);

  const adapter = await createViewAdapter(
    body.type,
    body
  );

  return await adapter.getViewExplainPlan(body.schema, body.viewName);
});
