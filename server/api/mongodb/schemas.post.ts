import { defineEventHandler, readBody } from 'h3';
import type { DatabaseMetadataRequestParams } from '~/core/types/database-schemas.types';
import {
  listMongoCollectionNames,
  listMongoDatabases,
} from '~/server/infrastructure/nosql/mongodb/mongodb-quick-query';
import { withMongoClient } from '~/server/infrastructure/nosql/mongodb/mongodb.client';

export default defineEventHandler(async event => {
  const body = await readBody<DatabaseMetadataRequestParams>(event);

  return await withMongoClient(body, async client => {
    let databaseNames: string[] = [];
    try {
      databaseNames = await listMongoDatabases(client);
    } catch {
      if (body.database) {
        databaseNames = [body.database];
      }
    }

    const databases = await Promise.all(
      databaseNames.map(async databaseName => {
        try {
          const database = client.db(databaseName);
          const collections = await listMongoCollectionNames(database);
          return {
            database: databaseName,
            collections,
          };
        } catch {
          return {
            database: databaseName,
            collections: [],
          };
        }
      })
    );

    return { databases };
  });
});
