import { getOracleFixtureConfig } from '../../support/db-fixtures';

const oracle = getOracleFixtureConfig();

/** Form-style body for Oracle API calls. */
export function oracleBody(overrides: Record<string, unknown> = {}) {
  return {
    host: oracle.host,
    port: `${oracle.port}`,
    username: oracle.username,
    password: oracle.password,
    serviceName: oracle.database,
    type: 'oracledb',
    ...overrides,
  };
}

/** Connection-string variant for Oracle API calls. */
export function oracleStringBody(overrides: Record<string, unknown> = {}) {
  return {
    dbConnectionString: oracle.url,
    type: 'oracledb',
    ...overrides,
  };
}

export { oracle as oracleConfig };
