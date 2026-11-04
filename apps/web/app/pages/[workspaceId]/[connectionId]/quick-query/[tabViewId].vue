<script setup lang="ts">
import {
  LazyFunctionDetail,
  LazyFunctionOverview,
  LazyMacroDetail,
  LazyQuickQuery,
  LazyTableOverview,
  LazyViewOverview,
} from '#components';
import { DEFAULT_MAX_KEEP_ALIVE } from '#shared/constants';
import { isSqlFamilyConnection } from '#shared/constants/connection-capabilities';
import { DatabaseClientType } from '#shared/constants/database-client-type';
import { EConnectionMethod } from '#shared/types/entities/connection.entity';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';
import { useTabViewsStore } from '~/core/stores/useTabViewsStore';
import { TabViewType } from '~/core/stores/useTabViewsStore';

definePageMeta({
  keepalive: {
    max: DEFAULT_MAX_KEEP_ALIVE,
  },
});

const route = useRoute('workspaceId-connectionId-quick-query-tabViewId');
const tabViewStore = useTabViewsStore();
const { tabViews } = storeToRefs(tabViewStore);
const connectionStore = useManagementConnectionStore();

const tabInfo = computed(() =>
  tabViews.value.find(t => t.id === route.params.tabViewId)
);

const selectedConnection = computed(() => connectionStore.selectedConnection);

const isSqlFamily = computed(() =>
  isSqlFamilyConnection(
    selectedConnection.value ?? {
      type: DatabaseClientType.POSTGRES,
      method: EConnectionMethod.STRING,
    }
  )
);

watchEffect(() => {
  if (!selectedConnection.value || isSqlFamily.value) {
    return;
  }

  navigateTo(
    {
      name: 'workspaceId-connectionId',
      params: {
        workspaceId: route.params.workspaceId,
        connectionId: route.params.connectionId,
      },
      replace: true,
    },
    { replace: true }
  );
});

const isDuckDbTab = computed(
  () =>
    connectionStore.connections.find(c => c.id === tabInfo.value?.connectionId)
      ?.type === DatabaseClientType.DUCKDB
);

const activeComponent = computed(() => {
  if (!tabInfo.value || !isSqlFamily.value) return null;

  switch (tabInfo.value.type) {
    case TabViewType.TableDetail:
    case TabViewType.ViewDetail:
    case TabViewType.CodeQuery:
      return LazyQuickQuery;
    case TabViewType.TableOverview:
      return LazyTableOverview;
    case TabViewType.FunctionsOverview:
      return LazyFunctionOverview;
    case TabViewType.ViewOverview:
      return LazyViewOverview;
    case TabViewType.FunctionsDetail:
      return isDuckDbTab.value ? LazyMacroDetail : LazyFunctionDetail;
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
  <BaseEmpty
    v-else
    title="Tab view not found"
    desc="The requested tab could not be found. Please close this tab and try again."
  />
</template>
