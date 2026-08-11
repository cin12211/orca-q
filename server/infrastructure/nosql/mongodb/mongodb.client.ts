import { MongoClient } from 'mongodb';
import type { DatabaseMetadataRequestParams } from '~/core/types/database-schemas.types';

function getMongoUri(params: DatabaseMetadataRequestParams) {
  if (params.dbConnectionString) return params.dbConnectionString;

  const credentials = params.username
    ? `${encodeURIComponent(params.username)}:${encodeURIComponent(params.password || '')}@`
    : '';
  const host = params.host || 'localhost';
  const port = params.port || '27017';
  const database = params.database || 'admin';
  return `mongodb://${credentials}${host}:${port}/${database}`;
}

export async function withMongoDatabase<T>(
  params: DatabaseMetadataRequestParams,
  operation: (database: ReturnType<MongoClient['db']>) => Promise<T>
) {
  const client = new MongoClient(getMongoUri(params), {
    serverSelectionTimeoutMS: 5_000,
    connectTimeoutMS: 5_000,
  });

  try {
    await client.connect();
    return await operation(client.db(params.database));
  } finally {
    await client.close();
  }
}
