<script setup lang="ts">
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-vue-next";
import { useDefaultLayout } from "~/shared/contexts/defaultLayoutContext";

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
      'w-full h-9 select-none border-b pr-2 ',
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

      <div class="w-full" data-tauri-drag-region>
        <Button
          variant="outline"
          size="sm"
          @click="togglePrimarySideBarPanel()"
          class="border-t border-b-0! rounded-b-none rounded-t-sm pl-2!"
        >
          hello.tsx
        </Button>
        <Button
          variant="secondary"
          size="sm"
          @click="togglePrimarySideBarPanel()"
        >
          hello.tsx
        </Button>
        <Button
          variant="secondary"
          size="sm"
          @click="togglePrimarySideBarPanel()"
        >
          hello.tsx
        </Button>
        <Button
          variant="secondary"
          size="sm"
          @click="togglePrimarySideBarPanel()"
        >
          hello.tsx
        </Button>
        <Button
          variant="secondary"
          size="sm"
          @click="togglePrimarySideBarPanel()"
        >
          hello.tsx
        </Button>
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
