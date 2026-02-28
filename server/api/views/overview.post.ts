import { defineEventHandler, readBody } from 'h3';
import { createViewAdapter } from '~/server/infrastructure/database/adapters/views';

export default defineEventHandler(async event => {
  const body = await readBody(event);

  const adapter = await createViewAdapter('postgres', {
    dbConnectionString: body.dbConnectionString,
  });

  return await adapter.getOverviewViews(body.schema);
});
