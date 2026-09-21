<script setup lang="ts">
import { computed, ref } from 'vue';
import { useVirtualizer } from '@tanstack/vue-virtual';
import { useCopyToClipboard } from '~/core/composables/useCopyToClipboard';
import type { MongoRawQueryLogEntry } from '~/core/types/mongodb-raw-query.types';
import { formatMongoEjsonConsoleValue } from '../utils/mongoEjson';

const props = defineProps<{ logs?: MongoRawQueryLogEntry[] }>();

const entries = computed(() => props.logs ?? []);

const formatLogArgument = formatMongoEjsonConsoleValue;

const formatLogText = (entry: MongoRawQueryLogEntry): string =>
  `[${entry.level}] ${entry.args.map(formatLogArgument).join(' ')}`;

const {
  handleCopyWithKey,
  isCopied,
  getCopyIcon,
  getCopyIconClass,
  getCopyTooltip,
} = useCopyToClipboard();

// ── Virtual scroll ────────────────────────────────────────────────────────────
const parentRef = ref<HTMLElement | null>(null);

const isNearBottom = (el: HTMLElement, threshold = 24) =>
  el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;

const rowVirtualizer = useVirtualizer({
  get count() {
    return entries.value.length;
  },
  getScrollElement: () => parentRef.value,
  estimateSize: () => 32,
  overscan: 5,
});

const virtualRows = computed(() => rowVirtualizer.value.getVirtualItems());
const totalSize = computed(() => rowVirtualizer.value.getTotalSize());

const measureElement = (el: any) => {
  if (!el) return;
  rowVirtualizer.value.measureElement(el);
  return undefined;
};

const scrollToLatest = () => {
  if (!entries.value.length) return;
  rowVirtualizer.value.scrollToIndex(entries.value.length - 1);
};

onMounted(async () => {
  await nextTick();
  scrollToLatest();
});

watch(
  () => entries.value.length,
  async () => {
    const shouldFollow = !parentRef.value || isNearBottom(parentRef.value);
    await nextTick();
    if (shouldFollow) scrollToLatest();
  }
);
</script>

<template>
  <div
    class="flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground"
    data-testid="mongo-raw-query-console"
    aria-live="polite"
  >
    <!-- Header -->
    <div
      class="flex shrink-0 items-center justify-between border-b border-border/60 bg-muted/35 px-3 py-2"
    >
      <div class="flex min-w-0 items-center gap-2">
        <Icon
          name="hugeicons:command-line"
          class="size-4 text-muted-foreground"
        />
        <span data-testid="mongo-console-title" class="text-xs font-medium"
          >Console</span
        >
        <span class="text-xxs text-muted-foreground">
          {{ entries.length }} {{ entries.length === 1 ? 'entry' : 'entries' }}
        </span>
      </div>
      <span class="text-xxs text-muted-foreground">MongoDB Raw Query</span>
    </div>

    <!-- Empty state -->
    <div
      v-if="!entries.length"
      data-testid="mongo-console-empty"
      class="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-6 text-center"
    >
      <Icon
        name="hugeicons:command-line"
        class="size-7 text-muted-foreground/70"
      />
      <div>
        <p class="text-xs font-medium">No console output</p>
        <p class="mt-1 text-xxs text-muted-foreground">
          Add console.log(), console.info(), console.warn(), or console.error()
          to debug this script.
        </p>
      </div>
    </div>

    <!-- Virtual scroll list -->
    <div
      v-else
      ref="parentRef"
      class="h-full min-h-0 flex-1 overflow-y-auto contain-strict [overflow-anchor:none] font-mono"
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
          class="group [overflow-anchor:none]"
          :style="{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            transform: `translateY(${virtualRow.start}px)`,
          }"
        >
          <div
            data-testid="mongo-console-entry"
            class="flex items-start gap-2 rounded px-2 text-xs leading-5 whitespace-pre-wrap break-words transition-colors hover:bg-muted/45"
            :class="{
              'text-destructive': entries[virtualRow.index].level === 'error',
              'text-amber-600 dark:text-amber-400':
                entries[virtualRow.index].level === 'warn',
              'text-sky-600 dark:text-sky-400':
                entries[virtualRow.index].level === 'info',
            }"
          >
            <!-- Line number -->
            <span class="shrink-0 select-none text-muted-foreground">
              {{ virtualRow.index + 1 }}
            </span>

            <!-- Message -->
            <span data-testid="mongo-console-message" class="min-w-0 flex-1">
              [{{ entries[virtualRow.index].level }}]
              {{
                entries[virtualRow.index].args.map(formatLogArgument).join(' ')
              }}
            </span>

            <!-- Copy button -->
            <Tooltip>
              <TooltipTrigger as-child>
                <Button
                  variant="ghost"
                  size="icon"
                  class="size-5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  @click="
                    handleCopyWithKey(
                      String(virtualRow.index),
                      formatLogText(entries[virtualRow.index])
                    )
                  "
                >
                  <Icon
                    :key="isCopied(String(virtualRow.index)) ? 'tick' : 'copy'"
                    :name="getCopyIcon(isCopied(String(virtualRow.index)))"
                    class="size-3"
                    :class="
                      getCopyIconClass(isCopied(String(virtualRow.index)))
                    "
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {{
                    getCopyTooltip(
                      isCopied(String(virtualRow.index)),
                      'Copy log'
                    )
                  }}
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
