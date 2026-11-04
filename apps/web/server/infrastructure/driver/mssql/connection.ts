import type { Knex } from 'knex';
import { parseConnectionString } from '~/core/helpers/parser-connection-string';

export const DEFAULT_MSSQL_PORT = 1433;

/** knex `mssql` connection settings (forwarded to tedious). */
export interface MssqlConnectionSettings {
  host: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  requestTimeout?: number;
  connectionTimeout?: number;
  options: {
    encrypt: boolean;
    trustServerCertificate: boolean;
    instanceName?: string;
    appName: string;
    useUTC: boolean;
    cryptoCredentialsDetails?: { ca?: string; cert?: string; key?: string };
  };
}

interface SslLike {
  rejectUnauthorized?: boolean;
  ca?: string;
  cert?: string;
  key?: string;
}

const URI_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;
const APP_NAME = 'OrcaQ';
// Long-running editor queries should not be cut off by tedious' 15s default.
const REQUEST_TIMEOUT_MS = 0;

const TRUE_VALUES = new Set(['true', 'yes', '1', 'strict', 'mandatory']);
const FALSE_VALUES = new Set(['false', 'no', '0', 'optional', 'disable']);

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;

  const normalized = value.trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;
  return undefined;
}

function pickOption(
  options: Record<string, string>,
  ...keys: string[]
): string | undefined {
  const lowered = Object.fromEntries(
    Object.entries(options).map(([key, value]) => [key.toLowerCase(), value])
  );

  for (const key of keys) {
    if (lowered[key] !== undefined) return lowered[key];
  }

  return undefined;
}

// `host\INSTANCE` names a named instance resolved through SQL Browser.
function splitInstance(host: string): { host: string; instanceName?: string } {
  const index = host.indexOf('\\');
  if (index === -1) return { host };

  return {
    host: host.slice(0, index) || 'localhost',
    instanceName: host.slice(index + 1) || undefined,
  };
}

function buildSettings(args: {
  host: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  options: Record<string, string>;
  ssl?: SslLike;
}): MssqlConnectionSettings {
  const { host, instanceName: hostInstance } = splitInstance(args.host);
  const instanceName =
    pickOption(args.options, 'instancename', 'instance name') || hostInstance;

  // Encryption is on by default (required by Azure SQL). Like the other SQL
  // engines' "require/preferred" modes, an untrusted certificate is accepted
  // unless the connection explicitly asks for verification.
  const encrypt = parseBoolean(pickOption(args.options, 'encrypt')) ?? true;
  const trustServerCertificate =
    parseBoolean(
      pickOption(
        args.options,
        'trustservercertificate',
        'trust server certificate'
      )
    ) ?? (args.ssl ? args.ssl.rejectUnauthorized !== true : true);

  const connectTimeoutSeconds = Number(
    pickOption(
      args.options,
      'connect timeout',
      'connection timeout',
      'connecttimeout'
    )
  );

  const settings: MssqlConnectionSettings = {
    host,
    user: args.user,
    password: args.password,
    database: args.database,
    requestTimeout: REQUEST_TIMEOUT_MS,
    options: {
      encrypt,
      trustServerCertificate,
      appName: APP_NAME,
      useUTC: true,
    },
  };

  if (Number.isFinite(connectTimeoutSeconds) && connectTimeoutSeconds > 0) {
    settings.connectionTimeout = connectTimeoutSeconds * 1000;
  }

  if (instanceName) {
    settings.options.instanceName = instanceName;
  } else {
    settings.port = args.port || DEFAULT_MSSQL_PORT;
  }

  if (args.ssl && (args.ssl.ca || args.ssl.cert || args.ssl.key)) {
    settings.options.cryptoCredentialsDetails = {
      ...(args.ssl.ca ? { ca: args.ssl.ca } : {}),
      ...(args.ssl.cert ? { cert: args.ssl.cert } : {}),
      ...(args.ssl.key ? { key: args.ssl.key } : {}),
    };
  }

  return settings;
}

function fromUri(raw: string): MssqlConnectionSettings {
  const url = new URL(raw);
  const options = Object.fromEntries(url.searchParams.entries());
  const database = url.pathname.replace(/^\/+/, '');

  return buildSettings({
    host: decodeURIComponent(url.hostname || 'localhost'),
    port: url.port ? Number(url.port) : undefined,
    user: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    database: database ? decodeURIComponent(database) : undefined,
    options,
  });
}

function fromAdoNet(raw: string): MssqlConnectionSettings {
  const parsed = parseConnectionString(raw);

  return buildSettings({
    host: parsed.host,
    port: parsed.port,
    user: parsed.username,
    password: parsed.password,
    database: parsed.database,
    options: parsed.options,
  });
}

/**
 * Accepts a `sqlserver://` / `mssql://` URI, an ADO.NET key=value string, or
 * the structured form object, and returns knex `mssql` connection settings.
 */
export function normalizeMssqlConnection(
  connection: string | Knex.Config['connection']
): MssqlConnectionSettings {
  if (typeof connection === 'string') {
    const raw = connection.trim();
    return URI_SCHEME.test(raw) ? fromUri(raw) : fromAdoNet(raw);
  }

  const candidate = (connection || {}) as Record<string, unknown>;

  return buildSettings({
    host: String(candidate.host || candidate.server || 'localhost'),
    port: candidate.port ? Number(candidate.port) : undefined,
    user: (candidate.user ?? candidate.username) as string | undefined,
    password: candidate.password as string | undefined,
    database: candidate.database as string | undefined,
    options: {},
    ssl: candidate.ssl as SslLike | undefined,
  });
}

/**
 * Rewrites an ADO.NET string as a `sqlserver://` URI so URI-based helpers
 * (SSH tunnelling) can rewrite host and port. URIs are returned unchanged.
 */
export function toMssqlUri(connection: string): string {
  const raw = connection.trim();
  if (URI_SCHEME.test(raw)) return raw;

  const parsed = parseConnectionString(raw);
  const { host, instanceName } = splitInstance(parsed.host);
  const url = new URL('sqlserver://localhost');
  url.hostname = host;
  if (instanceName) url.searchParams.set('instanceName', instanceName);
  url.port = String(parsed.port || DEFAULT_MSSQL_PORT);
  if (parsed.username) url.username = encodeURIComponent(parsed.username);
  if (parsed.password) url.password = encodeURIComponent(parsed.password);
  if (parsed.database) url.pathname = `/${encodeURIComponent(parsed.database)}`;

  for (const [key, value] of Object.entries(parsed.options)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}
