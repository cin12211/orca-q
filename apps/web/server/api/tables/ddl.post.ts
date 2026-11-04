import { defineEventHandler, readBody } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { DatabaseMetadataRequestParams } from '~/core/types';
import { createTableAdapter } from '~/server/infrastructure/database/adapters/tables';

interface RequestBody extends DatabaseMetadataRequestParams {
  schemaName: string;
  tableName: string;
}

export default defineEventHandler(async event => {
  const body = await readBody<RequestBody>(event);

  const adapter = await createTableAdapter(
    body.type,
    body
  );

  return await adapter.getTableDdl(body.schemaName, body.tableName);
});
