import { DatabaseClientType } from '../constants';
import {
  resolveConnectionFamily,
  resolveConnectionProviderKind,
} from '../constants/connection-capabilities';
import {
  EConnectionFamily,
  EConnectionMethod,
  EConnectionProviderKind,
  EManagedSqliteProvider,
} from '../types/entities/connection.entity';

export interface ParsedConnection {
  type: DatabaseClientType;
  providerKind: EConnectionProviderKind;
  family: EConnectionFamily;
  host: string;
  port: number;
  username?: string;
  password?: string;
  database?: string;
  /** Remaining query-string / URI options as key-value pairs */
  options: Record<string, string>;
  /** Original connection string (password masked) */
  masked: string;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const DEFAULT_PORTS: Partial<Record<DatabaseClientType, number>> = {
  [DatabaseClientType.POSTGRES]: 5432,
  [DatabaseClientType.MYSQL]: 3306,
  [DatabaseClientType.MARIADB]: 3306,
  [DatabaseClientType.MYSQL2]: 3306,
  [DatabaseClientType.REDIS]: 6379,
  [DatabaseClientType.MSSQL]: 1433,
  [DatabaseClientType.ORACLE]: 1521,
  [DatabaseClientType.BETTER_SQLITE3]: 0, // No port for SQLite
  [DatabaseClientType.SQLITE3]: 0,
  [DatabaseClientType.SNOWFLAKE]: 443,
};

function parseQueryString(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw) return out;
  for (const pair of raw.split('&')) {
    const idx = pair.indexOf('=');
    if (idx === -1) {
      out[decodeURIComponent(pair)] = '';
    } else {
      out[decodeURIComponent(pair.slice(0, idx))] = decodeURIComponent(
        pair.slice(idx + 1)
      );
    }
  }
  return out;
}

function maskPassword(connStr: string, password?: string): string {
  if (!password) return connStr;
  return connStr.replace(password, '****');
}

// ─────────────────────────────────────────────
// URI-based parsers  (PostgreSQL · MySQL · Redis)
// ─────────────────────────────────────────────

/**
 * Parses URI-style connection strings:
 *   scheme://[user[:password]@]host[:port][/database][?options]
 *
 * Handles postgres aliases, mysql2, rediss, etc.
 */
function parseUri(
  raw: string,
  type: DatabaseClientType,
  providerKindHint?: EConnectionProviderKind
): ParsedConnection {
  // Normalise to a URL the built-in parser can handle
  const url = new URL(raw);

  const username = url.username ? decodeURIComponent(url.username) : undefined;
  const password = url.password ? decodeURIComponent(url.password) : undefined;

  const rawHost = url.hostname || 'localhost';
  const host = rawHost.split(',')[0].trim();

  const port = url.port ? parseInt(url.port, 10) : (DEFAULT_PORTS[type] ?? 0);

  // Strip leading slash
  const database =
    url.pathname && url.pathname !== '/'
      ? decodeURIComponent(url.pathname.slice(1).split('/')[0])
      : undefined;

  const options = parseQueryString(url.search.slice(1));
  const providerKind = resolveConnectionProviderKind({
    type,
    method: providerKindHint
      ? EConnectionMethod.MANAGED
      : EConnectionMethod.STRING,
    providerKind: providerKindHint,
    managedSqlite:
      providerKindHint === EConnectionProviderKind.TURSO
        ? { provider: EManagedSqliteProvider.TURSO }
        : undefined,
  });
  const family = resolveConnectionFamily({
    type,
    method: providerKindHint
      ? EConnectionMethod.MANAGED
      : EConnectionMethod.STRING,
    providerKind,
    managedSqlite:
      providerKind === EConnectionProviderKind.TURSO
        ? { provider: EManagedSqliteProvider.TURSO }
        : undefined,
  });

  return {
    type,
    providerKind,
    family,
    host,
    port,
    username,
    password,
    database,
    options,
    masked: maskPassword(raw, password),
  };
}

// ─────────────────────────────────────────────
// SQL Server – ADO.NET key=value format
// ─────────────────────────────────────────────

/**
 * Parses SQL Server / ADO.NET connection strings:
 *   Server=host,port;Database=db;User Id=user;Password=pass;...
 */
function parseSqlServer(raw: string): ParsedConnection {
  const pairs: Record<string, string> = {};

  // Split on semicolons that are NOT inside a value
  const segments = raw
    .split(';')
    .map(s => s.trim())
    .filter(Boolean);
  for (const seg of segments) {
    const idx = seg.indexOf('=');
    if (idx === -1) continue;
    const key = seg.slice(0, idx).trim().toLowerCase();
    const value = seg.slice(idx + 1).trim();
    pairs[key] = value;
  }

  // Resolve aliases for the server/host key
  const serverRaw =
    pairs['server'] ??
    pairs['data source'] ??
    pairs['datasource'] ??
    pairs['address'] ??
    pairs['addr'] ??
    pairs['network address'] ??
    'localhost';

  // SQL Server supports  host\INSTANCE  or  host,port
  let host = serverRaw;
  let port = DEFAULT_PORTS[DatabaseClientType.MSSQL] ?? 1433;

  const commaIdx = serverRaw.lastIndexOf(',');
  if (commaIdx !== -1) {
    host = serverRaw.slice(0, commaIdx).trim();
    port = parseInt(serverRaw.slice(commaIdx + 1).trim(), 10) || port;
  }

  // Strip optional tcp: prefix
  host = host.replace(/^tcp:/i, '').trim();

  const database =
    pairs['database'] ??
    pairs['initial catalog'] ??
    pairs['initialcatalog'] ??
    undefined;

  const username =
    pairs['user id'] ??
    pairs['userid'] ??
    pairs['uid'] ??
    pairs['user'] ??
    undefined;

  const password = pairs['password'] ?? pairs['pwd'] ?? undefined;

  // Everything else goes into options
  const knownKeys = new Set([
    'server',
    'data source',
    'datasource',
    'address',
    'addr',
    'network address',
    'database',
    'initial catalog',
    'initialcatalog',
    'user id',
    'userid',
    'uid',
    'user',
    'password',
    'pwd',
  ]);
  const options: Record<string, string> = {};
  for (const [k, v] of Object.entries(pairs)) {
    if (!knownKeys.has(k)) options[k] = v;
  }

  const providerKind = EConnectionProviderKind.DIRECT_SQL;

  return {
    type: DatabaseClientType.MSSQL,
    providerKind,
    family: EConnectionFamily.SQL,
    host,
    port,
    username,
    password,
    database,
    options,
    masked: maskPassword(raw, password),
  };
}

// ─────────────────────────────────────────────
// Scheme → DbType map
// ─────────────────────────────────────────────

const SCHEME_MAP: Record<
  string,
  { type: DatabaseClientType; providerKind?: EConnectionProviderKind }
> = {
  postgresql: {
    type: DatabaseClientType.POSTGRES,
    providerKind: EConnectionProviderKind.DIRECT_SQL,
  },
  postgres: {
    type: DatabaseClientType.POSTGRES,
    providerKind: EConnectionProviderKind.DIRECT_SQL,
  },
  pg: {
    type: DatabaseClientType.POSTGRES,
    providerKind: EConnectionProviderKind.DIRECT_SQL,
  },
  mysql: {
    type: DatabaseClientType.MYSQL,
    providerKind: EConnectionProviderKind.DIRECT_SQL,
  },
  mysql2: {
    type: DatabaseClientType.MYSQL,
    providerKind: EConnectionProviderKind.DIRECT_SQL,
  },
  mariadb: {
    type: DatabaseClientType.MARIADB,
    providerKind: EConnectionProviderKind.DIRECT_SQL,
  },
  oracle: {
    type: DatabaseClientType.ORACLE,
    providerKind: EConnectionProviderKind.DIRECT_SQL,
  },
  oracledb: {
    type: DatabaseClientType.ORACLE,
    providerKind: EConnectionProviderKind.DIRECT_SQL,
  },
  redis: {
    type: DatabaseClientType.REDIS,
    providerKind: EConnectionProviderKind.REDIS_DIRECT,
  },
  rediss: {
    type: DatabaseClientType.REDIS,
    providerKind: EConnectionProviderKind.REDIS_DIRECT,
  },
  redis6: {
    type: DatabaseClientType.REDIS,
    providerKind: EConnectionProviderKind.REDIS_DIRECT,
  },
  snowflake: {
    type: DatabaseClientType.SNOWFLAKE,
    providerKind: EConnectionProviderKind.DIRECT_SQL,
  },
  libsql: {
    type: DatabaseClientType.SQLITE3,
    providerKind: EConnectionProviderKind.TURSO,
  },
};

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

/**
 * Detects and parses a connection string for:
 * PostgreSQL · MySQL · Redis · SQL Server
 *
 * @param connectionString - The raw connection string
 * @returns A structured {@link ParsedConnection} object
 * @throws {Error} When the format cannot be detected or is invalid
 *
 * @example
 * parseConnectionString("postgresql://admin:secret@localhost:5432/mydb")
 * parseConnectionString("Server=localhost,1433;Database=shop;User Id=sa;Password=pass;")
 */
export function parseConnectionString(
  connectionString: string
): ParsedConnection {
  const raw = connectionString.trim();
  if (!raw) throw new Error('Connection string must not be empty.');

  // ── URI-style (has a scheme) ───────────────────────────────────────────────
  const schemeMatch = raw.match(/^([a-z][a-z0-9+\-.]*):/i);
  if (schemeMatch) {
    const scheme = schemeMatch[1].toLowerCase();
    const resolution = SCHEME_MAP[scheme];
    if (!resolution) {
      throw new Error(
        `Unsupported scheme "${scheme}". ` +
          `Supported: ${Object.keys(SCHEME_MAP).join(', ')}.`
      );
    }
    return parseUri(raw, resolution.type, resolution.providerKind);
  }

  // ── ADO.NET / key=value style → SQL Server ─────────────────────────────────
  if (/\b(server|data\s+source|datasource|initial\s+catalog)\s*=/i.test(raw)) {
    return parseSqlServer(raw);
  }

  throw new Error(
    'Unable to detect database type. ' +
      'Provide a URI (scheme://…) or a SQL Server key=value string.'
  );
}
