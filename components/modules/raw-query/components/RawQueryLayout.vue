<script setup lang="ts">
import type { Slot } from 'vue';
import { Pane, Splitpanes } from 'splitpanes';
import 'splitpanes/dist/splitpanes.css';
import { useAppLayoutStore } from '~/shared/stores/appLayoutStore';
import { RawQueryEditorLayout } from '../constants';

const props = defineProps<{
  layout: RawQueryEditorLayout;
}>();

defineSlots<{
  content: Slot;
  result: Slot;
  variables?: Slot;
}>();

const appLayoutStore = useAppLayoutStore();
const { editorLayoutSizes, editorLayoutInnerVariableSizes } =
  toRefs(appLayoutStore);

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
</script>

<template>
  <div class="w-full h-full">
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
            min-size="3"
            max-size="70"
          >
            <div class="flex flex-col flex-1 h-full p-1">
              <slot name="variables" />
            </div>
          </pane>
        </splitpanes>
      </pane>

      <pane :size="resultSize" min-size="10" max-size="80">
        <div class="flex flex-col flex-1 h-full p-1">
          <slot name="result" />
        </div>
      </pane>
    </splitpanes>
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
