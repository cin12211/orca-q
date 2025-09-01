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
      class="py-0 mt-1 h-full rounded-none shadow-none border-none overflow-auto"
      ref="wrapperRef"
    >
      <CardContent class="p-0">
        <div
          ref="parentRef"
          :style="{
            height: `${height}px`,
          }"
          class="w-full overflow-y-auto contain-strict h-full"
        >
          <div
            :style="{
              height: `${totalSize}px`,
              width: '100%',
              position: 'relative',
            }"
          >
            <div
              :style="{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRows[0]?.start ?? 0}px)`,
              }"
            >
              <div
                v-for="virtualRow in virtualRows"
                :key="virtualRow.key.toString()"
                :data-index="virtualRow.index"
                :ref="measureElement"
              >
                <div class="pb-2 leading-relaxed text-xs">
                  <span class="text-[10px]"
                    >[{{ formatDate(logs[virtualRow.index].createdAt) }}]
                  </span>

                  <span class="text-[10px]">
                    :
                    {{ formatQueryTime(logs[virtualRow.index].queryTime || 0) }}
                  </span>

                  <QuickQueryHistoryLogItem
                    :highlighter="highlighter"
                    :log="logs[virtualRow.index].logs"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { useElementSize } from '@vueuse/core';
import { computed, ref, useTemplateRef } from 'vue';
import plsql from '@shikijs/langs/plsql';
import githubLightDefault from '@shikijs/themes/github-light-default';
import { useVirtualizer } from '@tanstack/vue-virtual';
import {
  createHighlighterCore,
  createJavaScriptRegexEngine,
  type HighlighterCore,
} from 'shiki';
import { useQuickQueryLogs } from '~/shared/stores';
import { formatQueryTime } from '~/utils/common/format';
import QuickQueryHistoryLogItem from './QuickQueryHistoryLogItem.vue';

enum HistoryLogTabs {
  All = 'all',
  OneTable = 'one-table',
}

const props = defineProps<{
  tableName: string;
  schemaName: string;
}>();

const tab = ref<HistoryLogTabs>(HistoryLogTabs.All);

const qqLogStore = useQuickQueryLogs();
const { getLogsByTableId, qqLogs } = toRefs(qqLogStore);

const logs = computed(() => {
  if (tab.value === HistoryLogTabs.All) {
    return qqLogs.value;
  }

  return getLogsByTableId.value(props);
});

const wrapperRef = useTemplateRef('wrapperRef');
const { height } = useElementSize(wrapperRef);

const parentRef = ref<HTMLElement | null>(null);

const rowVirtualizer = useVirtualizer({
  get count() {
    return logs.value.length;
  },
  getScrollElement: () => parentRef.value,
  estimateSize: () => 39,
});

const virtualRows = computed(() => rowVirtualizer.value.getVirtualItems());

const totalSize = computed(() => rowVirtualizer.value.getTotalSize());

const measureElement = (el: any) => {
  if (!el) {
    return;
  }

  rowVirtualizer.value.measureElement(el);

  return undefined;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString();
};

const highlighter = ref<HighlighterCore>();

onBeforeMount(async () => {
  const highlighterPromise = createHighlighterCore({
    themes: [githubLightDefault],
    langs: [plsql],
    engine: createJavaScriptRegexEngine(),
  });

  highlighter.value = await highlighterPromise;
});

onMounted(async () => {
  if (!rowVirtualizer.value) {
    return;
  }

  await nextTick();

  rowVirtualizer.value.scrollToIndex(logs.value.length - 1);
});

watch(
  () => logs.value,
  async () => {
    if (!rowVirtualizer.value) {
      return;
    }

    await nextTick();

    rowVirtualizer.value.scrollToIndex(logs.value.length - 1);
  },
  { deep: true }
);
</script>
