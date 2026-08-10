import { getCockroachDbFixtureConfig } from '../../support/db-fixtures';

const cockroachdb = getCockroachDbFixtureConfig();

export function cockroachdbBody(overrides: Record<string, unknown> = {}) {
  return {
    host: cockroachdb.host,
    port: `${cockroachdb.port}`,
    username: cockroachdb.username,
    password: cockroachdb.password,
    database: cockroachdb.database,
    type: 'cockroachdb',
    ...overrides,
  };
}

export function cockroachdbStringBody(overrides: Record<string, unknown> = {}) {
  return {
    dbConnectionString: cockroachdb.url,
    type: 'cockroachdb',
    ...overrides,
  };
}

export { cockroachdb as cockroachdbConfig };
