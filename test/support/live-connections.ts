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

function readEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
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
    url: readEnv('TURSO_DATABASE_URL') ?? readEnv('TURSO_URL'),
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
