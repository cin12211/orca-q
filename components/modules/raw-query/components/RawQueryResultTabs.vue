<script setup lang="ts">
import { storeToRefs } from 'pinia';
import {
  computed,
  ref,
  shallowRef,
  toValue,
  onMounted,
  onUnmounted,
  watch,
} from 'vue';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  Button,
} from '#components';
import { cn } from '@/lib/utils';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { useSchemaStore } from '~/core/stores';
import { useRawQueryContext } from '../hooks';
import {
  ViewMode,
  type ExecutedResultItem,
  type MappedRawColumn,
} from '../interfaces';
import {
  getRawQueryResultProfile,
  type RawQueryContext,
  type ResolvedRawQueryResultViewDefinition,
} from '../registry';
import {
  resolveActiveRawQueryResultView,
  resolveRawQueryResultViews,
} from '../registry/rawQueryResultDefaults';
import { formatColumnsInfo } from '../utils/formatColumnsInfo';
import { normalizeResultRows } from '../utils/normalizeResultRows';

const rawQueryContext = useRawQueryContext();

const executedResults = computed<Map<string, ExecutedResultItem>>(() => {
  const fromEditor = rawQueryContext?.rawQueryEditor?.executedResults;
  return (
    (toValue(fromEditor) as Map<string, ExecutedResultItem>) ??
    new Map<string, ExecutedResultItem>()
  );
});

const activeTabId = computed<string | null>(() => {
  const fromEditor = rawQueryContext?.rawQueryEditor?.activeResultTabId;
  const val = toValue(fromEditor);
  return (val as string | null) ?? null;
});

const executeLoading = computed<boolean>(() => {
  const editorState = toValue(
    rawQueryContext?.rawQueryEditor?.queryProcessState
  );
  if (editorState?.executeLoading !== undefined)
    return Boolean(editorState.executeLoading);
  return Boolean(toValue(rawQueryContext?.executeLoading));
});

const isStreaming = computed<boolean>(() => {
  const editorState = toValue(
    rawQueryContext?.rawQueryEditor?.queryProcessState
  );
  if (editorState?.isStreaming !== undefined)
    return Boolean(editorState.isStreaming);
  return Boolean(toValue(rawQueryContext?.isStreaming));
});

const schemaStore = useSchemaStore();
const { schemas } = storeToRefs(schemaStore);

const handleSelectActiveTab = (id: string) => {
  rawQueryContext?.rawQueryEditor?.setActiveResultTab?.(id);
};

const handleCloseTab = (id: string) => {
  rawQueryContext?.rawQueryEditor?.closeResultTab?.(id);
};

const handleCloseOtherTabs = (id: string) => {
  rawQueryContext?.rawQueryEditor?.closeOtherResultTabs?.(id);
};

const handleCloseTabsToRight = (id: string) => {
  rawQueryContext?.rawQueryEditor?.closeResultTabsToRight?.(id);
};

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

  const tabIds = Array.from(executedResults.value.keys());
  const currentIndex = tabIds.indexOf(currentTabMenuContext.value);

  return currentIndex >= 0 && currentIndex < tabIds.length - 1;
});

// Cache key: tabId + resultLength for case (streaming)
const formattedDataCache = new Map<string, Record<string, any>[]>();

const formattedData = shallowRef<Record<string, any>[]>([]);

let rafId: number | null = null;

// Get the active tab data
const activeTab = computed(() => {
  if (!activeTabId.value) return null;
  return executedResults.value.get(activeTabId.value) || null;
});

const activeDatabaseType = computed(
  () => activeTab.value?.metadata.connection?.type
);

// Switch view mode
const setViewMode = (view: ViewMode) => {
  const currentId = activeTabId.value;
  if (currentId) {
    rawQueryContext?.rawQueryEditor?.updateResultTabView?.(currentId, view);
  }
};

const selectView = (view: ResolvedRawQueryResultViewDefinition) => {
  if (!view.availabilityState.enabled) return;
  setViewMode(view.mode);
};

// Check if tab has errors
const hasErrors = (tab: ExecutedResultItem) => {
  return !!tab.metadata.executeErrors;
};

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

const resultViewContext = computed<RawQueryContext<any> | null>(() => {
  const tab = activeTab.value;
  const databaseType = activeDatabaseType.value;
  if (!tab || !databaseType) return null;

  return {
    ...(rawQueryContext ?? {}),
    databaseType,
    executeLoading: executeLoading.value,
    isStreaming: isStreaming.value,
    activeTab: tab,
    activeResultTab: tab,
    activeTabColumns: activeTabColumns.value,
    formattedData: formattedData.value,
    changeView: setViewMode,
  } as RawQueryContext<any>;
});

const resolvedViews = computed(() => {
  const context = resultViewContext.value;
  if (!context) return [];
  const profile = getRawQueryResultProfile(context.databaseType);
  if (!profile) return [];
  return resolveRawQueryResultViews(profile, context);
});

// Get current view mode for active tab
const currentView = computed(() => activeTab.value?.view || ViewMode.RESULT);

const activeView = computed(() =>
  resolveActiveRawQueryResultView(
    resolvedViews.value,
    currentView.value,
    Boolean(activeTab.value?.metadata.executeErrors)
  )
);

watch(
  () => [activeTabId.value, activeView.value?.mode] as const,
  ([tabId, resolvedMode]) => {
    if (tabId && resolvedMode && activeTab.value?.view !== resolvedMode) {
      rawQueryContext?.rawQueryEditor?.updateResultTabView?.(
        tabId,
        resolvedMode
      );
    }
  },
  { immediate: true }
);

watch(
  () => activeTab.value?.metadata.connection,
  async connection => {
    if (!connection) {
      return;
    }
    if (connection.type === DatabaseClientType.MONGODB) return;

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

const getFormattedData = (tab: ExecutedResultItem): Record<string, any>[] => {
  const resultLength = tab.result?.length || 0;
  const cacheKey = `${tab.id}_${resultLength}`;

  if (formattedDataCache.has(cacheKey)) {
    return formattedDataCache.get(cacheKey)!;
  }

  const connectionId = tab.metadata.connection?.id;
  const cols = formatColumnsInfo({
    fieldDefs: tab.metadata.fieldDefs || [],
    statementQuery: tab.metadata.statementQuery,
    schemas: connectionId ? schemas.value[connectionId] || [] : [],
    getTableInfoById: schemaStore.getTableInfoById,
  });

  const formatted = normalizeResultRows(tab.result || [], cols);

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
    <div
      class="flex mt-7 [writing-mode:vertical-rl]"
      v-if="resolvedViews.length > 0"
    >
      <Tooltip v-for="view in resolvedViews" :key="view.mode">
        <TooltipTrigger as-child>
          <button
            type="button"
            :data-view-mode="view.mode"
            :disabled="!view.availabilityState.enabled"
            :title="view.availabilityState.reason"
            @click="selectView(view)"
            :class="
              cn(
                'border px-1 text-xs font-normal transition-colors',
                activeView?.mode === view.mode
                  ? 'bg-muted border-transparent border-r-border'
                  : 'border-transparent',
                view.availabilityState.enabled
                  ? 'hover:bg-muted cursor-pointer'
                  : 'opacity-40 cursor-not-allowed'
              )
            "
          >
            {{ view.label }}
          </button>
        </TooltipTrigger>
        <TooltipContent v-if="view.availabilityState.reason">
          {{ view.availabilityState.reason }}
        </TooltipContent>
      </Tooltip>
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
                    @click="handleSelectActiveTab(tabId)"
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
                      @click.stop="handleCloseTab(tabId)"
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
              <ContextMenuItem @select="handleCloseTab(currentTabMenuContext!)">
                Close
              </ContextMenuItem>
              <ContextMenuItem
                @select="handleCloseOtherTabs(currentTabMenuContext!)"
              >
                Close Others
              </ContextMenuItem>
              <ContextMenuItem
                :disabled="!isHaveRightItem"
                @select="handleCloseTabsToRight(currentTabMenuContext!)"
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
                class="size-5 rounded border border-border cursor-pointer"
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

        <!-- Unsupported database state -->
        <BaseEmpty
          v-else-if="!activeDatabaseType || !activeView"
          title="Unsupported database"
          desc="This database type is not supported for query results"
          data-test="unsupported-database"
        />

        <!-- Dynamic active view renderer -->
        <slot
          v-if="activeView && resultViewContext"
          name="active-view"
          :active-view="activeView"
          :context="resultViewContext"
        >
          <component
            :is="activeView.renderer"
            :key="`${resultViewContext.activeTab?.id ?? 'tab'}:${activeView.mode}`"
            :context="resultViewContext"
          />
        </slot>
      </div>
    </div>
  </div>
</template>
