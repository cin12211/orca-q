<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useTabManagement } from '~/core/composables/useTabManagement';
import { useWorkspaceConnectionRoute } from '~/core/composables/useWorkspaceConnectionRoute';
import { useChangelogModal } from '~/core/contexts/useChangelogModal';
import { useSettingsModal } from '~/core/contexts/useSettingsModal';
import { TabViewType } from '~/core/stores';
import { useTabViewsStore } from '~/core/stores/useTabViewsStore';
import CurrentPositionPath from './CurrentPositionPath.vue';

const tabViewStore = useTabViewsStore();
const { openChangelog } = useChangelogModal();
const { openSettings } = useSettingsModal();
const { openInstanceInsightsTab } = useTabManagement();
const config = useRuntimeConfig();

const { activeTab } = storeToRefs(tabViewStore);
const { workspaceId, connectionId } = useWorkspaceConnectionRoute();

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
  await openInstanceInsightsTab();
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
    class="w-full h-6 min-h-6 shadow px-2 flex items-center justify-between bg-sidebar-accent"
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
      <p class="text-foreground inline">
        {{ activeTab?.schemaId ? `${activeTab?.schemaId}.` : ''
        }}{{ activeTab?.name }}
      </p>
    </div>

    <div class="flex items-center gap-3">
      <Tooltip>
        <TooltipTrigger as-child>
          <div
            class="flex items-center gap-1 rounded hover:bg-muted cursor-pointer"
            @click="openChangelog"
          >
            <Icon name="hugeicons:git-merge" class="size-4!" />
            <span class="text-xxs text-foreground">{{
              config.public.version
            }}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent> Version: {{ config.public.version }} </TooltipContent>
      </Tooltip>

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

      <!-- <Tooltip>
        <TooltipTrigger as-child>
          <div
            class="flex items-center justify-center hover:bg-muted rounded cursor-pointer"
            @click="openChangelog"
          >
            <Icon name="hugeicons:notification-01" class="size-4!" />
          </div>
        </TooltipTrigger>
        <TooltipContent> What's New </TooltipContent>
      </Tooltip> -->

      <Tooltip>
        <TooltipTrigger as-child>
          <div
            class="flex items-center justify-center hover:bg-muted rounded cursor-pointer"
            @click="openSettings()"
          >
            <Icon name="hugeicons:settings-01" class="size-4!" />
          </div>
        </TooltipTrigger>
        <TooltipContent> Settings (⌘,) </TooltipContent>
      </Tooltip>
    </div>
  </div>
</template>
