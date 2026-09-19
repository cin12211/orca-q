<script setup lang="ts">
import { ref } from 'vue';
import {
  Button,
  ContextMenuShortcut,
  Icon,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#components';

const emit = defineEmits<{
  (e: 'onRefresh'): void;
}>();

// Reactive state for rotation angle
const rotation = ref(0);

const handleRefreshClick = () => {
  rotation.value += 360; // Increment by 360 degrees for each click
  emit('onRefresh');
};

useHotkeys(
  [
    {
      key: 'meta+r',
      callback: () => {
        handleRefreshClick();
      },
    },
  ],
  {
    isPreventDefault: true,
  }
);
</script>

<template>
  <Tooltip>
    <TooltipTrigger as-child>
      <Button
        variant="outline"
        size="xxs"
        @click="handleRefreshClick"
        aria-label="Refresh table"
      >
        <Icon
          name="hugeicons:refresh"
          :style="{ transform: `rotate(${rotation}deg)` }"
          class="icon-transition"
        />

        <ContextMenuShortcut>⌘R</ContextMenuShortcut>
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Refresh data</p>
    </TooltipContent>
  </Tooltip>
</template>

<style scoped>
.icon-transition {
  transition: transform 0.4s ease-in;
}
</style>
