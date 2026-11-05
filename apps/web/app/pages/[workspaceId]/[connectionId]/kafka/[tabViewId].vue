<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { DEFAULT_MAX_KEEP_ALIVE } from '#shared/constants';
import { KafkaWorkspace } from '~/components/modules/kafka-workspace';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';
import { useTabViewsStore } from '~/core/stores/useTabViewsStore';

definePageMeta({
  keepalive: {
    max: DEFAULT_MAX_KEEP_ALIVE,
  },
  notAllowBottomPanel: true,
  notAllowRightPanel: true,
});

const route = useRoute('workspaceId-connectionId-kafka-tabViewId');
const tabViewStore = useTabViewsStore();
const connectionStore = useManagementConnectionStore();
const { tabViews } = storeToRefs(tabViewStore);

const tabInfo = computed(() =>
  tabViews.value.find(tab => tab.id === route.params.tabViewId)
);
</script>

<template>
  <KafkaWorkspace
    v-if="connectionStore.selectedConnection && tabInfo"
    :connection="connectionStore.selectedConnection"
    :tab-info="tabInfo"
  />
</template>
