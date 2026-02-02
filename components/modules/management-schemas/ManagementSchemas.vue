<script setup lang="ts">
import { refDebounced, templateRef } from '@vueuse/core';
import type { RouteNameFromPath, RoutePathSchema } from '@typed-router/__paths';
import {
  TreeManager,
  type FlattenedTreeFileSystemItem,
  type TreeFileSystemItem,
} from '~/components/base/Tree';
import TreeFolder from '~/components/base/Tree/TreeFolder.vue';
import BaseContextMenu from '~/components/base/context-menu/BaseContextMenu.vue';
import SafeModeConfirmDialog from '~/components/modules/quick-query/SafeModeConfirmDialog.vue';
import { useAppContext } from '~/shared/contexts/useAppContext';
import { useActivityBarStore } from '~/shared/stores';
import { TabViewType } from '~/shared/stores/useTabViewsStore';
import { FunctionSchemaEnum, ViewSchemaEnum } from '~/shared/types';
import { DEFAULT_DEBOUNCE_INPUT } from '~/utils/constants';
import { getFormatParameters } from '~/utils/sql-generators';
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

const items = computed(() => {
  const tables = activeSchema?.value?.tables || [];
  const functions = activeSchema?.value?.functions || [];

  const views = activeSchema?.value?.views || [];

  //TODO: split logic to utiles
  const formatFunctionName = (name: string, parameters: string) => {
    const formatParameters = getFormatParameters(parameters);

    return `${name}(${formatParameters})`;
  };

  const treeItems: TreeFileSystemItem[] = [
    {
      title: 'Functions',
      icon: 'material-icon-theme:folder-functions-open',
      closeIcon: 'material-icon-theme:folder-functions',
      path: SchemaFolderType.Functions,
      id: SchemaFolderType.Functions,
      tabViewType: TabViewType.FunctionsOverview,
      children: [
        ...functions.map(({ name, oId, type, parameters }) => ({
          title: formatFunctionName(name, parameters),
          parameters,
          name: name,
          id: oId,
          icon: 'gravity-ui:function',
          path: `${SchemaFolderType.Functions}/${oId}`,
          tabViewType: TabViewType.FunctionsDetail,
          isFolder: false,
          iconClass:
            type === FunctionSchemaEnum.Function
              ? 'text-blue-400'
              : 'text-orange-400',
        })),
      ],
      isFolder: true,
    },
    {
      title: 'Tables',
      id: SchemaFolderType.Tables,
      icon: 'material-icon-theme:folder-database-open',
      closeIcon: 'material-icon-theme:folder-database',
      path: SchemaFolderType.Tables,
      tabViewType: TabViewType.TableOverview,
      children: [
        ...tables.map(tableName => ({
          title: tableName,
          name: tableName,
          id: tableName,
          icon: 'hugeicons:grid-table',
          iconClass: 'text-yellow-400',
          path: `${SchemaFolderType.Tables}/${tableName}`,
          tabViewType: TabViewType.TableDetail,
          isFolder: false,
        })),
      ],
      isFolder: true,
    },
    {
      title: 'Views',
      id: SchemaFolderType.Views,
      icon: 'material-icon-theme:folder-enum-open',
      closeIcon: 'material-icon-theme:folder-enum',
      path: SchemaFolderType.Views,
      tabViewType: TabViewType.ViewOverview,
      children: [
        ...views.map(({ name, oid, type }) => ({
          title: name,
          id: oid,
          icon:
            type === ViewSchemaEnum.View
              ? 'hugeicons:property-view'
              : 'hugeicons:property-new',
          iconClass:
            type === ViewSchemaEnum.View ? 'text-green-700' : 'text-orange-500',
          path: `${SchemaFolderType.Views}/${name}`,
          tabViewType: TabViewType.ViewDetail,
          isFolder: false,
        })),
      ],
      isFolder: true,
    },
  ];

  if (!debouncedSearch.value) {
    return treeItems;
  }

  const tree = new TreeManager([]);

  tree.tree = treeItems;

  return tree.searchByTitle(debouncedSearch.value);
});

const activityBarStore = useActivityBarStore();
const { schemasExpandedState, schemaCurrentScrollTop } =
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
      v-if="!items.length"
      class="flex flex-col items-center h-full justify-center"
    >
      No data!
    </div>

    <!-- Context Menu Wrapper -->
    <BaseContextMenu
      :context-menu-items="contextMenuItems"
      @on-clear-context-menu="selectedItem = null"
    >
      <TreeFolder
        v-model:explorerFiles="items"
        v-model:expandedState="schemasExpandedState"
        :isShowArrow="true"
        :isExpandedByArrow="true"
        :onRightClickItem="onRightClickItem"
        v-on:clickTreeItem="onHandleOpenTab"
      />
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
