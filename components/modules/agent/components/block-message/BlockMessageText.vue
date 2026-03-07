<script setup lang="ts">
import { computed, toRef } from 'vue';
import { useSmoothStream } from '~/core/composables/useSmoothStream';

const props = defineProps<{
  content: string;
  isBlockStreaming?: boolean;
  isStreaming?: boolean;
  isUserMessage?: boolean;
}>();

const isCurrentlyStreaming = computed(
  () => !!(props.isBlockStreaming && props.isStreaming)
);
const smoothedContent = useSmoothStream(
  toRef(props, 'content'),
  isCurrentlyStreaming
);
</script>

<template>
  <p class="whitespace-pre-wrap leading-normal text-[13px]">
    {{ smoothedContent }}
    <span
      v-if="isBlockStreaming && isStreaming && !isUserMessage"
      class="ml-0.5 inline-block h-3.5 w-1 animate-pulse rounded-xs bg-foreground align-middle"
    />
  </p>
</template>
