<script setup lang="ts">
import { unrefElement } from '@vueuse/core';
import { h, ref, render, watchEffect } from 'vue';
import {
  type Edge,
  attachClosestEdge,
  extractClosestEdge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import {
  draggable,
  dropTargetForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { preserveOffsetOnSource } from '@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { X } from 'lucide-vue-next';
import type { TabView } from '~/shared/stores';
import TabViewItemPreview from './TabViewItemPreview.vue';

const props = defineProps<{
  tab: TabView;
  isActive: boolean;
  selectTab: (tabId: string) => void;
  closeTab: (tabId: string) => void;
  onRightClickItem: (tab: TabView) => void;
}>();

const innerElementRef = shallowRef<HTMLElement | null>();
const outerElementRef = shallowRef<HTMLElement | null>();
const isDragging = ref(false);
const isDraggedOver = ref(false);
const closestEdgeRef = ref<Edge>();

const showDropIndicator = ref(false);

watchEffect(onCleanup => {
  const innerElement = unrefElement(innerElementRef);
  const outerElement = unrefElement(outerElementRef);

  if (!innerElement || !outerElement) return;

  const dndFunction = combine(
    draggable({
      element: innerElement,
      getInitialData: () => props.tab,

      onDragStart: args => {
        isDragging.value = true;
      },
      onDrop: () => {
        isDragging.value = false;
        props.selectTab(props.tab.id);
      },

      onGenerateDragPreview: ({ location, nativeSetDragImage }) => {
        setCustomNativeDragPreview({
          nativeSetDragImage,
          getOffset: preserveOffsetOnSource({
            element: innerElement,
            input: location.current.input,
          }),
          render({ container }) {
            render(
              h(
                TabViewItemPreview,
                {
                  icon: props.tab.icon,
                  name: props.tab.name,
                },
                props.tab.name
              ),
              container
            );

            return () => {
              render(null, container);
            };
          },
        });
      },
    }),

    dropTargetForElements({
      element: outerElement,
      getData: ({ input, element }) => {
        const data = { id: props.tab.id };

        return attachClosestEdge(data, {
          element,
          input,
          allowedEdges: ['left', 'right'],
        });
      },
      canDrop: ({ source }) => {
        return true;
      },
      onDrag: ({ self, source, location }) => {
        const closestEdge = extractClosestEdge(self.data);

        if (!closestEdge) {
          return;
        }

        closestEdgeRef.value = closestEdge;
      },
      onDragEnter: ({ self, source }) => {
        const isDifferentTab = self.data?.id !== source.data.id;

        if (props.tab.id === self.data?.id && isDifferentTab) {
          showDropIndicator.value = true;
        }
      },
      onDragLeave: () => {
        isDraggedOver.value = false;
        showDropIndicator.value = false;
      },
      onDrop: ({ location }) => {
        isDraggedOver.value = false;
        showDropIndicator.value = false;
      },

      getIsSticky: () => false,
    })
  );

  onCleanup(() => dndFunction());
});
</script>

<template>
  <div
    class="relative"
    @click.right="
      () => {
        onRightClickItem(tab);
      }
    "
    ref="outerElementRef"
  >
    <Button
      ref="innerElementRef"
      variant="ghost"
      size="sm"
      :class="[
        'h-7! max-w-44 justify-start! hover:bg-muted-foreground/10 font-normal p-2!  hover:[&>div]:opacity-100 transition-all duration-200 border-transparent border',
        isActive ? 'bg-muted' : '',
        isDragging ? 'bg-primary/5' : '',
      ]"
      @click.left="selectTab(tab.id)"
      :id="tab.id"
    >
      <Icon :name="tab.icon" class="size-4 min-w-4" />

      <Tooltip :id="tab.id">
        <TooltipTrigger as-child>
          <div class="truncate">{{ tab.name }}</div>
        </TooltipTrigger>

        <TooltipContent side="bottom">
          <p>{{ tab.name }}</p>
        </TooltipContent>
      </Tooltip>

      <div
        class="hover:bg-accent p-0.5 rounded-full opacity-0"
        @click.stop="() => closeTab(tab.id)"
      >
        <X class="size-3 stroke-[2.5]!" />
      </div>
    </Button>

    <div
      v-if="showDropIndicator && closestEdgeRef"
      class="absolute h-7 w-0.5 top-0 rounded-md bg-accent-foreground"
      :style="{ [closestEdgeRef === 'left' ? 'left' : 'right']: '0px' }"
    />
  </div>

  <!-- <div class="border-l w-0 h-6 block"></div> -->
</template>
