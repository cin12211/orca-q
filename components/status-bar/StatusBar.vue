<script setup lang="ts">
import { useAppContext } from '~/shared/contexts/useAppContext';
import { useChangelogModal } from '~/shared/contexts/useChangelogModal';
import ConnectionMetricMonitor from './ConnectionMetricMonitor.vue';
import CurrentPositionPath from './CurrentPositionPath.vue';

const { tabViewStore } = useAppContext();
const { openChangelog } = useChangelogModal();

const { activeTab } = toRefs(tabViewStore);

const onBackToHome = async () => {
  await navigateTo('/');
  // setActiveWSId({
  //   connId: undefined,
  //   wsId: undefined,
  // });
};
</script>
<template>
  <div
    class="w-full h-6 min-h-6 shadow px-2 flex items-center justify-between bg-sidebar"
  >
    <div class="flex items-center gap-3 h-full">
      <div
        class="flex items-center h-full gap-0.5 hover:bg-muted px-1 rounded cursor-pointer"
        @click="onBackToHome"
      >
        <Icon name="hugeicons:home-06" class="size-4!" />
        <p class="text-xs inline">Home</p>
      </div>

      <CurrentPositionPath />
    </div>

    <div class="text-muted-foreground text-xs">
      Table :
      <p class="text-black/80 inline">{{ activeTab?.name }}</p>
    </div>

    <div class="flex items-center gap-3">
      <div
        class="flex items-center justify-center hover:bg-muted rounded cursor-pointer"
        @click="openChangelog"
        title="What's New"
      >
        <Icon name="hugeicons:notification-01" class="size-4!" />
      </div>
      <!-- <ConnectionMetricMonitor /> -->
    </div>
  </div>
</template>
