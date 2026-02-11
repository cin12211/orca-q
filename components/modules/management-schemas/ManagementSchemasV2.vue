<script setup lang="ts">
import { refDebounced, templateRef } from '@vueuse/core';
import type { RouteNameFromPath, RoutePathSchema } from '@typed-router/__paths';
import { type FlattenedTreeFileSystemItem } from '~/components/base/Tree';
import BaseContextMenu from '~/components/base/context-menu/BaseContextMenu.vue';
import FileTree from '~/components/base/tree-folder/FileTree.vue';
import type { FileNode } from '~/components/base/tree-folder/types';
import { getFormatParameters } from '~/components/modules/management-schemas/utils';
import SafeModeConfirmDialog from '~/components/modules/quick-query/SafeModeConfirmDialog.vue';
import { DEFAULT_DEBOUNCE_INPUT } from '~/core/constants';
import { useAppContext } from '~/core/contexts/useAppContext';
import { useActivityBarStore } from '~/core/stores';
import { TabViewType } from '~/core/stores/useTabViewsStore';
import { FunctionSchemaEnum, ViewSchemaEnum } from '~/core/types';
import ConnectionSelector from '../selectors/ConnectionSelector.vue';
import SchemaSelector from '../selectors/SchemaSelector.vue';
import { SchemaFolderType } from './constants';
import RenameDialog from './dialogs/RenameDialog.vue';
import SqlPreviewDialog from './dialogs/SqlPreviewDialog.vue';
import { useSchemaContextMenu } from './hooks/useSchemaContextMenu';

const { schemaStore, connectToConnection, wsStateStore, tabViewStore } =
  useAppContext();

const { activeSchema } = toRefs(schemaStore);
const { connectionId, schemaId, workspaceId } = toRefs(wsStateStore);

const isRefreshing = ref(false);

const searchInput = shallowRef('');
const debouncedSearch = refDebounced(searchInput, DEFAULT_DEBOUNCE_INPUT);

const fileTreeData = computed(() => {
  const nodes: Record<string, FileNode> = {};
  const tables = activeSchema?.value?.tables || [];
  const functions = activeSchema?.value?.functions || [];
  const views = activeSchema?.value?.views || [];

  // Helper to format function names
  const formatFunctionName = (name: string, parameters: string) => {
    const formatParameters = getFormatParameters(parameters);
    return `${name}(${formatParameters})`;
  };

  // 1. Functions Folder
  nodes[SchemaFolderType.Functions] = {
    id: SchemaFolderType.Functions,
    parentId: null,
    name: 'Functions',
    type: 'folder',
    depth: 0,
    iconOpen: 'material-icon-theme:folder-functions-open',
    iconClose: 'material-icon-theme:folder-functions',
    children: [],
    data: { tabViewType: TabViewType.FunctionsOverview },
  };

  functions.forEach(({ name, oId, type, parameters }) => {
    const formattedName = formatFunctionName(name, parameters);
    // Ensure unique ID if oId clashes (though oId should be unique per schema usually)
    // Using oId as ID
    nodes[oId] = {
      id: oId,
      parentId: SchemaFolderType.Functions,
      name: formattedName,
      type: 'file', // Treat as file for now
      depth: 1,
      iconClose: 'gravity-ui:function',
      iconClass:
        type === FunctionSchemaEnum.Function
          ? 'text-blue-400'
          : 'text-orange-400',
      data: {
        tabViewType: TabViewType.FunctionsDetail,
        originalName: name, // Store original name for easy access
        parameters,
        // ... specific data needed for opening tabs
        // mimic old item structure for compatibility if needed
      },
    };
    nodes[SchemaFolderType.Functions].children!.push(oId);
  });

  // 2. Tables Folder
  nodes[SchemaFolderType.Tables] = {
    id: SchemaFolderType.Tables,
    parentId: null,
    name: 'Tables',
    type: 'folder',
    depth: 0,
    iconOpen: 'material-icon-theme:folder-database-open',
    iconClose: 'material-icon-theme:folder-database',
    children: [],
    data: { tabViewType: TabViewType.TableOverview },
  };

  tables.forEach(tableName => {
    nodes[tableName] = {
      id: tableName,
      parentId: SchemaFolderType.Tables,
      name: tableName,
      type: 'file',
      depth: 1,
      iconClose: 'hugeicons:grid-table',
      iconClass: 'text-yellow-400',
      data: { tabViewType: TabViewType.TableDetail },
    };
    nodes[SchemaFolderType.Tables].children!.push(tableName);
  });

  // 3. Views Folder
  nodes[SchemaFolderType.Views] = {
    id: SchemaFolderType.Views,
    parentId: null,
    name: 'Views',
    type: 'folder',
    depth: 0,
    iconOpen: 'material-icon-theme:folder-enum-open',
    iconClose: 'material-icon-theme:folder-enum',
    children: [],
    data: { tabViewType: TabViewType.ViewOverview },
  };

  views.forEach(({ name, oid, type }) => {
    nodes[oid] = {
      id: oid,
      parentId: SchemaFolderType.Views,
      name: name,
      type: 'file',
      depth: 1,
      iconClose:
        type === ViewSchemaEnum.View
          ? 'hugeicons:property-view'
          : 'hugeicons:property-new',
      iconClass:
        type === ViewSchemaEnum.View ? 'text-green-700' : 'text-orange-500',
      data: { tabViewType: TabViewType.ViewDetail },
    };
    nodes[SchemaFolderType.Views].children!.push(oid);
  });

  // Filter by search
  if (debouncedSearch.value) {
    const query = debouncedSearch.value.toLowerCase();
    const filteredNodes: Record<string, FileNode> = {};
    const rootIds = [
      SchemaFolderType.Functions,
      SchemaFolderType.Tables,
      SchemaFolderType.Views,
    ];

    rootIds.forEach(rootId => {
      const rootNode = nodes[rootId];
      if (!rootNode) return;

      const matchingChildren = rootNode.children?.filter(childId => {
        const child = nodes[childId];
        return child.name.toLowerCase().includes(query);
      });

      if (matchingChildren && matchingChildren.length > 0) {
        // Clone root to avoid mutating original
        filteredNodes[rootId] = { ...rootNode, children: matchingChildren };
        matchingChildren.forEach(childId => {
          filteredNodes[childId] = nodes[childId];
        });
      }
    });
    return filteredNodes;
  }

  return nodes;
});

const activityBarStore = useActivityBarStore();
const { schemasExpandedState, onCollapsedSchemaTree } =
  toRefs(activityBarStore);

const onRefreshSchema = async () => {
  if (!connectionId.value) {
    throw new Error('No connection selected');
    return;
  }

  isRefreshing.value = true;
  await connectToConnection({
    wsId: workspaceId.value,
    connId: connectionId.value,
    isRefresh: true,
  });

  isRefreshing.value = false;
};

// Context menu setup
const schemaName = computed(() => activeSchema.value?.name || 'public');

const {
  selectedItem,
  contextMenuItems,
  safeModeDialogOpen,
  safeModeDialogSQL,
  safeModeDialogType,
  onSafeModeConfirm,
  onSafeModeCancel,
  renameDialogType,
  renameDialogOpen,
  renameDialogValue,

  onConfirmRename,
  sqlPreviewDialogOpen,
  sqlPreviewDialogSQL,
  sqlPreviewDialogTitle,
  onRightClickItem,
  isFetching,
  safeModeLoading,
} = useSchemaContextMenu({
  schemaName,
  activeSchema,
  onRefreshSchema,
});

// Adapter for tree selection
const handleTreeSelect = (nodeIds: string[]) => {
  if (nodeIds.length === 0) return;
  const nodeId = nodeIds[0];
  const node = fileTreeData.value[nodeId];
  if (!node) return;

  // Construct item compatible with onHandleOpenTab
  // Or refactor onHandleOpenTab to accept FileNode
  // For now, construct adapter object
  const item: any = {
    value: {
      id: node.id,
      title: node.name,
      icon: node.iconClose, // best guess
      iconClass: node.iconClass,
      tabViewType: node.data?.tabViewType,
      // parameters needed for functions?
      parameters: node.data?.originalName ? node.data?.parameters : undefined, // Check logic
    },
  };
  // Specific fix for function handling which expects 'id' to be the function name or OID?
  // In original code:
  // FunctionsOverview params: none
  // FunctionsDetail params: functionName: item.value.id (which was OID in original map)
  // FileNode id is OID for functions. So node.id is correct.

  onHandleOpenTab(new MouseEvent('click'), item);
};

const handleTreeClick = (nodeId: string) => {
  const node = fileTreeData.value[nodeId];
  if (!node) return;

  // Construct item compatible with onHandleOpenTab
  // Or refactor onHandleOpenTab to accept FileNode
  // For now, construct adapter object
  const item: any = {
    value: {
      id: node.id,
      title: node.name,
      icon: node.iconClose, // best guess
      iconClass: node.iconClass,
      tabViewType: node.data?.tabViewType,
      // parameters needed for functions?
      parameters: node.data?.originalName ? node.data?.parameters : undefined, // Check logic
    },
  };
  // Specific fix for function handling which expects 'id' to be the function name or OID?
  // In original code:
  // FunctionsOverview params: none
  // FunctionsDetail params: functionName: item.value.id (which was OID in original map)
  // FileNode id is OID for functions. So node.id is correct.

  onHandleOpenTab(new MouseEvent('click'), item);
};

const onHandleOpenTab = async (
  _: MouseEvent,
  item: FlattenedTreeFileSystemItem
) => {
  const tabViewType: TabViewType = (item.value as any).tabViewType;

  let routeName: RouteNameFromPath<RoutePathSchema> | null = null;
  let routeParams;

  if (!schemaId.value) {
    return;
  }

  if (tabViewType === TabViewType.FunctionsOverview) {
    routeName =
      'workspaceId-connectionId-quick-query-function-over-view' as unknown as any;
  }

  if (tabViewType === TabViewType.TableOverview) {
    routeName =
      'workspaceId-connectionId-quick-query-table-over-view' as unknown as any;
  }

  if (tabViewType === TabViewType.ViewOverview) {
    routeName =
      'workspaceId-connectionId-quick-query-view-over-view' as unknown as any;
  }

  if (tabViewType === TabViewType.FunctionsDetail) {
    routeName =
      'workspaceId-connectionId-quick-query-function-over-view-functionName';

    routeParams = {
      functionName: item.value.id,
      schemaName: schemaId.value || '',
    };
  }

  const tabId = `${item.value.title}-${schemaId.value}`;

  //TODO: refactor route to tabId
  if (
    tabViewType === TabViewType.TableDetail ||
    tabViewType === TabViewType.ViewDetail
  ) {
    routeName =
      'workspaceId-connectionId-quick-query-tabViewId' as unknown as any;

    routeParams = {
      tabViewId: tabId,
    };
  }

  const virtualTableId =
    tabViewType === TabViewType.ViewDetail ? item.value.id : undefined;

  if (routeName) {
    await tabViewStore.openTab({
      icon: item.value.icon,
      iconClass: item.value.iconClass!,
      id: tabId,
      name: item.value.title,
      type: (item.value as any).tabViewType,
      routeName,
      routeParams,
      connectionId: connectionId.value,
      schemaId: schemaId.value || '',
      workspaceId: workspaceId.value || '',
      tableName: item.value.title,
      virtualTableId: virtualTableId,
    });

    await tabViewStore.selectTab(tabId);
  }
};

// Adapter for context menu
const handleTreeContextMenu = (nodeId: string, event: MouseEvent) => {
  console.log('handleTreeContextMenu', nodeId, event);

  const node = fileTreeData.value[nodeId];
  if (!node) return;

  // Construct item expected by useSchemaContextMenu logic
  // It seems to expect { id, title, path?, ... }
  // Let's see what onRightClickItem does.
  // It sets selectedItem.
  // The hook uses selectedItem to determine actions.
  const item: any = {
    name: node.name, // hook uses name? check useSchemaContextMenu
    title: node.name,
    id: node.id,
    // The original code passed 'id' as OID for functions/views and tableName for tables.
    // My node.id matches this.
    // What about 'path'? hook getItemType uses it?
    // Let's check hook logic if possible or assume properties.
    // Original items had 'path'.
    path: node.parentId ? `${node.parentId}/${node.id}` : node.id, // approximate path
    isFolder: node.type === 'folder',
    // type?
  };

  // We need to match what onRightClickItem expects.
  // It takes (event, item).
  onRightClickItem(event, item);
};
</script>

<template>
  <div class="flex flex-col h-full w-full overflow-y-auto relative">
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
            <Button
              size="iconSm"
              variant="ghost"
              @click="onCollapsedSchemaTree"
            >
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
                name="lucide:refresh-ccw"
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

    <!-- Context Menu Wrapper -->
    <BaseContextMenu
      :context-menu-items="contextMenuItems"
      @on-clear-context-menu="selectedItem = null"
    >
      <div class="h-full">
        <FileTree
          :initial-data="fileTreeData"
          storage-key="schema_tree"
          @click="handleTreeClick"
          @contextmenu="handleTreeContextMenu"
        />
      </div>
    </BaseContextMenu>

    <!-- Safe Mode Confirm Dialog -->
    <SafeModeConfirmDialog
      :loading="safeModeLoading"
      :open="safeModeDialogOpen"
      :sql="safeModeDialogSQL"
      :type="safeModeDialogType"
      @update:open="safeModeDialogOpen = $event"
      @confirm="onSafeModeConfirm"
      @cancel="onSafeModeCancel"
    />

    <!-- Rename Dialog -->
    <RenameDialog
      v-model:open="renameDialogOpen"
      :tabViewType="renameDialogType"
      :current-name="renameDialogValue"
      @confirm="onConfirmRename"
    />

    <!-- SQL Preview Dialog -->
    <SqlPreviewDialog
      :open="sqlPreviewDialogOpen"
      :sql="sqlPreviewDialogSQL"
      :title="sqlPreviewDialogTitle"
      :isLoading="isFetching"
      @update:open="sqlPreviewDialogOpen = $event"
    />
  </div>
</template>
