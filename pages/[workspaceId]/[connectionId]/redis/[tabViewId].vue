<script setup lang="ts">
import RedisWorkspace from '~/components/modules/redis-workspace/RedisWorkspace.vue';
import { DEFAULT_MAX_KEEP_ALIVE } from '~/core/constants';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';
import { useTabViewsStore } from '~/core/stores/useTabViewsStore';

definePageMeta({
  keepalive: {
    max: DEFAULT_MAX_KEEP_ALIVE,
  },
});

const route = useRoute('workspaceId-connectionId-redis-tabViewId');
const tabViewStore = useTabViewsStore();
const connectionStore = useManagementConnectionStore();
const { tabViews } = storeToRefs(tabViewStore);

const tabInfo = computed(() =>
  tabViews.value.find(tab => tab.id === route.params.tabViewId)
);
</script>

<template>
  <RedisWorkspace
    :connection="connectionStore.selectedConnection"
    :tab-info="tabInfo"
  />
</template>
