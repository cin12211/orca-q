<script setup lang="ts">
import { type SplitterPanel } from 'reka-ui';
import { useAppLayoutStore } from '~/shared/stores/appLayoutStore';
import { provideDefaultLayoutContext } from '../shared/contexts/defaultLayoutContext';

const primarySideBarPanelRef = useTemplateRef<
  InstanceType<typeof SplitterPanel>
>('primarySideBarPanelRef');

const secondarySideBarPanelRef = useTemplateRef<
  InstanceType<typeof SplitterPanel>
>('secondarySideBarPanelRef');

const togglePanel = (
  panel: InstanceType<typeof SplitterPanel> | null | undefined
) => {
  if (!panel) return;
  panel.isCollapsed ? panel.expand() : panel.collapse();
};

useHotkeys([
  {
    key: 'meta+shift+b',
    callback: () => {
      togglePanel(secondarySideBarPanelRef.value);
    },
  },
  {
    key: 'meta+b',
    callback: () => {
      togglePanel(primarySideBarPanelRef.value);
    },
  },
]);

const isPrimarySideBarPanelCollapsed = computed(
  () => !!primarySideBarPanelRef.value?.isCollapsed
);
const isSecondarySideBarPanelCollapsed = computed(
  () => !!secondarySideBarPanelRef.value?.isCollapsed
);

const appLayoutStore = useAppLayoutStore();

const { layoutSize, isActivityBarPanelCollapsed } = toRefs(appLayoutStore);

provideDefaultLayoutContext({
  isPrimarySideBarPanelCollapsed,
  isSecondarySideBarPanelCollapsed,
  togglePrimarySideBarPanel: () => togglePanel(primarySideBarPanelRef.value),
  toggleSecondarySideBarPanel: () =>
    togglePanel(secondarySideBarPanelRef.value),
});
</script>

<template>
  <ResizablePanelGroup
    direction="horizontal"
    id="default-layout-group-1"
    @layout="layoutSize = $event"
  >
    <div
      class="h-screen w-screen flex flex-col flex-1 max-h-screen overflow-y-auto"
    >
      <TabViewContainer />
      <div
        class="h-full flex overflow-y-auto w-screen max-w-screen overflow-x-hidden"
        v-auto-animate="{ duration: 250 }"
      >
        <ActivityBar v-if="isActivityBarPanelCollapsed" />

        <ResizablePanel
          :min-size="10"
          :max-size="40"
          :default-size="layoutSize[0]"
          :collapsed-size="0"
          collapsible
          id="default-layout-group-1-panel-1"
          ref="primarySideBarPanelRef"
          key="primarySideBarPanel"
        >
          <PrimarySideBar />
        </ResizablePanel>
        <ResizableHandle
          class="[&[data-state=hover]]:bg-primary/30! [&[data-state=drag]]:bg-primary/20!"
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
          ref="secondarySideBarPanelRef"
          key="secondarySideBarPanel"
        >
          <SecondarySideBar />
        </ResizablePanel>
      </div>
      <!-- <StatusBar /> -->
    </div>
  </ResizablePanelGroup>
</template>
