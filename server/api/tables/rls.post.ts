import { defineEventHandler, readBody } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createTableAdapter } from '~/server/infrastructure/database/adapters/tables';

export default defineEventHandler(async event => {
  const body = await readBody(event);

  const adapter = await createTableAdapter(DatabaseClientType.POSTGRES, {
    dbConnectionString: body.dbConnectionString,
  });

  const [status, policies] = await Promise.all([
    adapter.getTableRlsStatus(body.schema, body.table),
    adapter.getTableRlsPolicies(body.schema, body.table),
  ]);

  return { ...status, policies };
});
