import { ActivityBarItemType } from '../types/entities/activity-bar.entity';
import {
  EConnectionFamily,
  EConnectionMethod,
  EConnectionProviderKind,
  EManagedSqliteProvider,
  type Connection,
} from '../types/entities/connection.entity';
import {
  DatabaseClientType,
  NOSQL_DATABASE_CLIENT_TYPES,
  SQL_DATABASE_CLIENT_TYPES,
} from './database-client-type';

export interface ConnectionCapabilityProfile {
  family: EConnectionFamily;
  /** Primary sidebar activities shown for this database type, in order. */
  visibleActivityItems: ActivityBarItemType[];
  /** Fallback activity when the active one is not visible for this type. */
  defaultActivityItem: ActivityBarItemType;
  supportsQueryFiles: boolean;
}

type ConnectionContextInput = Pick<
  Connection,
  'type' | 'method' | 'providerKind' | 'managedSqlite'
>;

export const DEFAULT_CONNECTION_CONTEXT = {
  type: DatabaseClientType.POSTGRES,
  method: EConnectionMethod.STRING,
};

const { Explorer, Schemas, ErdDiagram, UsersRoles, DatabaseTools, Agent } =
  ActivityBarItemType;

const SQL_PROFILE: ConnectionCapabilityProfile = {
  family: EConnectionFamily.SQL,
  visibleActivityItems: [
    Explorer,
    Schemas,
    ErdDiagram,
    UsersRoles,
    DatabaseTools,
    Agent,
  ],
  defaultActivityItem: Schemas,
  supportsQueryFiles: true,
};

// SQL engines without a users/roles adapter or AI agent support.
const SQL_BASIC_PROFILE: ConnectionCapabilityProfile = {
  ...SQL_PROFILE,
  visibleActivityItems: [Explorer, Schemas, ErdDiagram, DatabaseTools],
};

// Keyed by every DatabaseClientType so adding a type without a profile fails
// the typecheck.
const CONNECTION_CAPABILITY_REGISTRY: Record<
  DatabaseClientType,
  ConnectionCapabilityProfile
> = {
  [DatabaseClientType.POSTGRES]: SQL_PROFILE,
  [DatabaseClientType.MSSQL]: SQL_PROFILE,
  [DatabaseClientType.SNOWFLAKE]: SQL_PROFILE,
  [DatabaseClientType.ORACLE]: {
    ...SQL_PROFILE,
    visibleActivityItems: [
      Explorer,
      Schemas,
      ErdDiagram,
      UsersRoles,
      DatabaseTools,
    ],
  },
  [DatabaseClientType.MYSQL]: SQL_BASIC_PROFILE,
  [DatabaseClientType.MYSQL2]: SQL_BASIC_PROFILE,
  [DatabaseClientType.MARIADB]: SQL_BASIC_PROFILE,
  [DatabaseClientType.SQLITE3]: SQL_BASIC_PROFILE,
  [DatabaseClientType.BETTER_SQLITE3]: SQL_BASIC_PROFILE,
  [DatabaseClientType.REDIS]: {
    family: EConnectionFamily.REDIS,
    visibleActivityItems: [Explorer, Schemas, DatabaseTools],
    defaultActivityItem: Schemas,
    supportsQueryFiles: true,
  },
  [DatabaseClientType.MONGODB]: {
    family: EConnectionFamily.MONGODB,
    visibleActivityItems: [Schemas, DatabaseTools],
    defaultActivityItem: Schemas,
    supportsQueryFiles: false,
  },
};

export function resolveConnectionProviderKind(
  input: ConnectionContextInput
): EConnectionProviderKind {
  if (input.providerKind) {
    return input.providerKind;
  }

  if (input.type === DatabaseClientType.SQLITE3) {
    if (
      input.managedSqlite?.provider === EManagedSqliteProvider.CLOUDFLARE_D1
    ) {
      return EConnectionProviderKind.CLOUDFLARE_D1;
    }

    if (input.managedSqlite?.provider === EManagedSqliteProvider.TURSO) {
      return EConnectionProviderKind.TURSO;
    }

    if (input.method === EConnectionMethod.FILE) {
      return EConnectionProviderKind.SQLITE_FILE;
    }
  }

  if (input.type === DatabaseClientType.REDIS) {
    return EConnectionProviderKind.REDIS_DIRECT;
  }

  if (input.type === DatabaseClientType.MONGODB) {
    return EConnectionProviderKind.MONGODB_DIRECT;
  }

  return EConnectionProviderKind.DIRECT_SQL;
}

export function resolveConnectionFamily(
  input: ConnectionContextInput
): EConnectionFamily {
  const providerKind = resolveConnectionProviderKind(input);

  if (providerKind === EConnectionProviderKind.REDIS_DIRECT) {
    return EConnectionFamily.REDIS;
  }

  if (providerKind === EConnectionProviderKind.MONGODB_DIRECT) {
    return EConnectionFamily.MONGODB;
  }

  if (input.type === DatabaseClientType.MONGODB) {
    return EConnectionFamily.MONGODB;
  }

  if (NOSQL_DATABASE_CLIENT_TYPES.includes(input.type as never)) {
    return EConnectionFamily.REDIS;
  }

  if (SQL_DATABASE_CLIENT_TYPES.includes(input.type as never)) {
    return EConnectionFamily.SQL;
  }

  return EConnectionFamily.SQL;
}

/**
 * Capability profile for a connection's database type. Falls back to the
 * PostgreSQL profile when no connection is selected or the type is unknown.
 */
export function getConnectionCapabilityProfile(
  input?: Pick<Connection, 'type'> | null
): ConnectionCapabilityProfile {
  const type = (input?.type ??
    DEFAULT_CONNECTION_CONTEXT.type) as DatabaseClientType;

  return (
    CONNECTION_CAPABILITY_REGISTRY[type] ??
    CONNECTION_CAPABILITY_REGISTRY[DEFAULT_CONNECTION_CONTEXT.type]
  );
}

export function isSqlFamilyConnection(input: ConnectionContextInput) {
  return resolveConnectionFamily(input) === EConnectionFamily.SQL;
}
