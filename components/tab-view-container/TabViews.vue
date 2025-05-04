<script setup lang="ts">
import { unrefElement } from '@vueuse/core';
import { shallowRef, watchEffect } from 'vue';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from '#components';
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
import {
  type Edge,
  extractClosestEdge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { getReorderDestinationIndex } from '@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { useManagementViewContainerStore, type TabView } from '~/shared/stores';
import TabViewItem from './TabViewItem.vue';

const tabsStore = useManagementViewContainerStore();

const elementRef = shallowRef<HTMLElement | null>();

const isDragging = ref(false);

const currentTabMenuContext = ref<TabView | null>();

const isHaveRightItem = computed(() => {
  if (!currentTabMenuContext.value) {
    return false;
  }

  const totalTabs = tabsStore.tabs.length;

  const currentTabMenuContextIndex = tabsStore.tabs.findIndex(
    t => t.id === currentTabMenuContext.value?.id
  );

  return totalTabs > currentTabMenuContextIndex + 1;
});

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
        if (!location.current.dropTargets.length) {
          return;
        }

        const sourceId = source.data.id as string;
        const target = location.current.dropTargets[0];
        const targetId = target.data.id as string;

        const closestEdgeOfTarget: Edge | null = extractClosestEdge(
          target.data
        );

        if (!closestEdgeOfTarget) {
          return;
        }

        const startIndex = tabsStore.tabs.findIndex(t => t.id === sourceId);

        const indexOfTarget = tabsStore.tabs.findIndex(t => t.id === targetId);

        const finishIndex = getReorderDestinationIndex({
          startIndex,
          indexOfTarget,
          closestEdgeOfTarget,
          axis: 'horizontal',
        });

        tabsStore.moveTabTo(startIndex, finishIndex);
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
      'w-full flex items-center h-full space-x-2 mx-1 overflow-x-auto custom-x-scrollbar relative',
      isDragging ? 'bg-purple-50' : '',
    ]"
    data-tauri-drag-region
    ref="elementRef"
  >
    <ContextMenu>
      <ContextMenuTrigger>
        <div v-auto-animate="{ duration: 120 }" class="flex items-center">
          <TabViewItem
            v-for="tab in tabsStore.tabs"
            :key="tab.id"
            :tab="tab"
            :isActive="tab.id === tabsStore.activeTab?.id"
            :selectTab="tabsStore.selectTab"
            :closeTab="tabsStore.closeTab"
            :onRightClickItem="
              () => {
                currentTabMenuContext = tab;
              }
            "
          />
        </div>

        <ContextMenuContent
          hideWhenDetached
          class="w-56"
          v-if="currentTabMenuContext"
        >
          <ContextMenuItem
            @select="tabsStore.closeTab(currentTabMenuContext.id)"
          >
            Close
            <ContextMenuShortcut>⌘W</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem
            @select="tabsStore.closeOtherTab(currentTabMenuContext.id)"
          >
            Close other
            <ContextMenuShortcut>⌘AO</ContextMenuShortcut>
          </ContextMenuItem>

          <ContextMenuItem
            :disabled="!isHaveRightItem"
            @select="tabsStore.closeToTheRight(currentTabMenuContext.id)"
          >
            Close to the right
            <ContextMenuShortcut>⌘AX</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenuTrigger>
    </ContextMenu>
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
