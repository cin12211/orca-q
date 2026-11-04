import { defineEventHandler, readBody } from 'h3';
import { DatabaseClientType } from '~~/app/core/constants/database-client-type';
import type { DatabaseMetadataRequestParams } from '~~/app/core/types';
import { createTableAdapter } from '~~/server/infrastructure/database/adapters/tables';

interface RequestBody extends DatabaseMetadataRequestParams {
  schema: string;
  table: string;
}

export default defineEventHandler(async event => {
  const body = await readBody<RequestBody>(event);

  const adapter = await createTableAdapter(
    body.type,
    body
  );

  return await adapter.getTableRules(body.schema, body.table);
});
