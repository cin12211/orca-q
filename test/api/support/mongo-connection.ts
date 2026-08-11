import { getMongoFixtureConfig } from '../../support/db-fixtures';

/**
 * Matches DatabaseClientType/EConnectionMethod values without importing from
 * ~ alias (which is not resolved by the integration test runner).
 */
const CLIENT_TYPE = {
  MONGODB: 'mongodb',
} as const;

const CONNECTION_METHOD = {
  FORM: 'form',
  STRING: 'string',
} as const;

const mongo = getMongoFixtureConfig();

/**
 * Body fragment for MongoDB API routes using form-based connection.
 * Works with `/api/mongodb/*` endpoints.
 */
export function mongoBody(overrides: Record<string, unknown> = {}) {
  return {
    method: CONNECTION_METHOD.FORM,
    host: mongo.host,
    port: `${mongo.port}`,
    database: mongo.database,
    ...overrides,
  };
}

/**
 * Body for the health-check endpoint (uses `type: 'mongodb'`).
 */
export function mongoHealthCheckBody(overrides: Record<string, unknown> = {}) {
  return {
    type: CLIENT_TYPE.MONGODB,
    method: CONNECTION_METHOD.FORM,
    host: mongo.host,
    port: `${mongo.port}`,
    database: mongo.database,
    ...overrides,
  };
}

export { mongo as mongoConfig };
