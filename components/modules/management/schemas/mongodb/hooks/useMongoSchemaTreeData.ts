import { computed, ref, watch, type Ref } from 'vue';
import type { FileNode } from '~/components/base/tree-folder/types';
import {
  useMongoDatabaseSummary,
  useMongoServerDatabases,
} from '~/components/modules/quick-query/mongodb/hooks';
import type { MongoCollectionName } from '~/components/modules/quick-query/mongodb/types';
import type { Connection } from '~/core/stores';
import { TabViewType } from '~/core/types/entities/tab-view.entity';

interface MongoNodeData {
  tabViewType: TabViewType;
  totalSize?: number;
}

type MongoFileNode = FileNode<MongoNodeData>;

interface DatabaseSummary {
  collections: MongoCollectionName[];
  totalSize: number;
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
  const isLoadingSummaries = ref(false);

  const isLoading = computed(
    () => isLoadingDatabases.value || isLoadingSummaries.value
  );

  const loadTree = async () => {
    if (!connection.value) {
      summaryByDatabase.value = {};
      return;
    }

    await fetchDatabases();

    isLoadingSummaries.value = true;
    const entries = await Promise.all(
      databases.value.map(async databaseName => {
        const { collections, totalSize, fetchSummary } =
          useMongoDatabaseSummary({
            connection,
            databaseName: ref(databaseName),
          });
        await fetchSummary();
        return [
          databaseName,
          { collections: collections.value, totalSize: totalSize.value },
        ] as const;
      })
    );
    summaryByDatabase.value = Object.fromEntries(entries);
    isLoadingSummaries.value = false;
  };

  const fileTreeData = computed<Record<string, MongoFileNode>>(() => {
    const nodes: Record<string, MongoFileNode> = {};

    for (const databaseName of databases.value) {
      const summary = summaryByDatabase.value[databaseName];

      nodes[databaseName] = {
        id: databaseName,
        parentId: null,
        name: databaseName,
        type: 'folder',
        depth: 0,
        iconOpen: 'hugeicons:database-01',
        iconClose: 'hugeicons:database-01',
        iconClass: 'text-yellow-500',
        children: [],
        data: {
          tabViewType: TabViewType.MongoDatabaseOverview,
          totalSize: summary?.totalSize,
        },
      };

      for (const collection of summary?.collections || []) {
        const nodeId = `${databaseName}.${collection.name}`;
        nodes[nodeId] = {
          id: nodeId,
          parentId: databaseName,
          name: collection.name,
          type: 'file',
          depth: 1,
          iconOpen: 'hugeicons:grid-table',
          iconClose: 'hugeicons:grid-table',
          iconClass: 'text-green-500',
          data: { tabViewType: TabViewType.MongoCollectionDetail },
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
  };
}
