<script setup lang="ts">
import type { Slot } from 'vue';
import { Pane, Splitpanes } from 'splitpanes';
import 'splitpanes/dist/splitpanes.css';
import { useAppConfigStore } from '~/core/stores/appConfigStore';
import {
  RawQueryEditorLayout,
  type CustomLayoutDefinition,
} from '../constants';

const props = defineProps<{
  layout: RawQueryEditorLayout;
  customLayout?: CustomLayoutDefinition | null;
}>();

defineSlots<{
  content: Slot;
  result: Slot;
  variables?: Slot;
}>();

const appConfigStore = useAppConfigStore();
const { editorLayoutSizes, editorLayoutInnerVariableSizes } =
  toRefs(appConfigStore);

const onUpdateEditorLayoutSizes = (
  panes: {
    size: number;
  }[]
) => {
  editorLayoutSizes.value = [panes[0].size, panes[1].size];
};

const onUpdateEditorLayoutInnerVariableSizes = (
  panes: {
    size: number;
  }[]
) => {
  editorLayoutInnerVariableSizes.value = [panes[0].size, panes[1].size];
};

const contentSize = computed(() => {
  return editorLayoutSizes.value[0];
});

const innerContentSize = computed(() => {
  return editorLayoutInnerVariableSizes.value[0];
});

const innerVariablesSize = computed(() => {
  return editorLayoutInnerVariableSizes.value[1];
});

const resultSize = computed(() => {
  return editorLayoutSizes.value[1];
});

const isWithVariablesLayout = computed(() => {
  return (
    props.layout === RawQueryEditorLayout.horizontalWithVariables ||
    props.layout === RawQueryEditorLayout.vertical
  );
});

const horizontalWithVariables = computed(() => {
  return props.layout === RawQueryEditorLayout.horizontalWithVariables;
});

// --- Custom Layout Helpers ---

const isCustomLayout = computed(() => !!props.customLayout);

/**
 * For splitpanes, 'horizontal' prop means stacked top/bottom.
 * Our CustomLayoutDefinition uses 'vertical' for stacked (top/bottom)
 * and 'horizontal' for side-by-side — matching splitpanes convention inverted.
 * So: our 'vertical' = splitpanes horizontal=true, our 'horizontal' = splitpanes horizontal=false
 */
const isCustomHorizontal = computed(() => {
  return props.customLayout?.direction === 'vertical';
});

const isInnerSplitHorizontal = computed(() => {
  return props.customLayout?.innerSplit?.direction === 'vertical';
});

/** Get persisted panel size, falling back to definition default */
const getCustomPanelSize = (panelIndex: number): number => {
  const layoutId = props.customLayout?.id;
  if (!layoutId)
    return props.customLayout?.panels[panelIndex]?.defaultSize ?? 50;

  const persisted = appConfigStore.customLayoutSizes[layoutId];
  return (
    persisted?.panels[panelIndex] ??
    props.customLayout?.panels[panelIndex]?.defaultSize ??
    50
  );
};

/** Get persisted inner panel size, falling back to definition default */
const getCustomInnerPanelSize = (panelIndex: number): number => {
  const layoutId = props.customLayout?.id;
  if (!layoutId)
    return (
      props.customLayout?.innerSplit?.panels[panelIndex]?.defaultSize ?? 50
    );

  const persisted = appConfigStore.customLayoutSizes[layoutId];
  return (
    persisted?.innerPanels[panelIndex] ??
    props.customLayout?.innerSplit?.panels[panelIndex]?.defaultSize ??
    50
  );
};

/** Persist outer pane sizes on resize */
const onCustomResize = (panes: { size: number }[]) => {
  const layoutId = props.customLayout?.id;
  if (!layoutId) return;

  appConfigStore.updateCustomLayoutSizes(
    layoutId,
    panes.map(p => p.size)
  );
};

/** Persist inner pane sizes on resize */
const onCustomInnerResize = (panes: { size: number }[]) => {
  const layoutId = props.customLayout?.id;
  if (!layoutId) return;

  const existingPanels =
    appConfigStore.customLayoutSizes[layoutId]?.panels ??
    props.customLayout?.panels.map(p => p.defaultSize) ??
    [];

  appConfigStore.updateCustomLayoutSizes(
    layoutId,
    existingPanels,
    panes.map(p => p.size)
  );
};

/** CSS wrapper classes for each slot */
const SLOT_WRAPPER_CLASSES: Record<string, string> = {
  content: 'flex flex-col w-full h-full overflow-y-auto',
  variables: 'flex flex-col flex-1 h-full p-1',
  result: 'flex flex-col flex-1 h-full p-1 pl-0 relative',
};
</script>

<template>
  <div class="w-full h-full">
    <!-- Custom Layout Mode -->
    <template v-if="isCustomLayout && customLayout">
      <splitpanes
        class="default-theme"
        :horizontal="isCustomHorizontal"
        @resize="onCustomResize($event.panes)"
      >
        <template v-for="(panel, idx) in customLayout.panels" :key="idx">
          <!-- Panel with inner split -->
          <pane
            v-if="
              customLayout.innerSplit &&
              customLayout.innerSplit.panelIndex === idx
            "
            :size="getCustomPanelSize(idx)"
            :min-size="panel.minSize"
            :max-size="panel.maxSize"
          >
            <splitpanes
              :horizontal="isInnerSplitHorizontal"
              class="default-theme"
              @resize="onCustomInnerResize($event.panes)"
            >
              <pane
                v-for="(innerPanel, iIdx) in customLayout.innerSplit.panels"
                :key="`inner-${iIdx}`"
                :size="getCustomInnerPanelSize(iIdx)"
                :min-size="innerPanel.minSize"
                :max-size="innerPanel.maxSize"
              >
                <div :class="SLOT_WRAPPER_CLASSES[innerPanel.slot]">
                  <slot :name="innerPanel.slot" />
                </div>
              </pane>
            </splitpanes>
          </pane>

          <!-- Regular panel -->
          <pane
            v-else
            :size="getCustomPanelSize(idx)"
            :min-size="panel.minSize"
            :max-size="panel.maxSize"
          >
            <div :class="SLOT_WRAPPER_CLASSES[panel.slot]">
              <slot :name="panel.slot" />
            </div>
          </pane>
        </template>
      </splitpanes>
    </template>

    <!-- Preset Layout Mode (existing behavior) -->
    <template v-else>
      <splitpanes
        @resize="onUpdateEditorLayoutSizes($event.panes)"
        class="default-theme"
        :horizontal="layout === RawQueryEditorLayout.vertical"
      >
        <pane :size="contentSize">
          <splitpanes
            :horizontal="horizontalWithVariables"
            @resize="
              isWithVariablesLayout
                ? onUpdateEditorLayoutInnerVariableSizes($event.panes)
                : null
            "
          >
            <pane
              :size="isWithVariablesLayout ? innerContentSize : 100"
              min-size="30"
            >
              <div class="flex flex-col w-full h-full overflow-y-auto">
                <slot name="content" />
              </div>
            </pane>

            <pane
              v-if="isWithVariablesLayout"
              :size="innerVariablesSize"
              min-size="0"
              max-size="70"
            >
              <div class="flex flex-col flex-1 h-full p-1">
                <slot name="variables" />
              </div>
            </pane>
          </splitpanes>
        </pane>

        <pane :size="resultSize" min-size="0" max-size="80">
          <div class="flex flex-col flex-1 h-full p-1 pl-0 relative">
            <slot name="result" />
          </div>
        </pane>
      </splitpanes>
    </template>
  </div>
</template>

<style>
.splitpanes--vertical > .splitpanes__splitter {
  width: 1px !important;
  border: none !important;
}
.splitpanes--horizontal > .splitpanes__splitter {
  height: 1px !important;
  border: none !important;
}

.splitpanes__pane {
  background: var(--color-background) !important ;
}

/* custom splitpanes */
.splitpanes__splitter:before {
  opacity: 0 !important;
}

.splitpanes--vertical > .splitpanes__splitter:after {
  margin-left: -3px !important;

  width: calc(var(--spacing) * 1.5) !important;
  height: calc(var(--spacing) * 10) !important;

  background-color: var(--border) !important;
  border-radius: calc(var(--radius));
}

.splitpanes--horizontal > .splitpanes__splitter:after {
  margin-top: -3px !important;

  width: calc(var(--spacing) * 10) !important;
  height: calc(var(--spacing) * 1.5) !important;

  background-color: var(--border) !important;
  border-radius: calc(var(--radius));
}

.splitpanes__splitter {
  background-color: var(--border) !important;
  margin: 0 !important;
}

.splitpanes__splitter:hover {
  background-color: var(--color-gray-300) !important;
}
</style>
