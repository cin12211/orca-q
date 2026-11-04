import { getPostgresFixtureConfig } from '../../support/db-fixtures';

const pg = getPostgresFixtureConfig();

/**
 * Body fragment that every PG API call needs.
 * Spread it into `$fetch` body:
 *
 *   $fetch('/api/...', { method: 'POST', body: { ...pgBody(), schema: 'public' } })
 */
export function pgBody(overrides: Record<string, unknown> = {}) {
  return {
    host: pg.host,
    port: `${pg.port}`,
    username: pg.username,
    password: pg.password,
    database: pg.database,
    type: 'postgres',
    ...overrides,
  };
}

/**
 * Connection-string variant for routes that prefer `dbConnectionString`.
 */
export function pgStringBody(overrides: Record<string, unknown> = {}) {
  return {
    dbConnectionString: pg.url,
    type: 'postgres',
    ...overrides,
  };
}

export { pg as pgConfig };
