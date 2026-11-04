import { ref, computed, shallowRef, watch, onMounted, type Ref } from 'vue';
import { type FileNode, type TreePersistenceExtension } from '../types';

interface UseTreeNodesProps {
  initExpandedIds?: string[];
  initialData?: Record<string, FileNode>;
  storageKey: string;
  persistenceExtension?: TreePersistenceExtension;
  searchQuery: string;
  autoExpandOnSearch: boolean;
}

type ExpandedPersistenceStrategy = {
  load: () => string[] | null;
  save: (expandedNodeIds: string[]) => void;
};

const normalizeExpandedIds = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  return value.filter((id): id is string => typeof id === 'string');
};

/**
 * Owns the node map and folder-expansion state: flattening the tree for
 * virtualization, persisting/restoring expanded ids, and auto-expanding
 * everything while a search query is active (restoring on clear).
 */
export function useTreeNodes(props: UseTreeNodesProps) {
  const nodes = shallowRef<Record<string, FileNode>>({});
  const expandedIds = ref<Set<string>>(new Set(props.initExpandedIds || []));

  const persistenceContext = computed(() => ({
    storageKey: `${props.storageKey}_expanded`,
  }));

  const extensionPersistenceStrategy = computed<ExpandedPersistenceStrategy>(
    () => ({
      load: () => {
        const loadExpandedIds = props.persistenceExtension?.loadExpandedIds;
        if (!loadExpandedIds) {
          return null;
        }

        try {
          const loadedExpandedIds = loadExpandedIds(persistenceContext.value);
          return normalizeExpandedIds(loadedExpandedIds);
        } catch (error) {
          console.error(
            'Failed to load expanded ids from persistence extension',
            error
          );
          return null;
        }
      },
      save: expandedNodeIds => {
        const saveExpandedIds = props.persistenceExtension?.saveExpandedIds;
        if (!saveExpandedIds) {
          return;
        }

        try {
          saveExpandedIds(expandedNodeIds, persistenceContext.value);
        } catch (error) {
          console.error(
            'Failed to save expanded ids using persistence extension',
            error
          );
        }
      },
    })
  );

  const expandedIdsPersistenceStrategy =
    computed<ExpandedPersistenceStrategy | null>(() => {
      if (props.persistenceExtension) {
        return extensionPersistenceStrategy.value;
      }

      return null;
    });

  // Root node IDs (nodes with parentId === null)
  const rootIds = computed(() =>
    Object.values(nodes.value)
      .filter(node => node.parentId === null)
      .map(node => node.id)
  );

  // Flatten the tree based on expansion state
  const visibleNodeIds = computed(() => {
    const result: string[] = [];

    const traverse = (ids: string[]) => {
      for (const id of ids) {
        result.push(id);
        const node = nodes.value[id];
        if (
          node.children &&
          node.children.length > 0 &&
          expandedIds.value.has(id)
        ) {
          traverse(node.children);
        }
      }
    };

    traverse(rootIds.value);
    return result;
  });

  const toggleExpansion = (nodeId: string) => {
    if (expandedIds.value.has(nodeId)) {
      expandedIds.value.delete(nodeId);
    } else {
      expandedIds.value.add(nodeId);
    }
    // Trigger reactivity
    expandedIds.value = new Set(expandedIds.value);
  };

  const allFolderIds = computed(() => {
    const result: string[] = [];

    for (const key in nodes.value) {
      const node = nodes.value[key];
      if (node.type === 'folder') {
        result.push(node.id);
      }
    }

    return result;
  });

  const expandAll = () => {
    expandedIds.value = new Set(allFolderIds.value);
  };

  const collapseAll = () => {
    expandedIds.value = new Set();
  };

  const isExpandedAll = computed(() => {
    const folders = allFolderIds.value;
    if (folders.length === 0) return false;

    for (const id of folders) {
      if (!expandedIds.value.has(id)) return false;
    }

    return true;
  });

  // Persistence
  watch(
    () => Array.from(expandedIds.value),
    newVal => {
      if (
        props.autoExpandOnSearch &&
        props.searchQuery &&
        props.searchQuery.trim()
      ) {
        return;
      }
      expandedIdsPersistenceStrategy.value?.save(newVal);
    }
  );

  // Initialization
  onMounted(() => {
    if (props.initialData) {
      nodes.value = props.initialData;
    }

    const persistedExpandedIds = expandedIdsPersistenceStrategy.value?.load();
    if (persistedExpandedIds !== null && persistedExpandedIds !== undefined) {
      expandedIds.value = new Set(persistedExpandedIds);
    }
  });

  // React to external data changes
  watch(
    () => props.initialData,
    newData => {
      if (newData) {
        nodes.value = newData;
        if (
          props.autoExpandOnSearch &&
          props.searchQuery &&
          props.searchQuery.trim()
        ) {
          expandAll();
        }
      }
    },
    { deep: true }
  );

  // Auto-expand on search and restore expansion on search clear
  const savedExpandedIdsBeforeSearch: Ref<Set<string> | null> = ref(null);

  watch(
    () => props.searchQuery,
    (newQuery, oldQuery) => {
      if (!props.autoExpandOnSearch) {
        return;
      }

      const hasNew = Boolean(newQuery && newQuery.trim());
      const hadOld = Boolean(oldQuery && oldQuery.trim());

      if (hasNew) {
        if (!hadOld) {
          savedExpandedIdsBeforeSearch.value = new Set(expandedIds.value);
        }
        expandAll();
      } else if (hadOld && !hasNew) {
        if (savedExpandedIdsBeforeSearch.value) {
          expandedIds.value = new Set(savedExpandedIdsBeforeSearch.value);
          savedExpandedIdsBeforeSearch.value = null;
        }
      }
    }
  );

  return {
    nodes,
    expandedIds,
    rootIds,
    visibleNodeIds,
    toggleExpansion,
    allFolderIds,
    expandAll,
    collapseAll,
    isExpandedAll,
  };
}
