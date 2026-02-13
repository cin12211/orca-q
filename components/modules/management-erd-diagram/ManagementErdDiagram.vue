<script setup lang="ts">
import { refDebounced } from '@vueuse/core';
import FileTree from '~/components/base/tree-folder/FileTree.vue';
import type { FileNode } from '~/components/base/tree-folder/types';
import { DEFAULT_DEBOUNCE_INPUT } from '~/core/constants';
import { useAppContext } from '~/core/contexts/useAppContext';
import { TabViewType } from '~/core/stores/useTabViewsStore';
import { buildTableNodeId } from '../erd-diagram/utils';
import { SchemaFolderType } from '../management-schemas/constants';
import ConnectionSelector from '../selectors/ConnectionSelector.vue';
import SchemaSelector from '../selectors/SchemaSelector.vue';

const { schemaStore, connectToConnection, wsStateStore, tabViewStore } =
  useAppContext();
const { activeSchema } = toRefs(schemaStore);
const { connectionId, workspaceId, schemaId } = toRefs(wsStateStore);

const isRefreshing = ref(false);
const fileTreeRef = ref<InstanceType<typeof FileTree> | null>(null);

const searchInput = shallowRef('');
const debouncedSearch = refDebounced(searchInput, DEFAULT_DEBOUNCE_INPUT);

/**
 * Build flat FileNode data from schema tables
 */
const fileTreeData = computed<Record<string, FileNode>>(() => {
  const nodes: Record<string, FileNode> = {};
  const tables = activeSchema?.value?.tables || [];

  // Root folder: All Tables
  nodes[SchemaFolderType.Tables] = {
    id: SchemaFolderType.Tables,
    parentId: null,
    name: 'All Tables',
    type: 'folder',
    depth: 0,
    iconOpen: 'hugeicons:structure-folder',
    iconClose: 'hugeicons:structure-folder',

    children: [],
    data: { tabViewType: TabViewType.AllERD },
  };

  // Child items: individual tables
  tables.forEach(tableName => {
    const refId = buildTableNodeId({
      schemaName: activeSchema.value?.name || '',
      tableName,
    });

    nodes[refId] = {
      id: refId,
      parentId: SchemaFolderType.Tables,
      name: tableName,
      type: 'file',
      depth: 1,
      iconOpen: 'hugeicons:flowchart-01',
      iconClose: 'hugeicons:flowchart-01',
      data: { tabViewType: TabViewType.DetailERD },
    };

    nodes[SchemaFolderType.Tables].children!.push(refId);
  });

  // Filter by search
  if (debouncedSearch.value) {
    const query = debouncedSearch.value.toLowerCase();
    const filteredNodes: Record<string, FileNode> = {};

    const rootNode = nodes[SchemaFolderType.Tables];
    const matchingChildren = rootNode.children?.filter(childId => {
      const child = nodes[childId];
      return child.name.toLowerCase().includes(query);
    });

    if (matchingChildren && matchingChildren.length > 0) {
      filteredNodes[SchemaFolderType.Tables] = {
        ...rootNode,
        children: matchingChildren,
      };
      matchingChildren.forEach(childId => {
        filteredNodes[childId] = nodes[childId];
      });
    }

    return filteredNodes;
  }

  return nodes;
});

const onRefreshSchema = async () => {
  if (!connectionId.value) {
    throw new Error('No connection selected');
  }

  isRefreshing.value = true;
  await connectToConnection({
    wsId: workspaceId.value,
    connId: connectionId.value,
    isRefresh: true,
  });

  isRefreshing.value = false;
};

const onCollapseAll = () => {
  fileTreeRef.value?.collapseAll();
};

// Navigation functions
const openErdTab = async (node: FileNode) => {
  if (!workspaceId.value) {
    throw new Error('No workspace selected');
  }

  if (!connectionId.value) {
    throw new Error('No connection selected');
  }

  const tabViewType = node.data?.tabViewType as TabViewType | undefined;
  if (
    tabViewType !== TabViewType.AllERD &&
    tabViewType !== TabViewType.DetailERD
  ) {
    return;
  }

  const currentSchemaId = schemaId.value || activeSchema.value?.name || '';
  const isOverview = tabViewType === TabViewType.AllERD;

  const tableId = isOverview
    ? undefined
    : node.id ||
      buildTableNodeId({
        schemaName: activeSchema.value?.name || '',
        tableName: node.name,
      });

  const tabId = isOverview
    ? `erd-overview-${currentSchemaId || 'all'}`
    : `erd-${tableId}`;

  await tabViewStore.openTab({
    id: tabId,
    name: isOverview ? 'All Tables' : node.name,
    icon: node.iconOpen || node.iconClose || 'hugeicons:structure-folder',
    iconClass: node.iconClass,
    type: tabViewType,
    routeName: isOverview
      ? 'workspaceId-connectionId-erd'
      : 'workspaceId-connectionId-erd-tableId',
    routeParams: isOverview
      ? {
          workspaceId: workspaceId.value,
          connectionId: connectionId.value,
        }
      : {
          workspaceId: workspaceId.value,
          connectionId: connectionId.value,
          tableId: tableId || '',
        },
    connectionId: connectionId.value,
    workspaceId: workspaceId.value,
    schemaId: currentSchemaId,
    tableName: isOverview ? undefined : node.name,
  });

  await tabViewStore.selectTab(tabId);
};

/**
 * Handle FileTree click — resolve node and navigate
 */
const handleTreeClick = async (nodeId: string) => {
  const node = fileTreeData.value[nodeId];
  if (!node) return;

  await openErdTab(node);
};

watch(
  () => tabViewStore.activeTab,
  activeTab => {
    if (!activeTab || fileTreeRef.value?.isMouseInside) return;

    if (activeTab.type === TabViewType.AllERD) {
      if (fileTreeData.value[SchemaFolderType.Tables]) {
        fileTreeRef.value?.focusItem(SchemaFolderType.Tables);
      }
      return;
    }

    if (activeTab.type === TabViewType.DetailERD) {
      const rawTableId = activeTab.routeParams?.tableId;
      if (typeof rawTableId !== 'string') return;

      const directMatch = fileTreeData.value[rawTableId];
      if (directMatch) {
        fileTreeRef.value?.focusItem(rawTableId);
        return;
      }

      const schemaName = activeSchema.value?.name || '';
      const composedId = schemaName
        ? buildTableNodeId({ schemaName, tableName: rawTableId })
        : rawTableId;

      if (fileTreeData.value[composedId]) {
        fileTreeRef.value?.focusItem(composedId);
      }
    }
  },
  { flush: 'post', immediate: true }
);
</script>

<template>
  <div class="flex flex-col h-full w-full overflow-y-auto">
    <div class="relative w-full items-center px-2 pt-1 space-y-1">
      <div>
        <p
          class="text-sm font-medium text-muted-foreground leading-none block pb-1"
        >
          Connections
        </p>
        <ConnectionSelector class="w-full!" :workspaceId="workspaceId" />
      </div>

      <div>
        <p
          class="text-sm font-medium text-muted-foreground leading-none block pb-1"
        >
          Schemas
        </p>
        <SchemaSelector class="w-full!" />
      </div>
    </div>

    <div class="px-2 pt-2 flex items-center justify-between">
      <p class="text-sm font-medium text-muted-foreground leading-none">
        Schemas
      </p>

      <div class="flex items-center">
        <Tooltip>
          <TooltipTrigger as-child>
            <Button size="iconSm" variant="ghost" @click="onCollapseAll">
              <Icon
                name="lucide:copy-minus"
                class="size-4! min-w-4 text-muted-foreground"
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent> Collapse All </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger as-child>
            <Button size="iconSm" variant="ghost" @click="onRefreshSchema">
              <Icon
                name="hugeicons:redo"
                :class="[
                  'size-4! min-w-4 text-muted-foreground',
                  isRefreshing && 'animate-spin',
                ]"
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent> Refresh Schema </TooltipContent>
        </Tooltip>
      </div>
    </div>

    <div class="px-2 pb-1">
      <div class="relative w-full">
        <Input
          type="text"
          placeholder="Search in all tables or functions"
          class="pr-6 w-full h-8"
          v-model="searchInput"
        />

        <div
          v-if="searchInput"
          class="absolute right-2 top-1.5 w-4 cursor-pointer hover:bg-accent"
          @click="searchInput = ''"
        >
          <Icon name="lucide:x" class="stroke-3! text-muted-foreground" />
        </div>
      </div>
    </div>

    <!-- TODO: check flow when change connection  -->
    <!-- TODO: check flow when change schema  -->

    <div
      v-if="Object.keys(fileTreeData).length === 0"
      class="flex flex-col items-center h-full justify-center"
    >
      No data!
    </div>

    <FileTree
      ref="fileTreeRef"
      :initial-data="fileTreeData"
      :allow-drag-and-drop="false"
      @click="handleTreeClick"
    />
  </div>
</template>
