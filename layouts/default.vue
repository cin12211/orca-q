<script setup lang="ts">
import { useAppLayoutStore } from '~/shared/stores/appLayoutStore';

const appLayoutStore = useAppLayoutStore();
const { layoutSize, isPrimarySidebarCollapsed } = toRefs(appLayoutStore);

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
        v-auto-animate="{ duration: 250 }"
      >
        <ActivityBar v-if="isPrimarySidebarCollapsed" />

        <ResizablePanel
          :min-size="10"
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
          class="[&[data-state=hover]]:bg-primary! [&[data-state=drag]]:bg-primary!"
          id="default-layout-group-1-resize-1"
        />
        <ResizablePanel id="default-layout-group-1-panel-2" key="contentPanel">
          <div class="overflow-y-auto w-full h-full">
            <slot />
          </div>
        </ResizablePanel>
        <ResizableHandle
          class="[&[data-state=hover]]:bg-primary/30! [&[data-state=drag]]:bg-primary/20!"
          id="default-layout-group-1-resize-2"
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
      <!-- <StatusBar /> -->
    </div>
  </ResizablePanelGroup>
</template>
