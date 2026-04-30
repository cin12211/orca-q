export type RedisFixtureConfig = {
  host: string;
  port: number;
  database: number;
  username?: string;
  password?: string;
  url: string;
  source: 'env' | 'default-local';
};

function readEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function parsePort(
  value: string | undefined,
  fallback: number,
  envName: string
) {
  if (!value) {
    return fallback;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`${envName} must be a positive integer.`);
  }

  return port;
}

export function getRedisFixtureConfig(): RedisFixtureConfig {
  const host = readEnv('REDIS_HOST') ?? '127.0.0.1';
  const port = parsePort(readEnv('REDIS_PORT'), 6379, 'REDIS_PORT');
  const database = parsePort(readEnv('REDIS_DATABASE'), 0, 'REDIS_DATABASE');
  const username = readEnv('REDIS_USERNAME');
  const password = readEnv('REDIS_PASSWORD');
  const url = readEnv('REDIS_URL') ?? `redis://${host}:${port}/${database}`;

  return {
    host,
    port,
    database,
    username,
    password,
    url,
    source:
      readEnv('REDIS_URL') ||
      readEnv('REDIS_HOST') ||
      readEnv('REDIS_PORT') ||
      readEnv('REDIS_DATABASE') ||
      readEnv('REDIS_USERNAME') ||
      readEnv('REDIS_PASSWORD')
        ? 'env'
        : 'default-local',
  };
}
