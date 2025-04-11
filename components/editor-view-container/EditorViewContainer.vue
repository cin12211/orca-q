<script setup lang="ts">
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  X,
} from "lucide-vue-next";
import { useDefaultLayout } from "~/shared/contexts/defaultLayoutContext";
import Separator from "../ui/separator/Separator.vue";

const {
  isPrimarySideBarPanelCollapsed,
  isSecondarySideBarPanelCollapsed,
  togglePrimarySideBarPanel,
  toggleSecondarySideBarPanel,
} = useDefaultLayout();

const isAppVersion = computed(() => "__TAURI_INTERNALS__" in window);
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
        <div v-for="_ in [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]">
          <Button
            variant="ghost"
            size="sm"
            @click="togglePrimarySideBarPanel()"
            class="h-7! max-w-44 justify-start! font-normal p-2! hover:[&>div]:opacity-100"
          >
            <Icon name="vscode-icons:file-type-sql" class="min-w-4 size-4" />
            <div class="truncate">file name.tsx</div>
            <div class="hover:bg-card p-0.5 rounded-full opacity-0">
              <X class="size-3 stroke-[2.5]!" />
            </div>
          </Button>

          <div class="border-l w-0 h-6 inline mx-1"></div>

          <!-- <Separator orientation="vertical" class="h-6!" /> -->
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
