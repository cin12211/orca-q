<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { isElectron, isMacOS, isPWA, isTauri } from '~/core/helpers';
import { toggleTauriWindowMaximize } from '~/core/platform/tauri-window';
import { useAppConfigStore } from '~/core/stores/appConfigStore';
import { ActivityBarHorizontal } from '../../activity-bar';
import {
  getTabViewMinWidth,
  TAURI_MAC_TITLEBAR_INSET,
} from '../tabViewContainerLayout';
import TabViews from './TabViews.vue';

const props = defineProps<{
  primarySideBarWidth: number;
}>();

const route = useRoute();

const appConfigStore = useAppConfigStore();

const { isPrimarySidebarCollapsed, isSecondSidebarCollapsed } =
  storeToRefs(appConfigStore);

const isPWAApp = computed(() => isPWA());
const isElectronRuntime = computed(() => isElectron());
const isTauriRuntime = computed(() => isTauri());
const isTauriMacWindow = computed(() => isTauri() && isMacOS());

const minWidth = computed(() => {
  return getTabViewMinWidth({
    primarySideBarWidth: props.primarySideBarWidth,
    sidebarWidthPercentage: appConfigStore.layoutSize[0],
    isTauriMacWindow: isTauriMacWindow.value,
  });

  // if (isPWA()) {
  //   return `calc( ${props.primarySideBarWidth} - 6rem)`;
  // }

  // if (isElectron()) {
  //   return `calc( ${props.primarySideBarWidth} - 4.5rem)`;
  // }
  // if (isAppVersion.value) {
  //   return `calc( ${widthPercentage}% + 1px) `;
  // }
  // return `calc( ${widthPercentage}% + 1px) `;
});

const isAccessRightPanel = computed(() => {
  if (route.meta.notAllowRightPanel) return false;
  return true;
});

const onTitleBarDoubleClick = async () => {
  if (!isTauriMacWindow.value) {
    return;
  }

  await toggleTauriWindowMaximize();
};
</script>

<template>
  <div
    :class="[
      'w-screen h-9 select-none border-b pr-2 bg-sidebar-accent/50!',
      isElectronRuntime && 'electron-drag-region',
      isElectronRuntime && isPrimarySidebarCollapsed ? 'pl-[4.5rem]' : '',
      isPWAApp && isPrimarySidebarCollapsed ? 'pl-[6rem]' : '',
      isTauriMacWindow && 'pl-[4.75rem]',
      isPWAApp && 'h-10.5 header-tab-view-pwa',
    ]"
    @dblclick="onTitleBarDoubleClick"
    data-tauri-drag-region
  >
    <div
      class="flex justify-between items-center h-full"
      data-tauri-drag-region
    >
      <div
        class="window-no-drag flex items-center gap-1 h-full px-1"
        :style="{
          minWidth,
          justifyContent: !isPrimarySidebarCollapsed
            ? 'space-between'
            : 'center',
        }"
      >
        <div
          v-if="isPWAApp && !isPrimarySidebarCollapsed"
          class="vitrual-light-trafic-button"
        ></div>

        <div
          :class="[
            isElectronRuntime ? 'pl-[4.5rem]' : '',
            'flex justify-center w-full',
          ]"
          v-if="!isPrimarySidebarCollapsed"
          :data-tauri-drag-region="isTauriRuntime ? '' : undefined"
        >
          <ActivityBarHorizontal />
        </div>

        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              variant="ghost"
              size="iconSm"
              @click="appConfigStore.onToggleActivityBarPanel()"
            >
              <Icon
                name="hugeicons:sidebar-left"
                class="size-5!"
                v-if="isPrimarySidebarCollapsed"
              />
              <Icon name="hugeicons:sidebar-left-01" class="size-5!" v-else />

              <!-- <PanelLeftOpen class="size-4" v-if="isPrimarySideBarPanelCollapsed" />
          <PanelLeftClose class="size-4" v-else /> -->
            </Button>
          </TooltipTrigger>
          <TooltipContent> Toggle Sidebar </TooltipContent>
        </Tooltip>
      </div>

      <TabViews />

      <div class="window-no-drag flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              v-if="isAccessRightPanel"
              variant="ghost"
              size="iconSm"
              @click="appConfigStore.onToggleSecondSidebar()"
            >
              <Icon
                name="hugeicons:sidebar-right"
                class="size-5!"
                v-if="isSecondSidebarCollapsed"
              />
              <Icon name="hugeicons:sidebar-right-01" class="size-5!" v-else />
            </Button>
          </TooltipTrigger>
          <TooltipContent> Toggle Sidebar </TooltipContent>
        </Tooltip>
      </div>
    </div>
  </div>
</template>

<style>
/*TODO: use to control logic , dont use css env() -> import { useScreenSafeArea } from '@vueuse/core' */
.header-tab-view-pwa {
  width: calc(
    env(titlebar-area-width, 100vw) + env(titlebar-area-x)
  ) !important;
}

.vitrual-light-trafic-button {
  min-width: env(titlebar-area-x);
}
</style>
