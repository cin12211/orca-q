<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
import { Empty } from '#components';
import { DEFAULT_MAX_KEEP_ALIVE } from '~/core/constants';
import { useAppContext } from '~/core/contexts';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';
import { TabViewType } from '~/core/stores/useTabViewsStore';

definePageMeta({
  keepalive: {
    max: DEFAULT_MAX_KEEP_ALIVE,
  },
});

const route = useRoute('workspaceId-connectionId-quick-query-tabViewId');
const { tabViewStore } = useAppContext();
const { tabViews } = storeToRefs(tabViewStore);
const connectionStore = useManagementConnectionStore();

const QuickQuery = defineAsyncComponent(
  () => import('~/components/modules/quick-query/QuickQuery.vue')
);
const ViewOverview = defineAsyncComponent(
  () => import('~/components/modules/quick-query/ViewOverview.vue')
);
const FunctionDetail = defineAsyncComponent(
  () => import('~/components/modules/quick-query/FunctionDetail.vue')
);
const TableOverview = defineAsyncComponent(
  () => import('~/components/modules/quick-query/TableOverview.vue')
);
const FunctionOverview = defineAsyncComponent(
  () => import('~/components/modules/quick-query/FunctionOverview.vue')
);

const tabInfo = computed(() =>
  tabViews.value.find(t => t.id === route.params.tabViewId)
);

const activeComponent = computed(() => {
  if (!tabInfo.value) return null;

  switch (tabInfo.value.type) {
    case TabViewType.TableDetail:
    case TabViewType.ViewDetail:
    case TabViewType.CodeQuery:
      return QuickQuery;
    case TabViewType.TableOverview:
      return TableOverview;
    case TabViewType.FunctionsOverview:
      return FunctionOverview;
    case TabViewType.ViewOverview:
      return ViewOverview;
    case TabViewType.FunctionsDetail:
      return FunctionDetail;
    default:
      return null;
  }
});

const componentProps = computed(() => {
  if (!tabInfo.value) return {};

  return {
    connectionId: tabInfo.value.connectionId,
    workspaceId: route.params.workspaceId,
    schemaName: tabInfo.value.schemaId || '',
    tableName: tabInfo.value.metadata?.tableName || '',
    functionName: tabInfo.value.metadata?.tableName || '',
    tabViewType: tabInfo.value.type,
    virtualTableId: tabInfo.value.metadata?.virtualTableId,
    connections: connectionStore.connections,
    functionId: tabInfo.value.metadata?.functionId,
  };
});
</script>

<template>
  <component
    v-if="activeComponent"
    :is="activeComponent"
    v-bind="componentProps"
  />
  <Empty v-else>
    <EmptyTitle> Tab view not found </EmptyTitle>
    <EmptyDescription> Close this tab and try again </EmptyDescription>
  </Empty>
</template>
