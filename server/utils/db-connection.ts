import { type DatabaseType, DataSource } from 'typeorm';

type CachedConnection = {
  source: DataSource;
  lastUsed: number;
};

const connectionCache = new Map<string, CachedConnection>();
const LRU_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// Cleanup every 1 minute
setInterval(() => {
  const now = Date.now();

  for (const [connStr, conn] of connectionCache.entries()) {
    const idleTime = now - conn.lastUsed;

    if (idleTime > LRU_TIMEOUT) {
      conn.source.destroy().catch(console.error);
      connectionCache.delete(connStr);
      console.log(`[Connection Cache] Destroyed idle connection: ${connStr}`);
    }
  }
}, 60 * 1000); // Every 1 min

//TODO: only support postgres
export const getDatabaseSource = async ({
  dbConnectionString,
  type,
}: {
  dbConnectionString: string;
  type: DatabaseType;
  schema?: string;
}) => {
  const cached = connectionCache.get(dbConnectionString);
  if (cached && cached.source.isInitialized) {
    cached.lastUsed = Date.now();
    return cached.source;
  }

  const newSource = new DataSource({
    type: 'postgres', // Ensure the type is explicitly set to 'postgres'
    url: dbConnectionString, // Your connection string
    synchronize: false, // Set to true if you want TypeORM to auto-create tables (use with caution in production)
    logging: true, // Logs SQL queries for debugging,
  });

  await newSource.initialize();

  connectionCache.set(dbConnectionString, {
    source: newSource,
    lastUsed: Date.now(),
  });

  return newSource;
};

export async function healthCheckConnection({ url }: { url: string }) {
  try {
    const connection = new DataSource({
      type: 'postgres', // Ensure the type is explicitly set to 'postgres'
      url, // Your connection string
      synchronize: false, // Set to true if you want TypeORM to auto-create tables (use with caution in production)
      logging: true, // Logs SQL queries for debugging
      entities: [], // Add entities if required
    });

    await connection.initialize();

    return connection.isConnected;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}
