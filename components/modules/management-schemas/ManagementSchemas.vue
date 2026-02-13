<script setup lang="ts">
import { refDebounced } from '@vueuse/core';
import type { RouteNameFromPath, RoutePathSchema } from '@typed-router/__paths';
import BaseContextMenu from '~/components/base/context-menu/BaseContextMenu.vue';
import FileTree from '~/components/base/tree-folder/FileTree.vue';
import type { FileNode } from '~/components/base/tree-folder/types';
import { getFormatParameters } from '~/components/modules/management-schemas/utils';
import SafeModeConfirmDialog from '~/components/modules/quick-query/SafeModeConfirmDialog.vue';
import { DEFAULT_DEBOUNCE_INPUT } from '~/core/constants';
import { useAppContext } from '~/core/contexts/useAppContext';
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

const fileTreeRef = useTemplateRef<typeof FileTree | null>('fileTreeRef');
const isTreeCollapsed = ref(false);

const searchInput = shallowRef('');
const debouncedSearch = refDebounced(searchInput, DEFAULT_DEBOUNCE_INPUT);

const fileTreeData = computed<Record<string, FileNode>>(() => {
  const tables = activeSchema?.value?.tables || [];
  const functions = activeSchema?.value?.functions || [];
  const views = activeSchema?.value?.views || [];

  const nodes: Record<string, FileNode> = {};

  const formatFunctionName = (name: string, parameters: string) => {
    const formatParameters = getFormatParameters(parameters);
    return `${name}(${formatParameters})`;
  };

  const addFolder = (
    id: string,
    name: string,
    iconOpen: string,
    iconClose: string,
    tabViewType: TabViewType,
    iconClass?: string
  ) => {
    nodes[id] = {
      id,
      parentId: null,
      name,
      type: 'folder',
      depth: 0,
      iconOpen,
      iconClose,
      iconClass,
      children: [],
      data: { tabViewType },
    };
  };

  addFolder(
    SchemaFolderType.Functions,
    'Functions',
    'material-icon-theme:folder-functions-open',
    'material-icon-theme:folder-functions',
    TabViewType.FunctionsOverview
  );

  addFolder(
    SchemaFolderType.Tables,
    'Tables',
    'material-icon-theme:folder-database-open',
    'material-icon-theme:folder-database',
    TabViewType.TableOverview
  );

  addFolder(
    SchemaFolderType.Views,
    'Views',
    'material-icon-theme:folder-enum-open',
    'material-icon-theme:folder-enum',
    TabViewType.ViewOverview
  );

  functions.forEach(({ name, oId, type, parameters }) => {
    const nodeId = String(oId);
    const displayName = formatFunctionName(name, parameters);

    nodes[nodeId] = {
      id: nodeId,
      parentId: SchemaFolderType.Functions,
      name: displayName,
      type: 'file',
      depth: 1,
      iconOpen: 'gravity-ui:function',
      iconClose: 'gravity-ui:function',
      iconClass:
        type === FunctionSchemaEnum.Function
          ? 'text-blue-400'
          : 'text-orange-400',
      data: {
        tabViewType: TabViewType.FunctionsDetail,
        itemValue: {
          title: displayName,
          name,
          id: oId,
          parameters,
          tabViewType: TabViewType.FunctionsDetail,
          icon: 'gravity-ui:function',
          iconClass:
            type === FunctionSchemaEnum.Function
              ? 'text-blue-400'
              : 'text-orange-400',
        },
        parameters,
      },
    };

    nodes[SchemaFolderType.Functions].children!.push(nodeId);
  });

  tables.forEach(tableName => {
    const nodeId = tableName;

    nodes[nodeId] = {
      id: nodeId,
      parentId: SchemaFolderType.Tables,
      name: tableName,
      type: 'file',
      depth: 1,
      iconOpen: 'hugeicons:grid-table',
      iconClose: 'hugeicons:grid-table',
      iconClass: 'text-yellow-400',
      data: {
        tabViewType: TabViewType.TableDetail,
        itemValue: {
          title: tableName,
          name: tableName,
          id: tableName,
          tabViewType: TabViewType.TableDetail,
          icon: 'hugeicons:grid-table',
          iconClass: 'text-yellow-400',
        },
      },
    };

    nodes[SchemaFolderType.Tables].children!.push(nodeId);
  });

  views.forEach(({ name, oid, type }) => {
    const nodeId = String(oid);

    nodes[nodeId] = {
      id: nodeId,
      parentId: SchemaFolderType.Views,
      name,
      type: 'file',
      depth: 1,
      iconOpen:
        type === ViewSchemaEnum.View
          ? 'hugeicons:property-view'
          : 'hugeicons:property-new',
      iconClose:
        type === ViewSchemaEnum.View
          ? 'hugeicons:property-view'
          : 'hugeicons:property-new',
      iconClass:
        type === ViewSchemaEnum.View ? 'text-green-700' : 'text-orange-500',
      data: {
        tabViewType: TabViewType.ViewDetail,
        itemValue: {
          title: name,
          name,
          id: oid,
          tabViewType: TabViewType.ViewDetail,
          icon:
            type === ViewSchemaEnum.View
              ? 'hugeicons:property-view'
              : 'hugeicons:property-new',
          iconClass:
            type === ViewSchemaEnum.View ? 'text-green-700' : 'text-orange-500',
        },
      },
    };

    nodes[SchemaFolderType.Views].children!.push(nodeId);
  });

  if (debouncedSearch.value) {
    const query = debouncedSearch.value.toLowerCase();
    const filtered: Record<string, FileNode> = {};

    [
      SchemaFolderType.Functions,
      SchemaFolderType.Tables,
      SchemaFolderType.Views,
    ].forEach(folderId => {
      const folder = nodes[folderId];
      if (!folder) return;

      const matchingChildren = folder.children?.filter(childId => {
        const child = nodes[childId];
        return child?.name.toLowerCase().includes(query);
      });

      if (matchingChildren && matchingChildren.length > 0) {
        filtered[folderId] = {
          ...folder,
          children: matchingChildren,
        };

        matchingChildren.forEach(childId => {
          filtered[childId] = nodes[childId];
        });
      }
    });

    return filtered;
  }

  return nodes;
});

const hasTreeData = computed(() => Object.keys(fileTreeData.value).length > 0);

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

const onToggleCollapse = () => {
  if (!fileTreeRef.value) return;

  if (isTreeCollapsed.value) {
    fileTreeRef.value.expandAll();
    isTreeCollapsed.value = false;
  } else {
    fileTreeRef.value.collapseAll();
    isTreeCollapsed.value = true;
  }
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

const handleTreeClick = async (nodeId: string) => {
  const node = fileTreeData.value[nodeId];
  if (!node) return;

  const tabViewType: TabViewType | undefined = node.data?.tabViewType as
    | TabViewType
    | undefined;

  const itemValue = (node.data as any)?.itemValue as
    | {
        id?: string | number;
        icon?: string;
        iconClass?: string;
        tabViewType?: TabViewType;
        name?: string;
        title?: string;
      }
    | undefined;

  if (!schemaId.value || !tabViewType) {
    return;
  }

  let routeName: RouteNameFromPath<RoutePathSchema> | null = null;
  let routeParams: Record<string, any> | undefined;

  const tabId = `${node.name}-${schemaId.value}`;

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
      functionName: String(itemValue?.id ?? node.id ?? ''),
      schemaName: schemaId.value || '',
    };
  }

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
    tabViewType === TabViewType.ViewDetail
      ? String(itemValue?.id ?? node.id ?? '')
      : undefined;

  if (routeName) {
    const icon =
      itemValue?.icon ||
      node.iconOpen ||
      node.iconClose ||
      'hugeicons:grid-table';
    await tabViewStore.openTab({
      icon,
      iconClass: itemValue?.iconClass || node.iconClass,
      id: tabId,
      name: node.name,
      type: tabViewType,
      routeName,
      routeParams,
      connectionId: connectionId.value,
      schemaId: schemaId.value || '',
      workspaceId: workspaceId.value || '',
      tableName: node.name,
      virtualTableId,
      treeNodeId: node.id,
    });

    await tabViewStore.selectTab(tabId);
  }
};

const handleTreeContextMenu = (nodeId: string, event: MouseEvent) => {
  const node = fileTreeData.value[nodeId];
  if (!node) return;

  const itemValue = (node.data as any)?.itemValue || {
    title: node.name,
    name: node.name,
    id: node.id,
    tabViewType: (node.data as any)?.tabViewType,
    icon: node.iconOpen || node.iconClose,
    iconClass: node.iconClass,
  };

  // Reuse existing context menu helper signature
  onRightClickItem(event, { value: itemValue } as any);
};

watch(
  () => tabViewStore.activeTab,
  activeTab => {
    console.log('🚀 ~ activeTab:', activeTab);

    if (
      activeTab?.type === TabViewType.TableDetail ||
      activeTab?.type === TabViewType.TableOverview ||
      activeTab?.type === TabViewType.ViewDetail ||
      activeTab?.type === TabViewType.ViewOverview ||
      activeTab?.type === TabViewType.FunctionsDetail ||
      activeTab?.type === TabViewType.FunctionsOverview
    ) {
      const nodeId = activeTab.treeNodeId;

      console.log('🚀 ~ activeTab:::', nodeId);

      if (typeof nodeId === 'string' && !fileTreeRef.value?.isMouseInside) {
        fileTreeRef.value?.focusItem(nodeId);
      }
    }
  },
  { flush: 'post', immediate: true }
);
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
            <Button size="iconSm" variant="ghost" @click="onToggleCollapse">
              <Icon
                name="hugeicons:plus-minus"
                class="size-4! min-w-4 text-muted-foreground"
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {{ isTreeCollapsed ? 'Expand All' : 'Collapse All' }}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger as-child>
            <Button size="iconSm" variant="ghost" @click="onRefreshSchema">
              <Icon
                name="hugeicons:redo"
                :class="[
                  'size-4! min-w-4 stroke-amber-400! text-muted-foreground',
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
      v-if="!hasTreeData"
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
          ref="fileTreeRef"
          :initial-data="fileTreeData"
          :allow-drag-and-drop="false"
          :delay-focus="0"
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
