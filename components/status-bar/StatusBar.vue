<script setup lang="ts">
import { useAppContext } from '~/shared/contexts/useAppContext';
import { useChangelogModal } from '~/shared/contexts/useChangelogModal';
import { TabViewType } from '~/shared/stores';
import CurrentPositionPath from './CurrentPositionPath.vue';

// import ConnectionMetricMonitor from './ConnectionMetricMonitor.vue';

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

const formattedTabType = computed(() => {
  const type = activeTab.value?.type;
  if (!type) return '';

  switch (type) {
    case TabViewType.AllERD:
    case TabViewType.DetailERD:
      return 'erd';

    case TabViewType.TableOverview:
    case TabViewType.TableDetail:
      return 'table';

    case TabViewType.FunctionsOverview:
    case TabViewType.FunctionsDetail:
      return 'func';

    case TabViewType.ViewOverview:
    case TabViewType.ViewDetail:
      return 'view';

    case TabViewType.CodeQuery:
      return 'raw query';

    default:
      return '';
  }
});
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

    <div class="text-muted-foreground text-xs" v-if="activeTab">
      {{ formattedTabType }}:
      <p class="text-black/80 inline">
        {{ activeTab?.schemaId ? `${activeTab?.schemaId}.` : ''
        }}{{ activeTab?.name }}
      </p>
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
