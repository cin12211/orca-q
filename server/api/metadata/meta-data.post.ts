import { defineEventHandler, readBody } from 'h3';
import type { SchemaMetaData } from '~/core/types';
import { createMetadataAdapter } from '~/server/infrastructure/database/adapters/metadata';

interface RequestBody {
  dbConnectionString: string;
}

export default defineEventHandler(async (event): Promise<SchemaMetaData[]> => {
  const body: RequestBody = await readBody(event);

  const adapter = await createMetadataAdapter('postgres', {
    dbConnectionString: body.dbConnectionString,
  });

  return await adapter.getSchemaMetaData();
});
