<template>
  <div class="[&_code]:text-wrap w-full" v-html="highlightedCode"></div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import plsql from '@shikijs/langs/plsql';
import githubLightDefault from '@shikijs/themes/github-light-default';
import { createJavaScriptRegexEngine } from 'shiki';
import { createHighlighterCore } from 'shiki/core';

const props = defineProps<{
  log: string;
}>();

const highlightedCode = ref<string>('');

const highlighterPromise = createHighlighterCore({
  themes: [githubLightDefault],
  langs: [plsql],
  engine: createJavaScriptRegexEngine(),
});

async function highlightCode(code: string) {
  const highlighter = await highlighterPromise;
  return highlighter.codeToHtml(code, {
    lang: 'plsql',
    theme: 'github-light-default',
  });
}

watch(
  () => props.log,
  async () => {
    const log = (props.log || '').trim();

    highlightedCode.value = await highlightCode(log);
  },
  { immediate: true }
);
</script>
