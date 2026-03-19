<script setup lang="ts">
import { useElementSize, type MaybeComputedElementRef } from '@vueuse/core';
import {
  ActivityBar,
  PrimarySideBar,
  SecondarySideBar,
  StatusBar,
  TabViewContainer,
} from '~/components/modules/app-shell';
import { DEFAULT_DEBOUNCE_INPUT } from '~/core/constants';
import { useAppConfigStore } from '~/core/stores/appConfigStore';

const route = useRoute();

const primarySideBarPanelRef = useTemplateRef('primarySideBarPanel');
const { width: primarySideBarWidth } = useElementSize(
  primarySideBarPanelRef as MaybeComputedElementRef
);

const appConfigStore = useAppConfigStore();
const { layoutSize, isPrimarySidebarCollapsed, bodySize } =
  toRefs(appConfigStore);

const { chatUiVars } = useAppearance();

const isAccessBottomPanel = computed(() => {
  if (route.meta.notAllowBottomPanel) return false;
  return true;
});

const isAccessRightPanel = computed(() => {
  if (route.meta.notAllowRightPanel) return false;
  return true;
});

useHotkeys([
  {
    key: 'meta+shift+b',
    callback: () => {
      if (isAccessRightPanel.value) {
        appConfigStore.onToggleSecondSidebar();
      }
    },
  },
  {
    key: 'meta+b',
    callback: () => {
      appConfigStore.onToggleActivityBarPanel();
    },
  },
  {
    key: 'meta+j',
    callback: () => {
      if (isAccessBottomPanel.value) {
        appConfigStore.onToggleBottomPanel();
      }
    },
  },
]);
</script>

<template>
  <ResizablePanelGroup
    direction="horizontal"
    id="default-layout-group-1"
    @layout="appConfigStore.onResizeLayout($event)"
  >
    <div
      class="h-screen w-screen flex flex-col flex-1 max-h-screen overflow-y-auto"
      :style="chatUiVars"
    >
      <TabViewContainer :primarySideBarWidth="primarySideBarWidth" />

      <div
        class="h-full flex overflow-y-auto w-screen max-w-screen overflow-x-hidden"
        v-auto-animate="{ duration: DEFAULT_DEBOUNCE_INPUT }"
      >
        <ActivityBar v-if="isPrimarySidebarCollapsed" />

        <ResizablePanel
          :min-size="10"
          :max-size="40"
          :default-size="layoutSize[0]"
          :collapsed-size="0"
          ref="primarySideBarPanel"
          collapsible
          id="default-layout-group-1-panel-1"
          key="primarySideBarPanel"
          class="bg-sidebar/50 dark:bg-sidebar"
        >
          <PrimarySideBar />
        </ResizablePanel>
        <ResizableHandle
          class="[&[data-state=hover]]:bg-primary/30! [&[data-state=drag]]:bg-primary/20!"
          id="default-layout-group-1-resize-1"
          with-handle
        />
        <ResizablePanel id="default-layout-group-1-panel-2" key="contentPanel">
          <div class="overflow-y-auto w-full h-full">
            <ResizablePanelGroup
              id="default-layout-body-group"
              direction="vertical"
              v-model="bodySize"
              @layout="appConfigStore.onResizeBody"
            >
              <ResizablePanel
                id="default-layout-body-group-panel-1"
                key="default-layout-body-group-panel-1"
              >
                <div class="flex flex-col overflow-y-auto w-full h-full">
                  <div class="h-full">
                    <slot />
                  </div>
                </div>
              </ResizablePanel>
              <ResizableHandle
                class="[&[data-state=hover]]:bg-primary/30! [&[data-state=drag]]:bg-primary/20!"
                with-handle
                v-show="isAccessBottomPanel"
              />

              <ResizablePanel
                :min-size="10"
                :max-size="70"
                :default-size="bodySize[1]"
                :collapsed-size="0"
                collapsible
                id="default-layout-body-group-panel-2"
                key="default-layout-body-group-panel-2"
                v-show="isAccessBottomPanel"
              >
                <div
                  class="flex flex-col flex-1 h-full p-1"
                  id="bottom-panel"
                ></div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </ResizablePanel>
        <ResizableHandle
          class="[&[data-state=hover]]:bg-primary/30! [&[data-state=drag]]:bg-primary/20!"
          id="default-layout-group-1-resize-2"
          with-handle
          v-show="isAccessRightPanel"
        />
        <ResizablePanel
          id="default-layout-group-1-panel-3"
          :min-size="15"
          :max-size="40"
          :default-size="layoutSize[2]"
          :collapsed-size="0"
          collapsible
          key="secondarySideBarPanel"
          v-show="isAccessRightPanel"
          class="bg-sidebar"
        >
          <SecondarySideBar />
        </ResizablePanel>
      </div>
      <StatusBar />
    </div>
  </ResizablePanelGroup>
</template>
