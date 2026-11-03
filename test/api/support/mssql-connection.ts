import { getMssqlFixtureConfig } from '../../support/db-fixtures';

const mssql = getMssqlFixtureConfig();

/** Form-style body for SQL Server API calls. */
export function mssqlBody(overrides: Record<string, unknown> = {}) {
  return {
    host: mssql.host,
    port: `${mssql.port}`,
    username: mssql.username,
    password: mssql.password,
    database: mssql.database,
    type: 'mssql',
    ...overrides,
  };
}

/** ADO.NET connection-string variant for SQL Server API calls. */
export function mssqlStringBody(overrides: Record<string, unknown> = {}) {
  return {
    dbConnectionString: `Server=${mssql.host},${mssql.port};Database=${mssql.database};User Id=${mssql.username};Password=${mssql.password};`,
    type: 'mssql',
    ...overrides,
  };
}

export { mssql as mssqlConfig };
