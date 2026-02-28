import { defineEventHandler, readBody } from 'h3';
import { createTableAdapter } from '~/server/infrastructure/database/adapters/tables';

export default defineEventHandler(async event => {
  const body = await readBody(event);

  const adapter = await createTableAdapter('postgres', {
    dbConnectionString: body.dbConnectionString,
  });

  return await adapter.getTableSize(body.schema, body.tableName);
});
