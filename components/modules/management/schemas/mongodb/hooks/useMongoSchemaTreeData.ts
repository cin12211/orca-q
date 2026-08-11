import { computed, watch, type Ref } from 'vue';
import type { FileNode } from '~/components/base/tree-folder/types';
import { useMongoDatabaseCollections } from '~/components/modules/quick-query/mongodb/hooks';
import type { Connection } from '~/core/stores';
import { TabViewType } from '~/core/types/entities/tab-view.entity';

export function useMongoSchemaTreeData(params: {
  connection: Ref<Connection | undefined>;
}) {
  const { collections, isLoading, fetchCollections } =
    useMongoDatabaseCollections({ connection: params.connection });

  const databaseName = computed(
    () =>
      params.connection.value?.database ||
      params.connection.value?.name ||
      'database'
  );

  const fileTreeData = computed<
    Record<string, FileNode<{ tabViewType: TabViewType }>>
  >(() => {
    if (!params.connection.value) return {};
    const rootId = databaseName.value;

    const nodes: Record<string, FileNode<{ tabViewType: TabViewType }>> = {
      [rootId]: {
        id: rootId,
        parentId: null,
        name: rootId,
        type: 'folder',
        depth: 0,
        iconOpen: 'hugeicons:database-01',
        iconClose: 'hugeicons:database-01',
        children: [],
        data: { tabViewType: TabViewType.MongoDatabaseOverview },
      },
    };

    for (const collection of collections.value) {
      const nodeId = `${rootId}.${collection.name}`;
      nodes[nodeId] = {
        id: nodeId,
        parentId: rootId,
        name: collection.name,
        type: 'file',
        depth: 1,
        iconOpen: 'hugeicons:grid-table',
        iconClose: 'hugeicons:grid-table',
        data: { tabViewType: TabViewType.MongoCollectionDetail },
      };
      nodes[rootId].children!.push(nodeId);
    }

    return nodes;
  });

  watch(databaseName, fetchCollections, { immediate: true });

  return { fileTreeData, isLoading };
}
