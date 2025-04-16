<script setup lang="ts">
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  X,
} from "lucide-vue-next";
import { useDefaultLayout } from "~/shared/contexts/defaultLayoutContext";
import { useManagementViewContainerStore } from "~/shared/stores/useManagementViewContainerStore";

const {
  isPrimarySideBarPanelCollapsed,
  isSecondarySideBarPanelCollapsed,
  togglePrimarySideBarPanel,
  toggleSecondarySideBarPanel,
} = useDefaultLayout();

const isAppVersion = computed(() => "__TAURI_INTERNALS__" in window);

const tabsStore = useManagementViewContainerStore();
</script>

<template>
  <div
    :class="[
      'w-full h-9 select-none border-b pr-2 bg-sidebar-accent',
      isAppVersion ? 'pl-[4.5rem]' : 'pl-2',
    ]"
    data-tauri-drag-region
  >
    <div class="flex justify-between items-center h-full">
      <Button
        variant="ghost"
        size="iconSm"
        @click="togglePrimarySideBarPanel()"
      >
        <PanelLeftOpen class="size-4" v-if="isPrimarySideBarPanelCollapsed" />
        <PanelLeftClose class="size-4" v-else />
      </Button>

      <div
        class="w-full flex items-center h-full space-x-2 overflow-x-auto custom-x-scrollbar"
        data-tauri-drag-region
      >
        <div v-for="tab in tabsStore.tabs">
          <Button
            variant="secondary"
            size="sm"
            :class="[
              'h-7! max-w-44 justify-start! hover:bg-background font-normal p-2!  hover:[&>div]:opacity-100 ',
              tab.id === tabsStore.activeTab?.id
                ? 'bg-background border'
                : 'border-transparent border',
            ]"
            @click="tabsStore.selectTab(tab.id)"
            :id="tab.id"
          >
            <Icon :name="tab.icon" class="min-w-4 size-4" />
            <div class="truncate">{{ tab.name }}</div>
            <div
              class="hover:bg-card p-0.5 rounded-full opacity-0"
              @click="() => tabsStore.closeTab(tab.id)"
            >
              <X class="size-3 stroke-[2.5]!" />
            </div>
          </Button>

          <div class="border-l w-0 h-6 inline ml-2"></div>
        </div>
      </div>

      <Button
        variant="ghost"
        size="iconSm"
        @click="toggleSecondarySideBarPanel()"
      >
        <PanelRightOpen
          class="size-4"
          v-if="isSecondarySideBarPanelCollapsed"
        />
        <PanelRightClose class="size-4" v-else />
      </Button>
    </div>
  </div>
</template>

<style scoped>
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
