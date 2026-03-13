<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
import { Empty } from '#components';
import { DEFAULT_MAX_KEEP_ALIVE } from '~/core/constants';
import { useAppContext } from '~/core/contexts';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';
import { TabViewType } from '~/core/stores/useTabViewsStore';

definePageMeta({
  keepalive: {
    max: DEFAULT_MAX_KEEP_ALIVE,
  },
});

const route = useRoute('workspaceId-connectionId-agent-tabViewId');
const { tabViewStore } = useAppContext();
const { tabViews } = storeToRefs(tabViewStore);
const connectionStore = useManagementConnectionStore();

const AgentWorkspace = defineAsyncComponent(
  () => import('~/components/modules/agent/AgentWorkspace.vue')
);

const tabInfo = computed(() =>
  tabViews.value.find(t => t.id === route.params.tabViewId)
);

const activeComponent = computed(() => {
  if (!tabInfo.value) return null;

  switch (tabInfo.value.type) {
    case TabViewType.AgentChat:
      return AgentWorkspace;
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
      <Empty v-else>
        <EmptyTitle> Tab view not found </EmptyTitle>
        <EmptyDescription> Close this tab and try again </EmptyDescription>
      </Empty>
    </div>
  </div>
</template>
