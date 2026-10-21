<script setup lang="ts">
import ViewOverview from '~/components/modules/quick-query/ViewOverview.vue';
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
  <ViewOverview v-if="tabInfo" :connection-id="tabInfo.connectionId" />
  <TabViewNotFound v-else />
</template>
