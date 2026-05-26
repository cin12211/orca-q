import { createError } from 'h3';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type { ISSLConfig } from '~/core/types/entities/connection.entity';
import { createSshTunnel } from '~/server/utils/ssh-tunnel';
import { createTableAdapter } from '../../../adapters/tables';
import type {
  ExportJobParams,
  NativeBackupConnectionParams,
  ResolvedCliConnection,
  TempSslFiles,
} from './types';

const DEFAULT_PORTS: Partial<Record<DatabaseClientType, number>> = {
  [DatabaseClientType.POSTGRES]: 5432,
  [DatabaseClientType.MYSQL]: 3306,
  [DatabaseClientType.MARIADB]: 3306,
  [DatabaseClientType.SQLITE3]: 0,
};

function getDefaultPort(type: DatabaseClientType) {
  return DEFAULT_PORTS[type] ?? 5432;
}

export function resolveDatabaseName(params: NativeBackupConnectionParams) {
  return (
    params.databaseName ||
    params.database ||
    params.serviceName ||
    params.username ||
    (params.filePath ? basename(params.filePath) : '') ||
    'database'
  );
}

function parseConnectionString(
  connectionString: string,
  type: DatabaseClientType
) {
  if (!connectionString) {
    return {};
  }

  const url = new URL(connectionString);
  const pathname = url.pathname.replace(/^\/+/, '');

  return {
    host: url.hostname,
    port: parseInt(url.port || `${getDefaultPort(type)}`, 10),
    username: decodeURIComponent(url.username || ''),
    password: decodeURIComponent(url.password || ''),
    database: pathname,
  };
}

async function writeSslFiles(tempDir: string, ssl?: ISSLConfig) {
  if (!ssl?.mode || ssl.mode === 'disable') {
    return undefined;
  }

  const sslDir = join(tempDir, 'ssl');
  const files: TempSslFiles = {};

  await mkdir(sslDir, { recursive: true });

  if (ssl.ca) {
    files.caPath = join(sslDir, 'ca.pem');
  }

  if (ssl.cert) {
    files.certPath = join(sslDir, 'client-cert.pem');
  }

  if (ssl.key) {
    files.keyPath = join(sslDir, 'client-key.pem');
  }

  await Promise.all(
    [
      files.caPath ? writeFile(files.caPath, ssl.ca || '', 'utf8') : undefined,
      files.certPath
        ? writeFile(files.certPath, ssl.cert || '', 'utf8')
        : undefined,
      files.keyPath
        ? writeFile(files.keyPath, ssl.key || '', 'utf8')
        : undefined,
    ].filter(Boolean) as Promise<unknown>[]
  );

  return files;
}

export async function resolveCliConnection(
  params: NativeBackupConnectionParams,
  tempDir: string
): Promise<ResolvedCliConnection> {
  const type = params.type;

  if (!type) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Database type is required for native backup jobs.',
    });
  }

  if (type === DatabaseClientType.SQLITE3) {
    if (!params.filePath) {
      throw createError({
        statusCode: 400,
        statusMessage: 'SQLite native backup requires a file path.',
      });
    }

    return {
      filePath: params.filePath,
    };
  }

  const fromUrl = parseConnectionString(params.dbConnectionString, type);
  const host = params.host || fromUrl.host;
  const port = parseInt(
    params.port || `${fromUrl.port || getDefaultPort(type)}`,
    10
  );
  const username = params.username || fromUrl.username;
  const password = params.password || fromUrl.password;
  const database = params.serviceName || params.database || fromUrl.database;

  if (!host) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Host is required for native backup jobs.',
    });
  }

  let finalHost = host;
  let finalPort = port;
  let closeTunnel: (() => Promise<void>) | undefined;

  if (params.ssh?.enabled) {
    const tunnel = await createSshTunnel(params.ssh, host, port);
    finalHost = tunnel.localHost;
    finalPort = tunnel.localPort;
    closeTunnel = tunnel.close;
  }

  return {
    host: finalHost,
    port: finalPort,
    username,
    password,
    database,
    ssl: params.ssl,
    sslFiles: await writeSslFiles(tempDir, params.ssl),
    closeTunnel,
  };
}

function parseHumanBytes(value?: string | number | null) {
  if (typeof value === 'number') {
    return value;
  }

  if (!value) {
    return null;
  }

  const match = value.trim().match(/^([\d.]+)\s*([KMGT]?B)$/i);

  if (!match) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const numericValue = Number(match[1]);
  const unit = match[2].toUpperCase();
  const multiplier =
    {
      B: 1,
      KB: 1024,
      MB: 1024 ** 2,
      GB: 1024 ** 3,
      TB: 1024 ** 4,
    }[unit] || 1;

  return Math.round(numericValue * multiplier);
}

function resolveDefaultSchemas(
  type: DatabaseClientType,
  params: NativeBackupConnectionParams
) {
  switch (type) {
    case DatabaseClientType.POSTGRES:
      return ['public'];
    case DatabaseClientType.MYSQL:
    case DatabaseClientType.MARIADB:
      return [params.database || resolveDatabaseName(params)];
    default:
      return [];
  }
}

export async function estimateExportBytes(params: ExportJobParams) {
  if (!params.type) {
    return undefined;
  }

  if (params.type === DatabaseClientType.SQLITE3 && params.filePath) {
    try {
      const fileStat = await stat(params.filePath);
      return fileStat.size;
    } catch {
      return undefined;
    }
  }

  try {
    const tableAdapter = await createTableAdapter(params.type, params);
    const schemas =
      params.options.schemas?.length &&
      params.type === DatabaseClientType.POSTGRES
        ? params.options.schemas
        : resolveDefaultSchemas(params.type, params);

    let totalBytes = 0;

    for (const schema of schemas) {
      const tables = await tableAdapter.getOverviewTables(schema);

      tables.forEach(table => {
        totalBytes += parseHumanBytes(table.total_size) || 0;
      });
    }

    return totalBytes || undefined;
  } catch {
    return undefined;
  }
}

function getMysqlSslMode(mode?: ISSLConfig['mode']) {
  switch (mode) {
    case 'preferred':
      return 'PREFERRED';
    case 'require':
      return 'REQUIRED';
    case 'verify-ca':
      return 'VERIFY_CA';
    case 'verify-full':
      return 'VERIFY_IDENTITY';
    default:
      return undefined;
  }
}

export function buildPostgresEnv(connection: ResolvedCliConnection) {
  return {
    ...process.env,
    ...(connection.password ? { PGPASSWORD: connection.password } : {}),
    ...(connection.ssl?.mode && connection.ssl.mode !== 'disable'
      ? { PGSSLMODE: connection.ssl.mode }
      : {}),
    ...(connection.sslFiles?.caPath
      ? { PGSSLROOTCERT: connection.sslFiles.caPath }
      : {}),
    ...(connection.sslFiles?.certPath
      ? { PGSSLCERT: connection.sslFiles.certPath }
      : {}),
    ...(connection.sslFiles?.keyPath
      ? { PGSSLKEY: connection.sslFiles.keyPath }
      : {}),
  };
}

export function buildMysqlEnv(connection: ResolvedCliConnection) {
  return {
    ...process.env,
    ...(connection.password ? { MYSQL_PWD: connection.password } : {}),
  };
}

export function appendMysqlSslArgs(
  args: string[],
  connection: ResolvedCliConnection
) {
  const sslMode = getMysqlSslMode(connection.ssl?.mode);

  if (sslMode) {
    args.push(`--ssl-mode=${sslMode}`);
  }

  if (connection.sslFiles?.caPath) {
    args.push(`--ssl-ca=${connection.sslFiles.caPath}`);
  }

  if (connection.sslFiles?.certPath) {
    args.push(`--ssl-cert=${connection.sslFiles.certPath}`);
  }

  if (connection.sslFiles?.keyPath) {
    args.push(`--ssl-key=${connection.sslFiles.keyPath}`);
  }
}

export function toDbProgress(
  bytesProcessed: number,
  bytesTotal?: number,
  min = 15,
  max = 90
) {
  if (!bytesTotal || bytesTotal <= 0) {
    return null;
  }

  const ratio = Math.max(0, Math.min(bytesProcessed / bytesTotal, 1));
  return Math.round(min + ratio * (max - min));
}
