<script setup lang="ts">
import { Icon, Button, Separator } from '#components';
import { useVueFlow } from '@vue-flow/core';

const props = defineProps<{
  isHand: boolean;
}>();

const { zoomIn, zoomOut, fitView, getViewport } = useVueFlow();

const emit = defineEmits<{
  (e: 'update:isHand', value: boolean): void;
}>();

const toggleHand = () => emit('update:isHand', !props.isHand);
const zoomPercent = computed(() => {
  return Math.round(getViewport().zoom * 100);
});
</script>

<template>
  <div
    class="absolute bottom-1 z-10 left-1/2 -translate-x-1/2 w-fit h-10 bg-background box-border border-2 border-border rounded-lg p-1 flex flex-row"
  >
    <Button
      :variant="'ghost'"
      :size="'iconMd'"
      @click="zoomOut({ duration: 150 })"
    >
      <Icon name="hugeicons:minus-sign" class="size-4!" />
    </Button>
    <div
      class="w-7 h-7 text-center p-y-0.5 text-sm flex items-center justify-center"
    >
      {{ zoomPercent }}
    </div>
    <Button
      :variant="'ghost'"
      :size="'iconMd'"
      @click="zoomIn({ duration: 150 })"
    >
      <Icon name="hugeicons:add-01" class="size-4!" />
    </Button>
    <Separator orientation="vertical" class="mx-3" />
    <Button :variant="'ghost'" :size="'iconMd'">
      <Icon
        name="hugeicons:full-screen"
        class="size-4!"
        @click="fitView({ duration: 150 })"
      />
    </Button>
    <Button
      :variant="!isHand ? 'ghost' : 'secondary'"
      :size="'iconMd'"
      @click="toggleHand()"
    >
      <Icon v-if="!isHand" name="hugeicons:hold-03" class="size-4!" />
      <Icon v-else name="hugeicons:hold-04" class="size-4!" />
    </Button>
  </div>
</template>
