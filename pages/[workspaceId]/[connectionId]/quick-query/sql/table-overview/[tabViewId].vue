<script setup lang="ts">
import TableOverview from '~/components/modules/quick-query/TableOverview.vue';
import { useSqlFamilyRouteGuard } from '~/core/composables/useSqlFamilyRouteGuard';
import { useTabViewPage } from '~/core/composables/useTabViewPage';
import { DEFAULT_MAX_KEEP_ALIVE } from '~/core/constants';

definePageMeta({
  keepalive: {
    max: DEFAULT_MAX_KEEP_ALIVE,
  },
});

useSqlFamilyRouteGuard();

const { tabInfo } = useTabViewPage();
</script>

<template>
  <TableOverview v-if="tabInfo" :connection-id="tabInfo.connectionId" />
  <TabViewNotFound v-else />
</template>
