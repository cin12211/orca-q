<script setup lang="ts">
import { Icon } from '#components';
import { toTypedSchema } from '@vee-validate/zod';
import { useFieldArray, useForm } from 'vee-validate';
import { z } from 'zod';
import type { Input } from '~/components/ui/input';
import { EExtendedField, OperatorSet } from '~/utils/constants';
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
}>();

const emit = defineEmits<{
  (e: 'onSearch', whereClauses: string): void;
}>();

const quickQueryFilterRef = ref<HTMLElement>();

const filterSearchRefs =
  useTemplateRef<InstanceType<typeof Input>[]>('filterSearchRefs');

const isDisplayFilters = ref(false);

const formFiltersSchema = z.object({
  filters: filterSchema.array(),
});

type FormFiltersSchema = {
  filters: FilterSchema[];
};

useForm<FormFiltersSchema>({
  validationSchema: toTypedSchema(formFiltersSchema),
  initialValues: {
    filters: [],
  },
  keepValuesOnUnmount: false,
});

const { remove, fields, insert, update } =
  useFieldArray<FilterSchema>('filters');

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
    emit(
      'onSearch',
      formatWhereClause({
        columns: props.columns,
        db: props.dbType,
        filters: [],
      })
    );

    return;
  }

  emit(
    'onSearch',
    formatWhereClause({
      columns: props.columns,
      db: props.dbType,
      filters: fields.value.map(f => f.value) || [],
    })
  );
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

  if (index === 0) {
    onExecuteSearch();
  } else {
    focusSearchByIndex(index - 1);
  }
};

const focusSearchByIndex = (index: number) => {
  if (filterSearchRefs.value) {
    filterSearchRefs.value?.[index]?.$el.focus();
  }
};

const onShowSearch = async () => {
  if (!fields.value.length) {
    onAddFilter(-1);
  }
  isDisplayFilters.value = true;

  await nextTick();

  const lastIndex = fields.value.length - 1 || 0;

  focusSearchByIndex(lastIndex);
};

useHotkeys([
  {
    key: 'meta+f',
    callback: async () => {
      await onShowSearch();
    },
  },
  {
    key: 'escape',
    callback: () => {
      isDisplayFilters.value = false;
      onExecuteSearch(true);
    },
  },
]);

useHotkeys(
  [
    //TODO: only listens event in this input focus
    {
      key: 'meta+backspace',
      callback: async () => {
        if (!filterSearchRefs.value) {
          return;
        }

        const currenFocusIndex = filterSearchRefs.value.findIndex(
          input => input.$el === document.activeElement
        );

        onRemoveFilter(currenFocusIndex);
      },
    },
    //TODO: only listens event in this input focus
    {
      key: 'meta+enter',
      callback: () => {
        if (!filterSearchRefs.value) {
          return;
        }

        const currenFocusIndex = filterSearchRefs.value.findIndex(
          input => input.$el === document.activeElement
        );

        if (currenFocusIndex >= 0) {
          onApplyAllFilter();
        }
      },
    },
    //TODO: only listens event in this input focus
    {
      key: 'meta+i',
      callback: async () => {
        if (!filterSearchRefs.value) {
          return;
        }

        const currenFocusIndex = filterSearchRefs.value.findIndex(
          input => input.$el === document.activeElement
        );

        onAddFilter(currenFocusIndex);

        await nextTick();

        focusSearchByIndex(currenFocusIndex + 1);
      },
    },
  ],
  {
    target: quickQueryFilterRef,
  }
);

defineExpose({
  onShowSearch,
});
</script>

<template>
  <div
    ref="quickQueryFilterRef"
    v-if="isDisplayFilters"
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

      <Input
        v-model:model-value="value.search"
        type="text"
        :placeholder="getPlaceholderSearchByOperator(value.operator || '')"
        class="w-full h-6 px-2"
        ref="filterSearchRefs"
      />
      <Button
        class="h-6 px-1.5"
        variant="outline"
        @click="onApplyFilter(index)"
      >
        Apply
      </Button>
      <Button
        size="iconSm"
        class="size-5!"
        variant="outline"
        @click="onRemoveFilter(index)"
      >
        <Icon name="hugeicons:minus-sign" />
      </Button>
      <Button
        size="iconSm"
        class="size-5!"
        variant="outline"
        @click="() => onAddFilter(index)"
      >
        <Icon name="hugeicons:plus-sign" />
      </Button>
    </div>

    <QuickQueryFilterGuide
      v-if="fields.length"
      :getParserApplyFilter="getParserApplyFilter"
      :getParserAllFilter="getParserAllFilter"
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
