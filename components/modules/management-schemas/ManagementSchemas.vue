<script setup lang="ts">
import { refDebounced, templateRef } from '@vueuse/core';
import type { RouteNameFromPath, RoutePathSchema } from '@typed-router/__paths';
import { tree } from '~/components/base/Tree';
import TreeFolder from '~/components/base/Tree/TreeFolder.vue';
import { useAppContext } from '~/shared/contexts/useAppContext';
import { useActivityBarStore } from '~/shared/stores';
import {
  TabViewType,
  useManagementViewContainerStore,
} from '~/shared/stores/useManagementViewContainerStore';

const { schemaStore } = useAppContext();

const searchInput = shallowRef('');
const debouncedSearch = refDebounced(searchInput, 250);

const treeFolderRef = templateRef('treeFolderRef');

const items = computed(() => {
  const tables = schemaStore.currentSchema?.tables || [];
  const functions = schemaStore.currentSchema?.functions || [];
  const views = schemaStore.currentSchema?.views || [];

  const treeItems = [
    {
      title: 'Functions',
      icon: 'material-icon-theme:folder-functions-open',
      closeIcon: 'material-icon-theme:folder-functions',
      paths: ['Functions'],
      tabViewType: TabViewType.FunctionsOverview,
      id: 'Functions',
      children: [
        ...functions.map(functionName => ({
          title: functionName,
          id: functionName,
          icon: 'vscode-icons:file-type-haskell',
          paths: ['Functions', functionName],
          tabViewType: TabViewType.FunctionsDetail,
        })),
      ],
    },
    {
      title: 'Tables',
      id: 'Tables',
      icon: 'material-icon-theme:folder-database-open',
      closeIcon: 'material-icon-theme:folder-database',
      paths: ['Tables'],
      tabViewType: TabViewType.TableOverview,
      children: [
        ...tables.map(tableName => ({
          title: tableName,
          id: tableName,
          icon: 'vscode-icons:file-type-sql',
          paths: ['Tables', tableName],
          tabViewType: TabViewType.TableDetail,
        })),
      ],
    },
    {
      title: 'Views',
      id: 'Views',
      icon: 'material-icon-theme:folder-database-open',
      closeIcon: 'material-icon-theme:folder-database',
      paths: ['Views'],
      tabViewType: TabViewType.ViewOverview,
      children: [
        ...views.map(viewName => ({
          title: viewName,
          id: viewName,
          icon: 'vscode-icons:file-type-sql',
          paths: ['Vies', viewName],
          tabViewType: TabViewType.ViewDetail,
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

const tabsStore = useManagementViewContainerStore();

const activityBarStore = useActivityBarStore();
const { schemasExpandedState, schemaCurrentScrollTop } =
  toRefs(activityBarStore);

onBeforeUnmount(() => {
  console.log('treeFolderRef', treeFolderRef.value?.$el?.scrollTop);
  schemaCurrentScrollTop.value = treeFolderRef.value?.$el?.scrollTop || 0;
});

onMounted(() => {
  nextTick(() => {
    treeFolderRef.value?.$el?.scrollTo({
      top: schemaCurrentScrollTop.value,
    });
  });
});
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

      <div class="relative w-full pt-2">
        <Input
          type="text"
          placeholder="Search in all tables or functions"
          class="pr-6 w-full h-8"
          v-model="searchInput"
        />

        <div
          v-if="searchInput"
          class="absolute right-2 top-3.5 w-4 cursor-pointer hover:bg-accent"
          @click="searchInput = ''"
        >
          <Icon name="lucide:x" class="stroke-3! text-muted-foreground" />
        </div>
      </div>
    </div>

    <div class="px-2 pt-2 flex items-center justify-between">
      <p class="text-sm font-medium text-muted-foreground leading-none">
        Schemas
      </p>

      <div class="flex items-center">
        <Button size="iconSm" variant="ghost">
          <Icon
            name="lucide:refresh-ccw"
            class="size-4! min-w-4 text-muted-foreground"
          />
        </Button>
      </div>
    </div>

    <TreeFolder
      ref="treeFolderRef"
      v-model:explorerFiles="items"
      v-model:expandedState="schemasExpandedState"
      :isShowArrow="false"
      :isExpandedByArrow="false"
      v-on:clickTreeItem="
        (_, item) => {
          const tabViewType: TabViewType = (item.value as any).tabViewType;

          let routeName: RouteNameFromPath<RoutePathSchema> | null = null;
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
            tabsStore.openTab({
              icon: item.value.icon,
              id: item.value.title,
              name: item.value.title,
              type: (item.value as any).tabViewType,
              routeName: routeName,
              routeParams,
            });

            tabsStore.selectTab(item.value.title);
          }
        }
      "
    >
      <!-- <template #extra-actions="{ item }">
        <div
          class="flex items-center"
          v-if="item.value.paths.includes('Tables')"
        >
          <Button size="iconSm" class="hover:bg-background/80!" variant="ghost">
            <Icon
              name="raphael:diagram"
              class="size-4! min-w-4 text-muted-foreground"
            />
          </Button>

          <Button size="iconSm" class="hover:bg-background/80!" variant="ghost">
            <Icon
              name="lucide:table"
              class="size-4! min-w-4 text-muted-foreground"
            />
          </Button>
        </div>
      </template> -->
    </TreeFolder>
  </div>
</template>
