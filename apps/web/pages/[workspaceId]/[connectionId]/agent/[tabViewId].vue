<script setup lang="ts">
import { LazyAgentWorkspace } from '#components';
import { DEFAULT_MAX_KEEP_ALIVE } from '~/core/constants';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';
import { useTabViewsStore } from '~/core/stores/useTabViewsStore';
import { TabViewType } from '~/core/stores/useTabViewsStore';

definePageMeta({
  keepalive: {
    max: DEFAULT_MAX_KEEP_ALIVE,
  },
  notAllowBottomPanel: true,
  notAllowRightPanel: true,
});

const route = useRoute('workspaceId-connectionId-agent-tabViewId');
const tabViewStore = useTabViewsStore();
const { tabViews } = storeToRefs(tabViewStore);
const connectionStore = useManagementConnectionStore();

const tabInfo = computed(() =>
  tabViews.value.find(t => t.id === route.params.tabViewId)
);

const activeComponent = computed(() => {
  if (!tabInfo.value) return null;

  switch (tabInfo.value.type) {
    case TabViewType.AgentChat:
      return LazyAgentWorkspace;
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
    tabViewType: tabInfo.value.type,
    connections: connectionStore.connections,
  };
});
</script>

<template>
  <div class="h-full w-full flex">
    <div class="flex-1 min-w-0 w-full">
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
    </div>
  </div>
</template>
