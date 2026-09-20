<script setup lang="ts">
import FunctionDetail from '~/components/modules/quick-query/FunctionDetail.vue';
import { useSqlFamilyRouteGuard } from '~/core/composables/useSqlFamilyRouteGuard';
import { useTabViewPage } from '~/core/composables/useTabViewPage';
import { DEFAULT_MAX_KEEP_ALIVE } from '~/core/constants';
import type { FunctionDetailMetadata } from '~/core/types/entities/tab-view.entity';

definePageMeta({
  keepalive: {
    max: DEFAULT_MAX_KEEP_ALIVE,
  },
});

useSqlFamilyRouteGuard();

const { metadata, tabInfo } = useTabViewPage<FunctionDetailMetadata>();
</script>

<template>
  <FunctionDetail
    v-if="tabInfo"
    :connection-id="tabInfo.connectionId"
    :function-id="metadata?.functionId || ''"
  />
  <TabViewNotFound v-else />
</template>
