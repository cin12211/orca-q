import { describe, expect, it } from 'vitest';
import { resolveRouteNameForTabType } from '~/core/composables/useTabManagement';
import { TabViewType } from '~/core/stores/useTabViewsStore';

describe('resolveRouteNameForTabType', () => {
  it('routes Redis tab types to the Redis page family', () => {
    expect(resolveRouteNameForTabType(TabViewType.RedisBrowser)).toBe(
      'workspaceId-connectionId-redis-tabViewId'
    );
    expect(resolveRouteNameForTabType(TabViewType.RedisPubSub)).toBe(
      'workspaceId-connectionId-redis-tabViewId'
    );
  });

  it('keeps SQL and agent tab types on their existing route families', () => {
    expect(resolveRouteNameForTabType(TabViewType.TableDetail)).toBe(
      'workspaceId-connectionId-quick-query-tabViewId'
    );
    expect(resolveRouteNameForTabType(TabViewType.AgentChat)).toBe(
      'workspaceId-connectionId-agent-tabViewId'
    );
  });
});
