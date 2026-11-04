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

export type CachedMongoClient = {
  client: MongoClient;
  lastUsed: number;
};

export const mongoClientCache = new Map<string, CachedMongoClient>();
const LRU_TIMEOUT = 15 * 60 * 1000; // 15 minutes

function getMongoCacheKey(params: DatabaseMetadataRequestParams): string {
  if (params.dbConnectionString) {
    return params.dbConnectionString;
  }
  return `mongodb://${params.username ?? ''}@${params.host || 'localhost'}:${params.port || '27017'}/${params.database || 'admin'}`;
}

function cleanupIdleClients() {
  const now = Date.now();
  for (const [key, cached] of mongoClientCache.entries()) {
    if (now - cached.lastUsed > LRU_TIMEOUT) {
      cached.client.close().catch(console.error);
      mongoClientCache.delete(key);
    }
  }
}

if (typeof setInterval !== 'undefined') {
  const timer = setInterval(cleanupIdleClients, 60 * 1000);
  if (timer && typeof timer === 'object' && 'unref' in timer) {
    (timer as { unref: () => void }).unref();
  }
}

async function shutdownAllMongoClients() {
  for (const [key, cached] of mongoClientCache.entries()) {
    try {
      await cached.client.close();
    } catch (err) {
      console.error('[MongoClient Cache] Error shutting down client', err);
    } finally {
      mongoClientCache.delete(key);
    }
  }
}

if (typeof process !== 'undefined' && typeof process.on === 'function') {
  process.on('SIGINT', async () => {
    await shutdownAllMongoClients();
  });
  process.on('SIGTERM', async () => {
    await shutdownAllMongoClients();
  });
  process.on('exit', () => {
    shutdownAllMongoClients().catch(() => {});
  });
}

export async function getOrCreateMongoClient(
  params: DatabaseMetadataRequestParams
): Promise<MongoClient> {
  const cacheKey = getMongoCacheKey(params);
  const cached = mongoClientCache.get(cacheKey);

  if (cached) {
    cached.lastUsed = Date.now();
    return cached.client;
  }

  const client = new MongoClient(getMongoUri(params), {
    serverSelectionTimeoutMS: 5_000,
    connectTimeoutMS: 5_000,
    maxPoolSize: 20,
    minPoolSize: 1,
  });

  await client.connect();
  mongoClientCache.set(cacheKey, { client, lastUsed: Date.now() });
  return client;
}

export async function pingMongoConnection(
  params: DatabaseMetadataRequestParams
): Promise<boolean> {
  await withMongoDatabase(params, database => database.command({ ping: 1 }));
  return true;
}

export async function withMongoDatabase<T>(
  params: DatabaseMetadataRequestParams,
  operation: (database: ReturnType<MongoClient['db']>) => Promise<T>
) {
  return withMongoClient(params, client =>
    operation(client.db(params.database))
  );
}

export async function withMongoClient<T>(
  params: DatabaseMetadataRequestParams,
  operation: (client: MongoClient) => Promise<T>
): Promise<T> {
  const client = await getOrCreateMongoClient(params);
  try {
    return await operation(client);
  } catch (error: any) {
    if (
      error?.name === 'MongoNetworkError' ||
      error?.name === 'MongoServerSelectionError' ||
      error?.message?.includes('topology was destroyed') ||
      error?.message?.includes('Client must be connected')
    ) {
      const cacheKey = getMongoCacheKey(params);
      mongoClientCache.delete(cacheKey);
      client.close().catch(() => {});
    }
    throw error;
  }
}
