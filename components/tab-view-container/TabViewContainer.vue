<script setup lang="ts">
import { isElectron } from '~/lib/utils';
import { useAppLayoutStore } from '~/shared/stores/appLayoutStore';
import ActivityBarHorizontal from '../activity-bar/ActivityBarHorizontal.vue';
import TabViews from './TabViews.vue';

const appLayoutStore = useAppLayoutStore();

const { isPrimarySidebarCollapsed, isSecondSidebarCollapsed } =
  toRefs(appLayoutStore);

const isAppVersion = computed(() => isElectron());

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
      'w-screen h-9 select-none border-b pr-2 electron-drag-region',
      isAppVersion && isPrimarySidebarCollapsed ? 'pl-[4.5rem]' : '',
    ]"
  >
    <div class="flex justify-between items-center h-full">
      <div
        class="flex items-center gap-1 h-full px-1"
        :style="{
          minWidth,
          justifyContent: !isPrimarySidebarCollapsed
            ? 'space-between'
            : 'center',
        }"
      >
        <div
          :class="[
            isAppVersion ? 'pl-[4.5rem]' : '',
            'flex justify-center w-full',
          ]"
          v-if="!isPrimarySidebarCollapsed"
        >
          <ActivityBarHorizontal />
        </div>

        <Button
          variant="ghost"
          size="iconSm"
          @click="appLayoutStore.onToggleActivityBarPanel()"
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
      </div>

      <TabViews />

      <Button
        variant="ghost"
        size="iconSm"
        @click="appLayoutStore.onToggleSecondSidebar()"
      >
        <Icon
          name="hugeicons:sidebar-right"
          class="size-5!"
          v-if="isSecondSidebarCollapsed"
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
