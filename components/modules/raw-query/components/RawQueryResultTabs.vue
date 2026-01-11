<script setup lang="ts">
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '#components';
import { cn } from '@/lib/utils';
import type { RowData } from '~/components/base/dynamic-table/utils';
import type { ExecutedResultItem } from '../hooks/useRawQueryEditor';
import type { MappedRawColumn } from '../interfaces';
import {
  ResultTabAgentView,
  ResultTabErrorView,
  ResultTabInfoView,
  ResultTabRawView,
  ResultTabResultView,
} from './result-tab';

const props = defineProps<{
  executedResults: Map<string, ExecutedResultItem>;
  activeTabId: string | null;
  mappedColumns: MappedRawColumn[];
  executeLoading: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:activeTab', id: string): void;
  (e: 'close-tab', id: string): void;
  (e: 'close-other-tabs', id: string): void;
  (e: 'close-tabs-to-right', id: string): void;
  (e: 'update:view', tabId: string, view: ExecutedResultItem['view']): void;
}>();

// Context menu state
const currentTabMenuContext = ref<string | null>(null);

// Check if there are tabs to the right of the current context menu tab
const isHaveRightItem = computed(() => {
  if (!currentTabMenuContext.value) return false;

  const tabIds = Array.from(props.executedResults.keys());
  const currentIndex = tabIds.indexOf(currentTabMenuContext.value);

  return currentIndex >= 0 && currentIndex < tabIds.length - 1;
});

// View modes for the vertical tabs
type ViewMode = 'result' | 'raw' | 'info' | 'error' | 'agent';

const viewModes: { value: ViewMode; label: string }[] = [
  { value: 'result', label: 'Result' },
  { value: 'raw', label: 'Raw' },
  { value: 'info', label: 'Info' },
  { value: 'error', label: 'Errors' },
  { value: 'agent', label: 'Agent' },
];

// Get the active tab data
const activeTab = computed(() => {
  if (!props.activeTabId) return null;
  return props.executedResults.get(props.activeTabId) || null;
});

// Get current view mode for active tab
const currentView = computed(() => activeTab.value?.view || 'result');

// Derive columns from active tab's fieldDefs (not global mappedColumns)
const activeTabColumns = computed<MappedRawColumn[]>(() => {
  if (!activeTab.value?.metadata.fieldDefs) return [];
  return activeTab.value.metadata.fieldDefs.map((field, index) => ({
    index,
    originalName: field.name,
    aliasFieldName: field.name,
    queryFieldName: field.name,
    isPrimaryKey: false,
    isForeignKey: false,
    type: field.dataTypeID?.toString() || 'unknown',
    tableName: '',
  }));
});

// Format data for display (map column indices to names using tab's own fieldDefs)
const formattedData = computed(() => {
  if (!activeTab.value?.result) return [];
  const fieldDefs = activeTab.value.metadata.fieldDefs || [];
  return activeTab.value.result.map((item: RowData) => {
    const mappedItem: Record<string, any> = {};
    for (const [key, value] of Object.entries(item)) {
      const fieldDef = fieldDefs[Number(key)];
      const columnName = fieldDef?.name || '';
      if (columnName) {
        mappedItem[columnName] = value;
      }
    }
    return mappedItem;
  });
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
  <div class="h-full flex w-full">
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
              ? 'bg-gray-100 border-transparent border-r-gray-400'
              : 'border-transparent',
            // Error tab styling
            mode.value === 'error' && hasErrors(activeTab)
              ? 'hover:bg-muted cursor-pointer'
              : '',
            mode.value === 'error' && !hasErrors(activeTab)
              ? 'opacity-40 cursor-not-allowed'
              : '',
            // Result/Raw disabled when errors
            (mode.value === 'result' || mode.value === 'raw') &&
              hasErrors(activeTab)
              ? 'opacity-40 cursor-not-allowed'
              : '',
            // Normal hover state for enabled tabs
            !(
              (mode.value === 'error' && !hasErrors(activeTab)) ||
              ((mode.value === 'result' || mode.value === 'raw') &&
                hasErrors(activeTab))
            )
              ? 'hover:bg-muted cursor-pointer'
              : ''
          )
        "
      >
        {{ mode.label }}
      </div>
    </div>

    <div class="h-full w-full flex flex-col">
      <!-- Horizontal result tabs (top) -->
      <div class="flex items-end overflow-x-auto pt-0.5">
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
                        ? 'border-b-transparent bg-background'
                        : 'border-transparent bg-muted/30'
                    )
                  "
                >
                  <Icon
                    :name="
                      hasErrors(tab) ? 'hugeicons:alert-02' : 'hugeicons:sql'
                    "
                    :class="cn('min-w-4', hasErrors(tab) ? 'text-red-500' : '')"
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

              <TooltipContent>
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

      <!-- Tab content area -->
      <div
        class="h-full w-full border rounded-md rounded-tl-none overflow-hidden"
      >
        <LoadingOverlay v-if="executeLoading && activeTabId" visible />

        <!-- No results placeholder -->
        <div
          v-if="!activeTab"
          class="h-full flex items-center justify-center text-muted-foreground"
        >
          <div class="text-center">
            <Icon
              name="hugeicons:file-empty-02"
              class="size-12! mb-2 opacity-50"
            />
            <p class="text-sm">Execute a query to see results</p>
          </div>
        </div>

        <!-- Result View -->
        <ResultTabResultView
          v-else-if="activeTab && currentView === 'result'"
          :active-tab="activeTab"
          :active-tab-columns="activeTabColumns"
          :formatted-data="formattedData"
        />

        <!-- Raw View (JSON) -->
        <ResultTabRawView
          v-else-if="activeTab && currentView === 'raw'"
          :formatted-data="formattedData"
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
        />

        <!-- Agent View -->
        <ResultTabAgentView
          v-else-if="activeTab && currentView === 'agent'"
          :active-tab="activeTab"
        />
      </div>
    </div>
  </div>
</template>
