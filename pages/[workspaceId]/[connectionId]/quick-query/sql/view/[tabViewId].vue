<script setup lang="ts">
import QuickQuery from '~/components/modules/quick-query/QuickQuery.vue';
import { useSqlFamilyRouteGuard } from '~/core/composables/useSqlFamilyRouteGuard';
import { useTabViewPage } from '~/core/composables/useTabViewPage';
import { DEFAULT_MAX_KEEP_ALIVE } from '~/core/constants';
import { TabViewType } from '~/core/stores/useTabViewsStore';
import type { ViewDetailMetadata } from '~/core/types/entities/tab-view.entity';

definePageMeta({
  keepalive: {
    max: DEFAULT_MAX_KEEP_ALIVE,
  },
});

useSqlFamilyRouteGuard();

const { metadata, tabInfo, workspaceId } = useTabViewPage<ViewDetailMetadata>();
</script>

<template>
  <QuickQuery
    v-if="tabInfo"
    :connection-id="tabInfo.connectionId"
    :workspace-id="workspaceId"
    :schema-name="tabInfo.schemaId || ''"
    :table-name="metadata?.tableName || ''"
    :tab-view-type="TabViewType.ViewDetail"
    :virtual-table-id="metadata?.virtualTableId"
  />
  <TabViewNotFound v-else />
</template>
