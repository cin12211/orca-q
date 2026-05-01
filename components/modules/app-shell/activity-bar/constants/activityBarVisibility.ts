import type { ConnectionActivityItem } from '~/core/constants/connection-capabilities';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { ActivityBarItemType } from '~/core/stores/useActivityBarStore';
import { EConnectionMethod } from '~/core/types/entities/connection.entity';

export const BASE_ACTIVITY_ITEMS = [
  {
    id: ActivityBarItemType.Explorer,
    title: 'Explorer',
    icon: 'hugeicons:folder-file-storage',
  },
  {
    id: ActivityBarItemType.Schemas,
    title: 'Schemas',
    icon: 'hugeicons:database',
  },
  {
    id: ActivityBarItemType.ErdDiagram,
    title: 'ErdDiagram',
    icon: 'hugeicons:hierarchy-square-02',
  },
  {
    id: ActivityBarItemType.UsersRoles,
    title: 'Users & Roles',
    icon: 'hugeicons:user-shield-01',
  },
  {
    id: ActivityBarItemType.DatabaseTools,
    title: 'Database Tools',
    icon: 'hugeicons:block-game',
  },
  {
    id: ActivityBarItemType.Agent,
    title: 'AI Agent',
    icon: 'hugeicons:robotic',
  },
] as const;

export const ACTIVITY_ITEM_MAP: Record<
  ConnectionActivityItem,
  ActivityBarItemType
> = {
  Explorer: ActivityBarItemType.Explorer,
  Schemas: ActivityBarItemType.Schemas,
  ERDiagram: ActivityBarItemType.ErdDiagram,
  UsersRoles: ActivityBarItemType.UsersRoles,
  DatabaseTools: ActivityBarItemType.DatabaseTools,
  Agent: ActivityBarItemType.Agent,
};

export const DEFAULT_CONNECTION_CONTEXT = {
  type: DatabaseClientType.POSTGRES,
  method: EConnectionMethod.STRING,
};

export const AGENT_HIDDEN_CONNECTION_TYPES = new Set<DatabaseClientType>([
  DatabaseClientType.MYSQL,
  DatabaseClientType.MYSQL2,
  DatabaseClientType.MARIADB,
  DatabaseClientType.ORACLE,
  DatabaseClientType.SQLITE3,
  DatabaseClientType.BETTER_SQLITE3,
  DatabaseClientType.REDIS,
]);

export const USERS_ROLES_HIDDEN_CONNECTION_TYPES = new Set<DatabaseClientType>([
  DatabaseClientType.SQLITE3,
  DatabaseClientType.BETTER_SQLITE3,
  DatabaseClientType.REDIS,
]);
