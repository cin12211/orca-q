<script setup lang="ts">
import { Empty } from '#components';
import QuickQuery from '~/components/modules/quick-query/QuickQuery.vue';
import { DEFAULT_MAX_KEEP_ALIVE } from '~/core/constants';
import { useAppContext } from '~/core/contexts';

definePageMeta({
  keepalive: {
    max: DEFAULT_MAX_KEEP_ALIVE,
  },
});

const route = useRoute('workspaceId-connectionId-quick-query-tabViewId');
const { tabViewStore } = useAppContext();
const { tabViews } = storeToRefs(tabViewStore);

const tabInfo = computed(() =>
  tabViews.value.find(t => t.id === route.params.tabViewId)
);
</script>

<template>
  <QuickQuery
    v-if="tabInfo"
    :connection-id="tabInfo.connectionId"
    :workspace-id="route.params.workspaceId"
    :schema-name="tabInfo.schemaId || ''"
    :table-name="tabInfo.tableName || ''"
    :tab-view-type="tabInfo.type"
    :virtual-table-id="tabInfo.virtualTableId"
  />
  <Empty v-else>
    <EmptyTitle> Tab view not found </EmptyTitle>
    <EmptyDescription> Close this tab and try again </EmptyDescription>
  </Empty>
</template>
