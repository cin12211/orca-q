import { defineEventHandler, readBody } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { createMetadataAdapter } from '~/server/infrastructure/database/adapters/metadata';

export default defineEventHandler(async event => {
  const body = await readBody(event);

  const adapter = await createMetadataAdapter(DatabaseClientType.POSTGRES, {
    dbConnectionString: body.dbConnectionString,
  });

  const result = await adapter.getReverseSchemas();
  return { result };
});
