import pg from 'pg';
import { type DatabaseType, DataSource } from 'typeorm';

/**
 * Disable pg's automatic type conversions for temporal and precision-sensitive
 * types. Must be set BEFORE any DataSource/Pool is initialized, at module load.
 *
 * Without this, pg converts TIMESTAMP → JS Date, which gets serialised to UTC
 * ISO string and then re-parsed by the browser in local timezone → wrong value.
 *
 * OIDs: https://www.postgresql.org/docs/current/catalog-pg-type.html
 */
const RAW = (val: string) => val;
const TEMPORAL_OIDS = [
  1082,
  1083,
  1114,
  1184,
  1266, // date, time, timestamp, timestamptz, timetz
  1182,
  1183,
  1115,
  1185,
  1270, // array variants
] as const;
const PRECISION_OIDS = [
  1700,
  1231, // numeric/decimal + array (avoid JS float precision loss)
  20,
  1016, // int8/bigint + array   (avoid MAX_SAFE_INTEGER overflow)
] as const;

[...TEMPORAL_OIDS, ...PRECISION_OIDS].forEach(oid =>
  // Cast needed: array-type OIDs (e.g. 1182, 1183) are valid pg OIDs but
  // are not listed in pg's narrow `TypeId` union type definition.
  pg.types.setTypeParser(
    oid as Parameters<typeof pg.types.setTypeParser>[0],
    RAW
  )
);

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
    applicationName: 'orca-query-server',
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
      applicationName: 'orca-query-server',
    });
    await connection.initialize();

    return connection.isConnected;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}
