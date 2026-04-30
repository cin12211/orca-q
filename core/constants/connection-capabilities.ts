import {
  EConnectionFamily,
  EConnectionMethod,
  EConnectionProviderKind,
  EManagedSqliteProvider,
  type Connection,
} from '../types/entities/connection.entity';
import { TabViewType } from '../types/entities/tab-view.entity';
import {
  DatabaseClientType,
  NOSQL_DATABASE_CLIENT_TYPES,
  SQL_DATABASE_CLIENT_TYPES,
} from './database-client-type';

export type ConnectionActivityItem =
  | 'Explorer'
  | 'Schemas'
  | 'ERDiagram'
  | 'UsersRoles'
  | 'DatabaseTools'
  | 'Agent';

export type ConnectionPrimaryQuerySurface = 'sql-editor' | 'raw-query';

export interface ConnectionCapabilityProfile {
  family: EConnectionFamily;
  visibleActivityItems: ConnectionActivityItem[];
  allowedTabTypes: TabViewType[];
  defaultActivityItem: ConnectionActivityItem;
  primaryQuerySurface: ConnectionPrimaryQuerySurface;
  supportsRawSql: boolean;
  supportsQueryFiles: boolean;
  supportsSchemaTree: boolean;
  supportsErd: boolean;
  supportsUsersRoles: boolean;
  supportsDatabaseTools: boolean;
  hiddenFeatureReasons: Partial<
    Record<ConnectionActivityItem | TabViewType, string>
  >;
}

type ConnectionContextInput = Pick<
  Connection,
  'type' | 'method' | 'providerKind' | 'managedSqlite'
>;

const SQL_TAB_TYPES = [
  TabViewType.AllERD,
  TabViewType.DetailERD,
  TabViewType.TableOverview,
  TabViewType.TableDetail,
  TabViewType.FunctionsOverview,
  TabViewType.FunctionsDetail,
  TabViewType.ViewOverview,
  TabViewType.ViewDetail,
  TabViewType.CodeQuery,
  TabViewType.UserPermissions,
  TabViewType.DatabaseTools,
  TabViewType.InstanceInsights,
  TabViewType.SchemaDiff,
  TabViewType.Connection,
  TabViewType.Explorer,
  TabViewType.Export,
  TabViewType.AgentChat,
] as const;

const REDIS_TAB_TYPES = [
  TabViewType.CodeQuery,
  TabViewType.Connection,
  TabViewType.Explorer,
  TabViewType.AgentChat,
  TabViewType.RedisBrowser,
  TabViewType.RedisPubSub,
  TabViewType.InstanceInsights,
] as const;

export const CONNECTION_CAPABILITY_REGISTRY: Record<
  EConnectionFamily,
  ConnectionCapabilityProfile
> = {
  [EConnectionFamily.SQL]: {
    family: EConnectionFamily.SQL,
    visibleActivityItems: [
      'Explorer',
      'Schemas',
      'ERDiagram',
      'UsersRoles',
      'DatabaseTools',
      'Agent',
    ],
    allowedTabTypes: [...SQL_TAB_TYPES],
    defaultActivityItem: 'Schemas',
    primaryQuerySurface: 'sql-editor',
    supportsRawSql: true,
    supportsQueryFiles: true,
    supportsSchemaTree: true,
    supportsErd: true,
    supportsUsersRoles: true,
    supportsDatabaseTools: true,
    hiddenFeatureReasons: {
      [TabViewType.RedisBrowser]:
        'Redis tools are only available for Redis connections.',
    },
  },
  [EConnectionFamily.REDIS]: {
    family: EConnectionFamily.REDIS,
    visibleActivityItems: ['Explorer', 'Schemas', 'DatabaseTools', 'Agent'],
    allowedTabTypes: [...REDIS_TAB_TYPES],
    defaultActivityItem: 'Explorer',
    primaryQuerySurface: 'raw-query',
    supportsRawSql: false,
    supportsQueryFiles: true,
    supportsSchemaTree: false,
    supportsErd: false,
    supportsUsersRoles: false,
    supportsDatabaseTools: true,
    hiddenFeatureReasons: {
      Schemas: 'Schema metadata is only available for SQL connections.',
      ERDiagram: 'ER diagrams are only available for SQL connections.',
      UsersRoles: 'Users & Roles is only available for SQL connections.',
    },
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

  return EConnectionProviderKind.DIRECT_SQL;
}

export function resolveConnectionFamily(
  input: ConnectionContextInput
): EConnectionFamily {
  const providerKind = resolveConnectionProviderKind(input);

  if (providerKind === EConnectionProviderKind.REDIS_DIRECT) {
    return EConnectionFamily.REDIS;
  }

  if (NOSQL_DATABASE_CLIENT_TYPES.includes(input.type as never)) {
    return EConnectionFamily.REDIS;
  }

  if (SQL_DATABASE_CLIENT_TYPES.includes(input.type as never)) {
    return EConnectionFamily.SQL;
  }

  return EConnectionFamily.SQL;
}

export function getConnectionCapabilityProfile(
  input: ConnectionContextInput
): ConnectionCapabilityProfile {
  const family = resolveConnectionFamily(input);
  return CONNECTION_CAPABILITY_REGISTRY[family];
}

export function isSqlFamilyConnection(input: ConnectionContextInput) {
  return resolveConnectionFamily(input) === EConnectionFamily.SQL;
}
