<script setup lang="ts">
import { refDebounced, templateRef } from '@vueuse/core';
import type { RouteNameFromPath, RoutePathSchema } from '@typed-router/__paths';
import { tree, type FlattenedTreeFileSystemItem } from '~/components/base/Tree';
import TreeFolder from '~/components/base/Tree/TreeFolder.vue';
import { useAppContext } from '~/shared/contexts/useAppContext';
import { useActivityBarStore } from '~/shared/stores';
import { TabViewType } from '~/shared/stores/useTabViewsStore';
import { DEFAULT_DEBOUNCE_INPUT } from '~/utils/constants';
import ConnectionSelector from '../selectors/ConnectionSelector.vue';
import SchemaSelector from '../selectors/SchemaSelector.vue';

const { schemaStore, connectToConnection, wsStateStore, tabViewStore } =
  useAppContext();
const { activeSchema } = toRefs(schemaStore);
const { connectionId, schemaId, workspaceId } = toRefs(wsStateStore);

const isRefreshing = ref(false);

const searchInput = shallowRef('');
const debouncedSearch = refDebounced(searchInput, DEFAULT_DEBOUNCE_INPUT);

const treeFolderRef = templateRef('treeFolderRef');

enum SchemaFolderType {
  Tables = 'Tables',
  Functions = 'Functions',
  Views = 'Views',
}

const items = computed(() => {
  const tables = activeSchema?.value?.tables || [];
  const functions = activeSchema?.value?.functions || [];
  const views = activeSchema?.value?.views || [];

  const treeItems = [
    {
      title: 'Functions',
      icon: 'material-icon-theme:folder-functions-open',
      closeIcon: 'material-icon-theme:folder-functions',
      paths: [SchemaFolderType.Functions],
      tabViewType: TabViewType.FunctionsOverview,
      id: SchemaFolderType.Functions,
      children: [
        ...functions.map(functionName => ({
          title: functionName,
          id: functionName,
          icon: 'vscode-icons:file-type-haskell',
          paths: [SchemaFolderType.Functions, functionName],
          tabViewType: TabViewType.FunctionsDetail,
          isFolder: false,
        })),
      ],
      isFolder: true,
    },
    {
      title: 'Tables',
      id: SchemaFolderType.Tables,
      icon: 'material-icon-theme:folder-database-open',
      closeIcon: 'material-icon-theme:folder-database',
      paths: [SchemaFolderType.Tables],
      tabViewType: TabViewType.TableOverview,
      children: [
        ...tables.map(tableName => ({
          title: tableName,
          id: tableName,
          icon: 'vscode-icons:file-type-sql',
          paths: [SchemaFolderType.Tables, tableName],
          tabViewType: TabViewType.TableDetail,
          isFolder: false,
        })),
      ],
      isFolder: true,
    },
    {
      title: 'Views',
      id: SchemaFolderType.Views,
      icon: 'material-icon-theme:folder-database-open',
      closeIcon: 'material-icon-theme:folder-database',
      paths: [SchemaFolderType.Views],
      tabViewType: TabViewType.ViewOverview,
      children: [
        ...views.map(viewName => ({
          title: viewName,
          id: viewName,
          icon: 'vscode-icons:file-type-sql',
          paths: [SchemaFolderType.Views, viewName],
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

  return tree.filterByTitle({
    data: treeItems,
    title: debouncedSearch.value,
  });
});

const activityBarStore = useActivityBarStore();
const { schemasExpandedState, schemaCurrentScrollTop } =
  toRefs(activityBarStore);

onMounted(() => {
  nextTick(() => {
    const el = treeFolderRef.value?.$el as HTMLElement | undefined;

    if (!el) {
      return;
    }

    el.scrollTo({
      top: schemaCurrentScrollTop.value,
    });

    el.onscroll = () => {
      schemaCurrentScrollTop.value = el.scrollTop || 0;
    };
  });
});

onActivated(() => {
  nextTick(() => {
    treeFolderRef.value?.$el?.scrollTo({
      top: schemaCurrentScrollTop.value,
    });
  });
});

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

const onHandleOpenTab = async (
  _: MouseEvent,
  item: FlattenedTreeFileSystemItem
) => {
  const tabViewType: TabViewType = (item.value as any).tabViewType;

  let routeName: RouteNameFromPath<RoutePathSchema> | null = null;
  let routeParams;

  if (tabViewType === TabViewType.FunctionsOverview) {
    routeName =
      'workspaceId-connectionId-quick-query-function-over-view' as unknown as any;
  }

  if (tabViewType === TabViewType.TableOverview) {
    routeName =
      'workspaceId-connectionId-quick-query-table-over-view' as unknown as any;
  }

  if (tabViewType === TabViewType.FunctionsDetail) {
    routeName =
      'workspaceId-connectionId-quick-query-function-over-view-functionName';

    routeParams = {
      functionName: item.value.title,
      schemaName: schemaId.value || '',
    };
  }

  if (!schemaId.value) {
    return;
  }

  const tabId = `${item.value.title}-${schemaId.value}`;

  //TODO: refactor route to tabId
  if (tabViewType === TabViewType.TableDetail) {
    routeName = 'workspaceId-connectionId-quick-query-tabViewId';

    routeParams = {
      tabViewId: tabId,
    };
  }

  if (routeName) {
    await tabViewStore.openTab({
      icon: item.value.icon,
      id: tabId,
      name: item.value.title,
      type: (item.value as any).tabViewType,
      routeName,
      routeParams,
      connectionId: connectionId.value,
      schemaId: schemaId.value || '',
      workspaceId: workspaceId.value || '',
      tableName: item.value.title,
    });

    await tabViewStore.selectTab(tabId);
  }
};
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

    <TreeFolder
      ref="treeFolderRef"
      v-model:explorerFiles="items"
      v-model:expandedState="schemasExpandedState"
      :isShowArrow="true"
      :isExpandedByArrow="true"
      v-on:clickTreeItem="onHandleOpenTab"
    />
  </div>
</template>
