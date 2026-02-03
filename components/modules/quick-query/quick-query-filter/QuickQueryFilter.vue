<script setup lang="ts">
import { Icon, Tooltip, TooltipContent, TooltipTrigger } from '#components';
import { toTypedSchema } from '@vee-validate/zod';
import debounce from 'lodash-es/debounce';
import { useFieldArray, useForm } from 'vee-validate';
import { z } from 'zod';
import type { Input } from '~/components/ui/input';
import {
  ComposeOperator,
  DEFAULT_DEBOUNCE_INPUT,
  EExtendedField,
  OperatorSet,
} from '~/utils/constants';
import {
  filterSchema,
  formatWhereClause,
  getPlaceholderSearchByOperator,
  type FilterSchema,
} from '~/utils/quickQuery';
import { EDatabaseType } from '../../management-connection/constants';
import ColumnSelector from '../../selectors/ColumnSelector.vue';
import OperatorSelector from '../../selectors/OperatorSelector.vue';
import QuickQueryFilterGuide from './QuickQueryFilterGuide.vue';

const props = defineProps<{
  columns: string[];
  dbType: EDatabaseType;
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

const formFiltersSchema = z.object({
  filters: filterSchema.array(),
});

type FormFiltersSchema = {
  filters: FilterSchema[];
};

useForm<FormFiltersSchema>({
  validationSchema: toTypedSchema(formFiltersSchema),
  initialValues: {
    filters: props.initFilters || [],
  },
  keepValuesOnUnmount: false,
});

const { remove, fields, insert, update } =
  useFieldArray<FilterSchema>('filters');

watch(
  fields,
  debounce(() => {
    emit('onUpdateFilters', fields.value.map(f => f.value) || []);
  }, DEFAULT_DEBOUNCE_INPUT),
  {
    deep: true,
  }
);

const onAddFilter = (index: number) => {
  insert(index + 1, {
    isSelect: true,
    fieldName: EExtendedField.RawQuery,
  });
};

const updateFieldName = (index: number, newFieldName: string) => {
  const row = fields.value?.[index]?.value;
  const isRowQuery = row?.fieldName === EExtendedField.RawQuery;
  const isEmptyOperator = !row?.operator;

  if (isRowQuery && isEmptyOperator) {
    update(index, {
      ...row,
      fieldName: newFieldName,
      operator: OperatorSet.LIKE_CONTAINS,
    });
  } else {
    update(index, {
      ...row,
      fieldName: newFieldName,
    });
  }
};

const getParserApplyFilter = () => {
  return `${props.baseQuery} ${formatWhereClause({
    columns: props.columns,
    db: props.dbType,
    filters: fields.value.map(f => f.value) || [],
  })};`;
};

const getParserAllFilter = () => {
  return `${props.baseQuery} ${formatWhereClause({
    columns: props.columns,
    db: props.dbType,
    filters: fields.value.map(f => ({ ...f.value, isSelect: true })) || [],
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
  const row = fields.value?.[index]?.value;
  if (!row?.isSelect) {
    update(index, {
      ...row,
      isSelect: true,
    });
  }

  onExecuteSearch();
};

const onApplyAllFilter = () => {
  fields.value.forEach((row, index) => {
    update(index, {
      ...row.value,
      isSelect: true,
    });
  });

  onExecuteSearch();
};

const onRemoveFilter = async (index: number) => {
  remove(index);

  await nextTick();

  if (index !== 0) {
    focusSearchByIndex(index - 1);
  }

  emit('onUpdateFilters', fields.value.map(f => f.value) || []);
  onExecuteSearch();
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

        if (currenFocusIndex === undefined) {
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

        if (currenFocusIndex === undefined) {
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
    @keyup.enter="() => onExecuteSearch()"
  >
    <!-- <TransitionGroup name="fade"> -->
    <div
      class="flex gap-1 items-center"
      v-for="({ key, value }, index) in fields"
      :key="key"
    >
      <Checkbox v-model:model-value="value.isSelect" />

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
              nextTick(() => focusSearchByIndex(index));
            }
          }
        "
      />

      <OperatorSelector
        v-if="value.fieldName !== EExtendedField.RawQuery"
        :db-type="dbType"
        v-model:value="value.operator"
        @update:open="
          isOpen => {
            if (!isOpen) {
              nextTick(() => focusSearchByIndex(index));
            }
          }
        "
      />

      <!-- https://www.shadcn-vue.com/docs/components/combobox -->
      <!-- TODO: need to apply auto suggesions for row query, this help user show columns name, only trigger show in the first or near 'and' or 'or' key word -->
      <Input
        v-model:model-value="value.search"
        type="text"
        :placeholder="getPlaceholderSearchByOperator(value.operator || '')"
        class="w-full h-6 px-2"
        ref="filterSearchRefs"
      />

      <Tooltip>
        <TooltipTrigger as-child>
          <Button size="xs" variant="outline" @click="onApplyFilter(index)">
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
