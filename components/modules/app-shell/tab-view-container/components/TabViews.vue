<script setup lang="ts">
import { unrefElement, useElementSize } from '@vueuse/core';
import { storeToRefs } from 'pinia';
import { shallowRef, watchEffect, computed, ref } from 'vue';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuShortcut,
  ContextMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#components';
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
import {
  type Edge,
  extractClosestEdge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { getReorderDestinationIndex } from '@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { useCommandPalette } from '~/components/modules/command-palette';
import { useTabManagement } from '~/core/composables/useTabManagement';
import { useWorkspaceConnectionRoute } from '~/core/composables/useWorkspaceConnectionRoute';
import { getConnectionCapabilityProfile } from '~/core/constants/connection-capabilities';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { isElectron } from '~/core/helpers';
import {
  useManagementConnectionStore,
  useTabViewsStore,
  type TabView,
} from '~/core/stores';
import { EConnectionMethod } from '~/core/types/entities/connection.entity';
import TabViewItem from './TabViewItem.vue';
import TabViewOpenActions from './TabViewOpenActions.vue';

const tabsStore = useTabViewsStore();
const connectionStore = useManagementConnectionStore();
const { openStarterSqlTab, openNewSqlFileTab, openInstanceInsightsTab } =
  useTabManagement();
const { openCommandPalette } = useCommandPalette();
const { workspaceId, connectionId } = useWorkspaceConnectionRoute();

const { tabViews } = storeToRefs(tabsStore);

const elementRef = shallowRef<HTMLElement | null>();
const tabBarBodyRef = shallowRef<HTMLElement | null>();
const tabsTrackRef = shallowRef<HTMLElement | null>();
const actionsMeasureRef = shallowRef<HTMLElement | null>();

const isDragging = ref(false);

const currentTabMenuContext = ref<TabView | null>();

const { width: tabBarBodyWidth } = useElementSize(tabBarBodyRef);
const { width: tabsTrackWidth } = useElementSize(tabsTrackRef);
const { width: actionsMeasureWidth } = useElementSize(actionsMeasureRef);

const capabilityProfile = computed(() =>
  getConnectionCapabilityProfile(
    connectionStore.selectedConnection ?? {
      type: DatabaseClientType.POSTGRES,
      method: EConnectionMethod.STRING,
    }
  )
);

const canOpenWorkspaceTabs = computed(
  () => !!workspaceId.value && !!connectionId.value
);

const showTabOpenActions = computed(
  () => capabilityProfile.value.supportsQueryFiles
);

const isDockedTabActions = computed(() => {
  if (!tabBarBodyWidth.value || !actionsMeasureWidth.value) {
    return false;
  }

  return (
    tabsTrackWidth.value + actionsMeasureWidth.value > tabBarBodyWidth.value
  );
});

const onOpenSchemaBrowser = () => {
  openCommandPalette();
};

const isHaveRightItem = computed(() => {
  if (!currentTabMenuContext.value) {
    return false;
  }

  const totalTabs = tabViews.value.length;

  const currentTabMenuContextIndex = tabViews.value.findIndex(
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

        const startIndex = tabViews.value.findIndex(t => t.id === sourceId);

        const indexOfTarget = tabViews.value.findIndex(t => t.id === targetId);

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

const isElectronRuntime = computed(() => isElectron());
</script>
<template>
  <div
    :class="[
      'w-full flex items-end h-full gap-2 mx-1 -mb-0.5 min-w-0 relative',
      isDragging ? 'bg-purple-50' : '',
    ]"
    :data-electron-drag-region="isElectronRuntime ? '' : undefined"
  >
    <div
      class="flex h-full shrink-0 items-center gap-1 bg-sidebar-accent/50 pr-1"
      v-if="false"
    >
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="outline"
            size="xxs"
            class="text-xxs"
            :disabled="!canOpenWorkspaceTabs"
            @click="openStarterSqlTab"
          >
            <!-- <Icon name="hugeicons:sql" class="size-4 min-w-4" /> -->
            SQL
          </Button>
        </TooltipTrigger>
        <TooltipContent>Open or reuse sample.sql</TooltipContent>
      </Tooltip>
    </div>

    <div ref="tabBarBodyRef" class="flex h-full min-w-0 flex-1 items-end">
      <div
        ref="elementRef"
        class="min-w-0 flex-1 overflow-x-auto hidden-scroll-container h-full"
      >
        <div class="flex min-w-max items-end h-full">
          <ContextMenu>
            <ContextMenuTrigger as-child>
              <div
                ref="tabsTrackRef"
                v-auto-animate="{ duration: 120 }"
                class="flex items-end"
              >
                <TabViewItem
                  v-for="tab in tabViews"
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
            </ContextMenuTrigger>

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
          </ContextMenu>

          <div
            v-if="showTabOpenActions && !isDockedTabActions"
            class="flex h-full shrink-0 items-center bg-sidebar-accent/50 pl-1 pr-1"
          >
            <TabViewOpenActions
              :disabled="!canOpenWorkspaceTabs"
              @open-starter-sql="openStarterSqlTab"
              @open-new-sql-file="openNewSqlFileTab"
              @open-schema-browser="onOpenSchemaBrowser"
              @open-instance-insights="openInstanceInsightsTab"
            />
          </div>
        </div>
      </div>

      <div class="flex min-w-max items-end h-full">
        <div
          v-if="showTabOpenActions && isDockedTabActions"
          class="flex h-full shrink-0 items-center bg-sidebar-accent/50 pl-1 pr-1"
        >
          <TabViewOpenActions
            :disabled="!canOpenWorkspaceTabs"
            @open-starter-sql="openStarterSqlTab"
            @open-new-sql-file="openNewSqlFileTab"
            @open-schema-browser="onOpenSchemaBrowser"
            @open-instance-insights="openInstanceInsightsTab"
          />
        </div>
      </div>
    </div>

    <div
      v-if="showTabOpenActions"
      ref="actionsMeasureRef"
      aria-hidden="true"
      class="pointer-events-none invisible absolute flex h-full shrink-0 items-center bg-sidebar-accent/50 pl-1 pr-1"
    >
      <TabViewOpenActions measure-only />
    </div>
  </div>
</template>

<style>
.hidden-scroll-container {
  overflow: auto; /* enables scrolling */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.hidden-scroll-container::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}
</style>
