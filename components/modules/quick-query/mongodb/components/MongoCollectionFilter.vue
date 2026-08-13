<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from 'vue';
import {
  Button,
  ContextMenuShortcut,
  Icon,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#components';
import debounce from 'lodash-es/debounce';
import { Checkbox } from '~/components/ui/checkbox';
import { Input } from '~/components/ui/input';
import { useHotkeys } from '~/core/composables/useHotKeys';
import { DEFAULT_DEBOUNCE_INPUT } from '~/core/constants';
import { getPlatformStorage } from '~/core/persist/storage-adapter';
import type {
  MongoDocument,
  MongoFilterMode,
  MongoFilterOperator,
  MongoFilterRow,
} from '../types';
import {
  buildMongoFilterPayload,
  extractFieldsFromDocuments,
  formatMongoFilterToRaw,
  MONGO_FILTER_OPERATORS,
} from '../utils/mongoFilterUtils';
import MongoColumnSelector from './MongoColumnSelector.vue';
import MongoFilterOperatorSelector from './MongoFilterOperatorSelector.vue';
import MongoQueryEditor from './MongoQueryEditor.vue';

const props = defineProps<{
  documents: MongoDocument[];
  isLoading?: boolean;
  /** Storage key for persisting filter state across reloads. Omit to disable persistence. */
  persistKey?: string;
}>();

const isShowFilters = defineModel<boolean>('isShowFilters', { default: false });

const emit = defineEmits<{
  (e: 'applyFilter', filter?: Record<string, unknown>): void;
}>();

const quickQueryFilterRef = ref<HTMLElement>();
const mode = ref<MongoFilterMode>('visual');
const rawJsonQuery = ref('');
const rawJsonError = ref<string | undefined>();

const availableFields = computed(() =>
  extractFieldsFromDocuments(props.documents)
);

const filterRows = ref<MongoFilterRow[]>([
  { isSelect: true, field: '_id', operator: '$eq', value: '' },
]);

interface PersistedMongoFilterState {
  filterRows?: MongoFilterRow[];
  mode?: MongoFilterMode;
  rawJsonQuery?: string;
  isShowFilters?: boolean;
}

// Filter state is UI-only and intentionally bypasses the backup / Electron
// persist contract, mirroring useTableQueryBuilder's QuickQuery equivalent.
const loadPersistedState = () => {
  if (!props.persistKey) return;

  const raw = getPlatformStorage().getItem(props.persistKey);
  if (!raw) return;

  try {
    const persisted = JSON.parse(raw) as PersistedMongoFilterState;

    if (persisted.filterRows?.length) {
      filterRows.value = persisted.filterRows;
    }
    if (persisted.mode) {
      mode.value = persisted.mode;
    }
    if (persisted.rawJsonQuery !== undefined) {
      rawJsonQuery.value = persisted.rawJsonQuery;
    }
    if (persisted.isShowFilters) {
      isShowFilters.value = true;
    }
  } catch {
    // Ignore corrupted persisted state
  }
};

loadPersistedState();

interface FilterSearchRef {
  $el?: Element | null;
  el?: HTMLInputElement | null;
  focus?: () => void;
}
const filterInputRefs = useTemplateRef<FilterSearchRef[]>('filterInputRefs');

const getOperatorPlaceholder = (operator: MongoFilterOperator): string => {
  const item = MONGO_FILTER_OPERATORS.find(op => op.value === operator);
  return item?.placeholder || 'Value...';
};

const getSearchInputElement = (index: number): HTMLInputElement | null => {
  const inputRef = filterInputRefs.value?.[index];
  if (!inputRef) return null;
  if (inputRef.el instanceof HTMLInputElement) return inputRef.el;
  if (inputRef.$el instanceof HTMLInputElement) return inputRef.$el;
  if (inputRef.$el instanceof HTMLElement) {
    const nested = inputRef.$el.querySelector('input');
    if (nested instanceof HTMLInputElement) return nested;
  }
  return null;
};

const focusSearchByIndex = async (index: number) => {
  await nextTick();
  if (index < 0) return;
  const inputEl = getSearchInputElement(index);
  if (inputEl) {
    inputEl.focus();
  }
};

const getNextFilters = () => filterRows.value.map(row => ({ ...row }));

const updateFilter = (index: number, patch: Partial<MongoFilterRow>) => {
  const nextRows = getNextFilters();
  const row = nextRows[index];
  if (!row) return;
  nextRows[index] = { ...row, ...patch };
  filterRows.value = nextRows;
};

const updateSearchValue = (index: number, value: string) => {
  updateFilter(index, { value });
};

const updateFieldName = (index: number, newField: string) => {
  updateFilter(index, { field: newField });
};

const updateFilterSelection = async (index: number, isSelected: boolean) => {
  updateFilter(index, { isSelect: isSelected });
  onExecuteSearch();
};

const onAddFilter = async (index: number) => {
  const defaultField = availableFields.value[0] || '_id';
  filterRows.value.splice(index + 1, 0, {
    isSelect: true,
    field: defaultField,
    operator: '$eq',
    value: '',
  });
  await focusSearchByIndex(index + 1);
};

const onRemoveFilter = async (index: number) => {
  const shouldApplyAfterRemove = !!filterRows.value[index]?.isSelect;

  filterRows.value.splice(index, 1);
  await focusSearchByIndex(Math.max(0, index - 1));

  if (shouldApplyAfterRemove) {
    onExecuteSearch();
  }
};

const onApplyFilter = (index: number) => {
  const row = filterRows.value[index];
  if (row && !row.isSelect) {
    updateFilter(index, { isSelect: true });
  }
  onExecuteSearch();
};

const onExecuteSearch = () => {
  rawJsonError.value = undefined;
  try {
    const payload = buildMongoFilterPayload(
      filterRows.value,
      rawJsonQuery.value,
      mode.value
    );
    emit('applyFilter', payload);
  } catch (err) {
    if (err instanceof Error) {
      rawJsonError.value = err.message;
    } else {
      rawJsonError.value = 'Failed to parse filter query';
    }
  }
};

const onShowSearch = async () => {
  isShowFilters.value = true;
  if (!filterRows.value.length) {
    filterRows.value = [
      {
        isSelect: true,
        field: availableFields.value[0] || '_id',
        operator: '$eq',
        value: '',
      },
    ];
  }
  await focusSearchByIndex(filterRows.value.length - 1);
};

const getCurrentFocusIndex = (): number | undefined => {
  if (!filterInputRefs.value) return undefined;
  return filterInputRefs.value.findIndex(
    (_, index) => getSearchInputElement(index) === document.activeElement
  );
};

useHotkeys(
  [
    {
      key: 'meta+backspace',
      callback: async () => {
        const idx = getCurrentFocusIndex();
        if (idx === undefined || idx < 0) return;
        await onRemoveFilter(idx);
      },
    },
    {
      key: 'meta+enter',
      callback: () => {
        const idx = getCurrentFocusIndex();
        if (idx === undefined) return;
        filterRows.value = filterRows.value.map(row => ({
          ...row,
          isSelect: true,
        }));
        onExecuteSearch();
      },
    },
    {
      key: 'meta+i',
      callback: async () => {
        const idx = getCurrentFocusIndex();
        if (idx === undefined) return;
        await onAddFilter(idx);
      },
    },
    {
      key: 'escape',
      callback: () => {
        isShowFilters.value = false;
        onExecuteSearch();
      },
    },
  ],
  {
    target: quickQueryFilterRef,
  }
);

watch(
  availableFields,
  fields => {
    if (
      fields.length &&
      filterRows.value.length === 1 &&
      !filterRows.value[0].value
    ) {
      if (!filterRows.value[0].field || filterRows.value[0].field === '_id') {
        filterRows.value[0].field = fields[0];
      }
    }
  },
  { immediate: true }
);

watch(
  [filterRows, mode, rawJsonQuery, isShowFilters],
  debounce(() => {
    if (!props.persistKey) return;

    getPlatformStorage().setItem(
      props.persistKey,
      JSON.stringify({
        filterRows: filterRows.value,
        mode: mode.value,
        rawJsonQuery: rawJsonQuery.value,
        isShowFilters: isShowFilters.value,
      })
    );
  }, DEFAULT_DEBOUNCE_INPUT),
  { deep: true }
);

onMounted(() => {
  if (isShowFilters.value) {
    onExecuteSearch();
  }
});

defineExpose({
  onShowSearch,
  onExecuteSearch,
});
</script>

<template>
  <div
    ref="quickQueryFilterRef"
    v-if="isShowFilters"
    :class="['h-fit space-y-1', filterRows.length && 'pb-2']"
  >
    <!-- Visual Builder Mode -->
    <template v-if="mode === 'visual'">
      <div
        v-for="(value, index) in filterRows"
        :key="index"
        class="flex gap-1 items-center"
      >
        <Checkbox
          :model-value="value.isSelect"
          @click.stop
          @keydown.enter.stop.prevent
          @keyup.enter.stop
          @update:model-value="updateFilterSelection(index, !!$event)"
        />

        <MongoColumnSelector
          :columns="availableFields"
          :value="value.field"
          @update:value="newCol => updateFieldName(index, newCol)"
          @update:open="
            isOpen => {
              if (!isOpen) focusSearchByIndex(index);
            }
          "
        />

        <MongoFilterOperatorSelector
          :value="value.operator"
          @update:value="newOp => updateFilter(index, { operator: newOp })"
          @update:open="
            isOpen => {
              if (!isOpen) focusSearchByIndex(index);
            }
          "
        />

        <Input
          :model-value="value.value"
          type="text"
          :placeholder="getOperatorPlaceholder(value.operator)"
          class="w-full h-6 px-2 text-xs"
          ref="filterInputRefs"
          @keyup.enter.stop="() => onExecuteSearch()"
          @update:model-value="updateSearchValue(index, String($event))"
        />

        <Tooltip>
          <TooltipTrigger as-child>
            <Button size="xxs" variant="outline" @click="onApplyFilter(index)">
              Apply
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Apply this filter</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              size="iconSm"
              variant="outline"
              @click="onRemoveFilter(index)"
            >
              <Icon name="hugeicons:minus-sign" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Remove filter (Meta+Backspace)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger as-child>
            <Button size="iconSm" variant="outline" @click="onAddFilter(index)">
              <Icon name="hugeicons:plus-sign" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Add new filter (Meta+I)</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </template>

    <!-- Raw BSON JSON Mode -->
    <div v-else class="space-y-1.5 pt-1">
      <MongoQueryEditor
        v-model="rawJsonQuery"
        :fields="availableFields"
        placeholder='{ "status": "active", "qty": { "$gte": 10 } }'
        @execute="onExecuteSearch"
      />
      <span class="text-xs text-destructive font-mono" v-if="rawJsonError">
        {{ rawJsonError }}
      </span>
    </div>

    <!-- Shortcut Info & Mode Selector (matching QuickQueryFilterGuide) -->
    <div
      v-if="filterRows.length"
      class="flex justify-between items-center text-xs pt-1"
    >
      <Tabs
        :model-value="mode"
        @update:model-value="
          val => {
            if (val === 'raw' && mode === 'visual') {
              rawJsonQuery = formatMongoFilterToRaw(filterRows);
            }
            mode = val as MongoFilterMode;
          }
        "
      >
        <TabsList size="xxs">
          <TabsTrigger
            size="xxs"
            value="visual"
            class="font-medium cursor-pointer text-primary/80"
          >
            Visual
          </TabsTrigger>
          <TabsTrigger
            size="xxs"
            value="raw"
            class="font-medium cursor-pointer text-primary/80"
          >
            Raw JSON
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div v-if="mode === 'visual'" class="text-xs flex items-center gap-2">
        <div><ContextMenuShortcut>⌘F</ContextMenuShortcut>: Show</div>
        <div><ContextMenuShortcut>Esc</ContextMenuShortcut>: Exit</div>
        <Separator orientation="vertical" class="h-3/4!" />
        <div><ContextMenuShortcut>⌘I</ContextMenuShortcut>: Insert</div>
        <div><ContextMenuShortcut>⌘⌫</ContextMenuShortcut>: Delete</div>
        <div><ContextMenuShortcut>⌘↵</ContextMenuShortcut>: Apply all</div>
      </div>
      <div v-else class="text-xs text-muted-foreground">
        Press Meta+Enter or Ctrl+Enter to execute query.
      </div>
      <Button
        v-if="mode === 'raw'"
        size="xs"
        variant="secondary"
        @click="onExecuteSearch"
      >
        Execute Filter
      </Button>
      <div v-else></div>
    </div>
  </div>
</template>
