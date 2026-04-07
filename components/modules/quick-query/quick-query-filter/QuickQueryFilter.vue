<script setup lang="ts">
import { Icon, Tooltip, TooltipContent, TooltipTrigger } from '#components';
import {
  formatWhereClause,
  getPlaceholderSearchByOperator,
  type FilterSchema,
} from '~/components/modules/quick-query/utils';
import type { Input } from '~/components/ui/input';
import { ComposeOperator, EExtendedField, OperatorSet } from '~/core/constants';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import ColumnSelector from '../../selectors/ColumnSelector.vue';
import OperatorSelector from '../../selectors/OperatorSelector.vue';
import QuickQueryFilterGuide from './QuickQueryFilterGuide.vue';

const props = defineProps<{
  columns: string[];
  dbType: DatabaseClientType;
  baseQuery: string;
  initFilters: FilterSchema[];
  composeWith: ComposeOperator;
}>();

const isShowFilters = defineModel('isShowFilters');

const emit = defineEmits<{
  (e: 'onSearch'): void;
  (e: 'onUpdateFilters', filters: FilterSchema[]): void;
  (e: 'onChangeComposeWith', composeWith: ComposeOperator): void;
}>();

const quickQueryFilterRef = ref<HTMLElement>();

const filterSearchRefs =
  useTemplateRef<InstanceType<typeof Input>[]>('filterSearchRefs');

const fields = computed(() => props.initFilters || []);

const getNextFilters = () => fields.value.map(filter => ({ ...filter }));

const emitFilters = (nextFilters: FilterSchema[]) => {
  emit('onUpdateFilters', nextFilters);
};

const updateFilter = (index: number, patch: Partial<FilterSchema>) => {
  const nextFilters = getNextFilters();
  const row = nextFilters[index];

  if (!row) {
    return;
  }

  nextFilters[index] = {
    ...row,
    ...patch,
  };

  emitFilters(nextFilters);
};

const insert = (index: number, filter: FilterSchema) => {
  const nextFilters = getNextFilters();

  nextFilters.splice(index, 0, { ...filter });

  emitFilters(nextFilters);
};

const remove = (index: number) => {
  const nextFilters = getNextFilters();

  nextFilters.splice(index, 1);

  emitFilters(nextFilters);
};

const onAddFilter = (index: number) => {
  insert(index + 1, {
    isSelect: true,
    fieldName: EExtendedField.AnyField,
    operator: OperatorSet.LIKE_CONTAINS,
  });
};

const updateFieldName = (index: number, newFieldName: string) => {
  const row = fields.value?.[index];
  const isRowQuery = row?.fieldName === EExtendedField.RawQuery;
  const isEmptyOperator = !row?.operator;

  if (isRowQuery && isEmptyOperator) {
    updateFilter(index, {
      ...row,
      fieldName: newFieldName,
      operator: OperatorSet.LIKE_CONTAINS,
    });
  } else {
    updateFilter(index, {
      ...row,
      fieldName: newFieldName,
    });
  }
};

const getParserApplyFilter = () => {
  return `${props.baseQuery} ${formatWhereClause({
    columns: props.columns,
    db: props.dbType,
    filters: fields.value,
    composeWith: props.composeWith,
  })};`;
};

const getParserAllFilter = () => {
  return `${props.baseQuery} ${formatWhereClause({
    columns: props.columns,
    db: props.dbType,
    filters: fields.value.map(filter => ({ ...filter, isSelect: true })),
    composeWith: props.composeWith,
  })};`;
};

const onExecuteSearch = (isWithoutQuery: boolean = false) => {
  if (isWithoutQuery) {
    emit('onSearch');

    return;
  }

  emit('onSearch');
};

const onApplyFilter = (index: number) => {
  const row = fields.value?.[index];
  if (!row?.isSelect) {
    updateFilter(index, {
      ...row,
      isSelect: true,
    });
  }

  onExecuteSearch();
};

const onApplyAllFilter = () => {
  emitFilters(
    fields.value.map(row => ({
      ...row,
      isSelect: true,
    }))
  );

  onExecuteSearch();
};

const onRemoveFilter = async (index: number) => {
  const row = fields.value?.[index];
  const shouldApplyAfterRemove = !!row?.isSelect;

  remove(index);

  await nextTick();

  if (index !== 0) {
    focusSearchByIndex(index - 1);
  }

  if (shouldApplyAfterRemove) {
    onExecuteSearch();
  }
};

const getSearchInputValue = (value?: FilterSchema['search']) => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
};

const updateSearchValue = (index: number, value: string) => {
  updateFilter(index, {
    search: value,
  });
};

const updateFilterSelection = async (index: number, isSelected: boolean) => {
  updateFilter(index, {
    isSelect: isSelected,
  });

  await onExecuteSearch();
};

const focusSearchByIndex = (index: number) => {
  if (filterSearchRefs.value) {
    filterSearchRefs.value?.[index]?.$el.focus();
  }
};

const onShowSearch = () => {
  if (!fields.value.length) {
    onAddFilter(-1);
  }

  isShowFilters.value = true;

  nextTick(() => {
    const lastIndex = fields.value.length - 1 || 0;

    focusSearchByIndex(lastIndex);
  });
};

const getCurrentFocusInput = (): number | undefined => {
  if (!filterSearchRefs.value) {
    return;
  }

  const currenFocusIndex = filterSearchRefs.value.findIndex(
    input => input.$el === document.activeElement
  );

  return currenFocusIndex;
};

useHotkeys(
  [
    {
      key: 'meta+backspace',
      callback: async () => {
        const currenFocusIndex = getCurrentFocusInput();

        if (currenFocusIndex === undefined || currenFocusIndex < 0) {
          return;
        }

        onRemoveFilter(currenFocusIndex);
      },
    },
    {
      key: 'meta+enter',
      callback: () => {
        const currenFocusIndex = getCurrentFocusInput();

        if (currenFocusIndex === undefined) {
          return;
        }

        if (currenFocusIndex >= 0) {
          onApplyAllFilter();
        }
      },
    },
    {
      key: 'meta+i',
      callback: async () => {
        const currenFocusIndex = getCurrentFocusInput();

        if (currenFocusIndex === undefined || currenFocusIndex < 0) {
          return;
        }

        onAddFilter(currenFocusIndex);

        await nextTick();

        focusSearchByIndex(currenFocusIndex + 1);
      },
    },
    {
      key: 'escape',
      callback: () => {
        isShowFilters.value = false;
        onExecuteSearch(true);
      },
    },
  ],
  {
    target: quickQueryFilterRef,
  }
);

defineExpose({
  onShowSearch,
  insert,
});
</script>

<template>
  <div
    ref="quickQueryFilterRef"
    v-if="isShowFilters"
    :class="['h-fit space-y-1', fields.length && 'pb-2']"
  >
    <!-- <TransitionGroup name="fade"> -->
    <div
      class="flex gap-1 items-center"
      v-for="(value, index) in fields"
      :key="index"
    >
      <Checkbox
        :model-value="value.isSelect"
        @click.stop
        @keydown.enter.stop.prevent
        @keyup.enter.stop
        @update:model-value="updateFilterSelection(index, !!$event)"
      />

      <ColumnSelector
        :columns="columns"
        :value="value.fieldName"
        @update:value="
          newColumns => {
            updateFieldName(index, newColumns as string);
          }
        "
        @update:open="
          isOpen => {
            if (!isOpen) {
              $nextTick(() => focusSearchByIndex(index));
            }
          }
        "
      />

      <OperatorSelector
        v-if="value.fieldName !== EExtendedField.RawQuery"
        :db-type="dbType"
        :value="value.operator"
        @update:value="
          updateFilter(index, {
            operator: $event == null ? undefined : String($event),
          })
        "
        @update:open="
          isOpen => {
            if (!isOpen) {
              $nextTick(() => focusSearchByIndex(index));
            }
          }
        "
      />

      <!-- https://www.shadcn-vue.com/docs/components/combobox -->
      <!-- TODO: need to apply auto suggesions for row query, this help user show columns name, only trigger show in the first or near 'and' or 'or' key word -->
      <Input
        :model-value="getSearchInputValue(value.search)"
        type="text"
        :placeholder="getPlaceholderSearchByOperator(value.operator || '')"
        class="w-full h-6 px-2"
        ref="filterSearchRefs"
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
          <Button
            size="iconSm"
            variant="outline"
            @click="() => onAddFilter(index)"
          >
            <Icon name="hugeicons:plus-sign" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Add new filter (Meta+I)</p>
        </TooltipContent>
      </Tooltip>
    </div>

    <QuickQueryFilterGuide
      v-if="fields.length"
      :getParserApplyFilter="getParserApplyFilter"
      :getParserAllFilter="getParserAllFilter"
      :compose-with="composeWith"
      @on-change-compose-with="emit('onChangeComposeWith', $event)"
    />

    <!-- </TransitionGroup> -->
  </div>
</template>

<style>
/* 1. declare transition */
.fade-move,
.fade-enter-active,
.fade-leave-active {
  transition: all 0.25s ease;
}

/* 2. declare enter from and leave to state */
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scaleY(0.01) translate(1.5rem, 0);
}

/* 3. ensure leaving items are taken out of layout flow so that moving
      animations can be calculated correctly. */
.fade-leave-active {
  position: absolute;
}
</style>
