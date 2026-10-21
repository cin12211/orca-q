import { describe, expect, it } from 'vitest';
import { resolveRouteNameForTabType } from '~/core/composables/useTabManagement';
import { TabViewType } from '~/core/stores/useTabViewsStore';

describe('resolveRouteNameForTabType', () => {
  it('routes each SQL tab type to its own quick-query page', () => {
    expect(resolveRouteNameForTabType(TabViewType.TableDetail)).toBe(
      'workspaceId-connectionId-quick-query-sql-table-tabViewId'
    );
    expect(resolveRouteNameForTabType(TabViewType.TableOverview)).toBe(
      'workspaceId-connectionId-quick-query-sql-table-overview-tabViewId'
    );
    expect(resolveRouteNameForTabType(TabViewType.ViewDetail)).toBe(
      'workspaceId-connectionId-quick-query-sql-view-tabViewId'
    );
    expect(resolveRouteNameForTabType(TabViewType.ViewOverview)).toBe(
      'workspaceId-connectionId-quick-query-sql-view-overview-tabViewId'
    );
    expect(resolveRouteNameForTabType(TabViewType.FunctionsDetail)).toBe(
      'workspaceId-connectionId-quick-query-sql-function-tabViewId'
    );
    expect(resolveRouteNameForTabType(TabViewType.FunctionsOverview)).toBe(
      'workspaceId-connectionId-quick-query-sql-function-overview-tabViewId'
    );
  });

  it('routes each Redis tab type to its own quick-query page', () => {
    expect(resolveRouteNameForTabType(TabViewType.RedisBrowser)).toBe(
      'workspaceId-connectionId-quick-query-redis-browser-tabViewId'
    );
    expect(resolveRouteNameForTabType(TabViewType.RedisPubSub)).toBe(
      'workspaceId-connectionId-quick-query-redis-pubsub-tabViewId'
    );
    expect(resolveRouteNameForTabType(TabViewType.RedisGroupOverview)).toBe(
      'workspaceId-connectionId-quick-query-redis-group-tabViewId'
    );
  });

  it('routes each Mongo tab type to its own quick-query page', () => {
    expect(resolveRouteNameForTabType(TabViewType.MongoDatabaseOverview)).toBe(
      'workspaceId-connectionId-quick-query-mongodb-database-tabViewId'
    );
    expect(resolveRouteNameForTabType(TabViewType.MongoCollectionDetail)).toBe(
      'workspaceId-connectionId-quick-query-mongodb-collection-tabViewId'
    );
  });

  it('keeps the agent tab type on its existing route family', () => {
    expect(resolveRouteNameForTabType(TabViewType.AgentChat)).toBe(
      'workspaceId-connectionId-agent-tabViewId'
    );
  });

  it('falls back to the connection root for unmapped tab types', () => {
    expect(resolveRouteNameForTabType(TabViewType.Export)).toBe(
      'workspaceId-connectionId'
    );
  });
});
