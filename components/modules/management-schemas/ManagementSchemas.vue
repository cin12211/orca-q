<script setup lang="ts">
import type { RouteNameFromPath, RoutePathSchema } from '@typed-router/__paths';
import { useCurrentWorkspaceId } from '~/shared/contexts/useGetWorkspaceId';
import {
  TabViewType,
  useManagementViewContainerStore,
} from '~/shared/stores/useManagementViewContainerStore';
import TreeFolder from '../management-explorer/TreeFolder.vue';

const expandedState = ref<string[]>(['Tables']);

// const dataBaseNames = await useFetch("/api/get-database-names");
// const schemas = await useFetch("/api/get-schemas");
const tables = await useFetch('/api/get-tables');
const functions = await useFetch('/api/get-functions');

const mappedTables = tables.data.value?.result?.[0]?.metadata?.tables || [];
const mappedViews = tables.data.value?.result?.[0]?.metadata?.views || [];

const mappedFunctions =
  functions.data.value?.result?.[0]?.functions_metadata || [];

const items = computed(() => [
  {
    title: 'Functions',
    icon: 'material-icon-theme:folder-functions-open',
    closeIcon: 'material-icon-theme:folder-functions',
    paths: ['Functions'],
    tabViewType: TabViewType.FunctionsOverview,
    id: 'Functions',
    children: [
      ...mappedFunctions.map(e => ({
        title: e.function_name,
        id: e.function_name,
        icon: 'vscode-icons:file-type-haskell',
        paths: ['Functions', e.function_name],
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
      ...mappedTables.map(e => ({
        title: e.table,
        id: e.table,
        icon: 'vscode-icons:file-type-sql',
        paths: ['Tables', e.table],
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
      ...mappedViews.map(e => ({
        title: e.view_name,
        id: e.view_name,
        icon: 'vscode-icons:file-type-sql',
        paths: ['Vies', e.view_name],
        tabViewType: TabViewType.ViewDetail,
      })),
    ],
  },
]);

const tabsStore = useManagementViewContainerStore();

// const workspaceId = useCurrentWorkspaceId();
</script>

<template>
  <div class="flex flex-col h-full w-full">
    <div class="relative w-full items-center px-3 pt-2">
      <div class="relative w-full">
        <!-- <Search class="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" /> -->
        <Input
          type="text"
          placeholder="Search in all tables or functions"
          class="pl-2 w-full h-8"
        />
      </div>
    </div>

    <div class="px-3 pt-2 flex items-center justify-between">
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
      v-model:explorerFiles="items"
      v-model:expandedState="expandedState"
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
