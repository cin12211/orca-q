<template>
  <div class="flex h-full min-h-0 flex-col">
    <div class="flex h-8 shrink-0 items-center justify-between">
      <Tabs v-model="tab" class="pt-1">
        <TabsList class="h-7!">
          <TabsTrigger
            :value="HistoryLogTabs.All"
            class="h-5! font-medium text-xs cursor-pointer text-primary/80"
          >
            All logs
          </TabsTrigger>
          <TabsTrigger
            :value="HistoryLogTabs.OneTable"
            class="h-5! font-medium text-xs cursor-pointer text-primary/80"
          >
            Only this table
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div>
        <p class="font-medium text-xs">Logs history</p>
      </div>

      <div class="flex items-center gap-1">
        <Tooltip v-if="tab === HistoryLogTabs.All">
          <TooltipTrigger as-child>
            <Button
              variant="outline"
              size="xxs"
              @click="qqLogStore.deleteAllLogs"
            >
              <Icon name="lucide:trash" />
              <p class="font-normal">Delete all logs</p>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Delete all logs</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip v-else>
          <TooltipTrigger as-child>
            <Button
              variant="outline"
              size="xxs"
              @click="qqLogStore.deleteLogsOfTable(props)"
            >
              <Icon name="lucide:trash" />
              <p class="font-normal">Delete logs</p>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Delete logs for this table</p>
          </TooltipContent>
        </Tooltip>

        <!-- TODO: open when to this feature -->
        <!-- <Button variant="outline" size="xxs" class="px-1">
          <Icon name="hugeicons:file-download"> </Icon>
          <p class="font-normal">Download logs</p>
        </Button> -->
      </div>
    </div>

    <div
      v-if="!logs.length"
      class="flex min-h-0 flex-1 items-center justify-center w-full"
    >
      <BaseEmpty
        title="No logs found"
        desc="There are no execution logs to display for this table."
      />
    </div>

    <Card
      v-else
      class="py-0 mt-1 min-h-0 flex-1 gap-0 rounded-none shadow-none border-none overflow-hidden"
    >
      <CardContent class="p-0 min-h-0 flex-1">
        <div
          ref="parentRef"
          class="h-full w-full overflow-y-auto contain-strict [overflow-anchor:none]"
        >
          <div
            :style="{
              height: `${totalSize}px`,
              width: '100%',
              position: 'relative',
            }"
          >
            <div
              v-for="virtualRow in virtualRows"
              :key="virtualRow.key.toString()"
              :data-index="virtualRow.index"
              :ref="measureElement"
              class="[overflow-anchor:none]"
              :style="{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }"
            >
              <div class="pb-2 leading-relaxed text-xs group">
                <div class="flex items-center justify-between gap-2 pr-1">
                  <div class="min-w-0">
                    <span class="text-xxs"
                      >[{{ formatDate(logs[virtualRow.index].createdAt) }}]
                    </span>

                    <span class="text-xxs">
                      :
                      {{
                        formatQueryTime(logs[virtualRow.index].queryTime || 0)
                      }}
                    </span>
                  </div>

                  <Tooltip>
                    <TooltipTrigger as-child>
                      <Button
                        variant="ghost"
                        size="icon"
                        class="size-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                        @click="
                          handleCopyWithKey(
                            logs[virtualRow.index].id,
                            String(logs[virtualRow.index].logs).trim()
                          )
                        "
                      >
                        <Icon
                          :key="
                            isCopied(logs[virtualRow.index].id)
                              ? 'tick'
                              : 'copy'
                          "
                          :name="
                            getCopyIcon(isCopied(logs[virtualRow.index].id))
                          "
                          class="size-3.5"
                          :class="
                            getCopyIconClass(
                              isCopied(logs[virtualRow.index].id)
                            )
                          "
                        />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {{
                          getCopyTooltip(
                            isCopied(logs[virtualRow.index].id),
                            'Copy log'
                          )
                        }}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                <QuickQueryHistoryLogItem
                  :highlighter="highlighter"
                  :log="logs[virtualRow.index].logs"
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, ref } from 'vue';
import { Tooltip, TooltipContent, TooltipTrigger } from '#components';
import plsql from '@shikijs/langs/plsql';
import catppuccinLatte from '@shikijs/themes/catppuccin-latte';
import { useVirtualizer } from '@tanstack/vue-virtual';
import {
  createHighlighterCore,
  createJavaScriptRegexEngine,
  type HighlighterCore,
} from 'shiki';
import { useCopyToClipboard } from '~/core/composables/useCopyToClipboard';
import { formatQueryTime } from '~/core/helpers/format';
import { useQuickQueryLogs } from '~/core/stores';
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
const { qqLogs } = storeToRefs(qqLogStore);

const {
  handleCopyWithKey,
  isCopied,
  getCopyIcon,
  getCopyIconClass,
  getCopyTooltip,
} = useCopyToClipboard();

const logs = computed(() => {
  if (tab.value === HistoryLogTabs.All) {
    return qqLogs.value;
  }

  return qqLogStore.getLogsByTableId(props);
});

const parentRef = ref<HTMLElement | null>(null);

const isNearBottom = (element: HTMLElement, threshold = 24) => {
  return (
    element.scrollHeight - element.scrollTop - element.clientHeight <= threshold
  );
};

const rowVirtualizer = useVirtualizer({
  get count() {
    return logs.value.length;
  },
  getScrollElement: () => parentRef.value,
  estimateSize: () => 39,
  overscan: 5,
});

const virtualRows = computed(() => rowVirtualizer.value.getVirtualItems());

const totalSize = computed(() => rowVirtualizer.value.getTotalSize());

const scrollToLatestLog = () => {
  if (!logs.value.length) {
    return;
  }

  rowVirtualizer.value.scrollToIndex(logs.value.length - 1);
};

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
    themes: [catppuccinLatte],
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

  scrollToLatestLog();
});

watch(
  () => logs.value.length,
  async () => {
    if (!rowVirtualizer.value) {
      return;
    }

    const shouldFollowLatestLog =
      !parentRef.value || isNearBottom(parentRef.value);

    await nextTick();

    if (shouldFollowLatestLog) {
      scrollToLatestLog();
    }
  }
);
</script>
