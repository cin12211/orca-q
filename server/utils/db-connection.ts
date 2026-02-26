import {
  createDatabaseAdapter,
  type DatabaseType,
  type IDatabaseAdapter,
} from './adapters';

type CachedAdapter = {
  adapter: IDatabaseAdapter;
  lastUsed: number;
};

const adapterCache = new Map<string, CachedAdapter>();
const LRU_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// Cleanup every 1 minute
function cleanupIdleAdapters() {
  const now = Date.now();

  for (const [key, cached] of adapterCache.entries()) {
    const idleTime = now - cached.lastUsed;

    if (idleTime > LRU_TIMEOUT) {
      cached.adapter.destroy().catch(console.error);
      adapterCache.delete(key);
      console.log(
        `[Adapter Cache] Destroyed idle adapter for ${cached.adapter.dbType}`
      );
    }
  }
}

setInterval(cleanupIdleAdapters, 60 * 1000);

// Graceful shutdown handler
async function shutdownAllAdapters() {
  for (const [key, cached] of adapterCache.entries()) {
    try {
      await cached.adapter.destroy();
      console.log(
        `[Adapter Cache] Adapter closed on shutdown: ${cached.adapter.dbType}`
      );
    } catch (err) {
      console.error(
        `[Adapter Cache] Error shutting down adapter: ${cached.adapter.dbType}`,
        err
      );
    } finally {
      adapterCache.delete(key);
    }
  }
}

process.on('SIGINT', async () => {
  await shutdownAllAdapters();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await shutdownAllAdapters();
  process.exit(0);
});

process.on('exit', async () => {
  await shutdownAllAdapters();
});

// We export this with the same name to be a drop-in replacement where possible,
// though it now returns an IDatabaseAdapter instead of a TypeORM DataSource.
export const getDatabaseSource = async ({
  dbConnectionString,
  type,
}: {
  dbConnectionString: string;
  type: DatabaseType | 'postgres'; // allow typeorm db types temporarily if any remain
  schema?: string;
}): Promise<IDatabaseAdapter> => {
  const cacheKey = `${type}://${dbConnectionString}`;
  let cached = adapterCache.get(cacheKey);

  if (cached) {
    cached.lastUsed = Date.now();
    return cached.adapter;
  }

  let dbType: DatabaseType = 'postgres';
  if (type === 'postgres' || type === 'mysql' || type === 'sqlite') {
    dbType = type as DatabaseType;
  } else {
    // fallback
    dbType = 'postgres';
  }

  const newAdapter = createDatabaseAdapter(dbType, dbConnectionString);

  adapterCache.set(cacheKey, {
    adapter: newAdapter,
    lastUsed: Date.now(),
  });

  return newAdapter;
};

export async function healthCheckConnection({
  url,
  type = 'postgres',
}: {
  url: string;
  type?: DatabaseType | 'postgres';
}) {
  try {
    const adapter = createDatabaseAdapter(
      (type as DatabaseType) || 'postgres',
      url
    );
    const isConnected = await adapter.healthCheck();
    await adapter.destroy();
    return isConnected;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}
