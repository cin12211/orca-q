import { defineEventHandler, readBody } from 'h3';
import type { DatabaseMetadataRequestParams } from '~/core/types/database-schemas.types';
import { listMongoCollectionStats } from '~/server/infrastructure/nosql/mongodb/mongodb-quick-query';
import {
  withMongoClient,
  withMongoDatabase,
} from '~/server/infrastructure/nosql/mongodb/mongodb.client';

export interface DatabaseStatsRequestTarget {
  database: string;
  collections?: string[];
}

interface MongoCollectionStatsRequestBody
  extends DatabaseMetadataRequestParams {
  databases?: Array<string | DatabaseStatsRequestTarget>;
}

export default defineEventHandler(async event => {
  const body = await readBody<MongoCollectionStatsRequestBody>(event);

  if (Array.isArray(body.databases)) {
    return await withMongoClient(body, async client => {
      const databases = await Promise.all(
        body.databases!.map(async target => {
          const databaseName =
            typeof target === 'string' ? target : target.database;
          const targetCollections =
            typeof target === 'string' ? undefined : target.collections;

          try {
            const database = client.db(databaseName);
            const collections = await listMongoCollectionStats(
              database,
              targetCollections
            );
            const totalSize = collections.reduce(
              (sum, col) => sum + (col.size || 0),
              0
            );
            return {
              database: databaseName,
              totalSize,
              collections,
            };
          } catch {
            return {
              database: databaseName,
              totalSize: 0,
              collections: [],
            };
          }
        })
      );
      return { databases };
    });
  }

  const result = await withMongoDatabase(body, async database => {
    try {
      const collections = await listMongoCollectionStats(database);
      const totalSize = collections.reduce(
        (sum, col) => sum + (col.size || 0),
        0
      );
      return { collections, totalSize };
    } catch {
      return { collections: [], totalSize: 0 };
    }
  });

  return result;
});
