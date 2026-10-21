import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MigrateTabViewRouteNames1740477873008 } from '~/core/persist/migration/versions/MigrateTabViewRouteNames1740477873008';
import { TabViewType } from '~/core/types/entities/tab-view.entity';

const getAll = vi.fn();
const replaceAll = vi.fn();

vi.mock('~/core/persist/migration/platformOps', () => ({
  getPlatformOps: () => ({ getAll, replaceAll }),
}));

interface PersistedTabView {
  id: string;
  type: TabViewType;
  routeName: string;
}

const makeTab = (
  id: string,
  type: TabViewType,
  routeName: string
): PersistedTabView => ({ id, type, routeName });

/** Returns the rows handed to replaceAll on its first (and only) call. */
const writtenRows = (): PersistedTabView[] => replaceAll.mock.calls[0]![1];

const findRouteName = (rows: PersistedTabView[], id: string) =>
  rows.find(row => row.id === id)?.routeName;

describe('MigrateTabViewRouteNames1740477873008', () => {
  const migration = new MigrateTabViewRouteNames1740477873008();

  beforeEach(() => {
    getAll.mockReset();
    replaceAll.mockReset();
  });

  describe('up', () => {
    it('moves SQL tabs from the shared quick-query page to their own page', async () => {
      getAll.mockResolvedValue([
        makeTab(
          'table',
          TabViewType.TableDetail,
          'workspaceId-connectionId-quick-query-tabViewId'
        ),
        makeTab(
          'table-overview',
          TabViewType.TableOverview,
          'workspaceId-connectionId-quick-query-tabViewId'
        ),
        makeTab(
          'view',
          TabViewType.ViewDetail,
          'workspaceId-connectionId-quick-query-tabViewId'
        ),
        makeTab(
          'view-overview',
          TabViewType.ViewOverview,
          'workspaceId-connectionId-quick-query-tabViewId'
        ),
        makeTab(
          'function',
          TabViewType.FunctionsDetail,
          'workspaceId-connectionId-quick-query-tabViewId'
        ),
        makeTab(
          'function-overview',
          TabViewType.FunctionsOverview,
          'workspaceId-connectionId-quick-query-tabViewId'
        ),
      ]);

      await migration.up();

      const rows = writtenRows();
      expect(findRouteName(rows, 'table')).toBe(
        'workspaceId-connectionId-quick-query-sql-table-tabViewId'
      );
      expect(findRouteName(rows, 'table-overview')).toBe(
        'workspaceId-connectionId-quick-query-sql-table-overview-tabViewId'
      );
      expect(findRouteName(rows, 'view')).toBe(
        'workspaceId-connectionId-quick-query-sql-view-tabViewId'
      );
      expect(findRouteName(rows, 'view-overview')).toBe(
        'workspaceId-connectionId-quick-query-sql-view-overview-tabViewId'
      );
      expect(findRouteName(rows, 'function')).toBe(
        'workspaceId-connectionId-quick-query-sql-function-tabViewId'
      );
      expect(findRouteName(rows, 'function-overview')).toBe(
        'workspaceId-connectionId-quick-query-sql-function-overview-tabViewId'
      );
    });

    it('moves Redis tabs from the shared redis page to their own page', async () => {
      getAll.mockResolvedValue([
        makeTab(
          'browser',
          TabViewType.RedisBrowser,
          'workspaceId-connectionId-redis-tabViewId'
        ),
        makeTab(
          'pubsub',
          TabViewType.RedisPubSub,
          'workspaceId-connectionId-redis-tabViewId'
        ),
        makeTab(
          'group',
          TabViewType.RedisGroupOverview,
          'workspaceId-connectionId-redis-tabViewId'
        ),
      ]);

      await migration.up();

      const rows = writtenRows();
      expect(findRouteName(rows, 'browser')).toBe(
        'workspaceId-connectionId-quick-query-redis-browser-tabViewId'
      );
      expect(findRouteName(rows, 'pubsub')).toBe(
        'workspaceId-connectionId-quick-query-redis-pubsub-tabViewId'
      );
      expect(findRouteName(rows, 'group')).toBe(
        'workspaceId-connectionId-quick-query-redis-group-tabViewId'
      );
    });

    it('moves Mongo tabs from the shared mongodb page to their own page', async () => {
      getAll.mockResolvedValue([
        makeTab(
          'database',
          TabViewType.MongoDatabaseOverview,
          'workspaceId-connectionId-mongodb-tabViewId'
        ),
        makeTab(
          'collection',
          TabViewType.MongoCollectionDetail,
          'workspaceId-connectionId-mongodb-tabViewId'
        ),
      ]);

      await migration.up();

      const rows = writtenRows();
      expect(findRouteName(rows, 'database')).toBe(
        'workspaceId-connectionId-quick-query-mongodb-database-tabViewId'
      );
      expect(findRouteName(rows, 'collection')).toBe(
        'workspaceId-connectionId-quick-query-mongodb-collection-tabViewId'
      );
    });

    it('leaves tabs served by another route untouched', async () => {
      getAll.mockResolvedValue([
        makeTab(
          'sql-file',
          TabViewType.CodeQuery,
          'workspaceId-connectionId-explorer-fileId'
        ),
        makeTab(
          'agent',
          TabViewType.AgentChat,
          'workspaceId-connectionId-agent-tabViewId'
        ),
        makeTab(
          'erd',
          TabViewType.DetailERD,
          'workspaceId-connectionId-erd-tableId'
        ),
        makeTab(
          'table',
          TabViewType.TableDetail,
          'workspaceId-connectionId-quick-query-tabViewId'
        ),
      ]);

      await migration.up();

      const rows = writtenRows();
      expect(findRouteName(rows, 'sql-file')).toBe(
        'workspaceId-connectionId-explorer-fileId'
      );
      expect(findRouteName(rows, 'agent')).toBe(
        'workspaceId-connectionId-agent-tabViewId'
      );
      expect(findRouteName(rows, 'erd')).toBe(
        'workspaceId-connectionId-erd-tableId'
      );
    });

    it('does not write when every tab is already migrated', async () => {
      getAll.mockResolvedValue([
        makeTab(
          'table',
          TabViewType.TableDetail,
          'workspaceId-connectionId-quick-query-sql-table-tabViewId'
        ),
      ]);

      await migration.up();

      expect(replaceAll).not.toHaveBeenCalled();
    });

    it('does not write when there are no tabs at all', async () => {
      getAll.mockResolvedValue([]);

      await migration.up();

      expect(replaceAll).not.toHaveBeenCalled();
    });
  });

  describe('down', () => {
    it('restores the shared pages', async () => {
      getAll.mockResolvedValue([
        makeTab(
          'table',
          TabViewType.TableDetail,
          'workspaceId-connectionId-quick-query-sql-table-tabViewId'
        ),
        makeTab(
          'pubsub',
          TabViewType.RedisPubSub,
          'workspaceId-connectionId-quick-query-redis-pubsub-tabViewId'
        ),
        makeTab(
          'collection',
          TabViewType.MongoCollectionDetail,
          'workspaceId-connectionId-quick-query-mongodb-collection-tabViewId'
        ),
      ]);

      await migration.down();

      const rows = writtenRows();
      expect(findRouteName(rows, 'table')).toBe(
        'workspaceId-connectionId-quick-query-tabViewId'
      );
      expect(findRouteName(rows, 'pubsub')).toBe(
        'workspaceId-connectionId-redis-tabViewId'
      );
      expect(findRouteName(rows, 'collection')).toBe(
        'workspaceId-connectionId-mongodb-tabViewId'
      );
    });
  });
});
