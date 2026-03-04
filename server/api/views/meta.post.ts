import { defineEventHandler, readBody } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createViewAdapter } from '~/server/infrastructure/database/adapters/views';

export default defineEventHandler(async event => {
  const body = await readBody(event);

  const adapter = await createViewAdapter(DatabaseClientType.POSTGRES, {
    dbConnectionString: body.dbConnectionString,
  });

  return await adapter.getViewMeta(body.schema, body.viewName);
});
