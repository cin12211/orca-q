import { getCockroachFixtureConfig } from '../../support/db-fixtures';

const crdb = getCockroachFixtureConfig();

/** Form-style body for CockroachDB API calls. */
export function crdbBody(overrides: Record<string, unknown> = {}) {
  return {
    host: crdb.host,
    port: `${crdb.port}`,
    username: crdb.username,
    password: crdb.password,
    database: crdb.database,
    type: 'cockroachdb',
    ...overrides,
  };
}

/** Connection-string variant for CockroachDB API calls. */
export function crdbStringBody(overrides: Record<string, unknown> = {}) {
  return {
    dbConnectionString: crdb.url,
    type: 'cockroachdb',
    ...overrides,
  };
}

export { crdb as crdbConfig };
