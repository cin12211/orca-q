import { DatabaseClientType } from '#shared/constants/database-client-type';
import type { DatabaseMetadataRequestParams } from '#shared/types';
import { defineEventHandler, readBody } from 'h3';
import { createTableAdapter } from '~~/server/infrastructure/database/adapters/tables';

interface RequestBody extends DatabaseMetadataRequestParams {
  schema: string;
  table: string;
}

export default defineEventHandler(async event => {
  const body = await readBody<RequestBody>(event);

  const adapter = await createTableAdapter(body.type, body);

  return await adapter.getTableTriggers(body.schema, body.table);
});
