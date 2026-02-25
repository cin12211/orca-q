import pkg from 'pg';
import type { Pool } from 'pg';

/**
 * Same type-parser overrides as db-connection.ts.
 * pg.types is a global singleton — calling setTypeParser here is idempotent
 * with the call in db-connection.ts. Both files set these so each is
 * self-contained regardless of import order.
 */
const RAW = (val: string) => val;
[
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
  1700,
  1231,
  20,
  1016, // numeric, bigint + arrays
].forEach(oid =>
  pkg.types.setTypeParser(
    oid as Parameters<typeof pkg.types.setTypeParser>[0],
    RAW
  )
);

const { Pool: PoolClass } = pkg;

type DatabaseType = 'postgres';

interface CachedConnection {
  source: Pool;
  lastUsed: number;
}

const connectionCache = new Map<string, CachedConnection>();
const LRU_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// Cleanup function
function cleanupIdlePools() {
  const now = Date.now();

  for (const [connStr, conn] of connectionCache.entries()) {
    const idleTime = now - conn.lastUsed;

    if (idleTime > LRU_TIMEOUT) {
      conn.source
        .end()
        .then(() => {
          console.log(`[Connection Cache] Destroyed idle pool: ${connStr}`);
        })
        .catch(err => {
          console.error(
            `[Connection Cache] Error closing pool: ${connStr}`,
            err
          );
        })
        .finally(() => {
          connectionCache.delete(connStr);
        });
    }
  }
}

// Run cleanup every minute
setInterval(cleanupIdlePools, 60 * 1000);

// Graceful shutdown handler
async function shutdownAllPools() {
  for (const [connStr, conn] of connectionCache.entries()) {
    try {
      await conn.source.end();
      console.log(`[Connection Cache] Pool closed on shutdown: ${connStr}`);
    } catch (err) {
      console.error(
        `[Connection Cache] Error shutting down pool: ${connStr}`,
        err
      );
    } finally {
      connectionCache.delete(connStr);
    }
  }
}

process.on('SIGINT', async () => {
  await shutdownAllPools();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await shutdownAllPools();
  process.exit(0);
});

process.on('exit', async () => {
  await shutdownAllPools();
});

export const getPgPool = async ({
  dbConnectionString,
}: {
  dbConnectionString: string;
  type: DatabaseType; // currently only "postgres"
  schema?: string;
}): Promise<Pool> => {
  const cached = connectionCache.get(dbConnectionString);
  if (cached) {
    cached.lastUsed = Date.now();
    return cached.source;
  }

  const newPool = new PoolClass({
    connectionString: dbConnectionString,
    min: 1,
    max: 10,
    idleTimeoutMillis: LRU_TIMEOUT, // clients auto-close after idle
  });

  connectionCache.set(dbConnectionString, {
    source: newPool,
    lastUsed: Date.now(),
  });

  return newPool;
};
