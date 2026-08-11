import { computed, ref, watch, type Ref } from 'vue';
import type { FileNode } from '~/components/base/tree-folder/types';
import {
  useMongoDatabaseCollections,
  useMongoServerDatabases,
} from '~/components/modules/quick-query/mongodb/hooks';
import type { MongoCollectionSummary } from '~/components/modules/quick-query/mongodb/types';
import type { Connection } from '~/core/stores';
import { TabViewType } from '~/core/types/entities/tab-view.entity';

type MongoFileNode = FileNode<{ tabViewType: TabViewType }>;

export function useMongoSchemaTreeData(
  connection: Ref<Connection | undefined>,
  search?: Ref<string>
) {
  const {
    databases,
    isLoading: isLoadingDatabases,
    fetchDatabases,
  } = useMongoServerDatabases({ connection });
  const collectionsByDatabase = ref<Record<string, MongoCollectionSummary[]>>(
    {}
  );
  const isLoadingCollections = ref(false);

  const isLoading = computed(
    () => isLoadingDatabases.value || isLoadingCollections.value
  );

  const loadTree = async () => {
    if (!connection.value) {
      collectionsByDatabase.value = {};
      return;
    }

    await fetchDatabases();

    isLoadingCollections.value = true;
    const entries = await Promise.all(
      databases.value.map(async databaseName => {
        const { collections, fetchCollections } = useMongoDatabaseCollections({
          connection,
          databaseName: ref(databaseName),
        });
        await fetchCollections();
        return [databaseName, collections.value] as const;
      })
    );
    collectionsByDatabase.value = Object.fromEntries(entries);
    isLoadingCollections.value = false;
  };

  const fileTreeData = computed<Record<string, MongoFileNode>>(() => {
    const nodes: Record<string, MongoFileNode> = {};

    for (const databaseName of databases.value) {
      nodes[databaseName] = {
        id: databaseName,
        parentId: null,
        name: databaseName,
        type: 'folder',
        depth: 0,
        iconOpen: 'hugeicons:database-01',
        iconClose: 'hugeicons:database-01',
        children: [],
        data: { tabViewType: TabViewType.MongoDatabaseOverview },
      };

      for (const collection of collectionsByDatabase.value[databaseName] ||
        []) {
        const nodeId = `${databaseName}.${collection.name}`;
        nodes[nodeId] = {
          id: nodeId,
          parentId: databaseName,
          name: collection.name,
          type: 'file',
          depth: 1,
          iconOpen: 'hugeicons:grid-table',
          iconClose: 'hugeicons:grid-table',
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
