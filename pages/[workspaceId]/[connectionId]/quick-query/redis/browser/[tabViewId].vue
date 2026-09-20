<script setup lang="ts">
import { RedisBrowserWorkspace } from '~/components/modules/driver/redis/quick-query/containers';
import { useTabViewPage } from '~/core/composables/useTabViewPage';
import { DEFAULT_MAX_KEEP_ALIVE } from '~/core/constants';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';

definePageMeta({
  keepalive: {
    max: DEFAULT_MAX_KEEP_ALIVE,
  },
});

const connectionStore = useManagementConnectionStore();
const { tabInfo } = useTabViewPage();
</script>

<template>
  <RedisBrowserWorkspace
    :connection="connectionStore.selectedConnection"
    :tab-info="tabInfo"
  />
</template>
