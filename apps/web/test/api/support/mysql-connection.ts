import { getMysqlFixtureConfig } from '../../support/db-fixtures';

const my = getMysqlFixtureConfig();

/**
 * Body fragment that every MySQL API call needs.
 * Spread it into `$fetch` body:
 *
 *   $fetch('/api/...', { method: 'POST', body: { ...myBody(), schema: 'sakila' } })
 */
export function myBody(overrides: Record<string, unknown> = {}) {
  return {
    host: my.host,
    port: `${my.port}`,
    username: my.username,
    password: my.password,
    database: my.database,
    type: 'mysql',
    ...overrides,
  };
}

/**
 * Connection-string variant for routes that prefer `dbConnectionString`.
 */
export function myStringBody(overrides: Record<string, unknown> = {}) {
  return {
    dbConnectionString: my.url,
    type: 'mysql',
    ...overrides,
  };
}

export { my as myConfig };
