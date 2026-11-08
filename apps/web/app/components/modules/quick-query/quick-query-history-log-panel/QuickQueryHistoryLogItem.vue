<script setup lang="ts">
import { ref, watch } from 'vue';
import { type HighlighterCore } from 'shiki';

const props = defineProps<{
  log: string;
  highlighter?: HighlighterCore;
}>();

const highlightedCode = ref<string>('');

watch(
  [() => props.log, () => props.highlighter],
  async () => {
    const log = (props.log || '').trim();

    if (!props.highlighter) {
      return;
    }

    highlightedCode.value = props.highlighter.codeToHtml(log, {
      lang: 'plsql',
      theme: 'catppuccin-latte',
    });
  },
  { immediate: true }
);
</script>

<template>
  <div
    class="[&_code]:text-wrap w-full [&>.catppuccin-latte]:bg-background!"
    v-html="highlightedCode"
  ></div>
</template>
