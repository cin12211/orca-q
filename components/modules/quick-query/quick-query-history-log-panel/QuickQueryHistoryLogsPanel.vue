<script setup lang="ts">
import plsql from '@shikijs/langs/plsql';
import githubLightDefault from '@shikijs/themes/github-light-default';
import { createJavaScriptRegexEngine, type HighlighterCore } from 'shiki';
import { createHighlighterCore } from 'shiki/core';
import { ScrollArea } from '~/components/ui/scroll-area';
import { useQuickQueryLogs } from '~/shared/stores';
import QuickQueryHistoryLogItem from './QuickQueryHistoryLogItem.vue';

enum HistoryLogTabs {
  All = 'all',
  OneTable = 'one-table',
}

const props = defineProps<{
  tableName: string;
  schemaName: string;
}>();

const qqLogStore = useQuickQueryLogs();
const { getLogsByTableId, qqLogs } = toRefs(qqLogStore);

const logs = computed(() => {
  if (tab.value === HistoryLogTabs.All) {
    return qqLogs.value;
  }

  return getLogsByTableId.value(props);
});

const tab = ref<HistoryLogTabs>(HistoryLogTabs.All);

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
  () => logs,
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
  const highlighterPromise = createHighlighterCore({
    themes: [githubLightDefault],
    langs: [plsql],
    engine: createJavaScriptRegexEngine(),
  });

  highlighter.value = await highlighterPromise;
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
  <div class="flex flex-1 flex-col h-full">
    <div class="flex flex-1 h-full items-center justify-between">
      <Tabs v-model="tab" class="pt-1">
        <TabsList class="grid grid-cols-2 h-[1.625rem]!">
          <TabsTrigger
            :value="HistoryLogTabs.All"
            class="h-5! px-1 font-medium text-xs cursor-pointer text-primary/80"
          >
            All logs
          </TabsTrigger>
          <TabsTrigger
            :value="HistoryLogTabs.OneTable"
            class="h-5! px-1 font-medium text-xs cursor-pointer text-primary/80"
          >
            Only this table
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div>
        <p class="font-medium text-xs">Logs history</p>
      </div>

      <div class="flex items-center gap-1">
        <Button
          v-if="tab === HistoryLogTabs.All"
          variant="outline"
          size="sm"
          class="h-6 px-1 gap-1 text-xs"
          @click="qqLogStore.deleteAllLogs"
        >
          <Icon name="lucide:trash" />
          <p class="font-normal">Delete all logs</p>
        </Button>
        <Button
          v-else
          variant="outline"
          size="sm"
          class="h-6 px-1 gap-1 text-xs"
          @click="qqLogStore.deleteLogsOfTable(props)"
        >
          <Icon name="lucide:trash" />
          <p class="font-normal">Delete logs</p>
        </Button>

        <!-- TODO: open when to this feature -->
        <!-- <Button  variant="outline" size="sm" class="h-6 px-1 gap-1 text-xs">
          <Icon name="hugeicons:file-download"> </Icon>
          <p class="font-normal">Download logs</p>
        </Button> -->
      </div>
    </div>

    <div
      v-if="!logs.length"
      class="flex h-full items-center justify-center text-zinc-500"
    >
      No logs to display
    </div>

    <Card
      v-else
      class="py-2 mt-1 h-full rounded-none shadow-none border-none overflow-auto"
    >
      <CardContent class="p-0">
        <ScrollArea
          class="h-full px-0 font-mono text-sm"
          @scroll="handleScroll"
        >
          <!-- // TODO: refactor , and add TanStack Virtual scroll for optimize -->
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
          <div ref="scrollRef"></div>
        </ScrollArea>
      </CardContent>
    </Card>
  </div>
</template>
