<script setup lang="ts">
import type { ResponseNavigatorItem } from './types';

defineProps<{
  currentIndex: number;
  responses: ResponseNavigatorItem[];
  position?: 'right' | 'left';
}>();

const emit = defineEmits<{
  select: [index: number];
}>();
</script>

<template>
  <div class="flex flex-col items-center gap-1">
    <div
      v-for="(response, index) in responses"
      :key="response.id"
      class="group relative flex items-center justify-center px-3 cursor-pointer"
      @click="emit('select', index)"
    >
      <button
        type="button"
        class="rounded-full transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-primary/60 pointer-events-none"
        :class="
          currentIndex === index
            ? 'h-1 w-5 bg-foreground'
            : 'h-[3px] w-3 bg-foreground/30 group-hover:bg-foreground/50 group-hover:w-4'
        "
        :aria-label="`Go to response ${index + 1}`"
      />

      <div
        v-if="response.preview"
        class="absolute top-1/2 -translate-y-1/2 pointer-events-none opacity-0 transition-opacity duration-200 group-hover:opacity-100 z-50 w-56 p-2.5 text-xs bg-popover text-popover-foreground rounded-lg shadow-md border border-border"
        :class="position === 'left' ? 'left-full ml-2' : 'right-full mr-2'"
      >
        <div class="line-clamp-3 leading-relaxed">{{ response.preview }}</div>
      </div>
    </div>
  </div>
</template>
