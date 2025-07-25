<script setup lang="ts">
import { refDebounced, templateRef } from '@vueuse/core';
import type { RouteNameFromPath, RoutePathSchema } from '@typed-router/__paths';
import { on } from 'events';
import { tree } from '~/components/base/Tree';
import TreeFolder from '~/components/base/Tree/TreeFolder.vue';
import { useAppContext } from '~/shared/contexts/useAppContext';
import { useActivityBarStore } from '~/shared/stores';
import { TabViewType } from '~/shared/stores/useTabViewsStore';
import { DEFAULT_DEBOUNCE_INPUT } from '~/utils/constants';

const { schemaStore, onConnectToConnection, wsStateStore, tabViewStore } =
  useAppContext();
const { activeSchema } = toRefs(schemaStore);
const { connectionId, workspaceId } = toRefs(wsStateStore);

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
          icon: 'hugeicons:hierarchy-square-02',
          paths: [SchemaFolderType.Tables, tableName],
          tabViewType: TabViewType.TableDetail,
        })),
      ],
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
  await onConnectToConnection(connectionId.value);

  isRefreshing.value = false;
};

// Navigation functions
const onNavigateToErdDiagram = async (tableId: string) => {
  if (!workspaceId.value) {
    throw new Error('No workspace selected');
    return;
  }
  navigateTo({
    name: 'workspaceId-schemas-erd-tableId',
    params: { tableId, workspaceId: workspaceId.value },
  });
};
const onNavigateToOverviewErdDiagram = async (tableId: string) => {
  if (!workspaceId.value) {
    throw new Error('No workspace selected');
    return;
  }
  navigateTo({
    name: 'workspaceId-schemas-erd',
    params: { workspaceId: workspaceId.value },
  });
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
        <ModulesSelectorsConnectionSelector class="w-full!" />
      </div>

      <div>
        <p
          class="text-sm font-medium text-muted-foreground leading-none block pb-1"
        >
          Schemas
        </p>
        <ModulesSelectorsSchemaSelector class="w-full!" />
      </div>
    </div>

    <div class="px-2 pt-2 flex items-center justify-between">
      <p class="text-sm font-medium text-muted-foreground leading-none">
        Schemas
      </p>

      <div class="flex items-center">
        <Button size="iconSm" variant="ghost" @click="onRefreshSchema">
          <Icon
            name="lucide:refresh-ccw"
            :class="[
              'size-4! min-w-4 text-muted-foreground',
              isRefreshing && 'animate-spin',
            ]"
          />
        </Button>
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
      v-on:clickTreeItem="
        async (_, item) => {
          let routeName: RouteNameFromPath<RoutePathSchema> | null = null;
          const tabViewType: TabViewType = (item.value as any).tabViewType;
          if (tabViewType === TabViewType.TableOverview) {
            onNavigateToOverviewErdDiagram(item.value.title);
            return;
            routeName = 'workspaceId-schemas-quick-query-over-view-tables';
          }
          onNavigateToErdDiagram(item.value.title);
          return;
          // const tabViewType: TabViewType = (item.value as any).tabViewType;

          let routeParams;

          if (tabViewType === TabViewType.FunctionsOverview) {
            routeName = 'workspaceId-schemas-quick-query-over-view-functions';
          }

          if (tabViewType === TabViewType.TableOverview) {
            routeName = 'workspaceId-schemas-quick-query-over-view-tables';
          }

          if (tabViewType === TabViewType.FunctionsDetail) {
            routeName =
              'workspaceId-schemas-quick-query-function-detail-functionId';

            routeParams = {
              functionId: item.value.title,
            };
          }

          if (tabViewType === TabViewType.TableDetail) {
            routeName = 'workspaceId-schemas-quick-query-table-detail-tableId';

            routeParams = {
              tableId: item.value.title,
            };
          }

          if (routeName) {
            await tabViewStore.openTab({
              icon: item.value.icon,
              id: item.value.title,
              name: item.value.title,
              type: (item.value as any).tabViewType,
              routeName: routeName,
              routeParams,
            });

            await tabViewStore.selectTab(item.value.title);
          }
        }
      "
    >
      <!-- <template #extra-actions="{ item }">
        <div
          class="flex items-center"
          v-if="item.value.paths.includes('Tables')"
        >
          <Button
            size="iconSm"
            class="hover:bg-background/80!"
            variant="ghost"
            @click.stop="onNavigateToErdDiagram(item.value.title)"
          >
            <Icon
              name="raphael:diagram"
              class="size-4! min-w-4 text-muted-foreground"
            />
          </Button>
        </div>
      </template> -->
    </TreeFolder>
  </div>
</template>
