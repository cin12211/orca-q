<script setup lang="ts">
import { useAppLayoutStore } from '~/shared/stores/appLayoutStore';
import { DEFAULT_DEBOUNCE_INPUT } from '~/utils/constants';

const appLayoutStore = useAppLayoutStore();
const { layoutSize, isPrimarySidebarCollapsed, bodySize } =
  toRefs(appLayoutStore);

useHotkeys([
  {
    key: 'meta+shift+b',
    callback: () => {
      appLayoutStore.onToggleSecondSidebar();
    },
  },
  {
    key: 'meta+b',
    callback: () => {
      appLayoutStore.onToggleActivityBarPanel();
    },
  },
  {
    key: 'meta+j',
    callback: () => {
      appLayoutStore.onToggleBottomPanel();
    },
  },
]);
</script>

<template>
  <ResizablePanelGroup
    direction="horizontal"
    id="default-layout-group-1"
    @layout="appLayoutStore.onResizeLayout($event)"
  >
    <div
      class="h-screen w-screen flex flex-col flex-1 max-h-screen overflow-y-auto"
    >
      <TabViewContainer />
      <div
        class="h-full flex overflow-y-auto w-screen max-w-screen overflow-x-hidden"
        v-auto-animate="{ duration: DEFAULT_DEBOUNCE_INPUT }"
      >
        <ActivityBar v-if="isPrimarySidebarCollapsed" />

        <ResizablePanel
          :min-size="15"
          :max-size="40"
          :default-size="layoutSize[0]"
          :collapsed-size="0"
          collapsible
          id="default-layout-group-1-panel-1"
          key="primarySideBarPanel"
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
              @layout="appLayoutStore.onResizeBody"
            >
              <ResizablePanel
                id="default-layout-body-group-panel-1"
                key="default-layout-body-group-panel-1"
              >
                <div class="flex flex-col overflow-y-auto w-full h-full">
                  <slot />
                </div>
              </ResizablePanel>
              <ResizableHandle
                class="[&[data-state=hover]]:bg-primary/30! [&[data-state=drag]]:bg-primary/20!"
                with-handle
              />

              <ResizablePanel
                :min-size="10"
                :max-size="70"
                :default-size="bodySize[1]"
                :collapsed-size="0"
                collapsible
                id="default-layout-body-group-panel-2"
                key="default-layout-body-group-panel-2"
              >
                <div
                  class="flex flex-col flex-1 h-full px-2"
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
        />
        <ResizablePanel
          id="default-layout-group-1-panel-3"
          :min-size="15"
          :max-size="40"
          :default-size="layoutSize[2]"
          :collapsed-size="0"
          collapsible
          key="secondarySideBarPanel"
        >
          <SecondarySideBar />
        </ResizablePanel>
      </div>
      <StatusBar />
    </div>
  </ResizablePanelGroup>
</template>
