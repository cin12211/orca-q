<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { RabbitWorkspace } from '~/components/modules/rabbitmq-workspace';
import { DEFAULT_MAX_KEEP_ALIVE } from '~/core/constants';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';
import { useTabViewsStore } from '~/core/stores/useTabViewsStore';

definePageMeta({
  keepalive: {
    max: DEFAULT_MAX_KEEP_ALIVE,
  },
  notAllowBottomPanel: true,
  notAllowRightPanel: true,
});

const route = useRoute('workspaceId-connectionId-rabbitmq-tabViewId');
const tabViewStore = useTabViewsStore();
const connectionStore = useManagementConnectionStore();
const { tabViews } = storeToRefs(tabViewStore);

const tabInfo = computed(() =>
  tabViews.value.find(tab => tab.id === route.params.tabViewId)
);
</script>

<template>
  <RabbitWorkspace
    v-if="connectionStore.selectedConnection && tabInfo"
    :connection="connectionStore.selectedConnection"
    :tab-info="tabInfo"
  />
</template>
