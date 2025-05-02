<script setup lang="ts">
import { unrefElement } from '@vueuse/core';
import { shallowRef, watchEffect } from 'vue';
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { useManagementViewContainerStore } from '~/shared/stores';
import TabViewItem from './TabViewItem.vue';

const tabsStore = useManagementViewContainerStore();

const elementRef = shallowRef<HTMLElement | null>();

const isDragging = ref(false);

watchEffect(onCleanup => {
  const wrapperElement = unrefElement(elementRef);

  if (!wrapperElement) return;

  const dndFunction = combine(
    monitorForElements({
      onDragStart(args) {
        isDragging.value = true;
      },

      onDrop(args) {
        isDragging.value = false;
        const { location, source } = args;
        // didn't drop on anything
        if (!location.current.dropTargets.length) return;

        const sourceId = source.data.id as string;
        const target = location.current.dropTargets[0];
        const targetId = target.data.id as string;

        tabsStore.moveTabTo(sourceId, targetId);
      },
    }),
    autoScrollForElements({
      element: wrapperElement,
    })
  );

  onCleanup(() => {
    dndFunction();
  });
});
</script>
<template>
  <div
    :class="[
      'w-full flex items-center h-full space-x-2 mx-1 overflow-x-auto custom-x-scrollbar',
      isDragging ? 'bg-purple-50' : '',
    ]"
    data-tauri-drag-region
    ref="elementRef"
  >
    <!-- <TransitionGroup name="tab"> -->
    <div v-for="tab in tabsStore.tabs" class="flex items-center relative">
      <TabViewItem
        :tab="tab"
        :isActive="tab.id === tabsStore.activeTab?.id"
        :selectTab="tabsStore.selectTab"
        :closeTab="tabsStore.closeTab"
      />

      <div class="border-l w-0 h-6 inline ml-2"></div>
    </div>
    <!-- </TransitionGroup> -->
  </div>
</template>

<style>
/* In your CSS file */
.custom-x-scrollbar {
  scrollbar-width: thin; /* For Firefox */
}

/* Webkit (Chrome, Safari, Edge) scrollbar customization */
.custom-x-scrollbar::-webkit-scrollbar {
  height: 1px; /* Controls the horizontal scrollbar height */
}

.custom-x-scrollbar::-webkit-scrollbar-track {
  border-radius: 1px;
}
</style>
