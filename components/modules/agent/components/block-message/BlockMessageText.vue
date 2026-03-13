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
  <p class="whitespace-pre-wrap leading-normal text-xs">
    {{ smoothedContent }}
  </p>
</template>
