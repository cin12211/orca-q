export type FixtureSource = 'env' | 'default-local';

export type D1LiveConnection = {
  provider: 'cloudflare-d1';
  accountId?: string;
  databaseId?: string;
  apiToken?: string;
};

export type TursoLiveConnection = {
  provider: 'turso';
  url?: string;
  authToken?: string;
  branchName?: string;
};

export type OracleLiveConnection = {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  serviceName?: string;
  url?: string;
  source?: FixtureSource;
};

export type RedisFixtureConfig = {
  host: string;
  port: number;
  database: number;
  username?: string;
  password?: string;
  url: string;
  source: FixtureSource;
};

export type SqlFixtureEngine = 'postgres' | 'mysql' | 'mariadb';

export type SqlFixtureConfig = {
  engine: SqlFixtureEngine;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  url: string;
  source: FixtureSource;
};

function readEnv(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();

    if (value) {
      return value;
    }
  }

  return undefined;
}

function hasAnyEnv(names: string[]) {
  return names.some(name => Boolean(process.env[name]?.trim()));
}

function parseInteger(
  value: string | undefined,
  fallback: number,
  envName: string,
  minimum = 1
) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < minimum) {
    const minimumDescription =
      minimum === 0 ? 'a non-negative integer' : 'a positive integer';
    throw new Error(`${envName} must be ${minimumDescription}.`);
  }

  return parsed;
}

function encodeAuthSegment(value?: string) {
  return value ? encodeURIComponent(value) : '';
}

function buildRedisUrl(config: {
  host: string;
  port: number;
  database: number;
  username?: string;
  password?: string;
}) {
  const username = encodeAuthSegment(config.username);
  const password = encodeAuthSegment(config.password);
  const auth =
    username || password ? `${username}${password ? `:${password}` : ''}@` : '';

  return `redis://${auth}${config.host}:${config.port}/${config.database}`;
}

function buildSqlUrl(config: {
  engine: SqlFixtureEngine;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}) {
  const protocol = config.engine === 'postgres' ? 'postgresql' : 'mysql';
  const username = encodeAuthSegment(config.username);
  const password = encodeAuthSegment(config.password);

  return `${protocol}://${username}:${password}@${config.host}:${config.port}/${config.database}`;
}

function buildSqlFixtureConfig(input: {
  engine: SqlFixtureEngine;
  envPrefix: string;
  defaultPort: number;
  defaultDatabase: string;
  defaultUsername: string;
  defaultPassword: string;
}) {
  const host = readEnv(`${input.envPrefix}_HOST`) || '127.0.0.1';
  const port = parseInteger(
    readEnv(`${input.envPrefix}_PORT`),
    input.defaultPort,
    `${input.envPrefix}_PORT`
  );
  const database =
    readEnv(`${input.envPrefix}_DATABASE`, `${input.envPrefix}_DB`) ||
    input.defaultDatabase;
  const username =
    readEnv(`${input.envPrefix}_USER`, `${input.envPrefix}_USERNAME`) ||
    input.defaultUsername;
  const password =
    readEnv(`${input.envPrefix}_PASSWORD`) || input.defaultPassword;
  const url =
    readEnv(`${input.envPrefix}_URL`) ||
    buildSqlUrl({
      engine: input.engine,
      host,
      port,
      database,
      username,
      password,
    });

  return {
    engine: input.engine,
    host,
    port,
    database,
    username,
    password,
    url,
    source: hasAnyEnv([
      `${input.envPrefix}_URL`,
      `${input.envPrefix}_HOST`,
      `${input.envPrefix}_PORT`,
      `${input.envPrefix}_DATABASE`,
      `${input.envPrefix}_DB`,
      `${input.envPrefix}_USER`,
      `${input.envPrefix}_USERNAME`,
      `${input.envPrefix}_PASSWORD`,
    ])
      ? 'env'
      : 'default-local',
  } satisfies SqlFixtureConfig;
}

export function getPostgresFixtureConfig() {
  return buildSqlFixtureConfig({
    engine: 'postgres',
    envPrefix: 'HERAQ_POSTGRES',
    defaultPort: 5432,
    defaultDatabase: 'pagila',
    defaultUsername: 'heraq',
    defaultPassword: 'heraq',
  });
}

export function getMysqlFixtureConfig() {
  return buildSqlFixtureConfig({
    engine: 'mysql',
    envPrefix: 'HERAQ_MYSQL',
    defaultPort: 3306,
    defaultDatabase: 'sakila',
    defaultUsername: 'heraq',
    defaultPassword: 'heraq',
  });
}

export function getMariaDbFixtureConfig() {
  return buildSqlFixtureConfig({
    engine: 'mariadb',
    envPrefix: 'HERAQ_MARIADB',
    defaultPort: 3307,
    defaultDatabase: 'sakila',
    defaultUsername: 'heraq',
    defaultPassword: 'heraq',
  });
}

export function getSqlFixtureCatalog() {
  return {
    postgres: getPostgresFixtureConfig(),
    mysql: getMysqlFixtureConfig(),
    mariadb: getMariaDbFixtureConfig(),
  };
}

export function getRedisFixtureConfig(): RedisFixtureConfig {
  const host = readEnv('HERAQ_REDIS_HOST', 'REDIS_HOST') || '127.0.0.1';
  const port = parseInteger(
    readEnv('HERAQ_REDIS_PORT', 'REDIS_PORT'),
    6379,
    'HERAQ_REDIS_PORT'
  );
  const database = parseInteger(
    readEnv('HERAQ_REDIS_DATABASE', 'REDIS_DATABASE'),
    0,
    'HERAQ_REDIS_DATABASE',
    0
  );
  const username = readEnv('HERAQ_REDIS_USERNAME', 'REDIS_USERNAME');
  const password = readEnv('HERAQ_REDIS_PASSWORD', 'REDIS_PASSWORD');
  const url =
    readEnv('HERAQ_REDIS_URL', 'REDIS_URL') ||
    buildRedisUrl({
      host,
      port,
      database,
      username,
      password,
    });

  return {
    host,
    port,
    database,
    username,
    password,
    url,
    source: hasAnyEnv([
      'HERAQ_REDIS_URL',
      'HERAQ_REDIS_HOST',
      'HERAQ_REDIS_PORT',
      'HERAQ_REDIS_DATABASE',
      'HERAQ_REDIS_USERNAME',
      'HERAQ_REDIS_PASSWORD',
      'REDIS_URL',
      'REDIS_HOST',
      'REDIS_PORT',
      'REDIS_DATABASE',
      'REDIS_USERNAME',
      'REDIS_PASSWORD',
    ])
      ? 'env'
      : 'default-local',
  };
}

export function getD1LiveConnection(): D1LiveConnection {
  return {
    provider: 'cloudflare-d1',
    accountId: readEnv('D1_ACCOUNT_ID'),
    databaseId: readEnv('D1_DATABASE_ID'),
    apiToken: readEnv('D1_API_TOKEN'),
  };
}

export function hasD1LiveConnection() {
  const config = getD1LiveConnection();
  return Boolean(config.accountId && config.databaseId && config.apiToken);
}

export function getTursoLiveConnection(): TursoLiveConnection {
  return {
    provider: 'turso',
    url: readEnv('TURSO_DATABASE_URL', 'TURSO_URL'),
    authToken: readEnv('TURSO_AUTH_TOKEN'),
    branchName: readEnv('TURSO_BRANCH_NAME'),
  };
}

export function hasTursoLiveConnection() {
  const config = getTursoLiveConnection();
  return Boolean(config.url && config.authToken);
}

export function getManagedSqliteLiveConnections() {
  return {
    d1: getD1LiveConnection(),
    turso: getTursoLiveConnection(),
  };
}

export function getOracleLiveConnection(): OracleLiveConnection {
  const host = readEnv('HERAQ_ORACLE_HOST', 'ORACLE_HOST');
  const portValue = readEnv('HERAQ_ORACLE_PORT', 'ORACLE_PORT');
  const username = readEnv(
    'HERAQ_ORACLE_USER',
    'HERAQ_ORACLE_USERNAME',
    'ORACLE_USER',
    'ORACLE_USERNAME'
  );
  const password = readEnv('HERAQ_ORACLE_PASSWORD', 'ORACLE_PASSWORD');
  const serviceName = readEnv(
    'HERAQ_ORACLE_SERVICE_NAME',
    'ORACLE_SERVICE_NAME'
  );
  const url =
    readEnv(
      'ORACLE_CONNECTION',
      'HERAQ_ORACLE_URL',
      'HERAQ_ORACLE_CONNECTION_STRING',
      'ORACLE_URL'
    ) ||
    (host && username && password && serviceName
      ? `oracledb://${encodeAuthSegment(username)}:${encodeAuthSegment(password)}@${host}:${parseInteger(portValue, 1521, 'HERAQ_ORACLE_PORT')}/${encodeURIComponent(serviceName)}`
      : undefined);

  let parsedUrl: URL | undefined;

  if (url) {
    try {
      parsedUrl = new URL(url);
    } catch {
      parsedUrl = undefined;
    }
  }

  return {
    host: host || parsedUrl?.hostname,
    port:
      host || parsedUrl?.hostname
        ? parseInteger(
            portValue || parsedUrl?.port,
            1521,
            portValue ? 'HERAQ_ORACLE_PORT' : 'ORACLE_CONNECTION'
          )
        : undefined,
    username: username || parsedUrl?.username || undefined,
    password: password || parsedUrl?.password || undefined,
    serviceName:
      serviceName ||
      decodeURIComponent(parsedUrl?.pathname.replace(/^\/+/, '') || '') ||
      undefined,
    url,
    source: hasAnyEnv([
      'ORACLE_CONNECTION',
      'HERAQ_ORACLE_URL',
      'HERAQ_ORACLE_CONNECTION_STRING',
      'ORACLE_URL',
      'HERAQ_ORACLE_HOST',
      'HERAQ_ORACLE_PORT',
      'HERAQ_ORACLE_USER',
      'HERAQ_ORACLE_USERNAME',
      'HERAQ_ORACLE_PASSWORD',
      'HERAQ_ORACLE_SERVICE_NAME',
      'ORACLE_HOST',
      'ORACLE_PORT',
      'ORACLE_USER',
      'ORACLE_USERNAME',
      'ORACLE_PASSWORD',
      'ORACLE_SERVICE_NAME',
    ])
      ? 'env'
      : undefined,
  };
}

export function hasOracleLiveConnection() {
  const config = getOracleLiveConnection();

  return Boolean(
    config.url ||
      (config.host &&
        config.port &&
        config.username &&
        config.password &&
        config.serviceName)
  );
}
