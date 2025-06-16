<script setup lang="ts">
import plsql from '@shikijs/langs/plsql';
import githubLightDefault from '@shikijs/themes/github-light-default';
import { createJavaScriptRegexEngine, type HighlighterCore } from 'shiki';
import { createHighlighterCore } from 'shiki/core';
import { ScrollArea } from '~/components/ui/scroll-area';
import QuickQueryHistoryLogItem from './QuickQueryHistoryLogItem.vue';

// TODO: refactor , and add TanStack Virtual scroll for optimize
interface Log {
  createdAt: string;
  logs: string;
}

const props = defineProps<{
  logs: Log[];
  height?: string;
}>();

const scrollRef = ref<HTMLDivElement | null>(null);
const autoScroll = ref(true);

const highlighter = ref<HighlighterCore>();

// Format date to readable time
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString();
};

// Handle scroll to detect if user has scrolled up
const handleScroll = (event: Event) => {
  const target = event.target as HTMLElement;
  const { scrollHeight, scrollTop, clientHeight } = target;

  // If user scrolls up, disable auto-scroll
  // If user scrolls to bottom, enable auto-scroll
  autoScroll.value = Math.abs(scrollHeight - scrollTop - clientHeight) < 10;
};

// Scroll to bottom when logs update if autoScroll is enabled
watch(
  () => props.logs,
  () => {
    if (autoScroll.value && scrollRef.value) {
      nextTick(() => {
        scrollRef.value?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  },
  { deep: true }
);

onBeforeMount(async () => {
  console.time('createHighlighterCore');
  const highlighterPromise = createHighlighterCore({
    themes: [githubLightDefault],
    langs: [plsql],
    engine: createJavaScriptRegexEngine(),
  });

  highlighter.value = await highlighterPromise;

  console.timeEnd('createHighlighterCore');
});

// Scroll to bottom on initial mount
onMounted(() => {
  nextTick(() => {
    if (!scrollRef.value) {
      return;
    }

    scrollRef.value.scrollIntoView({ behavior: 'auto' });
  });
});
</script>

<template>
  <Card class="py-2 h-full rounded-md border-none shadow-none">
    <CardContent :class="['p-0 overflow-y-auto']">
      <ScrollArea class="h-full px-0 font-mono text-sm" @scroll="handleScroll">
        <div
          v-if="logs.length === 0"
          class="flex h-full items-center justify-center text-zinc-500"
        >
          No logs to display
        </div>
        <template v-else>
          <div
            v-for="(log, index) in logs"
            :key="index"
            class="mb-2.5 leading-relaxed text-xs"
          >
            <span class="text-emerald-600"
              >[{{ formatDate(log.createdAt) }}]</span
            >

            <QuickQueryHistoryLogItem
              :highlighter="highlighter"
              :log="log.logs"
            />
          </div>
        </template>
        <div ref="scrollRef"></div>
      </ScrollArea>
    </CardContent>
  </Card>
</template>
