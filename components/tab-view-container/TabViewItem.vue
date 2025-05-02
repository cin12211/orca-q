<script setup lang="ts">
import { unrefElement } from '@vueuse/core';
import { h, ref, render, watchEffect } from 'vue';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import {
  draggable,
  dropTargetForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { pointerOutsideOfPreview } from '@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { X } from 'lucide-vue-next';
import type { TabView } from '~/shared/stores';

//TODO: check list
// - dragable tab view container
// - management explored ( maybe move to use json file in backend to store)
// - management control history query
// - quick query view need to update
// - code editor cần update để show full thông tin của filed ( nâng cao : kiểu dữ liệu , icon cho field )
// - need to review UI/UX
// - refactor source code
// - luồng data flow đi đang có vấn đề , chưa support cho nhiều schema

const props = defineProps<{
  tab: TabView;
  isActive: boolean;
  selectTab: (tabId: string) => void;
  closeTab: (tabId: string) => void;
}>();

const elementRef = shallowRef<HTMLElement | null>();
const isDragging = ref(false);
const isDraggedOver = ref(false);

const instruction = ref(false);

watchEffect(onCleanup => {
  const currentElement = unrefElement(elementRef);

  if (!currentElement) return;

  const dndFunction = combine(
    draggable({
      element: currentElement,
      getInitialData: () => props.tab,

      onDragStart: args => {
        isDragging.value = true;
      },
      onDrop: () => {
        isDragging.value = false;
      },

      onGenerateDragPreview({ nativeSetDragImage }) {
        setCustomNativeDragPreview({
          getOffset: pointerOutsideOfPreview({ x: '0px', y: '0px' }),
          render: ({ container }) => {
            return render(
              h(
                'div',
                {
                  class:
                    'bg-white text-blackA11 rounded-md text-sm font-medium px-3 py-1.5',
                },
                props.tab.name
              ),
              container
            );
          },
          nativeSetDragImage,
        });
      },
    }),

    dropTargetForElements({
      element: currentElement,
      getData: ({ input, element }) => {
        const data = { id: props.tab.id };

        return data;
      },
      canDrop: ({ source }) => {
        return true;
      },
      onDrag: ({ self, source, location }) => {
        //   console.log('🚀 ~ self:', self);
        //   const isDifferentTab = self.data?.id !== source.data.id;
        //   if (props.tab.id === self.data?.id && isDifferentTab) {
        //     instruction.value = true;
        //   }
      },
      onDragEnter: ({ self, source }) => {
        const isDifferentTab = self.data?.id !== source.data.id;

        if (props.tab.id === self.data?.id && isDifferentTab) {
          instruction.value = true;
        }
      },
      onDragLeave: () => {
        isDraggedOver.value = false;
        instruction.value = false;
      },
      onDrop: ({ location }) => {
        isDraggedOver.value = false;
        instruction.value = false;
      },

      getIsSticky: () => false,
    })
  );

  onCleanup(() => dndFunction());
});
</script>

<template>
  <Button
    ref="elementRef"
    variant="secondary"
    size="sm"
    :class="[
      'h-7! max-w-44 justify-start! hover:bg-background font-normal p-2!  hover:[&>div]:opacity-100 transition-all duration-200',
      isActive ? 'bg-background border' : 'border-transparent border',
      isDragging ? 'bg-primary/5' : '',
    ]"
    @mousedown="selectTab(tab.id)"
    :id="tab.id"
  >
    <Icon :name="tab.icon" class="size-4" />
    <div class="truncate">{{ tab.name }}</div>
    <div
      class="hover:bg-card p-0.5 rounded-full opacity-0"
      @click="() => closeTab(tab.id)"
    >
      <X class="size-3 stroke-[2.5]!" />
    </div>
  </Button>
  <div
    v-if="instruction"
    class="absolute h-7 w-0.5 top-0 rounded-md bg-accent-foreground"
  />
</template>
