import { defineEventHandler, readBody } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { SchemaMetaData } from '~/core/types';
import { createMetadataAdapter } from '~/server/infrastructure/database/adapters/metadata';

interface RequestBody {
  dbConnectionString: string;
}

export default defineEventHandler(async (event): Promise<SchemaMetaData[]> => {
  const body: RequestBody = await readBody(event);

  const adapter = await createMetadataAdapter(DatabaseClientType.POSTGRES, {
    dbConnectionString: body.dbConnectionString,
  });

  return await adapter.getSchemaMetaData();
});
