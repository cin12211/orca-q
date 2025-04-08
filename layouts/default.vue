<script setup lang="ts">
import { type SplitterPanel } from "reka-ui";
import { provideDefaultLayoutContext } from "../shared/contexts/defaultLayoutContext";

const primarySideBarPanelRef = useTemplateRef<
  InstanceType<typeof SplitterPanel>
>("primarySideBarPanelRef");

const secondarySideBarPanelRef = useTemplateRef<
  InstanceType<typeof SplitterPanel>
>("secondarySideBarPanelRef");

const togglePanel = (
  panel: InstanceType<typeof SplitterPanel> | null | undefined
) => {
  if (!panel) return;
  panel.isCollapsed ? panel.expand() : panel.collapse();
};

useShortKey("meta_b", () => {
  togglePanel(primarySideBarPanelRef.value);
});

useShortKey("meta_alt_b", () => {
  togglePanel(secondarySideBarPanelRef.value);
});

const isPrimarySideBarPanelCollapsed = computed(
  () => !!primarySideBarPanelRef.value?.isCollapsed
);
const isSecondarySideBarPanelCollapsed = computed(
  () => !!secondarySideBarPanelRef.value?.isCollapsed
);

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
    auto-save-id="default-layout-bar"
    id="default-layout-group-1"
  >
    <div class="h-screen flex flex-col flex-1 max-h-screen overflow-y-auto">
      <EditorViewContainer />
      <div class="h-full flex overflow-y-auto">
        <ActivityBar />

        <ResizablePanel
          :min-size="5"
          :max-size="40"
          :default-size="25"
          :collapsed-size="0"
          collapsible
          id="default-layout-group-1-panel-1"
          ref="primarySideBarPanelRef"
        >
          <PrimarySideBar />
        </ResizablePanel>
        <ResizableHandle
          class="[&[data-state=hover]]:bg-primary/30! [&[data-state=drag]]:bg-primary/20!"
          id="default-layout-group-1-resize-1"
        />
        <ResizablePanel id="default-layout-group-1-panel-2">
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
          :min-size="5"
          :max-size="50"
          :default-size="25"
          :collapsed-size="0"
          collapsible
          ref="secondarySideBarPanelRef"
        >
          <SecondarySideBar
        /></ResizablePanel>
      </div>
      <!-- <StatusBar /> -->
    </div>
  </ResizablePanelGroup>
</template>
