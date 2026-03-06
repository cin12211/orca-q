<script setup lang="ts">
import { useAppContext } from '~/core/contexts/useAppContext';
import { useChangelogModal } from '~/core/contexts/useChangelogModal';
import { TabViewType } from '~/core/stores';
import CurrentPositionPath from './CurrentPositionPath.vue';

const { tabViewStore, wsStateStore, connectionStore } = useAppContext();
const { openChangelog } = useChangelogModal();

const { activeTab } = toRefs(tabViewStore);
const { workspaceId, connectionId } = toRefs(wsStateStore);

const canOpenInstanceInsights = computed(
  () => !!workspaceId.value && !!connectionId.value
);

const onBackToHome = async () => {
  await navigateTo('/');
  // setActiveWSId({
  //   connId: undefined,
  //   wsId: undefined,
  // });
};

const onOpenInstanceInsights = async () => {
  if (!workspaceId.value || !connectionId.value) return;

  const selectedConnection = connectionStore.connections.find(
    connection => connection.id === connectionId.value
  );
  const databaseName =
    selectedConnection?.database ||
    selectedConnection?.name ||
    'Instance Insights';
  const tabId = `instance-insights-${connectionId.value}`;

  await tabViewStore.openTab({
    workspaceId: workspaceId.value,
    connectionId: connectionId.value,
    schemaId: '',
    id: tabId,
    name: `${databaseName} - Insights`,
    icon: 'hugeicons:activity-02',
    iconClass: 'text-primary',
    type: TabViewType.InstanceInsights,
    routeName: 'workspaceId-connectionId-instance-insights',
    routeParams: {
      workspaceId: workspaceId.value,
      connectionId: connectionId.value,
    },
    metadata: {
      type: TabViewType.InstanceInsights,
    },
  });

  await tabViewStore.selectTab(tabId);
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

    case TabViewType.DatabaseTools:
      return 'db tools';

    case TabViewType.InstanceInsights:
      return 'insights';

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
      <Tooltip>
        <TooltipTrigger as-child>
          <div
            class="flex items-center h-full gap-0.5 hover:bg-muted px-1 rounded cursor-pointer"
            @click="onBackToHome"
          >
            <Icon name="hugeicons:home-06" class="size-4!" />
            <p class="text-xs inline">Home</p>
          </div>
        </TooltipTrigger>
        <TooltipContent> Back to Home </TooltipContent>
      </Tooltip>

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
      <Tooltip>
        <TooltipTrigger as-child>
          <div
            class="flex items-center justify-center hover:bg-muted rounded cursor-pointer"
            :class="!canOpenInstanceInsights && 'opacity-50 cursor-not-allowed'"
            @click="onOpenInstanceInsights"
          >
            <Icon name="hugeicons:activity-02" class="size-4!" />
          </div>
        </TooltipTrigger>
        <TooltipContent> Instance Insights </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger as-child>
          <div
            class="flex items-center justify-center hover:bg-muted rounded cursor-pointer"
            @click="openChangelog"
          >
            <Icon name="hugeicons:notification-01" class="size-4!" />
          </div>
        </TooltipTrigger>
        <TooltipContent> What's New </TooltipContent>
      </Tooltip>
    </div>
  </div>
</template>
