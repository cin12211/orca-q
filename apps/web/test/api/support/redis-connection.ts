import { getRedisFixtureConfig } from '../../support/db-fixtures';

/**
 * Matches EConnectionMethod values without importing from ~ alias
 * (which is not resolved by the integration test runner).
 */
const CONNECTION_METHOD = {
  FORM: 'form',
  STRING: 'string',
} as const;

const redis = getRedisFixtureConfig();

/**
 * Body fragment for Redis API routes using form-based connection.
 * Works with `/api/redis/*` endpoints.
 */
export function redisBody(overrides: Record<string, unknown> = {}) {
  return {
    method: CONNECTION_METHOD.FORM,
    host: redis.host,
    port: `${redis.port}`,
    username: redis.username,
    password: redis.password,
    database: `${redis.database}`,
    databaseIndex: redis.database,
    ...overrides,
  };
}

/**
 * Connection-string variant for Redis routes.
 */
export function redisStringBody(overrides: Record<string, unknown> = {}) {
  return {
    method: CONNECTION_METHOD.STRING,
    stringConnection: redis.url,
    ...overrides,
  };
}

/**
 * Body for health-check endpoint (uses `type: 'redis'`).
 */
export function redisHealthCheckBody(overrides: Record<string, unknown> = {}) {
  return {
    type: 'redis',
    method: 'form',
    host: redis.host,
    port: `${redis.port}`,
    username: redis.username,
    password: redis.password,
    database: `${redis.database}`,
    ...overrides,
  };
}

export { redis as redisConfig };
