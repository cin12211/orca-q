import type { RoutesNamesList } from '@typed-router/__routes';
import { TabViewType } from '../types/entities/tab-view.entity';

/**
 * Single source of truth mapping a tab type to the page that renders it.
 *
 * Only tab types served by a dedicated `[tabViewId]` page belong here. Types
 * routed through another param (for example `CodeQuery`, which lives under the
 * explorer `fileId` route) keep the route name stored on the tab record.
 */
export const TAB_VIEW_ROUTE_NAMES: Partial<
  Record<TabViewType, RoutesNamesList>
> = {
  [TabViewType.AgentChat]: 'workspaceId-connectionId-agent-tabViewId',

  [TabViewType.TableDetail]:
    'workspaceId-connectionId-quick-query-sql-table-tabViewId',
  [TabViewType.TableOverview]:
    'workspaceId-connectionId-quick-query-sql-table-overview-tabViewId',
  [TabViewType.ViewDetail]:
    'workspaceId-connectionId-quick-query-sql-view-tabViewId',
  [TabViewType.ViewOverview]:
    'workspaceId-connectionId-quick-query-sql-view-overview-tabViewId',
  [TabViewType.FunctionsDetail]:
    'workspaceId-connectionId-quick-query-sql-function-tabViewId',
  [TabViewType.FunctionsOverview]:
    'workspaceId-connectionId-quick-query-sql-function-overview-tabViewId',

  [TabViewType.RedisBrowser]:
    'workspaceId-connectionId-quick-query-redis-browser-tabViewId',
  [TabViewType.RedisPubSub]:
    'workspaceId-connectionId-quick-query-redis-pubsub-tabViewId',
  [TabViewType.RedisGroupOverview]:
    'workspaceId-connectionId-quick-query-redis-group-tabViewId',

  [TabViewType.MongoDatabaseOverview]:
    'workspaceId-connectionId-quick-query-mongodb-database-tabViewId',
  [TabViewType.MongoCollectionDetail]:
    'workspaceId-connectionId-quick-query-mongodb-collection-tabViewId',
};

/**
 * Fallback for tab types with no dedicated page. The connection root always
 * exists, so a type added without a route lands somewhere valid instead of on
 * a dead route.
 */
export const DEFAULT_TAB_VIEW_ROUTE_NAME: RoutesNamesList =
  'workspaceId-connectionId';
