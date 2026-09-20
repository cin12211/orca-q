import { computed, ref, watch, type Ref } from 'vue';
import type { FileNode } from '~/components/base/tree-folder/types';
import {
  useMongoCollectionStats,
  useMongoDatabaseSummary,
  useMongoServerDatabases,
} from '~/components/modules/quick-query/mongodb/hooks';
import type { MongoCollectionInfo } from '~/components/modules/quick-query/mongodb/types';
import type { Connection } from '~/core/stores';
import { TabViewType } from '~/core/types/entities/tab-view.entity';

interface MongoNodeData {
  tabViewType: TabViewType;
  collectionCount?: number;
  size?: number;
  count?: number;
}

type MongoFileNode = FileNode<MongoNodeData>;

interface DatabaseSummary {
  collections: MongoCollectionInfo[];
}

export function useMongoSchemaTreeData(
  connection: Ref<Connection | undefined>,
  search?: Ref<string>
) {
  const {
    databases,
    isLoading: isLoadingDatabases,
    fetchDatabases,
  } = useMongoServerDatabases({ connection });
  const summaryByDatabase = ref<Record<string, DatabaseSummary>>({});
  const statsByDatabase = ref<
    Record<string, Record<string, { size: number; count: number }>>
  >({});
  const isLoadingSummaries = ref(false);

  const isLoading = computed(
    () => isLoadingDatabases.value || isLoadingSummaries.value
  );

  const loadTree = async () => {
    if (!connection.value) {
      summaryByDatabase.value = {};
      statsByDatabase.value = {};
      return;
    }

    // Keep isLoadingSummaries true across both fetch phases so isLoading
    // (isLoadingDatabases || isLoadingSummaries) never drops to false between
    // fetchDatabases finishing and the summaries fetch starting.
    isLoadingSummaries.value = true;

    await fetchDatabases();
    statsByDatabase.value = {};

    const entries = await Promise.all(
      databases.value.map(async databaseName => {
        const { collections, fetchSummary } = useMongoDatabaseSummary({
          connection,
          databaseName: ref(databaseName),
        });
        await fetchSummary();
        return [databaseName, { collections: collections.value }] as const;
      })
    );
    summaryByDatabase.value = Object.fromEntries(entries);
    isLoadingSummaries.value = false;
  };

  /**
   * Fetches per-collection size/count for one database. This runs a
   * `collStats` command per collection server-side, so it's only called for
   * the database the user actually selects — not eagerly for every database
   * like `loadTree` does. Memoized per database name.
   */
  const loadCollectionStats = async (databaseName: string) => {
    if (!connection.value || statsByDatabase.value[databaseName]) {
      return;
    }

    const { collections, fetchStats } = useMongoCollectionStats({
      connection,
      databaseName: ref(databaseName),
    });
    await fetchStats();

    statsByDatabase.value = {
      ...statsByDatabase.value,
      [databaseName]: Object.fromEntries(
        collections.value.map(collection => [
          collection.name,
          { size: collection.size, count: collection.count },
        ])
      ),
    };
  };

  const fileTreeData = computed<Record<string, MongoFileNode>>(() => {
    const nodes: Record<string, MongoFileNode> = {};

    for (const databaseName of databases.value) {
      const summary = summaryByDatabase.value[databaseName];
      const stats = statsByDatabase.value[databaseName];

      nodes[databaseName] = {
        id: databaseName,
        parentId: null,
        name: databaseName,
        type: 'folder',
        depth: 0,
        iconOpen: 'hugeicons:database',
        iconClose: 'hugeicons:database',
        iconClass: 'text-yellow-500',
        children: [],
        data: {
          tabViewType: TabViewType.MongoDatabaseOverview,
          collectionCount: summary?.collections.length ?? 0,
        },
      };

      for (const collection of summary?.collections || []) {
        const nodeId = `${databaseName}.${collection.name}`;
        const collectionStats = stats?.[collection.name];

        nodes[nodeId] = {
          id: nodeId,
          parentId: databaseName,
          name: collection.name,
          type: 'file',
          depth: 1,
          iconOpen: 'hugeicons:files-01',
          iconClose: 'hugeicons:files-01',
          iconClass: 'text-emerald-500',
          data: {
            tabViewType: TabViewType.MongoCollectionDetail,
            size: collectionStats?.size,
            count: collectionStats?.count,
          },
        };
        nodes[databaseName].children!.push(nodeId);
      }
    }

    if (search?.value) {
      const query = search.value.toLowerCase();
      const filtered: Record<string, MongoFileNode> = {};

      for (const databaseName of databases.value) {
        const folder = nodes[databaseName];
        if (!folder) continue;

        const matchingChildren = folder.children?.filter(childId =>
          nodes[childId]?.name.toLowerCase().includes(query)
        );

        if (matchingChildren && matchingChildren.length > 0) {
          filtered[databaseName] = { ...folder, children: matchingChildren };
          matchingChildren.forEach(childId => {
            filtered[childId] = nodes[childId];
          });
        }
      }

      return filtered;
    }

    return nodes;
  });

  const defaultFolderOpenId = computed(() => databases.value[0] || '');

  watch(() => connection.value?.id, loadTree, { immediate: true });

  return {
    fileTreeData,
    isLoading,
    defaultFolderOpenId,
    fetchDatabases: loadTree,
    loadCollectionStats,
  };
}
