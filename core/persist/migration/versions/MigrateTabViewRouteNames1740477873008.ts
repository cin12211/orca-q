import { TabViewType } from '~/core/types/entities/tab-view.entity';
import { Migration } from '../MigrationInterface';
import { getPlatformOps } from '../platformOps';

/**
 * Persisted tab records store the page they navigate to. Quick Query used to
 * serve every SQL tab type from one page, plus one page per NoSQL driver; each
 * tab type now has its own page.
 *
 * The route names below are frozen snapshots of that rename. They intentionally
 * do not read the live route map so a later page split cannot change what this
 * migration does to already-migrated data.
 */
const LEGACY_ROUTE_NAMES = new Set([
  'workspaceId-connectionId-quick-query-tabViewId',
  'workspaceId-connectionId-redis-tabViewId',
  'workspaceId-connectionId-mongodb-tabViewId',
]);

const LEGACY_ROUTE_NAME_BY_TAB_TYPE: Partial<Record<TabViewType, string>> = {
  [TabViewType.TableDetail]: 'workspaceId-connectionId-quick-query-tabViewId',
  [TabViewType.TableOverview]: 'workspaceId-connectionId-quick-query-tabViewId',
  [TabViewType.ViewDetail]: 'workspaceId-connectionId-quick-query-tabViewId',
  [TabViewType.ViewOverview]: 'workspaceId-connectionId-quick-query-tabViewId',
  [TabViewType.FunctionsDetail]:
    'workspaceId-connectionId-quick-query-tabViewId',
  [TabViewType.FunctionsOverview]:
    'workspaceId-connectionId-quick-query-tabViewId',
  [TabViewType.RedisBrowser]: 'workspaceId-connectionId-redis-tabViewId',
  [TabViewType.RedisPubSub]: 'workspaceId-connectionId-redis-tabViewId',
  [TabViewType.RedisGroupOverview]: 'workspaceId-connectionId-redis-tabViewId',
  [TabViewType.MongoDatabaseOverview]:
    'workspaceId-connectionId-mongodb-tabViewId',
  [TabViewType.MongoCollectionDetail]:
    'workspaceId-connectionId-mongodb-tabViewId',
};

const ROUTE_NAME_BY_TAB_TYPE: Partial<Record<TabViewType, string>> = {
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

const MIGRATED_ROUTE_NAMES = new Set(Object.values(ROUTE_NAME_BY_TAB_TYPE));

type PersistedTabView = {
  id: string;
  type?: TabViewType;
  routeName?: string;
} & Record<string, unknown>;

export class MigrateTabViewRouteNames1740477873008 extends Migration {
  readonly name = 'MigrateTabViewRouteNames1740477873008';

  public async up(): Promise<void> {
    await this.rewriteRouteNames({
      from: LEGACY_ROUTE_NAMES,
      to: ROUTE_NAME_BY_TAB_TYPE,
    });
  }

  public async down(): Promise<void> {
    await this.rewriteRouteNames({
      from: MIGRATED_ROUTE_NAMES,
      to: LEGACY_ROUTE_NAME_BY_TAB_TYPE,
    });
  }

  /**
   * Rewrites `routeName` for tabs whose current route is in `from` and whose
   * type has an entry in `to`. Tabs routed through another page (for example
   * `CodeQuery`, served by the explorer route) are left untouched.
   */
  private async rewriteRouteNames(params: {
    from: Set<string>;
    to: Partial<Record<TabViewType, string>>;
  }): Promise<void> {
    const { getAll, replaceAll } = getPlatformOps();
    const docs = await getAll<PersistedTabView>('tabViews');

    let hasChanges = false;

    const migrated = docs.map(doc => {
      const nextRouteName = doc.type ? params.to[doc.type] : undefined;

      if (
        !nextRouteName ||
        !doc.routeName ||
        !params.from.has(doc.routeName) ||
        doc.routeName === nextRouteName
      ) {
        return doc;
      }

      hasChanges = true;
      return { ...doc, routeName: nextRouteName };
    });

    // Idempotent: a second run finds nothing to rewrite and skips the write.
    if (!hasChanges) {
      return;
    }

    await replaceAll('tabViews', migrated);
  }
}
