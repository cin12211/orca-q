<script setup lang="ts">
import { useDefaultLayout } from '~/shared/contexts/defaultLayoutContext';
import { useAppLayoutStore } from '~/shared/stores/appLayoutStore';
import ActivityBarHorizontal from '../activity-bar/ActivityBarHorizontal.vue';
import TabViews from './TabViews.vue';

const {
  isPrimarySideBarPanelCollapsed,
  isSecondarySideBarPanelCollapsed,
  togglePrimarySideBarPanel,
  toggleSecondarySideBarPanel,
} = useDefaultLayout();

const isAppVersion = computed(() => '__TAURI_INTERNALS__' in window);

const appLayoutStore = useAppLayoutStore();

const minWidth = computed(() => {
  const widthPercentage = appLayoutStore.layoutSize[0];
  if (!widthPercentage) {
    return '2.25rem';
  }

  if (isAppVersion.value) {
    return `calc( ${widthPercentage}% + 1px) `;
  }

  return `calc( ${widthPercentage}% + 1px) `;
});
</script>

<template>
  <div
    :class="[
      'w-screen h-9 select-none border-b pr-2 bg-sidebar-accent',
      isAppVersion && !appLayoutStore.layoutSize[0] ? 'pl-[4.5rem]' : '',
    ]"
    data-tauri-drag-region
  >
    <div class="flex justify-between items-center h-full">
      <div
        class="flex items-center gap-1 h-full px-1"
        :style="{
          minWidth,
          justifyContent: appLayoutStore.layoutSize[0]
            ? 'space-between'
            : 'center',
        }"
      >
        <div
          :class="[
            isAppVersion ? 'pl-[4.5rem]' : '',
            'flex justify-center w-full',
          ]"
          v-if="!appLayoutStore.isActivityBarPanelCollapsed"
        >
          <ActivityBarHorizontal />
        </div>

        <Button
          variant="ghost"
          size="iconSm"
          @click="togglePrimarySideBarPanel()"
        >
          <Icon
            name="hugeicons:sidebar-left"
            class="size-5!"
            v-if="isPrimarySideBarPanelCollapsed"
          />
          <Icon name="hugeicons:sidebar-left-01" class="size-5!" v-else />

          <!-- <PanelLeftOpen class="size-4" v-if="isPrimarySideBarPanelCollapsed" />
          <PanelLeftClose class="size-4" v-else /> -->
        </Button>
      </div>

      <TabViews />

      <Button
        variant="ghost"
        size="iconSm"
        @click="toggleSecondarySideBarPanel()"
      >
        <Icon
          name="hugeicons:sidebar-right"
          class="size-5!"
          v-if="isSecondarySideBarPanelCollapsed"
        />
        <Icon name="hugeicons:sidebar-right-01" class="size-5!" v-else />

        <!-- <PanelRightOpen
          class="size-4"
          v-if="isSecondarySideBarPanelCollapsed"
        />
        <PanelRightClose class="size-4" v-else /> -->
      </Button>
    </div>
  </div>
</template>
