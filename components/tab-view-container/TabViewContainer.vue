<script setup lang="ts">
import { isElectron, isPWA } from '~/lib/utils';
import { useAppLayoutStore } from '~/shared/stores/appLayoutStore';
import ActivityBarHorizontal from '../activity-bar/ActivityBarHorizontal.vue';
import TabViews from './TabViews.vue';

const props = defineProps<{
  primarySideBarWidth: number;
}>();

const route = useRoute();

const appLayoutStore = useAppLayoutStore();

const { isPrimarySidebarCollapsed, isSecondSidebarCollapsed } =
  toRefs(appLayoutStore);

const isPWAApp = computed(() => isPWA());
const isElectronApp = computed(() => isElectron());

const minWidth = computed(() => {
  const widthPercentage = appLayoutStore.layoutSize[0];

  if (!widthPercentage) {
    return '2.25rem';
  }

  return `${props.primarySideBarWidth}px`;

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
</script>

<template>
  <div
    :class="[
      'w-screen h-9 select-none border-b pr-2 electron-drag-region bg-sidebar!',
      isElectronApp && isPrimarySidebarCollapsed ? 'pl-[4.5rem]' : '',
      isPWAApp && isPrimarySidebarCollapsed ? 'pl-[6rem]' : '',
      isPWAApp && 'h-10.5 pr-30',
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
            isElectronApp ? 'pl-[4.5rem]' : '',
            isPWAApp ? 'pl-[6rem]' : '',
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
        v-if="isAccessRightPanel"
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
