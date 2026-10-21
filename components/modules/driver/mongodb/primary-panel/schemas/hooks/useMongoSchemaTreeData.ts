import { computed, ref, watch, type Ref } from 'vue';
import type { FileNode } from '~/components/base/tree-folder/types';
import type {
  MongoCollectionName,
  MongoCollectionStatItem,
} from '~/components/modules/driver/mongodb/quick-query/types';
import { getConnectionParams } from '~/core/helpers/connection-helper';
import type { Connection } from '~/core/stores';
import { TabViewType } from '~/core/types/entities/tab-view.entity';
import { getMongoSchemasTreeExpandedIds } from '../utils';

interface MongoNodeData {
  tabViewType: TabViewType;
  totalCollections?: number;
  totalSize?: number;
  size?: number;
  count?: number;
}

type MongoFileNode = FileNode<MongoNodeData>;

interface DatabaseSummary {
  collections: MongoCollectionName[];
  totalSize?: number;
}

export function useMongoSchemaTreeData(
  connection: Ref<Connection | undefined>,
  search?: Ref<string>,
  getOpenFolders?: () => string[]
) {
  const databases = ref<string[]>([]);
  const summaryByDatabase = ref<Record<string, DatabaseSummary>>({});
  const isLoading = ref(false);

  const loadedStatsDatabases = ref(new Set<string>());
  const loadingStatsDatabases = ref(new Set<string>());

  let currentLoadSessionId = 0;

  const defaultFolderOpenId = computed(() => {
    if (!databases.value || databases.value.length === 0) return '';

    const connDb = connection.value?.database;
    if (connDb && databases.value.includes(connDb)) {
      return connDb;
    }

    return databases.value[0] || '';
  });

  const applyStatsResponse = (
    statsList: Array<{
      database: string;
      totalSize: number;
      collections: MongoCollectionStatItem[];
    }>
  ) => {
    const nextSummary = { ...summaryByDatabase.value };
    for (const dbStats of statsList) {
      const existing = nextSummary[dbStats.database];
      if (existing) {
        const statsByName = new Map(dbStats.collections.map(c => [c.name, c]));
        nextSummary[dbStats.database] = {
          ...existing,
          totalSize: dbStats.totalSize,
          collections: existing.collections.map(col => {
            const stat = statsByName.get(col.name);
            return stat ? { ...col, size: stat.size, count: stat.count } : col;
          }),
        };
      }
      loadedStatsDatabases.value.add(dbStats.database);
    }
    summaryByDatabase.value = nextSummary;
  };

  const fetchDatabasesStats = async (databaseNames: string[]) => {
    if (
      !connection.value ||
      !Array.isArray(databaseNames) ||
      databaseNames.length === 0
    ) {
      return;
    }

    const targetsToLoad: Array<{ database: string; collections: string[] }> =
      [];

    for (const name of databaseNames) {
      if (
        loadedStatsDatabases.value.has(name) ||
        loadingStatsDatabases.value.has(name)
      ) {
        continue;
      }
      const summary = summaryByDatabase.value[name];
      if (!summary) continue;

      loadingStatsDatabases.value.add(name);
      targetsToLoad.push({
        database: name,
        collections: summary.collections.map(c => c.name),
      });
    }

    if (targetsToLoad.length === 0) return;

    try {
      const response = await $fetch<{
        databases?: Array<{
          database: string;
          totalSize: number;
          collections: MongoCollectionStatItem[];
        }>;
      }>('/api/mongodb/collection-stats', {
        method: 'POST',
        body: {
          ...getConnectionParams(connection.value),
          databases: targetsToLoad,
        },
      });

      if (response.databases) {
        applyStatsResponse(response.databases);
      }
    } catch (err) {
      console.error(
        'Failed to fetch stats for databases:',
        targetsToLoad.map(t => t.database),
        err
      );
    } finally {
      for (const target of targetsToLoad) {
        loadingStatsDatabases.value.delete(target.database);
      }
    }
  };

  const fetchDatabaseStats = (databaseName: string) =>
    fetchDatabasesStats([databaseName]);

  const loadTree = async () => {
    const sessionId = ++currentLoadSessionId;
    if (!connection.value) {
      databases.value = [];
      summaryByDatabase.value = {};
      loadedStatsDatabases.value = new Set();
      loadingStatsDatabases.value = new Set();
      return;
    }

    isLoading.value = true;
    try {
      const response = await $fetch<{
        databases: Array<{
          database: string;
          collections: MongoCollectionName[];
        }>;
      }>('/api/mongodb/schemas', {
        method: 'POST',
        body: getConnectionParams(connection.value),
      });

      if (sessionId !== currentLoadSessionId) return;

      const summaryMap: Record<string, DatabaseSummary> = {};
      const dbNames: string[] = [];
      for (const item of response.databases || []) {
        dbNames.push(item.database);
        summaryMap[item.database] = {
          collections: item.collections,
        };
      }
      databases.value = dbNames;
      summaryByDatabase.value = summaryMap;
      loadedStatsDatabases.value = new Set();
      loadingStatsDatabases.value = new Set();
    } catch (fetchError) {
      console.error('Failed to fetch MongoDB schemas:', fetchError);
    } finally {
      if (sessionId === currentLoadSessionId) {
        isLoading.value = false;
      }
    }

    if (databases.value.length === 0) return;

    // Check which database folders are currently open / expanded
    let openDatabases: string[] = [];

    // 1. Check live mounted tree ref if available
    if (getOpenFolders) {
      try {
        const liveOpen = getOpenFolders();
        if (Array.isArray(liveOpen) && liveOpen.length > 0) {
          openDatabases = liveOpen.filter(db => databases.value.includes(db));
        }
      } catch {
        // fallback
      }
    }

    // 2. Check persisted open folders from localStorage
    if (openDatabases.length === 0) {
      const persisted = getMongoSchemasTreeExpandedIds(connection.value?.id);
      openDatabases = persisted.filter(db => databases.value.includes(db));
    }

    // 3. Fallback to defaultFolderOpenId (non-system database)
    if (openDatabases.length === 0 && defaultFolderOpenId.value) {
      openDatabases = [defaultFolderOpenId.value];
    }

    if (openDatabases.length > 0) {
      await fetchDatabasesStats(openDatabases);
    }
  };

  const fileTreeData = computed<Record<string, MongoFileNode>>(() => {
    const nodes: Record<string, MongoFileNode> = {};

    for (const databaseName of databases.value) {
      const summary = summaryByDatabase.value[databaseName];
      const collections = summary?.collections || [];

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
          totalCollections: collections.length,
          totalSize: summary?.totalSize,
        },
      };

      for (const collection of collections) {
        const nodeId = `${databaseName}.${collection.name}`;
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
            size: collection.size,
            count: collection.count,
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

  watch(() => connection.value?.id, loadTree, { immediate: true });

  return {
    fileTreeData,
    isLoading,
    defaultFolderOpenId,
    databases,
    fetchDatabases: loadTree,
    fetchDatabaseStats,
    fetchDatabasesStats,
  };
}
