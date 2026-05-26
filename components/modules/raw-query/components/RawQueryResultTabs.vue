<script setup lang="ts">
import { storeToRefs } from 'pinia';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  Button,
} from '#components';
import { cn } from '@/lib/utils';
import { useSchemaStore } from '~/core/stores';
import type { ExecutedResultItem, MappedRawColumn } from '../interfaces';
import { formatColumnsInfo } from '../utils/formatColumnsInfo';
import { normalizeResultRows } from '../utils/normalizeResultRows';
import ResultTabErrorView from './result-tab/ResultTabErrorView.vue';
import ResultTabInfoView from './result-tab/ResultTabInfoView.vue';
import ResultTabRawView from './result-tab/ResultTabRawView.vue';
import ResultTabResultView from './result-tab/ResultTabResultView.vue';
import ResultTabExplainView from './result-tab/explain/ResultTabExplainView.vue';

const props = defineProps<{
  executedResults: Map<string, ExecutedResultItem>;
  activeTabId: string | null;
  // mappedColumns: MappedRawColumn[];
  executeLoading: boolean;
  isStreaming: boolean;
}>();

const schemaStore = useSchemaStore();
const { schemas } = storeToRefs(schemaStore);

const emit = defineEmits<{
  (e: 'update:activeTab', id: string): void;
  (e: 'close-tab', id: string): void;
  (e: 'close-other-tabs', id: string): void;
  (e: 'close-tabs-to-right', id: string): void;
  (e: 'update:view', tabId: string, view: ExecutedResultItem['view']): void;
}>();

// Context menu state
const currentTabMenuContext = ref<string | null>(null);

const isFullscreen = ref(false);

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isFullscreen.value) {
    isFullscreen.value = false;
  }
};

// Check if there are tabs to the right of the current context menu tab
const isHaveRightItem = computed(() => {
  if (!currentTabMenuContext.value) return false;

  const tabIds = Array.from(props.executedResults.keys());
  const currentIndex = tabIds.indexOf(currentTabMenuContext.value);

  return currentIndex >= 0 && currentIndex < tabIds.length - 1;
});

// View modes for the vertical tabs
type ViewMode = 'result' | 'raw' | 'info' | 'error' | 'explain';

const viewModes: { value: ViewMode; label: string }[] = [
  { value: 'result', label: 'Result' },
  { value: 'explain', label: 'Explain' },
  { value: 'raw', label: 'Raw' },
  { value: 'info', label: 'Info' },
  { value: 'error', label: 'Errors' },
];

// Cache key: tabId + resultLength for case (streaming)
const formattedDataCache = new Map<string, Record<string, any>[]>();

const formattedData = shallowRef<Record<string, any>[]>([]);

let rafId: number | null = null;

// Get the active tab data
const activeTab = computed(() => {
  if (!props.activeTabId) return null;
  return props.executedResults.get(props.activeTabId) || null;
});

watch(
  () => activeTab.value?.metadata.connection,
  async connection => {
    if (!connection) {
      return;
    }

    try {
      if (!schemas.value[connection.id]?.length) {
        await schemaStore.fetchSchemas({
          connectionId: connection.id,
          workspaceId: connection.workspaceId,
          connection,
        });
      }

      await schemaStore.fetchReservedSchemas({
        connectionId: connection.id,
        connection,
      });
    } catch (error) {
      console.error(
        '[RawQueryResultTabs] Failed to load schema metadata',
        error
      );
    }
  },
  { immediate: true }
);

// Get current view mode for active tab
const currentView = computed(() => activeTab.value?.view || 'result');

// Derive columns from active tab's fieldDefs (not global mappedColumns)
const activeTabColumns = computed<MappedRawColumn[]>(() => {
  if (!activeTab.value?.metadata.fieldDefs) return [];

  const connectionId = activeTab.value.metadata.connection?.id;

  return formatColumnsInfo({
    fieldDefs: activeTab.value.metadata.fieldDefs,
    statementQuery: activeTab.value.metadata.statementQuery,
    schemas: connectionId ? schemas.value[connectionId] || [] : [],
    getTableInfoById: schemaStore.getTableInfoById,
  });
});

const getFormattedData = (tab: ExecutedResultItem): Record<string, any>[] => {
  const resultLength = tab.result?.length || 0;
  const cacheKey = `${tab.id}_${resultLength}`;

  if (formattedDataCache.has(cacheKey)) {
    return formattedDataCache.get(cacheKey)!;
  }

  const fieldDefs = tab.metadata.fieldDefs || [];
  const formatted = normalizeResultRows(tab.result || [], fieldDefs);

  formattedDataCache.set(cacheKey, formatted);

  // Clean up old cache entries for this tab to save memory
  for (const key of formattedDataCache.keys()) {
    if (key.startsWith(`${tab.id}_`) && key !== cacheKey) {
      formattedDataCache.delete(key);
    }
  }

  return formatted;
};

watch(
  activeTab,
  newTab => {
    if (rafId) cancelAnimationFrame(rafId);

    rafId = requestAnimationFrame(() => {
      formattedData.value = newTab ? getFormattedData(newTab) : [];
      rafId = null;
    });
  },
  { immediate: true }
);

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  if (rafId) cancelAnimationFrame(rafId);
});

// Switch view mode
const setViewMode = (view: ViewMode) => {
  if (props.activeTabId) {
    emit('update:view', props.activeTabId, view);
  }
};

// Check if tab has errors
const hasErrors = (tab: ExecutedResultItem) => {
  return !!tab.metadata.executeErrors;
};
</script>

<template>
  <div
    :class="
      cn(
        'h-full flex w-full bg-background transition-all duration-200',
        isFullscreen ? 'fixed inset-0 z-[999] pt-10 px-0 pb-0' : ''
      )
    "
  >
    <!-- Vertical view tabs (left side) -->
    <div class="flex mt-7 [writing-mode:vertical-rl]" v-if="activeTab">
      <div
        v-for="mode in viewModes"
        :key="mode.value"
        @click="
          // Disable result/raw if has errors, disable error if no errors
          hasErrors(activeTab) &&
          (mode.value === 'result' || mode.value === 'raw')
            ? null
            : mode.value === 'error' && !hasErrors(activeTab)
              ? null
              : setViewMode(mode.value)
        "
        :class="
          cn(
            'border px-1 text-xs font-normal transition-colors',
            currentView === mode.value
              ? 'bg-muted border-transparent border-r-border'
              : 'border-transparent',
            // Error tab styling
            mode.value === 'error' && hasErrors(activeTab)
              ? 'hover:bg-muted cursor-pointer'
              : mode.value === 'explain' &&
                  !activeTab.metadata.statementQuery.startsWith('EXPLAIN')
                ? null
                : '',
            mode.value === 'error' && !hasErrors(activeTab)
              ? 'opacity-40 cursor-not-allowed'
              : '',
            // Result/Raw disabled when errors
            (mode.value === 'result' || mode.value === 'raw') &&
              hasErrors(activeTab)
              ? 'opacity-40 cursor-not-allowed'
              : '',
            mode.value === 'explain' &&
              !activeTab.metadata.statementQuery.startsWith('EXPLAIN')
              ? 'opacity-40 cursor-not-allowed'
              : '',
            // Normal hover state for enabled tabs
            !(
              (mode.value === 'error' && !hasErrors(activeTab)) ||
              ((mode.value === 'result' || mode.value === 'raw') &&
                hasErrors(activeTab)) ||
              (mode.value === 'explain' &&
                !activeTab.metadata.statementQuery.startsWith('EXPLAIN'))
            )
              ? 'hover:bg-muted cursor-pointer'
              : ''
          )
        "
      >
        {{ mode.label }}
      </div>
    </div>

    <div class="h-full w-full flex flex-col min-w-0">
      <!-- Horizontal result tabs bar -->
      <div class="flex items-end justify-between flex-shrink-0 w-full">
        <!-- Horizontal result tabs (top) -->
        <div class="flex items-end overflow-x-auto pt-0.5 flex-1 min-w-0 pr-4">
          <ContextMenu>
            <ContextMenuTrigger class="flex items-end">
              <Tooltip v-for="[tabId, tab] in executedResults" :key="tabId">
                <TooltipTrigger as-child>
                  <div
                    @click="$emit('update:activeTab', tabId)"
                    @contextmenu="currentTabMenuContext = tabId"
                    :class="
                      cn(
                        'h-6! flex gap-0.5 rounded-t-md max-w-44 justify-start! items-center font-normal p-1! hover:[&>div]:opacity-100 transition-all duration-200 border rounded-b-none cursor-pointer relative',
                        tabId === activeTabId
                          ? 'border-b-transparent bg-background dark:bg-accent'
                          : 'border-transparent bg-muted/30'
                      )
                    "
                  >
                    <Icon
                      :name="
                        hasErrors(tab) ? 'hugeicons:alert-02' : 'hugeicons:sql'
                      "
                      :class="
                        cn('min-w-4', hasErrors(tab) ? 'text-red-500' : '')
                      "
                    />

                    <div class="truncate text-xs font-medium">
                      Query {{ tab.seqIndex }} -
                      {{ tab.metadata.statementQuery }}
                    </div>

                    <div
                      @click.stop="$emit('close-tab', tabId)"
                      class="hover:bg-accent h-5 w-5 flex items-center justify-center rounded-full opacity-0"
                    >
                      <Icon name="lucide:x" class="stroke-[2.5]! size-3!" />
                    </div>
                  </div>
                </TooltipTrigger>

                <TooltipContent class="max-w-xl">
                  <p>{{ tab.metadata.statementQuery }}</p>
                </TooltipContent>
              </Tooltip>
            </ContextMenuTrigger>

            <ContextMenuContent
              hideWhenDetached
              class="w-56"
              v-if="currentTabMenuContext"
            >
              <ContextMenuItem
                @select="$emit('close-tab', currentTabMenuContext!)"
              >
                Close
              </ContextMenuItem>
              <ContextMenuItem
                @select="$emit('close-other-tabs', currentTabMenuContext!)"
              >
                Close Others
              </ContextMenuItem>
              <ContextMenuItem
                :disabled="!isHaveRightItem"
                @select="$emit('close-tabs-to-right', currentTabMenuContext!)"
              >
                Close to the Right
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        </div>

        <!-- Fullscreen Button -->
        <div class="flex items-center gap-1.5 px-2 pb-1.5 flex-shrink-0">
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                @click="isFullscreen = !isFullscreen"
                :variant="isFullscreen ? 'secondary' : 'ghost'"
                size="icon"
                class="size-5 rounded border border-border"
              >
                <Icon name="hugeicons:full-screen" class="size-3.5!" />
              </Button>
            </TooltipTrigger>
            <TooltipContent align="end" side="top">
              {{
                isFullscreen
                  ? 'Zoom In (Restore Normal)'
                  : 'Zoom Out (Full Screen)'
              }}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <!-- Tab content area -->
      <div
        class="h-full w-full border rounded-md rounded-tl-none overflow-hidden"
      >
        <LoadingOverlay v-if="executeLoading && activeTabId" visible />

        <!-- No results placeholder -->
        <BaseEmpty
          v-if="!activeTab"
          title="No results"
          desc="Execute a query to see results"
        />

        <!-- Result View -->
        <ResultTabResultView
          v-else-if="activeTab && currentView === 'result'"
          :active-tab="activeTab"
          :active-tab-columns="activeTabColumns"
          :formatted-data="formattedData"
          :execute-loading="executeLoading"
          :is-streaming="isStreaming"
          :key="activeTab.id"
        />

        <ResultTabExplainView
          v-else-if="activeTab && currentView === 'explain'"
          :active-tab="activeTab"
        />

        <!-- Raw View (JSON) -->
        <ResultTabRawView
          v-else-if="activeTab && currentView === 'raw'"
          :formatted-data="formattedData"
          :execute-loading="executeLoading"
          :is-streaming="isStreaming"
        />

        <!-- Info View -->
        <ResultTabInfoView
          v-else-if="activeTab && currentView === 'info'"
          :active-tab="activeTab"
        />

        <!-- Errors View -->
        <ResultTabErrorView
          v-else-if="activeTab && currentView === 'error'"
          :active-tab="activeTab"
          @onChangeView="setViewMode($event)"
        />
      </div>
    </div>
  </div>
</template>
